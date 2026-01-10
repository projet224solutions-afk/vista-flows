/**
 * 🧪 TEST ANALYSE CLIENT
 * Script pour tester l'analyse client avec UUID ou ID
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomerAnalysis() {
  console.log('🔍 Recherche de clients existants...\n');

  // 1. Récupérer un client existant depuis la table customers
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, user_id, addresses, created_at')
    .limit(5);

  if (customerError) {
    console.error('❌ Erreur récupération clients:', customerError);
    return;
  }

  if (!customers || customers.length === 0) {
    console.log('⚠️ Aucun client trouvé dans la table customers\n');
    
    // Essayer de trouver des commandes pour identifier des clients
    console.log('📦 Recherche dans les commandes...\n');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_id, status, total_amount, created_at')
      .limit(10);
    
    if (ordersError) {
      console.error('❌ Erreur récupération commandes:', ordersError);
      return;
    }
    
    if (orders && orders.length > 0) {
      console.log(`✅ ${orders.length} commandes trouvées:\n`);
      const uniqueCustomerIds = [...new Set(orders.map(o => o.customer_id))];
      console.log(`👥 ${uniqueCustomerIds.length} clients uniques identifiés:\n`);
      
      for (let i = 0; i < Math.min(3, uniqueCustomerIds.length); i++) {
        const customerId = uniqueCustomerIds[i];
        const customerOrders = orders.filter(o => o.customer_id === customerId);
        const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        
        console.log(`${i + 1}. 👤 Customer ID: ${customerId}`);
        console.log(`   • Type: ${typeof customerId} (${customerId?.length || 0} caractères)`);
        console.log(`   • ${customerOrders.length} commande(s)`);
        console.log(`   • Total: ${totalSpent.toLocaleString()} GNF`);
        console.log(`   • Dernière commande: ${new Date(customerOrders[0].created_at).toLocaleDateString('fr-FR')}`);
        
        // Test regex UUID
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const isUUID = uuidRegex.test(customerId);
        console.log(`   • Format UUID: ${isUUID ? '✅ OUI' : '❌ NON'}`);
        console.log('');
      }
      
      // Test détection dans message
      const testId = uniqueCustomerIds[0];
      console.log('🔍 Test détection dans message:\n');
      
      const testMessages = [
        `Analyse le client ${testId}`,
        `client ${testId}`,
        `analyse ${testId}`,
      ];
      
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      
      testMessages.forEach(msg => {
        const match = msg.match(uuidRegex);
        console.log(`Message: "${msg}"`);
        console.log(`Résultat: ${match ? `✅ UUID détecté: ${match[0]}` : '❌ Aucun UUID'}`);
        console.log('');
      });
      
      console.log('📋 Pour tester dans le Copilote Vendeur:');
      console.log(`   Tapez: "Analyse le client ${testId}"`);
      console.log(`   ou simplement: "client ${testId}"`);
      
    } else {
      console.log('❌ Aucune commande trouvée');
    }
    return;
  }

  console.log(`✅ ${customers.length} clients trouvés:\n`);

  customers.forEach((customer, index) => {
    console.log(`${index + 1}. 👤 Client:`);
    console.log(`   • ID (UUID): ${customer.id}`);
    console.log(`   • User ID: ${customer.user_id}`);
    console.log(`   • Créé le: ${new Date(customer.created_at).toLocaleDateString('fr-FR')}`);
    
    // Vérifier si le client a des adresses
    if (customer.addresses) {
      const addresses = typeof customer.addresses === 'string' 
        ? JSON.parse(customer.addresses) 
        : customer.addresses;
      
      if (Array.isArray(addresses) && addresses.length > 0) {
        console.log(`   • Adresses: ${addresses.length}`);
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        if (defaultAddr) {
          console.log(`     - Pays: ${defaultAddr.country || 'N/A'}`);
          console.log(`     - Ville: ${defaultAddr.city || 'N/A'}`);
          console.log(`     - Rue: ${defaultAddr.street || 'N/A'}`);
        }
      } else {
        console.log(`   • Adresses: Aucune`);
      }
    } else {
      console.log(`   • Adresses: Non renseignées`);
    }
    console.log('');
  });

  // 2. Vérifier les commandes pour ces clients
  console.log('📊 Vérification des commandes pour ces clients...\n');

  for (const customer of customers.slice(0, 2)) {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at')
      .eq('customer_id', customer.id);

    if (!ordersError && orders) {
      console.log(`👤 Client ${customer.id}:`);
      console.log(`   • ${orders.length} commande(s)`);
      
      if (orders.length > 0) {
        const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        console.log(`   • Total dépensé: ${totalSpent.toLocaleString()} GNF`);
        console.log(`   • Statuts: ${orders.map(o => o.status).join(', ')}`);
      }
      console.log('');
    }
  }

  // 3. Format d'UUID détecté
  console.log('🔍 Test détection UUID:\n');
  
  const testCustomerId = customers[0].id;
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  
  const testMessages = [
    `Analyse le client ${testCustomerId}`,
    `client ${testCustomerId}`,
    `analyse client ${testCustomerId}`,
    `Donne moi les infos sur ${testCustomerId}`,
  ];

  testMessages.forEach(msg => {
    const match = msg.match(uuidRegex);
    if (match) {
      console.log(`✅ "${msg}"`);
      console.log(`   → UUID détecté: ${match[0]}`);
    } else {
      console.log(`❌ "${msg}"`);
      console.log(`   → Aucun UUID détecté`);
    }
  });

  console.log('\n📋 Pour tester l\'analyse dans le Copilote:');
  console.log(`   Tapez: "Analyse le client ${testCustomerId}"`);
  console.log(`   ou: "client ${testCustomerId}"`);
}

// Exécution
testCustomerAnalysis().catch(console.error);
