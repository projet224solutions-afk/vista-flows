require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001/api';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables manquantes: SUPABASE_URL et SUPABASE_KEY/SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testWallet(userId) {
  console.log('🔹 Test Wallet...');
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('❌ Wallet Error:', error.message);
    return false;
  }
  console.log('✅ Wallet:', data.balance, data.currency);
  return true;
}

async function testVirtualCard(userId) {
  console.log('🔹 Test Carte Virtuelle...');
  const { data, error } = await supabase
    .from('virtual_cards')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error('❌ Virtual Card Error:', error?.message || 'Aucune carte trouvée');
    return false;
  }
  console.log('✅ Carte Active:', String(data.card_number).slice(-4));
  return true;
}

async function testTransactions(userId, recipientId, amount) {
  console.log('🔹 Test Transaction P2P...');
  try {
    const res = await axios.post(`${BACKEND_API_URL}/transactions`, {
      from: userId,
      to: recipientId,
      amount
    });
    console.log('✅ Transaction effectuée:', res.data);
    return true;
  } catch (err) {
    console.error('❌ Transaction Error:', err.response?.data || err.message);
    return false;
  }
}

async function testPOS(userId) {
  console.log('🔹 Test POS...');
  const { data, error } = await supabase
    .from('pos_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ POS Error:', error.message);
    return false;
  }
  console.log('✅ POS Settings:', data);
  return true;
}

(async () => {
  const testUserId = process.env.TEST_VENDOR_USER_ID || '<id-vendeur-test>';
  const recipientId = process.env.TEST_VENDOR_RECIPIENT_ID || '<id-autre-vendeur-test>';
  const amount = Number(process.env.TEST_VENDOR_AMOUNT || 1000);

  const walletOk = await testWallet(testUserId);
  const cardOk = await testVirtualCard(testUserId);
  const transactionOk = await testTransactions(testUserId, recipientId, amount);
  const posOk = await testPOS(testUserId);

  if (walletOk && cardOk && transactionOk && posOk) {
    console.log('🎉 Tous les tests passent ✅');
    process.exit(0);
  } else {
    console.log('⚠️ Certains tests ont échoué ❌');
    process.exit(1);
  }
})();
