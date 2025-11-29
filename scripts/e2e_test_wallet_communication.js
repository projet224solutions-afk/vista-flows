/**
 * Script E2E pour tester:
 *  - application de la RPC `rpc_create_user_wallet`
 *  - création automatique de `user_ids` et `wallets` (trigger)
 *  - insertion de message direct (flow communication)
 *
 * Prérequis:
 *  - Avoir `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans le `.env`
 *  - npm install @supabase/supabase-js dotenv
 *
 * Usage:
 *  node scripts/e2e_test_wallet_communication.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function run() {
  console.log('🔬 Starting E2E test (will create a test user)');

  // 1) Resolve two existing users to run the test with (do NOT create users)
  const ENV_USER_ID = process.env.TEST_USER_ID;
  const ENV_OTHER_USER_ID = process.env.TEST_OTHER_USER_ID;
  const ENV_USER_EMAIL = process.env.TEST_USER_EMAIL;
  const ENV_OTHER_USER_EMAIL = process.env.TEST_OTHER_USER_EMAIL;

  let userId;
  let otherUserId;

  if (ENV_USER_ID && ENV_OTHER_USER_ID) {
    userId = ENV_USER_ID;
    otherUserId = ENV_OTHER_USER_ID;
    console.log('ℹ️ Using user IDs from env:', userId, otherUserId);
  } else {
    // listUsers requires service role; we use it to find existing users
    const { data: userListRes, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.error('❌ Failed to list users. Provide TEST_USER_ID and TEST_OTHER_USER_ID in .env', listErr);
      process.exit(1);
    }

    const users = userListRes.users || userListRes;
    if (!users || users.length < 2) {
      console.error('❌ Not enough existing users found. Provide TEST_USER_ID and TEST_OTHER_USER_ID in .env');
      process.exit(1);
    }

    if (ENV_USER_EMAIL) {
      const found = users.find(u => u.email === ENV_USER_EMAIL);
      if (!found) {
        console.error('❌ No user found with TEST_USER_EMAIL:', ENV_USER_EMAIL);
        process.exit(1);
      }
      userId = found.id;
    }

    if (ENV_OTHER_USER_EMAIL) {
      const found2 = users.find(u => u.email === ENV_OTHER_USER_EMAIL);
      if (!found2) {
        console.error('❌ No user found with TEST_OTHER_USER_EMAIL:', ENV_OTHER_USER_EMAIL);
        process.exit(1);
      }
      otherUserId = found2.id;
    }

    // fallback: pick first two distinct users
    if (!userId || !otherUserId) {
      const distinct = users.slice(0, 2);
      userId = userId || distinct[0].id;
      otherUserId = otherUserId || distinct[1].id;
      console.log('ℹ️ Using existing users from auth list:', userId, otherUserId);
    }
  }

  // 2) Call RPC to create/return wallet for the chosen user
  const { data: walletData, error: rpcErr } = await supabase.rpc('rpc_create_user_wallet', { p_user_id: userId });
  if (rpcErr) {
    console.error('❌ RPC rpc_create_user_wallet failed:', rpcErr);
    process.exit(1);
  }
  console.log('✅ rpc_create_user_wallet returned:', walletData);

  // 3) Check user_ids entry
  const { data: ids } = await supabase
    .from('user_ids')
    .select('*')
    .eq('user_id', userId);

  console.log('🔎 user_ids for test user:', ids);

  // 4) Insert a direct message to verify communication flow (use existing otherUserId)
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      sender_id: userId,
      recipient_id: otherUserId,
      content: 'E2E test message',
      type: 'text',
      status: 'sent'
    })
    .select()
    .single();

  if (msgErr) {
    console.error('❌ Failed to insert message:', msgErr);
    process.exit(1);
  }

  console.log('✅ Message inserted:', msg.id);

  // Done
  console.log('🎉 E2E test completed successfully');
}

run().catch(err => {
  console.error('Fatal error in E2E test:', err);
  process.exit(1);
});
