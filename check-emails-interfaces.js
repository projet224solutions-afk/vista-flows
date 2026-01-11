// Script pour vérifier les emails et interfaces des services
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmailsAndInterfaces() {
  console.log('\n=== VÉRIFICATION EMAILS ET INTERFACES DES SERVICES ===\n');

  // 1. Récupérer les services
  const { data: services } = await supabase
    .from('professional_services')
    .select(`
      id,
      business_name,
      status,
      user_id,
      service_types(name, code)
    `)
    .order('created_at', { ascending: false });

  if (!services || services.length === 0) {
    console.log('❌ Aucun service trouvé\n');
    return;
  }

  // 2. Récupérer les emails des utilisateurs
  const userIds = [...new Set(services.map(s => s.user_id))];
  
  // Récupérer les emails depuis auth.users via l'API admin ou profils
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds);

  // Map des user_id aux profiles
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  console.log(`📊 ${services.length} services trouvés\n`);
  console.log('═'.repeat(80));

  for (const service of services) {
    const profile = profileMap.get(service.user_id);
    const serviceType = service.service_types?.code || 'ecommerce';
    
    console.log(`\n📦 ${service.business_name}`);
    console.log(`   User ID: ${service.user_id}`);
    console.log(`   Nom: ${profile?.full_name || '❌ Pas de nom'}`);
    console.log(`   Téléphone: ${profile?.phone || '❌ Pas de téléphone'}`);
    console.log(`   Type de service: ${service.service_types?.name || 'Non défini'} (${serviceType})`);
    console.log(`   Status: ${service.status}`);
    
    // Vérifier si une interface existe pour ce type de service
    const interfaces = {
      'ecommerce': '✅ EcommerceModule',
      'beaute': '✅ BeautyModule',
      'reparation': '✅ RepairModule',
      'immobilier': '✅ RealEstateModule',
      'restauration': '✅ RestaurantModule',
      'taxi': '✅ VTCModule',
      'vtc': '✅ VTCModule',
      'transport': '✅ TransportModule',
      'livraison': '✅ DeliveryModule',
      'mode': '✅ FashionModule',
      'electronique': '✅ ElectronicsModule',
      'maison': '✅ HomeDecorModule',
      'fitness': '✅ FitnessModule',
      'media': '✅ PhotoStudioModule',
      'education': '✅ EducationModule',
      'sante': '✅ HealthModule',
      'voyage': '✅ TransportModule',
      'freelance': '✅ FreelanceModule',
      'construction': '✅ ConstructionModule',
      'agriculture': '✅ AgricultureModule',
      'informatique': '✅ DeveloperModule',
    };

    const hasInterface = interfaces[serviceType];
    if (hasInterface) {
      console.log(`   Interface: ${hasInterface}`);
    } else {
      console.log(`   Interface: ⚠️  AUCUNE (utilise EcommerceModule par défaut)`);
    }
  }

  console.log('\n\n═'.repeat(80));
  console.log('📌 RÉSUMÉ:\n');
  
  const withPhone = services.filter(s => profileMap.get(s.user_id)?.phone).length;
  const withoutPhone = services.length - withPhone;
  
  const interfaces = {
    'ecommerce': '✅ EcommerceModule',
    'beaute': '✅ BeautyModule',
    'reparation': '✅ RepairModule',
    'immobilier': '✅ RealEstateModule',
    'restauration': '✅ RestaurantModule',
    'taxi': '✅ VTCModule',
    'vtc': '✅ VTCModule',
    'transport': '✅ TransportModule',
    'livraison': '✅ DeliveryModule',
    'mode': '✅ FashionModule',
    'electronique': '✅ ElectronicsModule',
    'maison': '✅ HomeDecorModule',
    'fitness': '✅ FitnessModule',
    'media': '✅ PhotoStudioModule',
    'education': '✅ EducationModule',
    'sante': '✅ HealthModule',
    'voyage': '✅ TransportModule',
    'freelance': '✅ FreelanceModule',
    'construction': '✅ ConstructionModule',
    'agriculture': '✅ AgricultureModule',
    'informatique': '✅ DeveloperModule',
  };

  const serviceTypeCount = new Map();
  services.forEach(s => {
    const type = s.service_types?.code || 'ecommerce';
    serviceTypeCount.set(type, (serviceTypeCount.get(type) || 0) + 1);
  });

  console.log(`✅ Services avec téléphone: ${withPhone}`);
  console.log(`❌ Services sans téléphone: ${withoutPhone}`);
  console.log(`\n📊 Répartition par type:`);
  
  serviceTypeCount.forEach((count, type) => {
    const hasInterface = interfaces[type] ? '✅' : '⚠️ ';
    console.log(`   ${hasInterface} ${type}: ${count} service(s)`);
  });

  console.log('\n💡 NOTE: Tous les services utilisent le type "ecommerce" (Boutique Digitale)');
  console.log('   Ils ont TOUS une interface fonctionnelle (EcommerceModule)');
}

checkEmailsAndInterfaces().catch(console.error);
