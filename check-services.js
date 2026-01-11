// Script pour vérifier les services professionnels dans la base de données
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServices() {
  console.log('\n=== SERVICES PROFESSIONNELS DANS LE MARKETPLACE ===\n');

  // 1. Vérifier les services professionnels
  const { data: services, error: servicesError } = await supabase
    .from('professional_services')
    .select(`
      id, 
      business_name, 
      status, 
      created_at,
      user_id,
      service_types(name, code)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (servicesError) {
    console.error('❌ Erreur récupération services:', servicesError.message);
  } else {
    console.log(`📊 Total services trouvés: ${services.length}\n`);
    
    if (services.length === 0) {
      console.log('⚠️  AUCUN service professionnel trouvé dans la base de données!\n');
    } else {
      services.forEach((s, index) => {
        console.log(`${index + 1}. ${s.business_name}`);
        console.log(`   Type: ${s.service_types?.name || 'Non défini'} (${s.service_types?.code || 'N/A'})`);
        console.log(`   Status: ${s.status}`);
        console.log(`   User ID: ${s.user_id}`);
        console.log(`   Créé le: ${new Date(s.created_at).toLocaleDateString('fr-FR')}`);
        console.log('');
      });
    }
  }

  // 2. Vérifier les utilisateurs associés
  console.log('\n=== VÉRIFICATION DES EMAILS CRÉATEURS ===\n');
  
  if (services && services.length > 0) {
    const userIds = [...new Set(services.map(s => s.user_id))];
    
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', userIds);

    if (!usersError && users) {
      console.log(`👥 ${users.length} utilisateurs distincts trouvés\n`);
      users.forEach(u => {
        const userServices = services.filter(s => s.user_id === u.id);
        console.log(`- ${u.full_name || 'Sans nom'} (${u.phone || 'Pas de téléphone'})`);
        console.log(`  Services: ${userServices.map(s => s.business_name).join(', ')}`);
        console.log('');
      });
    }
  }

  // 3. Vérifier les produits e-commerce
  console.log('\n=== PRODUITS E-COMMERCE DANS LE MARKETPLACE ===\n');
  
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      is_active,
      vendor_id,
      vendors(business_name, user_id)
    `)
    .eq('is_active', true)
    .limit(10);

  if (productsError) {
    console.error('❌ Erreur récupération produits:', productsError.message);
  } else {
    console.log(`📦 Total produits actifs trouvés: ${products.length}\n`);
    products.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name} - ${p.price} GNF`);
      console.log(`   Vendeur: ${p.vendors?.business_name || 'Non défini'}`);
      console.log('');
    });
  }

  // 4. Vérifier les produits numériques
  console.log('\n=== PRODUITS NUMÉRIQUES DANS LE MARKETPLACE ===\n');
  
  const { data: digitalProducts, error: digitalError } = await supabase
    .from('service_products')
    .select(`
      id,
      name,
      price,
      professional_service_id,
      professional_services(business_name)
    `)
    .limit(10);

  if (digitalError) {
    console.error('❌ Erreur récupération produits numériques:', digitalError.message);
  } else {
    console.log(`💾 Total produits numériques trouvés: ${digitalProducts.length}\n`);
    digitalProducts.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name} - ${p.price} GNF`);
      console.log(`   Service: ${p.professional_services?.business_name || 'Non défini'}`);
      console.log('');
    });
  }

  console.log('\n=== RÉSUMÉ ===');
  console.log(`Services professionnels: ${services?.length || 0}`);
  console.log(`Produits e-commerce: ${products?.length || 0}`);
  console.log(`Produits numériques: ${digitalProducts?.length || 0}`);
  console.log(`TOTAL ITEMS MARKETPLACE: ${(services?.length || 0) + (products?.length || 0) + (digitalProducts?.length || 0)}`);
}

checkServices().catch(console.error);
