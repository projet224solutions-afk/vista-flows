/**
 * 💰 WALLET v2 ROUTES — JavaScript (compatible Node.js ESM sans compilation TS)
 *
 * Endpoints montés sur /api/v2/wallet :
 *   GET  /balance
 *   GET  /status
 *   GET  /transactions
 *   POST /initialize
 *   GET  /pin/status
 *   POST /pin/setup
 *   POST /pin/change
 *   POST /pin/reset
 */

import crypto from 'crypto';
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// ────────────────────────────────────────────────────────────
// WALLET PIN — logique interne (portée depuis walletPin.service.ts)
// ────────────────────────────────────────────────────────────

const PIN_LENGTH = 6;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const WALLET_PIN_SCHEMA_MISSING_MESSAGE =
  'Le schéma PIN wallet n\'est pas encore appliqué en base. Exécutez la migration 20260408193000_wallet_pin_schema_compat.sql.';
const ACCOUNT_PASSWORD_REQUIRED_MESSAGE =
  'Entrez le mot de passe de votre compte pour réinitialiser le PIN.';
const ACCOUNT_PASSWORD_INVALID_MESSAGE = 'Mot de passe du compte incorrect.';
const ACCOUNT_PASSWORD_RESET_UNAVAILABLE_MESSAGE =
  'Réinitialisation du PIN indisponible pour ce compte. Contactez le support.';

function validatePinFormat(pin) {
  return /^\d{6}$/.test(pin);
}

function isWalletPinSchemaMissingError(error) {
  const msg = String(error?.message || error?.details || '');
  return (
    /pin_hash|pin_enabled|pin_failed_attempts|pin_locked_until|pin_updated_at/i.test(msg) &&
    /column|does not exist|schema cache/i.test(msg)
  );
}

function toFallbackPinState(wallet) {
  if (!wallet) return null;
  return {
    id: wallet.id,
    pin_hash: wallet.pin_hash ?? null,
    pin_enabled: Boolean(wallet.pin_hash),
    pin_failed_attempts: 0,
    pin_locked_until: null,
    pin_updated_at: wallet.updated_at ?? null,
  };
}

