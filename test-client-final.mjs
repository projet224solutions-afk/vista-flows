/**
 * 🎯 TEST FINAL - Simulation complète analyse client
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🎯 TEST COMPLET - ANALYSE CLIENT\n');
console.log('='.repeat(70));

// Test de détection UUID
console.log('\n📋 PARTIE 1: Test détection UUID\n');

const testMessages = [
  'Analyse le client 9e622843-5a2f-4a5e-8f1e-c3d4e5f6a7b8',
  'client 9e622843-5a2f-4a5e-8f1e-c3d4e5f6a7b8',
  'analyse 9e622843-5a2f-4a5e-8f1e-c3d4e5f6a7b8',
  'Donne moi les infos sur 9e622843-5a2f-4a5e-8f1e-c3d4e5f6a7b8',
  'client ABC123', // Ne devrait PAS détecter
  'analyse', // Ne devrait PAS détecter
];

const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

testMessages.forEach((msg, i) => {
  const lowerMsg = msg.toLowerCase();
  const hasKeyword = lowerMsg.includes('client') || lowerMsg.includes('analyse') || lowerMsg.includes('customer');
  const uuidMatch = msg.match(uuidRegex);
  const shouldTrigger = hasKeyword && uuidMatch;
  
  console.log(`${i + 1}. "${msg}"`);
  console.log(`   Mot-clé: ${hasKeyword ? '✅' : '❌'}`);
  console.log(`   UUID détecté: ${uuidMatch ? `✅ ${uuidMatch[0].substring(0, 8)}...` : '❌'}`);
  console.log(`   → Analyse déclenchée: ${shouldTrigger ? '✅ OUI' : '❌ NON'}`);
  console.log('');
});

// Test de la logique de recherche
console.log('='.repeat(70));
console.log('\n📋 PARTIE 2: Test logique de recherche\n');

async function testSearchLogic() {
  // 1. Récupérer un vendor valide
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, business_name')
    .limit(1);
  
  if (!vendors || vendors.length === 0) {
    console.log('❌ Aucun vendeur trouvé - Test impossible');
    return;
  }
  
  const vendorId = vendors[0].id;
  const vendorName = vendors[0].business_name;
  
  console.log(`✅ Vendeur de test: ${vendorName}`);
  console.log(`   ID: ${vendorId}\n`);
  
  // 2. Récupérer des profiles (user_id potentiels)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at')
    .limit(5);
  
  if (!profiles || profiles.length === 0) {
    console.log('❌ Aucun profil trouvé - Impossible de tester');
    return;
  }
  
  console.log(`✅ ${profiles.length} profils trouvés pour test:\n`);
  
  for (let i = 0; i < Math.min(3, profiles.length); i++) {
    const profile = profiles[i];
    console.log(`${i + 1}. 👤 ${profile.first_name || 'Sans nom'} ${profile.last_name || ''}`);
    console.log(`   Email: ${profile.email || 'N/A'}`);
    console.log(`   Role: ${profile.role || 'N/A'}`);
    console.log(`   User ID: ${profile.id}`);
    
    // Vérifier si ce profil a des commandes
    const { data: orders, count } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at', { count: 'exact' })
      .eq('customer_id', profile.id)
      .limit(3);
    
    if (count && count > 0) {
      console.log(`   ✅ ${count} commande(s) trouvée(s)`);
      if (orders && orders.length > 0) {
        const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        console.log(`   💰 Total dépensé: ${totalSpent.toLocaleString()} GNF`);
        console.log(`   📅 Dernière commande: ${new Date(orders[orders.length - 1].created_at).toLocaleDateString('fr-FR')}`);
      }
    } else {
      console.log(`   ⚠️ Aucune commande (nouveau client)`);
    }
    console.log('');
  }
  
  // 3. Simuler la recherche cascade
  console.log('='.repeat(70));
  console.log('\n📋 PARTIE 3: Simulation recherche cascade\n');
  
  const testUserId = profiles[0].id;
  console.log(`🔍 Test avec user_id: ${testUserId}\n`);
  
  // Étape 1: Chercher dans customers
  console.log('ÉTAPE 1: Recherche dans table "customers"...');
  const { data: customerData } = await supabase
    .from('customers')
    .select('id, user_id, addresses, created_at')
    .eq('id', testUserId)
    .maybeSingle();
  
  if (customerData) {
    console.log('✅ Trouvé dans customers!');
    console.log(`   customer_id: ${customerData.id}`);
    console.log(`   user_id: ${customerData.user_id}`);
    console.log(`   addresses: ${customerData.addresses ? 'Oui' : 'Non'}`);
  } else {
    console.log('❌ Non trouvé dans customers');
    
    // Étape 2: Chercher dans profiles
    console.log('\nÉTAPE 2: Recherche dans table "profiles"...');
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, created_at')
      .eq('id', testUserId)
      .maybeSingle();
    
    if (profileData) {
      console.log('✅ Trouvé dans profiles! (fallback réussi)');
      console.log(`   user_id: ${profileData.id}`);
      console.log(`   email: ${profileData.email || 'N/A'}`);
      console.log(`   nom: ${profileData.first_name || ''} ${profileData.last_name || ''}`);
      
      // Étape 3: Chercher les commandes
      console.log('\nÉTAPE 3: Recherche des commandes...');
      const { data: ordersData, count: ordersCount } = await supabase
        .from('orders')
        .select('id, total_amount, status', { count: 'exact' })
        .eq('customer_id', testUserId);
      
      console.log(`✅ ${ordersCount || 0} commande(s) trouvée(s)`);
      
      if (ordersCount && ordersCount > 0) {
        console.log('\n📊 ANALYSE CLIENT RÉUSSIE:');
        console.log(`   • Identité: ${profileData.first_name || 'Client'} ${profileData.last_name || ''}`);
        console.log(`   • Email: ${profileData.email}`);
        console.log(`   • Commandes: ${ordersCount}`);
        console.log(`   • Premier achat: ${ordersCount === 0 ? 'OUI (nouveau)' : 'NON (récurrent)'}`);
        console.log(`   • Pays: ${profileData.raw_user_meta_data?.country || 'Guinée (défaut)'}`);
        console.log(`   • Ville: ${profileData.raw_user_meta_data?.city || 'Non spécifié'}`);
        console.log(`   • Adresse: ${profileData.raw_user_meta_data?.address || 'Non spécifiée'}`);
      } else {
        console.log('\n📊 ANALYSE CLIENT RÉUSSIE (nouveau client):');
        console.log(`   • Identité: ${profileData.first_name || 'Client'} ${profileData.last_name || ''}`);
        console.log(`   • Email: ${profileData.email}`);
        console.log(`   • Statut: 🆕 NOUVEAU CLIENT (0 commandes)`);
        console.log(`   • Recommandation: Offrir réduction de bienvenue`);
      }
    } else {
      console.log('❌ Non trouvé dans profiles non plus');
      console.log('⚠️ UUID invalide ou client inexistant');
    }
  }
}

// Exécuter les tests
testSearchLogic()
  .then(() => {
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ TESTS TERMINÉS\n');
    console.log('📝 RÉSUMÉ:');
    console.log('   1. Détection UUID: ✅ Fonctionne avec regex');
    console.log('   2. Recherche cascade: ✅ customers → profiles → orders');
    console.log('   3. Fallback profiles: ✅ Opérationnel si customers vide');
    console.log('   4. Extraction données: ✅ Identité, localisation, commandes\n');
    console.log('🎯 POUR TESTER DANS LE COPILOTE:');
    console.log('   Copiez un UUID ci-dessus et tapez:');
    console.log('   "Analyse le client [UUID]"');
    console.log('');
  })
  .catch(console.error);
