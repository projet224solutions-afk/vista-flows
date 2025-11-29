#!/usr/bin/env node
/**
 * Script de déploiement des Edge Functions Supabase
 * Utilise les variables d'environnement SUPABASE_SERVICE_ROLE_KEY et SUPABASE_URL
 * 
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY = 'votre_service_role_key'
 *   node deploy-subscription-functions.mjs
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || 'uakkxaibujzxdiqzpnpr';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

console.log('🚀 Déploiement des Edge Functions Supabase\n');
console.log(`📋 Configuration:`);
console.log(`   Projet: ${PROJECT_ID}`);
console.log(`   URL Supabase: ${SUPABASE_URL}`);
console.log(`   Service Role Key: ${SERVICE_ROLE_KEY ? '✅ Présente' : '⚠️  MANQUANTE (utilisera auth CLI)'}`);

if (!SUPABASE_URL) {
  console.error('\n❌ Erreur: SUPABASE_URL n\'est pas défini.');
  console.error('   Vérifiez les variables d\'environnement dans .env');
  process.exit(1);
}

const functions = [
  'subscription-webhook',
  'renew-subscription'
];

console.log(`\n📦 Functions à déployer: ${functions.join(', ')}\n`);

try {
  // Vérifier que supabase CLI est installé
  let supabaseVersion;
  try {
    supabaseVersion = execSync('supabase --version', { stdio: 'pipe', encoding: 'utf-8' }).trim();
    console.log(`✅ supabase CLI détecté: ${supabaseVersion}\n`);
  } catch {
    console.error('❌ Erreur: supabase CLI non trouvé.');
    console.error('   Installez-le: npm install -g supabase');
    console.error('   ou utilisez: npx supabase@latest functions deploy ...');
    process.exit(1);
  }

  // Si pas de clé de service role, demander l'authentification
  if (!SERVICE_ROLE_KEY) {
    console.warn('\n⚠️  SUPABASE_SERVICE_ROLE_KEY n\'est pas défini.');
    console.warn('   Assurez-vous d\'être authentifié avec supabase login');
    console.warn('   Exécutez: supabase login\n');
  }

  // Déployer chaque fonction
  for (const func of functions) {
    console.log(`📤 Déploiement de ${func}...`);
    try {
      const deployCmd = `supabase functions deploy ${func} --project-ref ${PROJECT_ID}`;
      const deployEnv = {
        ...process.env,
        SUPABASE_URL
      };
      
      // Ajouter la clé de service role si présente
      if (SERVICE_ROLE_KEY) {
        deployEnv.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
      }
      
      execSync(deployCmd, {
        stdio: 'inherit',
        env: deployEnv
      });
      console.log(`✅ ${func} déployée avec succès\n`);
    } catch (error) {
      console.error(`❌ Erreur lors du déploiement de ${func}:`);
      console.error(error.message);
      console.error('\n💡 Conseils de dépannage:');
      console.error('   1. Vérifiez que supabase login est exécuté (si pas de service role key)');
      console.error('   2. Vérifiez que vous avez accès au projet:', PROJECT_ID);
      console.error('   3. Consultez les logs: supabase functions logs ' + func + ' --project-ref ' + PROJECT_ID);
      process.exit(1);
    }
  }

  console.log('✅ Déploiement complété!');
  console.log('\n📝 Prochaines étapes:');
  console.log('   1. Testez les functions avec curl (voir SUBSCRIPTION_SYSTEM_GUIDE.md)');
  console.log('   2. Vérifiez les logs: supabase functions logs subscription-webhook --project-ref ' + PROJECT_ID);

} catch (error) {
  console.error('❌ Erreur fatale:', error.message);
  process.exit(1);
}
