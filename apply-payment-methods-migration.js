/**
 * SCRIPT D'APPLICATION DE LA MIGRATION user_payment_methods
 * Exécute automatiquement la migration SQL dans Supabase
 * 224Solutions - Deployment Script
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('   Vérifiez que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définis');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Vérifie si la table existe déjà
 */
async function checkTableExists() {
  try {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('id')
      .limit(1);

    if (error) {
      // Si l'erreur est "relation does not exist", la table n'existe pas
      if (error.message.includes('does not exist')) {
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erreur vérification table:', error);
    return false;
  }
}

/**
 * Compte le nombre de moyens de paiement existants
 */
async function countPaymentMethods() {
  try {
    const { count, error } = await supabase
      .from('user_payment_methods')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Erreur comptage:', error);
    return 0;
  }
}

/**
 * Applique la migration SQL
 * Note: Cette approche nécessite les droits service_role
 * Pour une vraie migration, utilisez Supabase Dashboard SQL Editor
 */
async function applyMigration() {
  console.log('\n🔧 APPLICATION DE LA MIGRATION user_payment_methods\n');

  // Vérifier si la table existe
  console.log('📋 Vérification de la table...');
  const tableExists = await checkTableExists();

  if (tableExists) {
    console.log('✅ La table user_payment_methods existe déjà');
    const count = await countPaymentMethods();
    console.log(`📊 ${count} moyen(s) de paiement configuré(s)`);
    
    if (count === 0) {
      console.log('\n💡 Aucun moyen de paiement trouvé.');
      console.log('   Le système créera automatiquement le wallet lors du premier chargement.');
    }

    return true;
  }

  console.log('\n⚠️  La table user_payment_methods n\'existe pas encore\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 ACTION REQUISE : Exécuter la migration manuellement');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🔹 Étape 1 : Ouvrez Supabase Dashboard');
  console.log(`   👉 https://supabase.com/dashboard/project/${SUPABASE_URL.split('.')[0].split('//')[1]}\n`);
  
  console.log('🔹 Étape 2 : Allez dans SQL Editor');
  console.log('   👉 Cliquez sur "SQL Editor" dans le menu de gauche\n');
  
  console.log('🔹 Étape 3 : Créez une nouvelle requête');
  console.log('   👉 Cliquez sur "New Query"\n');
  
  console.log('🔹 Étape 4 : Copiez le contenu de la migration');
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251130_user_payment_methods.sql');
  console.log(`   📄 Fichier : ${migrationPath}\n`);
  
  console.log('🔹 Étape 5 : Collez et exécutez');
  console.log('   👉 Collez le SQL dans l\'éditeur');
  console.log('   👉 Cliquez sur "Run" (ou Ctrl+Enter)\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Afficher le contenu de la migration pour faciliter le copier-coller
  try {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    console.log('📋 CONTENU DE LA MIGRATION (à copier) :\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(migrationContent);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error(`❌ Impossible de lire le fichier de migration: ${error.message}`);
  }

  console.log('⏳ Après avoir exécuté la migration, réexécutez ce script pour vérifier\n');
  
  return false;
}

/**
 * Point d'entrée
 */
async function main() {
  try {
    const success = await applyMigration();
    
    if (success) {
      console.log('\n✅ Migration user_payment_methods : OK');
      console.log('🎉 Les moyens de paiement sont prêts à être utilisés!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Veuillez exécuter la migration manuellement puis relancer ce script\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'application de la migration:', error);
    process.exit(1);
  }
}

main();
