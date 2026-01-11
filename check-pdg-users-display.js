// Script pour vérifier si les utilisateurs du marketplace apparaissent dans l'interface PDG
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPDGUsersDisplay() {
  console.log('\n=== VÉRIFICATION AFFICHAGE UTILISATEURS DANS INTERFACE PDG ===\n');

  // 1. Récupérer les user_ids des services professionnels
  const { data: services } = await supabase
    .from('professional_services')
    .select('user_id, business_name, status')
    .order('created_at', { ascending: false });

  const serviceUserIds = [...new Set(services?.map(s => s.user_id) || [])];
  
  console.log(`📊 ${serviceUserIds.length} utilisateurs créateurs de services trouvés\n`);

  // 2. Vérifier ce que l'interface PDG charge (simulation de la requête PDGUsers.tsx ligne 47)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, is_active, status, public_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur chargement profiles:', error.message);
    return;
  }

  console.log(`👥 TOTAL UTILISATEURS dans profiles: ${profiles?.length || 0}\n`);

  // 3. Vérifier si les créateurs de services sont dans profiles
  console.log('═'.repeat(80));
  console.log('🔍 VÉRIFICATION: Les créateurs de services sont-ils dans profiles ?\n');

  let foundCount = 0;
  let notFoundCount = 0;

  for (const userId of serviceUserIds) {
    const profile = profiles?.find(p => p.id === userId);
    const service = services?.find(s => s.user_id === userId);
    
    if (profile) {
      foundCount++;
      console.log(`✅ ${service?.business_name || 'Service'}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Email: ${profile.email || '❌ Pas d\'email'}`);
      console.log(`   Nom: ${profile.first_name || ''} ${profile.last_name || ''} ${!profile.first_name && !profile.last_name ? '❌ Pas de nom' : ''}`);
      console.log(`   Rôle: ${profile.role || 'non défini'}`);
      console.log(`   Public ID: ${profile.public_id || 'N/A'}`);
      console.log(`   Actif: ${profile.is_active ? '✅ Oui' : '❌ Non'}`);
      console.log(`   Status: ${profile.status || 'N/A'}`);
      console.log('');
    } else {
      notFoundCount++;
      console.log(`❌ ${service?.business_name || 'Service'}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   ⚠️  PAS DE PROFIL DANS LA TABLE PROFILES`);
      console.log('');
    }
  }

  console.log('═'.repeat(80));
  console.log('\n📊 RÉSULTATS:\n');
  console.log(`✅ Utilisateurs TROUVÉS dans profiles: ${foundCount}/${serviceUserIds.length}`);
  console.log(`❌ Utilisateurs NON TROUVÉS: ${notFoundCount}/${serviceUserIds.length}`);
  
  const percentageFound = ((foundCount / serviceUserIds.length) * 100).toFixed(1);
  console.log(`📈 Taux d'affichage: ${percentageFound}%\n`);

  // 4. Vérifier les rôles des créateurs
  console.log('═'.repeat(80));
  console.log('🎭 RÉPARTITION PAR RÔLE:\n');

  const roleCount = new Map();
  for (const userId of serviceUserIds) {
    const profile = profiles?.find(p => p.id === userId);
    if (profile) {
      const role = profile.role || 'non défini';
      roleCount.set(role, (roleCount.get(role) || 0) + 1);
    }
  }

  roleCount.forEach((count, role) => {
    console.log(`   ${role}: ${count} utilisateur(s)`);
  });

  // 5. Conclusion
  console.log('\n\n═'.repeat(80));
  console.log('🎯 CONCLUSION:\n');

  if (foundCount === serviceUserIds.length) {
    console.log('✅ TOUS les créateurs de services sont visibles dans l\'interface PDG');
    console.log('✅ L\'interface PDG affiche bien ces utilisateurs dans la liste');
    console.log('✅ Le PDG peut les gérer (suspendre, activer, supprimer)');
  } else {
    console.log(`⚠️  ${notFoundCount} créateur(s) de service ne sont PAS dans profiles`);
    console.log('⚠️  Ces utilisateurs existent dans auth.users mais pas dans profiles');
    console.log('⚠️  Ils ne sont donc PAS visibles dans l\'interface PDG');
  }

  console.log('\n📱 Interface PDG concernée:');
  console.log('   Fichier: src/components/pdg/PDGUsers.tsx');
  console.log('   Route: /pdg (onglet "Utilisateurs")');
  console.log('   Requête: SELECT * FROM profiles ORDER BY created_at DESC');
}

checkPDGUsersDisplay().catch(console.error);
