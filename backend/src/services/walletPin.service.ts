import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabase.js';

const PIN_LENGTH = 6;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const WALLET_PIN_SCHEMA_MISSING_MESSAGE = 'Le schéma PIN wallet n’est pas encore appliqué en base. Exécutez la migration 20260408193000_wallet_pin_schema_compat.sql.';
const ACCOUNT_PASSWORD_REQUIRED_MESSAGE = 'Entrez le mot de passe de votre compte pour réinitialiser le PIN.';
const ACCOUNT_PASSWORD_INVALID_MESSAGE = 'Mot de passe du compte incorrect.';
const ACCOUNT_PASSWORD_RESET_UNAVAILABLE_MESSAGE = 'Réinitialisation du PIN indisponible pour ce compte. Contactez le support.';

function validatePinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

function isWalletPinSchemaMissingError(error: unknown): boolean {
  const errorMessage = String(
    (error as { message?: string; details?: string } | null)?.message ||
    (error as { details?: string } | null)?.details ||
    ''
  );

  return /pin_hash|pin_enabled|pin_failed_attempts|pin_locked_until|pin_updated_at/i.test(errorMessage)
    && /column|does not exist|schema cache/i.test(errorMessage);
}

function toFallbackWalletPinState(wallet: { id: string; pin_hash?: string | null; updated_at?: string | null } | null) {
  if (!wallet) {
    return null;
  }

  return {
    id: wallet.id,
    pin_hash: wallet.pin_hash ?? null,
    pin_enabled: Boolean(wallet.pin_hash),
    pin_failed_attempts: 0,
    pin_locked_until: null,
    pin_updated_at: wallet.updated_at ?? null,
  };
}

async function fetchWalletPinFallback(userId: string) {
  const { data: fallbackWallet, error: fallbackError } = await supabaseAdmin
    .from('wallets')
    .select('id, pin_hash, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!fallbackError) {
    return toFallbackWalletPinState(fallbackWallet);
  }

  if (!isWalletPinSchemaMissingError(fallbackError)) {
    throw fallbackError;
  }

  const { data: minimalWallet, error: minimalError } = await supabaseAdmin
    .from('wallets')
    .select('id, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (minimalError) {
    throw minimalError;
  }

  return toFallbackWalletPinState(minimalWallet ? { ...minimalWallet, pin_hash: null } : null);
}

async function persistWalletPinUpdate(
  userId: string,
  payload: Record<string, unknown>,
  fallbackPayload: Record<string, unknown> = {}
) {
  const { error } = await supabaseAdmin
    .from('wallets')
    .update(payload)
    .eq('user_id', userId);

  if (!error) {
    return;
  }

  if (!isWalletPinSchemaMissingError(error)) {
    throw error;
  }

  if (Object.keys(fallbackPayload).length === 0) {
    return;
  }

  const { error: fallbackError } = await supabaseAdmin
    .from('wallets')
    .update(fallbackPayload)
    .eq('user_id', userId);

  if (fallbackError) {
    throw fallbackError;
  }
}

async function verifyAccountPassword(email: string | null | undefined, password: string) {
  if (!password || !password.trim()) {
    throw new Error(ACCOUNT_PASSWORD_REQUIRED_MESSAGE);
  }

  if (!email || !String(email).trim() || !env.SUPABASE_ANON_KEY) {
    throw new Error(ACCOUNT_PASSWORD_RESET_UNAVAILABLE_MESSAGE);
  }

  const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await authClient.auth.signInWithPassword({
    email: String(email).trim(),
    password,
  });

  await authClient.auth.signOut().catch(() => undefined);

  if (error || !data.user) {
    throw new Error(ACCOUNT_PASSWORD_INVALID_MESSAGE);
  }
}

function hashPin(pin: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(pin, actualSalt, 64).toString('hex');
  return `${actualSalt}:${derivedKey}`;
}

