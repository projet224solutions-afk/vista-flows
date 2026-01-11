// Script pour appliquer les migrations et créer les profils manquants
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('\n🔧 APPLICATION DES MIGRATIONS\n');
  console.log('⚠️  IMPORTANT: Ces migrations doivent être exécutées avec un compte admin');
  console.log('    Utilisez le SQL Editor de Supabase Dashboard pour les appliquer\n');
  
  // Vérifier l'état avant
  console.log('📊 État AVANT les migrations:\n');
  
  const { data: servicesBefore } = await supabase
    .from('professional_services')
    .select('user_id, business_name')
    .limit(10);
  
  const userIdsBefore = [...new Set(servicesBefore?.map(s => s.user_id) || [])];
  console.log(`   Services: ${servicesBefore?.length || 0}`);
  console.log(`   Vendeurs uniques: ${userIdsBefore.length}`);
  
  const { data: profilesBefore } = await supabase
    .from('profiles')
    .select('id')
    .in('id', userIdsBefore);
  
  console.log(`   Profils existants: ${profilesBefore?.length || 0}`);
  console.log(`   Profils manquants: ${userIdsBefore.length - (profilesBefore?.length || 0)}\n`);
  
  // Instructions pour appliquer manuellement
  console.log('═'.repeat(80));
  console.log('📝 ÉTAPES À SUIVRE:\n');
  console.log('1. Ouvrez Supabase Dashboard');
  console.log('   → https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql\n');
  
  console.log('2. Copiez et exécutez la MIGRATION 1:');
  console.log('   → Fichier: supabase/migrations/20260110000000_create_missing_vendor_profiles.sql');
  console.log('   → Crée les profils manquants pour les vendeurs\n');
  
  console.log('3. Copiez et exécutez la MIGRATION 2:');
  console.log('   → Fichier: supabase/migrations/20260110000001_auto_create_vendor_profiles_trigger.sql');
  console.log('   → Installe les triggers pour auto-créer les profils\n');
  
  console.log('4. Vérifiez avec:');
  console.log('   → node check-pdg-users-display.js\n');
  
  console.log('═'.repeat(80));
  
  // Attendre un peu pour que l'utilisateur lise
  console.log('\n⏳ Vérification dans 5 secondes...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Vérifier l'état après (si les migrations ont été appliquées)
  console.log('📊 Vérification de l\'état actuel:\n');
  
  const { data: profilesAfter } = await supabase
    .from('profiles')
    .select('id, role, first_name, email')
    .in('id', userIdsBefore);
  
  const foundCount = profilesAfter?.length || 0;
  const missingCount = userIdsBefore.length - foundCount;
  
  console.log(`   ✅ Profils trouvés: ${foundCount}/${userIdsBefore.length}`);
  console.log(`   ❌ Profils manquants: ${missingCount}/${userIdsBefore.length}`);
  
  if (missingCount === 0) {
    console.log('\n✅ SUCCÈS! Tous les vendeurs ont maintenant un profil');
    console.log('✅ Ils sont visibles dans l\'interface PDG\n');
  } else {
    console.log('\n⚠️  Les migrations n\'ont pas encore été appliquées');
    console.log('→ Suivez les étapes ci-dessus dans Supabase Dashboard\n');
  }
  
  // Afficher les profils créés
  if (foundCount > 0) {
    console.log('👥 Profils des vendeurs:\n');
    profilesAfter?.forEach((profile, i) => {
      const service = servicesBefore?.find(s => s.user_id === profile.id);
      console.log(`   ${i + 1}. ${profile.first_name || service?.business_name || 'Sans nom'}`);
      console.log(`      Email: ${profile.email || 'Non défini'}`);
      console.log(`      Rôle: ${profile.role || 'Non défini'}`);
      console.log('');
    });
  }
}

applyMigrations().catch(console.error);
