/**
 * 🧪 TESTS RAPIDES CORRECTIONS WALLET TRANSFER
 * À exécuter dans la console DevTools ou Node.js
 * 224Solutions - 8 janvier 2026
 */

// =====================================================
// CONFIGURATION
// =====================================================
const SUPABASE_URL = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/wallet-transfer`;

console.log('🧪 Tests Corrections Wallet Transfer');
console.log('=====================================\n');

// =====================================================
// TEST 1: CORS RESTRICTIF
// =====================================================
async function testCORS() {
  console.log('Test 1: CORS Restrictif');
  console.log('------------------------');
  
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_id: 'test-sender',
        receiver_id: 'test-receiver',
        amount: 1000
      })
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    
    if (corsHeader === '*') {
      console.log('❌ ÉCHEC: CORS encore ouvert (*)');
      return false;
    } else if (corsHeader && corsHeader.includes('224solution.net')) {
      console.log('✅ SUCCÈS: CORS restrictif actif');
      console.log(`   Origin autorisé: ${corsHeader}`);
      return true;
    } else {
      console.log('⚠️  ATTENTION: CORS header inattendu:', corsHeader);
      return false;
    }
  } catch (error) {
    if (error.message.includes('CORS')) {
      console.log('✅ SUCCÈS: CORS bloque la requête (normal si non autorisé)');
      return true;
    }
    console.log('❌ ERREUR:', error.message);
    return false;
  }
}

// =====================================================
// TEST 2: AUTHENTIFICATION PREVIEW
// =====================================================
async function testAuthPreview() {
  console.log('\nTest 2: Authentification Preview');
  console.log('----------------------------------');
  
  try {
    const response = await fetch(`${FUNCTION_URL}?action=preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pas d'auth header
      },
      body: JSON.stringify({
        sender_id: 'test-sender',
        receiver_id: 'test-receiver',
        amount: 1000
      })
    });
    
    const data = await response.json();
    
    if (data.error && data.error.includes('Authentification')) {
      console.log('✅ SUCCÈS: Preview nécessite authentification');
      console.log(`   Message: ${data.error}`);
      return true;
    } else if (data.success) {
      console.log('❌ ÉCHEC: Preview accessible sans auth');
      return false;
    } else {
      console.log('⚠️  ATTENTION: Réponse inattendue:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ ERREUR:', error.message);
    return false;
  }
}

// =====================================================
// TEST 3: LIMITES MONTANTS (avec auth simulée)
// =====================================================
async function testLimits(authToken) {
  console.log('\nTest 3: Limites Montants');
  console.log('-------------------------');
  
  if (!authToken) {
    console.log('⚠️  SKIP: Token auth requis pour ce test');
    console.log('   Utilisez: testLimits("votre-token-supabase")');
    return false;
  }
  
  // Test montant trop petit
  console.log('   Test 3a: Montant < 100 GNF...');
  try {
    const response1 = await fetch(`${FUNCTION_URL}?action=transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        sender_id: 'test-sender',
        receiver_id: 'test-receiver',
        amount: 50 // Trop petit
      })
    });
    
    const data1 = await response1.json();
    
    if (data1.error && data1.error.includes('Montant minimum')) {
      console.log('   ✅ Montant minimum validé');
    } else {
      console.log('   ❌ Montant minimum non validé');
    }
  } catch (error) {
    console.log('   ❌ Erreur test min:', error.message);
  }
  
  // Test montant trop grand
  console.log('   Test 3b: Montant > 50M GNF...');
  try {
    const response2 = await fetch(`${FUNCTION_URL}?action=transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        sender_id: 'test-sender',
        receiver_id: 'test-receiver',
        amount: 100000000 // Trop grand
      })
    });
    
    const data2 = await response2.json();
    
    if (data2.error && data2.error.includes('Montant maximum')) {
      console.log('   ✅ Montant maximum validé');
      return true;
    } else {
      console.log('   ❌ Montant maximum non validé');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erreur test max:', error.message);
    return false;
  }
}