function verifyHashedPin(pin: string, storedHash: string): boolean {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const candidateHash = crypto.scryptSync(pin, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (candidateHash.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(candidateHash, expectedBuffer);
}

export async function getWalletPinState(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('wallets')
    .select('id, pin_hash, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error) {
    return data;
  }

  if (!isWalletPinSchemaMissingError(error)) {
    throw error;
  }

  return fetchWalletPinFallback(userId);
}

export async function ensureWalletExistsForPin(userId: string) {
  const wallet = await getWalletPinState(userId);
  if (wallet) return wallet;

  const { data, error } = await supabaseAdmin
    .from('wallets')
    .insert({ user_id: userId })
    .select('id, pin_hash, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at')
    .maybeSingle();

  if (!error && data) {
    return data;
  }

  if (error && !isWalletPinSchemaMissingError(error)) {
    throw error;
  }

  const existingFallback = await fetchWalletPinFallback(userId);
  if (existingFallback) {
    return existingFallback;
  }

  const { data: insertedFallback, error: insertFallbackError } = await supabaseAdmin
    .from('wallets')
    .insert({ user_id: userId })
    .select('id, updated_at')
    .single();

  if (insertFallbackError) {
    throw insertFallbackError;
  }

  return toFallbackWalletPinState(insertedFallback ? { ...insertedFallback, pin_hash: null } : null);
}

export async function setupWalletPin(userId: string, pin: string) {
  if (!validatePinFormat(pin)) {
    throw new Error('Le code PIN doit contenir exactement 6 chiffres');
  }

  try {
    await ensureWalletExistsForPin(userId);

    const pinHash = hashPin(pin);
    const timestamp = new Date().toISOString();

    await persistWalletPinUpdate(
      userId,
      {
        pin_hash: pinHash,
        pin_enabled: true,
        pin_failed_attempts: 0,
        pin_locked_until: null,
        pin_updated_at: timestamp,
        updated_at: timestamp,
      },
      {
        pin_hash: pinHash,
        updated_at: timestamp,
      }
    );
  } catch (error) {
    if (isWalletPinSchemaMissingError(error)) {
      throw new Error(WALLET_PIN_SCHEMA_MISSING_MESSAGE);
    }
    throw error;
  }
}

export async function changeWalletPin(userId: string, currentPin: string, newPin: string) {
  let wallet;

  try {
    wallet = await ensureWalletExistsForPin(userId);
  } catch (error) {
    if (isWalletPinSchemaMissingError(error)) {
      throw new Error(WALLET_PIN_SCHEMA_MISSING_MESSAGE);
    }
    throw error;
  }

  const hasActivePin = Boolean(wallet?.pin_hash) && wallet?.pin_enabled !== false;

  if (!hasActivePin) {
    throw new Error('Aucun code PIN actif');
  }

  const verification = await verifyWalletPin(userId, currentPin);
  if (!verification.valid) {
    throw new Error(verification.error || 'Code PIN actuel invalide');
  }

  await setupWalletPin(userId, newPin);
}

export async function resetWalletPinWithPassword(
  userId: string,
  email: string | null | undefined,
  accountPassword: string,
  newPin: string,
) {
  if (!validatePinFormat(newPin)) {
    throw new Error('Le nouveau code PIN doit contenir exactement 6 chiffres');
  }

  await verifyAccountPassword(email, accountPassword);
  await setupWalletPin(userId, newPin);
}

export async function verifyWalletPin(userId: string, pin: string): Promise<{ valid: boolean; error?: string; lockedUntil?: string | null }> {
  if (!validatePinFormat(pin)) {
    return { valid: false, error: 'Le code PIN doit contenir 6 chiffres' };
  }

  let wallet;

  try {
    wallet = await ensureWalletExistsForPin(userId);
  } catch (error) {
    if (isWalletPinSchemaMissingError(error)) {
      return { valid: false, error: WALLET_PIN_SCHEMA_MISSING_MESSAGE };
    }
    throw error;
  }

  const hasActivePin = Boolean(wallet?.pin_hash) && wallet?.pin_enabled !== false;

  if (!hasActivePin) {
    return { valid: false, error: 'Veuillez configurer votre code PIN avant cette opération' };
  }

  const now = Date.now();
  const lockedUntilTs = wallet.pin_locked_until ? new Date(wallet.pin_locked_until).getTime() : null;
  if (lockedUntilTs && lockedUntilTs > now) {
    return { valid: false, error: 'Code PIN temporairement bloqué', lockedUntil: wallet.pin_locked_until };
  }

  const isValid = verifyHashedPin(pin, wallet.pin_hash!);
  if (isValid) {
    await persistWalletPinUpdate(
      userId,
      {
        pin_failed_attempts: 0,
        pin_locked_until: null,
        updated_at: new Date().toISOString(),
      },
      {
        updated_at: new Date().toISOString(),
      }
    );

    return { valid: true };
  }

  const failedAttempts = Number(wallet.pin_failed_attempts || 0) + 1;
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
    : null;

  await persistWalletPinUpdate(
    userId,
    {
      pin_failed_attempts: failedAttempts,
      pin_locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    },
    {
      updated_at: new Date().toISOString(),
    }
  );

  return {
    valid: false,
    error: shouldLock
      ? `Trop de tentatives. Code PIN bloqué pendant ${LOCKOUT_MINUTES} minutes`
      : `Code PIN invalide (${failedAttempts}/${MAX_FAILED_ATTEMPTS})`,
    lockedUntil,
  };
}

export function getWalletPinPolicy() {
  return {
    pinLength: PIN_LENGTH,
    maxFailedAttempts: MAX_FAILED_ATTEMPTS,
    lockoutMinutes: LOCKOUT_MINUTES,
  };
}
