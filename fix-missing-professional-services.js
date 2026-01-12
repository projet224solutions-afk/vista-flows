/**
 * Script pour créer les professional_services manquants
 * Pour les vendeurs existants qui n'ont pas encore leur module métier
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingProfessionalServices() {
  console.log('🔍 Recherche des vendeurs sans professional_service...\n');

  try {
    // 1. Récupérer tous les vendeurs avec leur service_type
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('user_id, business_name, email, phone, address, city, service_type')
      .eq('is_active', true);

    if (vendorsError) {
      console.error('❌ Erreur récupération vendeurs:', vendorsError);
      return;
    }

    console.log(`📊 Vendeurs trouvés: ${vendors?.length || 0}\n`);

    if (!vendors || vendors.length === 0) {
      console.log('ℹ️ Aucun vendeur trouvé');
      return;
    }

    // 2. Vérifier lesquels ont déjà un professional_service
    const { data: existingServices, error: servicesError } = await supabase
      .from('professional_services')
      .select('user_id');

    if (servicesError) {
      console.error('❌ Erreur récupération professional_services:', servicesError);
      return;
    }

    const existingUserIds = new Set(existingServices?.map(s => s.user_id) || []);
    const vendorsNeedingService = vendors.filter(v => !existingUserIds.has(v.user_id));

    console.log(`✅ Vendeurs avec professional_service: ${existingUserIds.size}`);
    console.log(`⚠️ Vendeurs SANS professional_service: ${vendorsNeedingService.length}\n`);

    if (vendorsNeedingService.length === 0) {
      console.log('✨ Tous les vendeurs ont déjà leur professional_service !');
      return;
    }

    // 3. Créer les professional_services manquants
    let created = 0;
    let errors = 0;

    for (const vendor of vendorsNeedingService) {
      const serviceTypeCode = vendor.service_type || 'ecommerce';
      
      // Récupérer le service_type_id
      const { data: serviceType, error: typeError } = await supabase
        .from('service_types')
        .select('id, name')
        .eq('code', serviceTypeCode)
        .maybeSingle();

      if (typeError || !serviceType) {
        console.log(`❌ Service type non trouvé pour ${vendor.business_name} (code: ${serviceTypeCode})`);
        errors++;
        continue;
      }

      // Créer le professional_service
      const { error: insertError } = await supabase
        .from('professional_services')
        .insert({
          user_id: vendor.user_id,
          service_type_id: serviceType.id,
          business_name: vendor.business_name,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address || vendor.city,
          status: 'active', // Activer directement pour les comptes existants
          verification_status: 'unverified'
        });

      if (insertError) {
        console.log(`❌ Erreur création pour ${vendor.business_name}:`, insertError.message);
        errors++;
      } else {
        console.log(`✅ ${vendor.business_name} - Module métier: ${serviceType.name}`);
        created++;
      }
    }

    console.log('\n📊 RÉSUMÉ:');
    console.log(`  ✅ Créés: ${created}`);
    console.log(`  ❌ Erreurs: ${errors}`);
    console.log(`  📦 Total traités: ${vendorsNeedingService.length}`);

  } catch (error) {
    console.error('❌ Erreur inattendue:', error);
  }
}

// Exécuter
console.log('🚀 Démarrage du script de correction...\n');
fixMissingProfessionalServices()
  .then(() => {
    console.log('\n✅ Script terminé');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
