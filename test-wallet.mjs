/**
 * 🔎 Test rapide des endpoints Wallet
 * Utilisation:
 *   BACKEND_URL=http://localhost:3001 AUTH_TOKEN=... node test-wallet.mjs
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ AUTH_TOKEN manquant. Exportez un token JWT utilisateur (Authorization Bearer).');
  process.exit(1);
}

async function api(path, options = {}) {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

(async () => {
  try {
    console.log(`\n🚀 Test Wallet sur ${BACKEND_URL}`);

    // 1) Solde
    const balance = await api('/api/wallet/balance');
    console.log('\n[GET] /api/wallet/balance →', balance.status, balance.json);

    // 2) Dépôt (10.000 GNF)
    const deposit = await api('/api/wallet/deposit', {
      method: 'POST',
      body: {
        amount: 10000,
        paymentMethod: 'mobile_money',
        reference: `TEST_${Date.now()}`
      }
    });
    console.log('\n[POST] /api/wallet/deposit →', deposit.status, deposit.json);

    // 3) Retrait (5.000 GNF minimum selon la route)
    const withdraw = await api('/api/wallet/withdraw', {
      method: 'POST',
      body: {
        amount: 5000,
        paymentMethod: 'mobile_money',
        paymentDetails: { provider: 'orange_money', phone: '620000000' }
      }
    });
    console.log('\n[POST] /api/wallet/withdraw →', withdraw.status, withdraw.json);

    // 4) Historique
    const txs = await api('/api/wallet/transactions');
    console.log('\n[GET] /api/wallet/transactions →', txs.status, Array.isArray(txs.json?.transactions) ? `${txs.json.transactions.length} transactions` : txs.json);

    console.log('\n✅ Test Wallet terminé');
  } catch (err) {
    console.error('❌ Erreur test Wallet:', err.message);
    process.exit(1);
  }
})();


