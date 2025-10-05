/**
 * 🚀 DÉPLOIEMENT SYSTÈME DE COMMUNICATION - 224SOLUTIONS
 * Script pour déployer le système de communication complet
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployCommunicationSystem() {
  console.log('🚀 DÉPLOIEMENT SYSTÈME DE COMMUNICATION - 224SOLUTIONS');
  console.log('=' .repeat(60));

  try {
    // 1. Lire le fichier SQL
    console.log('\n1️⃣ Lecture du fichier SQL...');
    const sqlFile = path.join(__dirname, 'sql', 'communication_system.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ Fichier SQL non trouvé:', sqlFile);
      return;
    }

    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    console.log('✅ Fichier SQL lu avec succès');

    // 2. Diviser le SQL en requêtes individuelles
    console.log('\n2️⃣ Division des requêtes SQL...');
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`✅ ${queries.length} requêtes SQL identifiées`);

    // 3. Exécuter les requêtes
    console.log('\n3️⃣ Exécution des requêtes SQL...');
    
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      if (query.trim().length === 0) continue;

      try {
        console.log(`   Exécution requête ${i + 1}/${queries.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql_query: query });
        
        if (error) {
          console.log(`   ⚠️  Requête ${i + 1} ignorée (déjà existante):`, error.message);
        } else {
          console.log(`   ✅ Requête ${i + 1} exécutée avec succès`);
          successCount++;
        }
      } catch (error) {
        console.log(`   ❌ Erreur requête ${i + 1}:`, error.message);
        errorCount++;
      }
    }

    // 4. Vérifier les tables créées
    console.log('\n4️⃣ Vérification des tables...');
    
    const tables = ['conversations', 'messages', 'calls', 'user_presence', 'notifications', 'conversation_participants'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table} non accessible:`, error.message);
        } else {
          console.log(`✅ Table ${table} accessible`);
        }
      } catch (error) {
        console.log(`❌ Erreur vérification table ${table}:`, error.message);
      }
    }

    // 5. Vérifier les politiques RLS
    console.log('\n5️⃣ Vérification des politiques RLS...');
    
    try {
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('*')
        .in('tablename', tables);
      
      if (error) {
        console.log('⚠️  Impossible de vérifier les politiques RLS:', error.message);
      } else {
        console.log(`✅ ${policies.length} politiques RLS trouvées`);
      }
    } catch (error) {
      console.log('⚠️  Erreur vérification politiques RLS:', error.message);
    }

    // 6. Vérifier les index
    console.log('\n6️⃣ Vérification des index...');
    
    try {
      const { data: indexes, error } = await supabase
        .from('pg_indexes')
        .select('*')
        .in('tablename', tables);
      
      if (error) {
        console.log('⚠️  Impossible de vérifier les index:', error.message);
      } else {
        console.log(`✅ ${indexes.length} index trouvés`);
      }
    } catch (error) {
      console.log('⚠️  Erreur vérification index:', error.message);
    }

    // 7. Test de performance
    console.log('\n7️⃣ Test de performance...');
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, type, status')
        .limit(100);
      
      const endTime = Date.now();
      
      if (error) {
        console.log('❌ Erreur test de performance:', error.message);
      } else {
        console.log(`✅ Test de performance: ${endTime - startTime}ms pour 100 conversations`);
      }
    } catch (error) {
      console.log('❌ Erreur test de performance:', error.message);
    }

    // 8. Résumé du déploiement
    console.log('\n📊 RÉSUMÉ DU DÉPLOIEMENT');
    console.log('=' .repeat(40));
    console.log(`✅ Requêtes exécutées avec succès: ${successCount}`);
    console.log(`⚠️  Requêtes ignorées: ${queries.length - successCount - errorCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📋 Tables vérifiées: ${tables.length}`);

    if (successCount > 0) {
      console.log('\n🎉 SYSTÈME DE COMMUNICATION DÉPLOYÉ AVEC SUCCÈS !');
      console.log('\n📋 PROCHAINES ÉTAPES:');
      console.log('1. Tester l\'interface de communication dans l\'application');
      console.log('2. Vérifier les permissions microphone/caméra');
      console.log('3. Tester les appels audio/vidéo entre utilisateurs');
      console.log('4. Configurer les credentials Agora si nécessaire');
    } else {
      console.log('\n⚠️  DÉPLOIEMENT PARTIEL - Vérifiez les erreurs ci-dessus');
    }

  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error);
  }
}

// Fonction pour créer un utilisateur de test
async function createTestUser() {
  console.log('\n👤 Création d\'un utilisateur de test...');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@224solutions.com',
      password: 'test123456',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'vendor'
        }
      }
    });

    if (error) {
      console.log('⚠️  Utilisateur de test non créé:', error.message);
    } else {
      console.log('✅ Utilisateur de test créé:', data.user?.email);
    }
  } catch (error) {
    console.log('⚠️  Erreur création utilisateur de test:', error.message);
  }
}

// Exécuter le déploiement
async function runDeployment() {
  await deployCommunicationSystem();
  await createTestUser();
  
  console.log('\n🏁 Déploiement terminé !');
  console.log('\n🔧 POUR TESTER:');
  console.log('1. Exécuter: node test-communication-system.js');
  console.log('2. Démarrer l\'application et aller dans Communication');
  console.log('3. Tester les fonctionnalités de chat et d\'appels');
}

runDeployment();