async function fetchWalletPinFallback(userId) {
  const { data, error } = await supabaseAdmin
    .from('wallets')
    .select('id, pin_hash, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error) return toFallbackPinState(data);
  if (!isWalletPinSchemaMissingError(error)) throw error;

  const { data: minimal, error: minErr } = await supabaseAdmin
    .from('wallets')
    .select('id, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (minErr) throw minErr;
  return toFallbackPinState(minimal ? { ...minimal, pin_hash: null } : null);
}

async function persistWalletPinUpdate(userId, payload, fallbackPayload = {}) {
  const { error } = await supabaseAdmin.from('wallets').update(payload).eq('user_id', userId);
  if (!error) return;
  if (!isWalletPinSchemaMissingError(error)) throw error;
  if (Object.keys(fallbackPayload).length === 0) return;

  const { error: fbErr } = await supabaseAdmin
    .from('wallets')
    .update(fallbackPayload)
    .eq('user_id', userId);
  if (fbErr) throw fbErr;
}

async function getWalletPinState(userId) {
  const { data, error } = await supabaseAdmin
    .from('wallets')
    .select('id, pin_hash, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error) return data;
  if (!isWalletPinSchemaMissingError(error)) throw error;
  return fetchWalletPinFallback(userId);
}

async function ensureWalletExistsForPin(userId) {
  const wallet = await getWalletPinState(userId);
  if (wallet) return wallet;

  const { data, error } = await supabaseAdmin
    .from('wallets')
    .insert({ user_id: userId })
    .select('id, pin_hash, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at')
    .maybeSingle();

  if (!error && data) return data;
  if (error && !isWalletPinSchemaMissingError(error)) throw error;

  const existing = await fetchWalletPinFallback(userId);
  if (existing) return existing;

  const { data: fallback, error: fbErr } = await supabaseAdmin
    .from('wallets')
    .insert({ user_id: userId })
    .select('id, updated_at')
    .single();
  if (fbErr) throw fbErr;
  return toFallbackPinState(fallback ? { ...fallback, pin_hash: null } : null);
}

function hashPin(pin, salt) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(pin, actualSalt, 64).toString('hex');
  return `${actualSalt}:${derivedKey}`;
}

function verifyHashedPin(pin, storedHash) {
  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;
  const candidateHash = crypto.scryptSync(pin, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (candidateHash.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(candidateHash, expectedBuffer);
}

async function verifyAccountPassword(email, password) {
  if (!password || !String(password).trim()) {
    throw new Error(ACCOUNT_PASSWORD_REQUIRED_MESSAGE);
  }
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!email || !String(email).trim() || !anonKey) {
    throw new Error(ACCOUNT_PASSWORD_RESET_UNAVAILABLE_MESSAGE);
  }
  const authClient = createClient(process.env.SUPABASE_URL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
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

async function setupWalletPin(userId, pin) {
  if (!validatePinFormat(pin)) {
    throw new Error('Le code PIN doit contenir exactement 6 chiffres');
  }
  try {
    await ensureWalletExistsForPin(userId);
    const pinHash = hashPin(pin);
    const timestamp = new Date().toISOString();
    await persistWalletPinUpdate(
      userId,
      { pin_hash: pinHash, pin_enabled: true, pin_failed_attempts: 0, pin_locked_until: null, pin_updated_at: timestamp, updated_at: timestamp },
      { pin_hash: pinHash, updated_at: timestamp }
    );
  } catch (error) {
    if (isWalletPinSchemaMissingError(error)) throw new Error(WALLET_PIN_SCHEMA_MISSING_MESSAGE);
    throw error;
  }
}

async function verifyWalletPin(userId, pin) {
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

  const isValid = verifyHashedPin(pin, wallet.pin_hash);
  if (isValid) {
    if (Number(wallet.pin_failed_attempts || 0) > 0) {
      await persistWalletPinUpdate(
        userId,
        { pin_failed_attempts: 0, pin_locked_until: null },
        {}
      ).catch(() => undefined);
    }
    return { valid: true };
  }

  const newFailedAttempts = Number(wallet.pin_failed_attempts || 0) + 1;
  const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(now + LOCKOUT_MINUTES * 60 * 1000).toISOString()
    : null;
  await persistWalletPinUpdate(
    userId,
    { pin_failed_attempts: newFailedAttempts, pin_locked_until: lockedUntil },
    {}
  ).catch(() => undefined);

  return {
    valid: false,
    error: shouldLock
      ? `Code PIN bloqué pour ${LOCKOUT_MINUTES} minutes après ${MAX_FAILED_ATTEMPTS} tentatives`
      : `Code PIN incorrect. ${MAX_FAILED_ATTEMPTS - newFailedAttempts} tentatives restantes`,
    lockedUntil,
  };
}

async function changeWalletPin(userId, currentPin, newPin) {
  let wallet;
  try {
    wallet = await ensureWalletExistsForPin(userId);
  } catch (error) {
    if (isWalletPinSchemaMissingError(error)) throw new Error(WALLET_PIN_SCHEMA_MISSING_MESSAGE);
    throw error;
  }
  const hasActivePin = Boolean(wallet?.pin_hash) && wallet?.pin_enabled !== false;
  if (!hasActivePin) throw new Error('Aucun code PIN actif');

  const verification = await verifyWalletPin(userId, currentPin);
  if (!verification.valid) throw new Error(verification.error || 'Code PIN actuel invalide');

  await setupWalletPin(userId, newPin);
}

async function resetWalletPinWithPassword(userId, email, accountPassword, newPin) {
  if (!validatePinFormat(newPin)) {
    throw new Error('Le nouveau code PIN doit contenir exactement 6 chiffres');
  }
  await verifyAccountPassword(email, accountPassword);
  await setupWalletPin(userId, newPin);
}

function getWalletPinPolicy() {
  return { pinLength: PIN_LENGTH, maxFailedAttempts: MAX_FAILED_ATTEMPTS, lockoutMinutes: LOCKOUT_MINUTES };
}

function hasPinEnabled(pinState) {
  return Boolean(pinState?.pin_enabled ?? pinState?.pin_hash);
}

// ────────────────────────────────────────────────────────────
// WALLET ROUTES
// ────────────────────────────────────────────────────────────

/**
 * GET /api/v2/wallet/balance
 */
router.get('/balance', verifyJWT, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency, wallet_status, is_blocked, daily_limit, monthly_limit, created_at')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    res.json({ success: true, data: data || null, exists: !!data });
  } catch (error) {
    logger.error(`[walletV2] balance error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération du solde' });
  }
});

/**
 * POST /api/v2/wallet/initialize
 */
router.post('/initialize', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: existing, error: selectErr } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectErr) throw selectErr;
    if (existing) {
      res.json({ success: true, wallet: existing, created: false });
      return;
    }

    const { data: newWallet, error: insertErr } = await supabaseAdmin
      .from('wallets')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertErr) throw insertErr;
    res.status(201).json({ success: true, wallet: newWallet, created: true });
  } catch (error) {
    logger.error(`[walletV2] initialize error: ${error.message}`);
    res.status(500).json({ success: false, error: "Erreur lors de l'initialisation du wallet" });
  }
});

/**
 * GET /api/v2/wallet/transactions
 */
router.get('/transactions', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!wallet) {
      res.json({ success: true, data: [], meta: { total: 0, limit, offset, hasMore: false } });
      return;
    }

    const { data, error, count } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .or(`sender_wallet_id.eq.${wallet.id},receiver_wallet_id.eq.${wallet.id}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({
      success: true,
      data: data || [],
      meta: { limit, offset, total: count || 0, hasMore: offset + limit < (count || 0) },
    });
  } catch (error) {
    logger.error(`[walletV2] transactions error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

/**
 * GET /api/v2/wallet/status
 */
router.get('/status', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select(
        'id, balance, currency, wallet_status, is_blocked, blocked_reason, blocked_at, biometric_enabled, daily_limit, monthly_limit, created_at, updated_at, pin_enabled, pin_failed_attempts, pin_locked_until, pin_updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (!error) {
      if (!data) {
        res.json({ success: true, exists: false, data: null });
        return;
      }
      res.json({ success: true, exists: true, data });
      return;
    }

    // Fallback si colonnes PIN manquantes
    const pinSchemaMissing = isWalletPinSchemaMissingError(error);
    if (!pinSchemaMissing) throw error;

    const [{ data: walletData, error: walletErr }, pinState] = await Promise.all([
      supabaseAdmin
        .from('wallets')
        .select(
          'id, balance, currency, wallet_status, is_blocked, blocked_reason, blocked_at, biometric_enabled, daily_limit, monthly_limit, created_at, updated_at'
        )
        .eq('user_id', userId)
        .maybeSingle(),
      getWalletPinState(userId),
    ]);

    if (walletErr) throw walletErr;
    if (!walletData) {
      res.json({ success: true, exists: false, data: null });
      return;
    }

    res.json({
      success: true,
      exists: true,
      data: {
        ...walletData,
        pin_enabled: hasPinEnabled(pinState),
        pin_failed_attempts: Number(pinState?.pin_failed_attempts || 0),
        pin_locked_until: pinState?.pin_locked_until || null,
        pin_updated_at: pinState?.pin_updated_at || null,
      },
    });
  } catch (error) {
    logger.error(`[walletV2] status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur' });
  }
});

// ────────────────────────────────────────────────────────────
// PIN ROUTES
// ────────────────────────────────────────────────────────────

/**
 * GET /api/v2/wallet/pin/status
 */
router.get('/pin/status', verifyJWT, async (req, res) => {
  try {
    const wallet = await ensureWalletExistsForPin(req.user.id);
    res.json({
      success: true,
      data: {
        pin_enabled: hasPinEnabled(wallet),
        pin_failed_attempts: Number(wallet?.pin_failed_attempts || 0),
        pin_locked_until: wallet?.pin_locked_until || null,
        pin_updated_at: wallet?.pin_updated_at || null,
        policy: getWalletPinPolicy(),
      },
    });
  } catch (error) {
    logger.error(`[walletV2] pin/status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Erreur lors du chargement du statut PIN' });
  }
});

/**
 * POST /api/v2/wallet/pin/setup
 */
router.post('/pin/setup', verifyJWT, async (req, res) => {
  try {
    const { pin, confirm_pin, confirmPin } = req.body || {};
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (typeof pin !== 'string' || typeof confirmPinValue !== 'string') {
      res.status(400).json({ success: false, error: 'pin et confirm_pin requis' });
      return;
    }
    if (pin !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Les deux codes PIN ne correspondent pas' });
      return;
    }

    await setupWalletPin(req.user.id, pin);
    res.json({ success: true, message: 'Code PIN configuré avec succès' });
  } catch (error) {
    logger.error(`[walletV2] pin/setup error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors de la configuration du code PIN' });
  }
});

/**
 * POST /api/v2/wallet/pin/change
 */
router.post('/pin/change', verifyJWT, async (req, res) => {
  try {
    const { current_pin, new_pin, confirm_pin, currentPin, newPin, confirmPin } = req.body || {};
    const currentPinValue = current_pin ?? currentPin;
    const newPinValue = new_pin ?? newPin;
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (
      typeof currentPinValue !== 'string' ||
      typeof newPinValue !== 'string' ||
      typeof confirmPinValue !== 'string'
    ) {
      res.status(400).json({ success: false, error: 'current_pin, new_pin et confirm_pin requis' });
      return;
    }
    if (newPinValue !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Le nouveau code PIN et sa confirmation ne correspondent pas' });
      return;
    }

    await changeWalletPin(req.user.id, currentPinValue, newPinValue);
    res.json({ success: true, message: 'Code PIN modifié avec succès' });
  } catch (error) {
    logger.error(`[walletV2] pin/change error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors du changement du code PIN' });
  }
});

/**
 * POST /api/v2/wallet/pin/reset
 */
router.post('/pin/reset', verifyJWT, async (req, res) => {
  try {
    const { account_password, new_pin, confirm_pin, accountPassword, newPin, confirmPin } = req.body || {};
    const accountPasswordValue = account_password ?? accountPassword;
    const newPinValue = new_pin ?? newPin;
    const confirmPinValue = confirm_pin ?? confirmPin;

    if (
      typeof accountPasswordValue !== 'string' ||
      typeof newPinValue !== 'string' ||
      typeof confirmPinValue !== 'string'
    ) {
      res.status(400).json({ success: false, error: 'account_password, new_pin et confirm_pin requis' });
      return;
    }
    if (newPinValue !== confirmPinValue) {
      res.status(400).json({ success: false, error: 'Le nouveau code PIN et sa confirmation ne correspondent pas' });
      return;
    }

    await resetWalletPinWithPassword(
      req.user.id,
      req.user?.email || null,
      accountPasswordValue,
      newPinValue
    );
    res.json({ success: true, message: 'Code PIN réinitialisé avec succès' });
  } catch (error) {
    logger.error(`[walletV2] pin/reset error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message || 'Erreur lors de la réinitialisation du code PIN' });
  }
});

export default router;
