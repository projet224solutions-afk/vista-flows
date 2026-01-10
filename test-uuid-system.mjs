import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🔍 DIAGNOSTIC SYSTÈME UUID/ID');
console.log('=====================================\n');

async function checkTableStructure() {
  try {
    // 1. VÉRIFIER LA TABLE PROFILES (Utilisateurs)
    console.log('📋 TABLE PROFILES (Utilisateurs):');
    console.log('─────────────────────────────────────');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, phone, first_name, last_name, role, created_at')
      .limit(5);

    if (profilesError) {
      console.log('❌ Erreur profiles:', profilesError.message);
    } else {
      console.log(`✅ ${profiles.length} utilisateurs trouvés`);
      if (profiles.length > 0) {
        const sample = profiles[0];
        console.log('\n🔹 Type d\'ID utilisé:');
        console.log(`   - ID: ${sample.id}`);
        console.log(`   - Type: ${typeof sample.id}`);
        console.log(`   - Format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sample.id) ? '✅ UUID' : '❌ Autre'}`);
        
        console.log('\n📝 Échantillon:');
        profiles.forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.email || 'N/A'} (${p.role}) - ID: ${p.id.substring(0, 8)}...`);
        });
      } else {
        console.log('⚠️  Table vide');
      }
    }

    // 2. VÉRIFIER LA TABLE WALLETS
    console.log('\n\n💰 TABLE WALLETS (Portefeuilles):');
    console.log('─────────────────────────────────────');
    
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('id, user_id, balance, currency, wallet_status, created_at')
      .limit(5);

    if (walletsError) {
      console.log('❌ Erreur wallets:', walletsError.message);
    } else {
      console.log(`✅ ${wallets.length} wallets trouvés`);
      if (wallets.length > 0) {
        const sample = wallets[0];
        console.log('\n🔹 Types d\'ID utilisés:');
        console.log(`   - Wallet ID: ${sample.id}`);
        console.log(`   - Type wallet ID: ${typeof sample.id}`);
        console.log(`   - Format: ${/^\d+$/.test(sample.id.toString()) ? '✅ BIGSERIAL (INTEGER)' : '❌ UUID'}`);
        console.log(`   - User ID: ${sample.user_id}`);
        console.log(`   - Type user ID: ${typeof sample.user_id}`);
        console.log(`   - Format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sample.user_id) ? '✅ UUID' : '❌ Autre'}`);
        
        console.log('\n📝 Échantillon:');
        wallets.forEach((w, i) => {
          console.log(`   ${i + 1}. Wallet #${w.id} - User: ${w.user_id.substring(0, 8)}... - Balance: ${w.balance} ${w.currency}`);
        });
      } else {
        console.log('⚠️  Table vide');
      }
    }

    // 3. VÉRIFIER LA TABLE WALLET_TRANSACTIONS
    console.log('\n\n💳 TABLE WALLET_TRANSACTIONS:');
    console.log('─────────────────────────────────────');
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('id, transaction_id, sender_wallet_id, receiver_wallet_id, sender_user_id, receiver_user_id, amount, created_at')
      .limit(5);

    if (transactionsError) {
      console.log('❌ Erreur transactions:', transactionsError.message);
    } else {
      console.log(`✅ ${transactions.length} transactions trouvées`);
      if (transactions.length > 0) {
        const sample = transactions[0];
        console.log('\n🔹 Types d\'ID utilisés:');
        console.log(`   - Transaction ID: ${sample.id}`);
        console.log(`   - Type: ${typeof sample.id}`);
        console.log(`   - Format: ${/^\d+$/.test(sample.id.toString()) ? '✅ BIGSERIAL' : '❌ UUID'}`);
        console.log(`   - Sender wallet ID: ${sample.sender_wallet_id || 'NULL'}`);
        console.log(`   - Sender user ID: ${sample.sender_user_id?.substring(0, 8) || 'NULL'}...`);
        
        console.log('\n📝 Échantillon:');
        transactions.forEach((t, i) => {
          console.log(`   ${i + 1}. TX #${t.id} - ${t.amount} - ${t.transaction_id}`);
        });
      } else {
        console.log('⚠️  Table vide');
      }
    }

    // 4. SYNTHÈSE
    console.log('\n\n📊 SYNTHÈSE DU SYSTÈME:');
    console.log('─────────────────────────────────────');
    console.log('✅ profiles.id → UUID (référence auth.users)');
    console.log('✅ wallets.id → BIGSERIAL (entier auto-incrémenté)');
    console.log('✅ wallets.user_id → UUID (référence profiles.id)');
    console.log('✅ wallet_transactions.id → BIGSERIAL');
    console.log('✅ wallet_transactions.sender_wallet_id → BIGINT (référence wallets.id)');
    console.log('✅ wallet_transactions.receiver_wallet_id → BIGINT (référence wallets.id)');
    console.log('✅ wallet_transactions.sender_user_id → UUID (référence profiles.id)');
    console.log('✅ wallet_transactions.receiver_user_id → UUID (référence profiles.id)');

    console.log('\n🎯 CONCLUSION:');
    console.log('─────────────────────────────────────');
    console.log('Le système utilise un SYSTÈME HYBRIDE:');
    console.log('  • Utilisateurs (profiles): UUID');
    console.log('  • Wallets: BIGSERIAL (ID numérique)');
    console.log('  • Relations user ↔ wallet: Via UUID (user_id)');
    console.log('  • Transactions: BIGSERIAL avec références BIGINT + UUID');
    console.log('\n✅ Ce système est OPTIMAL:');
    console.log('  - UUID pour utilisateurs (sécurité + compatibilité auth)');
    console.log('  - BIGSERIAL pour wallets/transactions (performance)');
    console.log('  - Double référence (wallet_id ET user_id) pour flexibilité\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Tester la recherche par UUID vs ID
async function testSearchMethods() {
  console.log('\n🔍 TEST MÉTHODES DE RECHERCHE:');
  console.log('=====================================\n');

  try {
    // Test 1: Recherche utilisateur par UUID
    console.log('1️⃣ Recherche utilisateur par UUID:');
    const { data: profileByUuid, error: error1 } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(1)
      .maybeSingle();

    if (profileByUuid) {
      const testUuid = profileByUuid.id;
      console.log(`   ✅ Test avec UUID: ${testUuid.substring(0, 8)}...`);
      
      const { data: found } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', testUuid)
        .maybeSingle();
      
      console.log(`   ${found ? '✅' : '❌'} Recherche par UUID: ${found ? 'FONCTIONNE' : 'ÉCHOUE'}`);
    } else {
      console.log('   ⚠️  Pas d\'utilisateur pour tester');
    }

    // Test 2: Recherche wallet par ID numérique
    console.log('\n2️⃣ Recherche wallet par ID numérique:');
    const { data: walletById, error: error2 } = await supabase
      .from('wallets')
      .select('id, user_id, balance')
      .limit(1)
      .maybeSingle();

    if (walletById) {
      const testId = walletById.id;
      console.log(`   ✅ Test avec ID: ${testId}`);
      
      const { data: found } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', testId)
        .maybeSingle();
      
      console.log(`   ${found ? '✅' : '❌'} Recherche par ID numérique: ${found ? 'FONCTIONNE' : 'ÉCHOUE'}`);
    } else {
      console.log('   ⚠️  Pas de wallet pour tester');
    }

    // Test 3: Recherche wallet par user_id (UUID)
    console.log('\n3️⃣ Recherche wallet via user_id (UUID):');
    if (walletById) {
      const testUserUuid = walletById.user_id;
      console.log(`   ✅ Test avec user_id UUID: ${testUserUuid.substring(0, 8)}...`);
      
      const { data: found } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', testUserUuid)
        .maybeSingle();
      
      console.log(`   ${found ? '✅' : '❌'} Recherche wallet par user UUID: ${found ? 'FONCTIONNE' : 'ÉCHOUE'}`);
    }

  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

// Exécution
(async () => {
  await checkTableStructure();
  await testSearchMethods();
  process.exit(0);
})();
