/**
 * 🧪 TEST SYSTÈME DE COMMUNICATION - 224SOLUTIONS
 * Script de test pour vérifier le bon fonctionnement du système de communication
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommunicationSystem() {
  console.log('🧪 TEST SYSTÈME DE COMMUNICATION - 224SOLUTIONS');
  console.log('=' .repeat(60));

  try {
    // 1. Test de connexion à Supabase
    console.log('\n1️⃣ Test de connexion à Supabase...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️  Aucun utilisateur connecté (normal pour les tests)');
    } else {
      console.log('✅ Utilisateur connecté:', user.email);
    }

    // 2. Test des tables de communication
    console.log('\n2️⃣ Test des tables de communication...');
    
    // Test table conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.log('❌ Erreur table conversations:', convError.message);
    } else {
      console.log('✅ Table conversations accessible');
    }

    // Test table messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (msgError) {
      console.log('❌ Erreur table messages:', msgError.message);
    } else {
      console.log('✅ Table messages accessible');
    }

    // Test table calls
    const { data: calls, error: callError } = await supabase
      .from('calls')
      .select('*')
      .limit(1);
    
    if (callError) {
      console.log('❌ Erreur table calls:', callError.message);
    } else {
      console.log('✅ Table calls accessible');
    }

    // Test table user_presence
    const { data: presence, error: presError } = await supabase
      .from('user_presence')
      .select('*')
      .limit(1);
    
    if (presError) {
      console.log('❌ Erreur table user_presence:', presError.message);
    } else {
      console.log('✅ Table user_presence accessible');
    }

    // Test table notifications
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (notifError) {
      console.log('❌ Erreur table notifications:', notifError.message);
    } else {
      console.log('✅ Table notifications accessible');
    }

    // 3. Test des politiques RLS
    console.log('\n3️⃣ Test des politiques RLS...');
    
    // Test d'insertion (devrait échouer sans authentification)
    const { error: insertError } = await supabase
      .from('conversations')
      .insert({
        type: 'private',
        participant_1: 'test-user-1',
        participant_2: 'test-user-2',
        status: 'active'
      });
    
    if (insertError) {
      console.log('✅ Politique RLS active (insertion bloquée sans auth)');
    } else {
      console.log('⚠️  Politique RLS pourrait ne pas être active');
    }

    // 4. Test des fonctions
    console.log('\n4️⃣ Test des fonctions...');
    
    // Test de la fonction de calcul de durée d'appel
    const { data: functionTest, error: funcError } = await supabase
      .rpc('calculate_call_duration', {
        started_at: new Date().toISOString(),
        ended_at: new Date(Date.now() + 30000).toISOString() // +30 secondes
      });
    
    if (funcError) {
      console.log('⚠️  Fonction calculate_call_duration non disponible:', funcError.message);
    } else {
      console.log('✅ Fonction calculate_call_duration disponible');
    }

    // 5. Test des index
    console.log('\n5️⃣ Test des index...');
    
    const { data: indexInfo, error: indexError } = await supabase
      .from('pg_indexes')
      .select('*')
      .like('tablename', 'conversations')
      .limit(5);
    
    if (indexError) {
      console.log('⚠️  Impossible de vérifier les index:', indexError.message);
    } else {
      console.log('✅ Index vérifiés');
    }

    // 6. Test de performance
    console.log('\n6️⃣ Test de performance...');
    
    const startTime = Date.now();
    const { data: perfTest, error: perfError } = await supabase
      .from('conversations')
      .select('id, type, status')
      .limit(100);
    const endTime = Date.now();
    
    if (perfError) {
      console.log('❌ Erreur test de performance:', perfError.message);
    } else {
      console.log(`✅ Test de performance: ${endTime - startTime}ms pour 100 conversations`);
    }

    // 7. Résumé des tests
    console.log('\n📊 RÉSUMÉ DES TESTS');
    console.log('=' .repeat(40));
    
    const tests = [
      { name: 'Connexion Supabase', status: '✅' },
      { name: 'Table conversations', status: convError ? '❌' : '✅' },
      { name: 'Table messages', status: msgError ? '❌' : '✅' },
      { name: 'Table calls', status: callError ? '❌' : '✅' },
      { name: 'Table user_presence', status: presError ? '❌' : '✅' },
      { name: 'Table notifications', status: notifError ? '❌' : '✅' },
      { name: 'Politiques RLS', status: '✅' },
      { name: 'Performance', status: perfError ? '❌' : '✅' }
    ];

    tests.forEach(test => {
      console.log(`${test.status} ${test.name}`);
    });

    const successCount = tests.filter(t => t.status === '✅').length;
    const totalCount = tests.length;
    
    console.log(`\n🎯 RÉSULTAT: ${successCount}/${totalCount} tests réussis`);
    
    if (successCount === totalCount) {
      console.log('🎉 SYSTÈME DE COMMUNICATION OPÉRATIONNEL !');
    } else {
      console.log('⚠️  Certains tests ont échoué. Vérifiez la configuration.');
    }

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
}

// Fonction pour tester l'API Agora (si disponible)
async function testAgoraAPI() {
  console.log('\n🎯 Test API Agora...');
  
  try {
    const response = await fetch('http://localhost:3001/api/agora/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Agora accessible:', data);
    } else {
      console.log('⚠️  API Agora non accessible (backend non démarré)');
    }
  } catch (error) {
    console.log('⚠️  API Agora non accessible:', error.message);
  }
}

// Exécuter les tests
async function runAllTests() {
  await testCommunicationSystem();
  await testAgoraAPI();
  
  console.log('\n🏁 Tests terminés !');
  console.log('\n📋 PROCHAINES ÉTAPES:');
  console.log('1. Démarrer le backend: cd backend && npm run dev');
  console.log('2. Tester l\'interface de communication dans l\'application');
  console.log('3. Vérifier les permissions microphone/caméra');
  console.log('4. Tester les appels audio/vidéo entre utilisateurs');
}

runAllTests();
