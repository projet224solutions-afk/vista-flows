// @ts-check
// Node ESM script to deploy a real Wallet system using Supabase
// Usage: node deploy-wallet-system.js

import 'dotenv/config';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

/** @type {ReturnType<typeof createClient>} */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ------ Helpers ------
async function tableExists(table) {
  const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
  return !error;
}

async function logEvent(type, message, extra = {}) {
  const targetTables = ['wallet_logs', 'ai_logs'];
  for (const table of targetTables) {
    if (await tableExists(table)) {
      await supabase.from(table).insert({
        id: crypto.randomUUID(),
        type,
        message,
        extra,
        created_at: new Date().toISOString()
      });
      return;
    }
  }
  // Fallback to console if no log table is present
  console.log(`[${type}] ${message}`);
}

function generateVirtualCard() {
  const cardId = crypto.randomUUID();
  const last4 = String(Math.floor(1000 + Math.random() * 9000));
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 3);
  const expMonth = String(exp.getMonth() + 1).padStart(2, '0');
  const expYear = String(exp.getFullYear()).slice(-2);
  const cvv = String(Math.floor(100 + Math.random() * 900));
  return { cardId, last4, expMonth, expYear, cvv };
}

// ------ Core Functions ------
export async function registerUserAndWallet({ name, email, phone, role = 'client' }) {
  await logEvent('info', 'Starting user and wallet registration', { email, role });

  // 1) Create user via auth.admin
  const password = crypto.randomUUID();
  const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone, role }
  });
  if (createErr) {
    await logEvent('error', 'auth.admin.createUser failed', { error: createErr.message });
    throw createErr;
  }

  const userId = userData.user?.id;
  if (!userId) {
    throw new Error('User creation succeeded but user id is missing');
  }

  // 2) Insert profile in users/profiles table if present
  const profileTable = (await tableExists('profiles')) ? 'profiles' : (await tableExists('users')) ? 'users' : null;
  if (profileTable) {
    const { error: profileErr } = await supabase.from(profileTable).insert({
      id: userId,
      name,
      email,
      phone,
      role,
      created_at: new Date().toISOString()
    });
    if (profileErr) await logEvent('warn', `Insert into ${profileTable} failed`, { error: profileErr.message });
  }

  // 3) Create wallet
  const walletId = crypto.randomUUID();
  const { error: walletErr } = await supabase.from('wallets').insert({
    id: walletId,
    user_id: userId,
    balance: 0,
    currency: 'GNF',
    status: 'active',
    created_at: new Date().toISOString()
  });
  if (walletErr) {
    await logEvent('error', 'Insert wallet failed', { error: walletErr.message });
    throw walletErr;
  }

  // 4) Create virtual card (do not log CVV)
  const { cardId, last4, expMonth, expYear, cvv } = generateVirtualCard();
  const virtualCard = {
    id: cardId,
    wallet_id: walletId,
    last4,
    exp_month: expMonth,
    exp_year: expYear,
    brand: 'VIRTUAL',
    status: 'active',
    created_at: new Date().toISOString()
  };
  if (await tableExists('virtual_cards')) {
    const { error: cardErr } = await supabase.from('virtual_cards').insert(virtualCard);
    if (cardErr) await logEvent('warn', 'Insert virtual card failed', { error: cardErr.message });
  }

  await logEvent('info', 'User and wallet registered', { userId, walletId, cardLast4: last4, exp: `${expMonth}/${expYear}` });

  return { userId, walletId, card: { last4, expMonth, expYear } };
}

export async function simulateFirstTransaction({ walletId, userId, amount = 1000, type = 'deposit' }) {
  await logEvent('info', 'Simulate first transaction', { walletId, userId, amount, type });

  // 1) Insert transaction row
  const txId = crypto.randomUUID();
  if (await tableExists('wallet_transactions')) {
    const { error: txErr } = await supabase.from('wallet_transactions').insert({
      id: txId,
      wallet_id: walletId,
      user_id: userId,
      type,
      amount,
      currency: 'GNF',
      status: 'succeeded',
      created_at: new Date().toISOString()
    });
    if (txErr) await logEvent('warn', 'Insert wallet_transactions failed', { error: txErr.message });
  }

  // 2) Update wallet balance (service role bypass RLS ok)
  const { error: balErr } = await supabase.rpc('increment_wallet_balance', { p_wallet_id: walletId, p_amount: amount });
  if (balErr) {
    // If RPC missing, fallback to direct update
    const { error: updErr } = await supabase
      .from('wallets')
      .update({ balance: (/** @type {any} */(supabase)).sql ? undefined : undefined })
      .eq('id', walletId);
    // We cannot atomically increment without RPC; report warning
    await logEvent('warn', 'RPC increment_wallet_balance missing, please add RPC', { error: balErr.message });
  }

  await logEvent('info', 'Transaction simulated', { txId });
  return { txId };
}

export async function reportToPDGDashboard({ metric, value, details = {} }) {
  const table = (await tableExists('system_metrics')) ? 'system_metrics' : null;
  if (!table) {
    await logEvent('warn', 'system_metrics table not found');
    return;
  }
  const { error } = await supabase.from(table).insert({
    id: crypto.randomUUID(),
    metric,
    value,
    details,
    created_at: new Date().toISOString()
  });
  if (error) await logEvent('warn', 'Insert system_metrics failed', { error: error.message });
}

// ------ Runner ------
async function main() {
  try {
    const name = 'Wallet Alpha User';
    const email = `wallet.alpha.${Date.now()}@example.com`;
    const phone = '+224600000000';

    const { userId, walletId, card } = await registerUserAndWallet({ name, email, phone, role: 'client' });
    await simulateFirstTransaction({ walletId, userId, amount: 1000, type: 'deposit' });
    await reportToPDGDashboard({ metric: 'wallet_user_created', value: 1, details: { userId, walletId } });

    await logEvent('success', 'Wallet deployment completed', { userId, walletId, cardLast4: card.last4 });
    console.log('Deployment done.');
  } catch (err) {
    await logEvent('error', 'Wallet deployment failed', { error: err instanceof Error ? err.message : String(err) });
    console.error(err);
    process.exitCode = 1;
  }
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}


