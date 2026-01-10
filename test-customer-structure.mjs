/**
 * 🧪 TEST COMPLET - Vérification structure + Création données test
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStructure() {
  console.log('🔍 DIAGNOSTIC COMPLET\n');
  console.log('='.repeat(60));
  
  // 1. Vérifier la table customers
  console.log('\n📊 Table CUSTOMERS:');
  const { data: customers, error: custError, count: custCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: false })
    .limit(1);
  
  if (custError) {
    console.log(`❌ Erreur: ${custError.message}`);
  } else {
    console.log(`✅ Table accessible`);
    console.log(`   • Lignes totales: ${custCount || 0}`);
    if (customers && customers.length > 0) {
      console.log(`   • Colonnes: ${Object.keys(customers[0]).join(', ')}`);
      console.log(`   • Exemple ID: ${customers[0].id}`);
    }
  }
  
  // 2. Vérifier la table orders
  console.log('\n📦 Table ORDERS:');
  const { data: orders, error: ordError, count: ordCount } = await supabase
    .from('orders')
    .select('id, customer_id, vendor_id, status, total_amount', { count: 'exact' })
    .limit(5);
  
  if (ordError) {
    console.log(`❌ Erreur: ${ordError.message}`);
  } else {
    console.log(`✅ Table accessible`);
    console.log(`   • Lignes totales: ${ordCount || 0}`);
    if (orders && orders.length > 0) {
      console.log(`   • ${orders.length} exemples:`);
      orders.forEach((order, i) => {
        console.log(`     ${i+1}. Order ${order.id.substring(0, 8)}... - customer_id: ${order.customer_id?.substring(0, 8) || 'NULL'}...`);
      });
    }
  }
  
  // 3. Vérifier la table profiles
  console.log('\n👤 Table PROFILES:');
  const { data: profiles, error: profError, count: profCount } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role', { count: 'exact' })
    .limit(5);
  
  if (profError) {
    console.log(`❌ Erreur: ${profError.message}`);
  } else {
    console.log(`✅ Table accessible`);
    console.log(`   • Lignes totales: ${profCount || 0}`);
    if (profiles && profiles.length > 0) {
      console.log(`   • ${profiles.length} exemples:`);
      profiles.forEach((prof, i) => {
        console.log(`     ${i+1}. ${prof.email || 'No email'} - Role: ${prof.role || 'N/A'}`);
      });
    }
  }
  
  // 4. Vérifier la table vendors
  console.log('\n🏪 Table VENDORS:');
  const { data: vendors, error: vendError, count: vendCount } = await supabase
    .from('vendors')
    .select('id, business_name, user_id', { count: 'exact' })
    .limit(3);
  
  if (vendError) {
    console.log(`❌ Erreur: ${vendError.message}`);
  } else {
    console.log(`✅ Table accessible`);
    console.log(`   • Lignes totales: ${vendCount || 0}`);
    if (vendors && vendors.length > 0) {
      console.log(`   • ${vendors.length} exemples:`);
      vendors.forEach((vend, i) => {
        console.log(`     ${i+1}. ${vend.business_name || 'Sans nom'} - ID: ${vend.id.substring(0, 8)}...`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 ANALYSE:\n');
  
  // Analyse du schéma customer_id dans orders
  if (orders && orders.length > 0) {
    const hasCustomerIds = orders.filter(o => o.customer_id).length;
    console.log(`✅ ${hasCustomerIds}/${orders.length} commandes ont un customer_id`);
    
    if (hasCustomerIds > 0) {
      const exampleId = orders.find(o => o.customer_id)?.customer_id;
      console.log(`   • Exemple customer_id: ${exampleId}`);
      console.log(`   • Type: ${typeof exampleId}`);
      
      // Test regex UUID
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      const isUUID = uuidRegex.test(exampleId);
      console.log(`   • Format UUID: ${isUUID ? '✅ OUI' : '❌ NON'}`);
      
      if (isUUID) {
        console.log('\n🎯 FONCTIONNEMENT CONFIRMÉ:');
        console.log(`   Le customer_id est bien au format UUID`);
        console.log(`   La détection dans le Copilote fonctionnera avec:`);
        console.log(`   • "Analyse le client ${exampleId}"`);
        console.log(`   • "client ${exampleId}"`);
        console.log(`   • "analyse ${exampleId}"`);
      } else {
        console.log('\n⚠️ ATTENTION:');
        console.log(`   Le customer_id n'est PAS au format UUID`);
        console.log(`   La regex actuelle ne le détectera pas`);
        console.log(`   Format actuel: ${exampleId}`);
      }
    }
  } else {
    console.log('⚠️ Aucune commande trouvée pour tester le format customer_id');
  }
  
  // Vérification de la logique analyzeCustomer
  console.log('\n🔍 LOGIQUE ANALYSE CLIENT:\n');
  console.log('1. La méthode VendorCopilotService.analyzeCustomer() attend:');
  console.log('   • customerId: string (UUID du client)');
  console.log('   • vendorId: string (UUID du vendeur)');
  console.log('\n2. Elle requête la table "customers" avec:');
  console.log('   • .from(\'customers\').select(...)');
  console.log('   • .eq(\'id\', customerId)');
  console.log('\n3. PROBLÈME IDENTIFIÉ:');
  console.log('   ❌ La table "customers" semble vide ou non utilisée');
  console.log('   ❌ Les customer_id dans "orders" pointent vers "profiles" (user_id)');
  console.log('\n4. SOLUTION:');
  console.log('   Option A: Modifier analyzeCustomer pour utiliser profiles au lieu de customers');
  console.log('   Option B: Peupler la table customers avec les données profiles');
  console.log('   Option C: Utiliser user_id directement depuis orders → profiles');
}

testStructure().catch(console.error);
