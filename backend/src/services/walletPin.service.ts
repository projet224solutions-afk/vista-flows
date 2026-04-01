import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

const PIN_LENGTH = 6;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function validatePinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
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

  if (error) throw error;
  return data;
}

export async function ensureWalletExistsForPin(userId: string) {
  const wallet = await getWalletPinState(userId);
  if (wallet) return wallet;

  const { data, error } = await supabaseAdmin
    .from('wallets')
    .insert({ user_id: userId })
    .select('id, pin_hash, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function setupWalletPin(userId: string, pin: string) {
  if (!validatePinFormat(pin)) {
    throw new Error('Le code PIN doit contenir exactement 6 chiffres');
  }

  await ensureWalletExistsForPin(userId);

  const pinHash = hashPin(pin);
  const { error } = await supabaseAdmin
    .from('wallets')
    .update({
      pin_hash: pinHash,
      pin_enabled: true,
      pin_failed_attempts: 0,
      pin_locked_until: null,
      pin_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function changeWalletPin(userId: string, currentPin: string, newPin: string) {
  const wallet = await ensureWalletExistsForPin(userId);
  if (!wallet?.pin_hash || !wallet?.pin_enabled) {
    throw new Error('Aucun code PIN actif');
  }

  const verification = await verifyWalletPin(userId, currentPin);
  if (!verification.valid) {
    throw new Error(verification.error || 'Code PIN actuel invalide');
  }

  await setupWalletPin(userId, newPin);
}

export async function verifyWalletPin(userId: string, pin: string): Promise<{ valid: boolean; error?: string; lockedUntil?: string | null }> {
  if (!validatePinFormat(pin)) {
    return { valid: false, error: 'Le code PIN doit contenir 6 chiffres' };
  }

  const wallet = await ensureWalletExistsForPin(userId);
  if (!wallet?.pin_enabled || !wallet?.pin_hash) {
    return { valid: false, error: 'Veuillez configurer votre code PIN avant cette opération' };
  }

  const now = Date.now();
  const lockedUntilTs = wallet.pin_locked_until ? new Date(wallet.pin_locked_until).getTime() : null;
  if (lockedUntilTs && lockedUntilTs > now) {
    return { valid: false, error: 'Code PIN temporairement bloqué', lockedUntil: wallet.pin_locked_until };
  }

  const isValid = verifyHashedPin(pin, wallet.pin_hash);
  if (isValid) {
    await supabaseAdmin
      .from('wallets')
      .update({
        pin_failed_attempts: 0,
        pin_locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    return { valid: true };
  }

  const failedAttempts = Number(wallet.pin_failed_attempts || 0) + 1;
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from('wallets')
    .update({
      pin_failed_attempts: failedAttempts,
      pin_locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

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
