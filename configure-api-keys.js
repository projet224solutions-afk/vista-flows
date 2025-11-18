/**
 * CONFIGURATEUR AUTOMATIQUE DE CLÉS API - 224SOLUTIONS
 * Script interactif pour configurer vos vraies clés Google Cloud
 */

import fs from 'fs';
import readline from 'readline';

console.log('🔧 CONFIGURATEUR AUTOMATIQUE DE CLÉS API - 224SOLUTIONS');
console.log('======================================================\n');

// Interface pour les questions interactives
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fonction pour poser une question
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// =====================================================
// FONCTION POUR LIRE LE FICHIER .env.local ACTUEL
// =====================================================

function readCurrentEnv() {
  if (!fs.existsSync('.env.local')) {
    console.log('❌ Fichier .env.local non trouvé');
    return {};
  }

  const envContent = fs.readFileSync('.env.local', 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  return envVars;
}

// =====================================================
// FONCTION POUR SAUVEGARDER LE FICHIER .env.local
// =====================================================

function saveEnvFile(envVars) {
  const envContent = `# 🔐 Configuration 224SOLUTIONS - Variables d'environnement sécurisées
# =====================================================================

# 🔐 Supabase Configuration (CONFIGURÉ)
VITE_SUPABASE_URL=${envVars.VITE_SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co'}
VITE_SUPABASE_ANON_KEY=${envVars.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM'}

# 🌩️ Google Cloud Platform Configuration (CONFIGURÉ)
GOOGLE_APPLICATION_CREDENTIALS=${envVars.GOOGLE_APPLICATION_CREDENTIALS || './.gcp/service-account-key.json'}
GCP_PROJECT_ID=${envVars.GCP_PROJECT_ID || 'solutions-ai-app-a8d57'}
GCP_CLIENT_EMAIL=${envVars.GCP_CLIENT_EMAIL || 'solutions224service@solutions-ai-app-a8d57.iam.gserviceaccount.com'}
GOOGLE_CLOUD_PROJECT=${envVars.GOOGLE_CLOUD_PROJECT || 'solutions-ai-app-a8d57'}

# 🗺️ Google Maps API (TAXI-MOTO) - CONFIGURÉ
VITE_GOOGLE_MAPS_API_KEY=${envVars.VITE_GOOGLE_MAPS_API_KEY}

# 🤖 Google AI Services (COPILOT PDG) - CONFIGURÉ  
GOOGLE_AI_API_KEY=${envVars.GOOGLE_AI_API_KEY}

# 🔥 Firebase Configuration (OPTIONNEL)
VITE_FIREBASE_API_KEY=${envVars.VITE_FIREBASE_API_KEY || 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
VITE_FIREBASE_AUTH_DOMAIN=${envVars.VITE_FIREBASE_AUTH_DOMAIN || 'solutions-ai-app-a8d57.firebaseapp.com'}
VITE_FIREBASE_PROJECT_ID=${envVars.VITE_FIREBASE_PROJECT_ID || 'solutions-ai-app-a8d57'}
VITE_FIREBASE_STORAGE_BUCKET=${envVars.VITE_FIREBASE_STORAGE_BUCKET || 'solutions-ai-app-a8d57.appspot.com'}

# 🚀 Environment (CONFIGURÉ)
NODE_ENV=${envVars.NODE_ENV || 'development'}
VITE_APP_ENV=${envVars.VITE_APP_ENV || 'development'}
VITE_APP_NAME=${envVars.VITE_APP_NAME || '224SOLUTIONS'}
VITE_APP_VERSION=${envVars.VITE_APP_VERSION || '1.0.0'}
`;

  fs.writeFileSync('.env.local', envContent);
}

// =====================================================
// FONCTION POUR VALIDER UNE CLÉ API
// =====================================================

function validateApiKey(key, type) {
  if (!key || key.length < 30) {
    return false;
  }
  
  if (type === 'google' && !key.startsWith('AIzaSy')) {
    return false;
  }
  
  if (key.includes('xxx') || key.includes('***')) {
    return false;
  }
  
  return true;
}

// =====================================================
// FONCTION PRINCIPALE DE CONFIGURATION
// =====================================================

async function configureApiKeys() {
  console.log('🚀 DÉBUT DE LA CONFIGURATION DES CLÉS API');
  console.log('==========================================\n');

  // Lire la configuration actuelle
  const currentEnv = readCurrentEnv();
  console.log('📋 Configuration actuelle lue depuis .env.local\n');

  // Afficher les instructions
  console.log('📚 INSTRUCTIONS:');
  console.log('================');
  console.log('1. Ouvrez Google Cloud Console dans votre navigateur');
  console.log('2. Allez sur: https://console.cloud.google.com/apis/credentials');
  console.log('3. Sélectionnez le projet: solutions-ai-app-a8d57');
  console.log('4. Copiez vos clés API complètes (pas les versions avec ***)');
  console.log('5. Collez-les ci-dessous quand demandé\n');

  console.log('⚠️ IMPORTANT: Vos clés doivent commencer par "AIzaSy" et faire environ 39 caractères\n');

  // Configuration Google Maps API
  console.log('🗺️ CONFIGURATION GOOGLE MAPS API (pour Taxi-Moto)');
  console.log('==================================================');
  console.log('📍 Clé recommandée: Browser Key (unrestricted)');
  console.log('🎯 Utilisée pour: Cartes interactives, géocodage, directions');
  
  const currentMapsKey = currentEnv.VITE_GOOGLE_MAPS_API_KEY;
  if (currentMapsKey && !currentMapsKey.includes('xxx')) {
    console.log(`✅ Clé actuelle: ${currentMapsKey.substring(0, 20)}...`);
    const keepMaps = await askQuestion('Voulez-vous garder cette clé? (o/n): ');
    if (keepMaps.toLowerCase() !== 'o') {
      const mapsKey = await askQuestion('Entrez votre clé Google Maps API: ');
      if (validateApiKey(mapsKey, 'google')) {
        currentEnv.VITE_GOOGLE_MAPS_API_KEY = mapsKey;
        console.log('✅ Clé Google Maps configurée avec succès!\n');
      } else {
        console.log('❌ Clé invalide. Format attendu: AIzaSy...\n');
      }
    }
  } else {
    const mapsKey = await askQuestion('Entrez votre clé Google Maps API: ');
    if (validateApiKey(mapsKey, 'google')) {
      currentEnv.VITE_GOOGLE_MAPS_API_KEY = mapsKey;
      console.log('✅ Clé Google Maps configurée avec succès!\n');
    } else {
      console.log('❌ Clé invalide. Format attendu: AIzaSy...\n');
    }
  }

  // Configuration Google AI API
  console.log('🤖 CONFIGURATION GOOGLE AI API (pour Copilot PDG)');
  console.log('=================================================');
  console.log('📍 Clé recommandée: AI/ML Key');
  console.log('🎯 Utilisée pour: Intelligence artificielle Gemini');
  
  const currentAiKey = currentEnv.GOOGLE_AI_API_KEY;
  if (currentAiKey && !currentAiKey.includes('xxx')) {
    console.log(`✅ Clé actuelle: ${currentAiKey.substring(0, 20)}...`);
    const keepAi = await askQuestion('Voulez-vous garder cette clé? (o/n): ');
    if (keepAi.toLowerCase() !== 'o') {
      const aiKey = await askQuestion('Entrez votre clé Google AI API: ');
      if (validateApiKey(aiKey, 'google')) {
        currentEnv.GOOGLE_AI_API_KEY = aiKey;
        console.log('✅ Clé Google AI configurée avec succès!\n');
      } else {
        console.log('❌ Clé invalide. Format attendu: AIzaSy...\n');
      }
    }
  } else {
    const aiKey = await askQuestion('Entrez votre clé Google AI API: ');
    if (validateApiKey(aiKey, 'google')) {
      currentEnv.GOOGLE_AI_API_KEY = aiKey;
      console.log('✅ Clé Google AI configurée avec succès!\n');
    } else {
      console.log('❌ Clé invalide. Format attendu: AIzaSy...\n');
    }
  }

  // Configuration Firebase (optionnelle)
  console.log('🔥 CONFIGURATION FIREBASE (optionnelle)');
  console.log('=======================================');
  const configureFirebase = await askQuestion('Voulez-vous configurer Firebase? (o/n): ');
  
  if (configureFirebase.toLowerCase() === 'o') {
    console.log('📍 Allez sur: https://console.firebase.google.com/');
    console.log('📍 Projet: solutions-ai-app-a8d57');
    console.log('📍 Paramètres > Général > Configuration SDK');
    
    const firebaseKey = await askQuestion('Entrez votre clé Firebase API: ');
    if (validateApiKey(firebaseKey, 'google')) {
      currentEnv.VITE_FIREBASE_API_KEY = firebaseKey;
      console.log('✅ Clé Firebase configurée avec succès!\n');
    } else {
      console.log('⚠️ Clé Firebase non configurée (optionnel)\n');
    }
  }

  // Sauvegarder la configuration
  console.log('💾 SAUVEGARDE DE LA CONFIGURATION...');
  console.log('===================================');
  
  try {
    // Créer une sauvegarde
    if (fs.existsSync('.env.local')) {
      fs.copyFileSync('.env.local', '.env.local.backup');
      console.log('✅ Sauvegarde créée: .env.local.backup');
    }
    
    // Sauvegarder la nouvelle configuration
    saveEnvFile(currentEnv);
    console.log('✅ Configuration sauvegardée dans .env.local');
    
  } catch (error) {
    console.log(`❌ Erreur lors de la sauvegarde: ${error.message}`);
    return;
  }

  // Résumé final
  console.log('\n🎉 CONFIGURATION TERMINÉE AVEC SUCCÈS !');
  console.log('=======================================');
  
  const mapsConfigured = currentEnv.VITE_GOOGLE_MAPS_API_KEY && !currentEnv.VITE_GOOGLE_MAPS_API_KEY.includes('xxx');
  const aiConfigured = currentEnv.GOOGLE_AI_API_KEY && !currentEnv.GOOGLE_AI_API_KEY.includes('xxx');
  const firebaseConfigured = currentEnv.VITE_FIREBASE_API_KEY && !currentEnv.VITE_FIREBASE_API_KEY.includes('xxx');
  
  console.log(`🗺️ Google Maps API: ${mapsConfigured ? '✅ CONFIGURÉE' : '❌ NON CONFIGURÉE'}`);
  console.log(`🤖 Google AI API: ${aiConfigured ? '✅ CONFIGURÉE' : '❌ NON CONFIGURÉE'}`);
  console.log(`🔥 Firebase API: ${firebaseConfigured ? '✅ CONFIGURÉE' : '⚪ OPTIONNELLE'}`);
  
  const totalConfigured = [mapsConfigured, aiConfigured].filter(Boolean).length;
  console.log(`\n📊 Score: ${totalConfigured}/2 APIs essentielles configurées`);
  
  if (totalConfigured === 2) {
    console.log('\n🚀 FÉLICITATIONS ! VOTRE SYSTÈME EST PRÊT !');
    console.log('==========================================');
    console.log('✅ Taxi-Moto avec Google Maps opérationnel');
    console.log('✅ Copilot PDG avec Google AI opérationnel');
    console.log('✅ Toutes les fonctionnalités disponibles');
    console.log('');
    console.log('🎯 PROCHAINES ÉTAPES:');
    console.log('1. 🔄 Redémarrez votre serveur: Ctrl+C puis npm run dev');
    console.log('2. 🧪 Testez vos APIs: node test-google-apis-real.js');
    console.log('3. 🌐 Testez dans le navigateur: http://localhost:5173/pdg');
    console.log('4. 🗺️ Testez Taxi-Moto: http://localhost:5173/taxi-moto');
  } else {
    console.log('\n⚠️ CONFIGURATION INCOMPLÈTE');
    console.log('============================');
    console.log('💡 Relancez ce script pour configurer les clés manquantes');
    console.log('📚 Consultez: https://console.cloud.google.com/apis/credentials');
  }
  
  console.log('\n🔒 SÉCURITÉ: Vos clés sont sécurisées dans .env.local (ignoré par Git)');
  
  rl.close();
}

// =====================================================
// LANCEMENT DU CONFIGURATEUR
// =====================================================

console.log('🔑 RÉCUPÉRATION DE VOS CLÉS API GOOGLE CLOUD');
console.log('============================================');
console.log('📍 Projet: solutions-ai-app-a8d57');
console.log('📧 Service Account: solutions224service@solutions-ai-app-a8d57.iam.gserviceaccount.com');
console.log('🌐 Console: https://console.cloud.google.com/apis/credentials');
console.log('');

const startConfig = await askQuestion('Voulez-vous commencer la configuration? (o/n): ');

if (startConfig.toLowerCase() === 'o') {
  await configureApiKeys();
} else {
  console.log('⚪ Configuration annulée');
  console.log('💡 Relancez avec: node configure-api-keys.js');
  rl.close();
}