// =====================================================
// TEST 4: WALLET SERVICE DÉSACTIVÉ (Frontend)
// =====================================================
function testWalletServiceDisabled() {
  console.log('\nTest 4: walletService.transferFunds() Désactivé');
  console.log('------------------------------------------------');
  
  // Ce test doit être exécuté dans le contexte de l'app
  console.log('⚠️  Ce test nécessite le contexte de l\'application');
  console.log('   À tester manuellement:');
  console.log('   ```javascript');
  console.log('   import walletService from "@/services/walletService";');
  console.log('   try {');
  console.log('     await walletService.transferFunds("w1", "w2", 1000, "test");');
  console.log('   } catch (e) {');
  console.log('     console.log(e.message); // "Cette méthode est désactivée"');
  console.log('   }');
  console.log('   ```');
  
  return null;
}

// =====================================================
// TEST 5: VÉRIFICATION SQL (à exécuter dans Supabase)
// =====================================================
function testSQLVerification() {
  console.log('\nTest 5: Vérification SQL');
  console.log('-------------------------');
  
  console.log('⚠️  Exécutez ces requêtes SQL dans Supabase Dashboard:');
  console.log('');
  console.log('-- Vérifier RLS activée');
  console.log(`SELECT tablename, rowsecurity FROM pg_tables`);
  console.log(`WHERE tablename IN ('wallet_transfers', 'wallet_transactions');`);
  console.log('');
  console.log('-- Vérifier policies');
  console.log(`SELECT tablename, policyname FROM pg_policies`);
  console.log(`WHERE tablename = 'wallet_transfers';`);
  console.log('');
  console.log('-- Vérifier contrainte montants');
  console.log(`SELECT constraint_name, check_clause`);
  console.log(`FROM information_schema.check_constraints`);
  console.log(`WHERE constraint_name LIKE '%transfer_amount%';`);
  console.log('');
  console.log('-- Vérifier vue user_wallet_transfers');
  console.log(`SELECT column_name FROM information_schema.columns`);
  console.log(`WHERE table_name = 'user_wallet_transfers';`);
  
  return null;
}

// =====================================================
// EXÉCUTION DES TESTS
// =====================================================
async function runAllTests(authToken = null) {
  console.log('🚀 Démarrage des tests...\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Test 1: CORS
  results.total++;
  const test1 = await testCORS();
  if (test1 === true) results.passed++;
  else if (test1 === false) results.failed++;
  else results.skipped++;
  
  // Test 2: Auth Preview
  results.total++;
  const test2 = await testAuthPreview();
  if (test2 === true) results.passed++;
  else if (test2 === false) results.failed++;
  else results.skipped++;
  
  // Test 3: Limites (nécessite auth)
  if (authToken) {
    results.total++;
    const test3 = await testLimits(authToken);
    if (test3 === true) results.passed++;
    else if (test3 === false) results.failed++;
    else results.skipped++;
  } else {
    console.log('\nTest 3: SKIP (token requis)');
    results.total++;
    results.skipped++;
  }
  
  // Test 4: Wallet Service (manuel)
  testWalletServiceDisabled();
  results.total++;
  results.skipped++;
  
  // Test 5: SQL (manuel)
  testSQLVerification();
  results.total++;
  results.skipped++;
  
  // Résumé
  console.log('\n=====================================');
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('=====================================');
  console.log(`Total:   ${results.total}`);
  console.log(`✅ Réussis: ${results.passed}`);
  console.log(`❌ Échoués: ${results.failed}`);
  console.log(`⚠️  Sautés:  ${results.skipped}`);
  console.log('');
  
  if (results.failed === 0) {
    console.log('🎉 Tous les tests automatiques ont réussi!');
    console.log('');
    console.log('📋 Actions suivantes:');
    console.log('   1. Exécuter les tests manuels (4 & 5)');
    console.log('   2. Tester un vrai transfert en dev');
    console.log('   3. Vérifier les logs Edge Functions');
    console.log('   4. Surveiller les erreurs 24-48h');
  } else {
    console.log('⚠️  Certains tests ont échoué. Vérifiez le déploiement.');
  }
  
  return results;
}

// =====================================================
// EXPORTS / USAGE
// =====================================================

// Usage dans DevTools Console:
// runAllTests();
// 
// Avec auth token:
// runAllTests("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...");

// Export pour Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testCORS,
    testAuthPreview,
    testLimits,
    testWalletServiceDisabled,
    testSQLVerification
  };
}

// Auto-run si dans DevTools
if (typeof window !== 'undefined') {
  console.log('💡 Pour exécuter tous les tests:');
  console.log('   runAllTests()');
  console.log('');
  console.log('💡 Avec token auth (pour test limites):');
  console.log('   runAllTests("votre-token-supabase")');
}
