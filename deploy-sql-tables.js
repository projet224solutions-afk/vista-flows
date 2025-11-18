/**
 * 🚀 DÉPLOIEMENT TABLES SQL - 224SOLUTIONS
 * Script simple pour déployer les tables de communication
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = "https://uakkxaibujzxdiqzpnpr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM";

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployTables() {
  console.log('🚀 DÉPLOIEMENT TABLES DE COMMUNICATION');
  console.log('=' .repeat(50));

  try {
    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, 'sql', 'communication_system.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('✅ Fichier SQL lu avec succès');

    // Diviser en requêtes individuelles
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`📋 ${queries.length} requêtes SQL identifiées`);

    // Exécuter les requêtes une par une
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      if (query.trim().length === 0) continue;

      try {
        console.log(`   Exécution requête ${i + 1}/${queries.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql_query: query });
        
        if (error) {
          console.log(`   ⚠️  Requête ${i + 1} ignorée:`, error.message);
        } else {
          console.log(`   ✅ Requête ${i + 1} exécutée`);
          successCount++;
        }
      } catch (error) {
        console.log(`   ❌ Erreur requête ${i + 1}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 RÉSUMÉ:');
    console.log(`✅ Succès: ${successCount}`);
    console.log(`⚠️  Ignorées: ${queries.length - successCount - errorCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);

    // Vérifier les tables créées
    console.log('\n🔍 VÉRIFICATION DES TABLES...');
    
    const tables = ['conversations', 'messages', 'calls', 'user_presence', 'notifications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: accessible`);
        }
      } catch (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du déploiement:', error);
  }
}

deployTables();
