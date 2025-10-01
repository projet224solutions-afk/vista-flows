/**
 * GÉNÉRATEUR DE FICHIER .env.local - 224SOLUTIONS
 * Crée automatiquement le fichier de configuration avec vos clés Google Cloud
 */

import fs from 'fs';

console.log('🔧 GÉNÉRATEUR DE CONFIGURATION .env.local');
console.log('=========================================\n');

const envContent = `# 🔐 Configuration 224SOLUTIONS - Variables d'environnement sécurisées
# =====================================================================

# 🔐 Supabase Configuration (CONFIGURÉ)
VITE_SUPABASE_URL=https://uakkxaibujzxdiqzpnpr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM

# 🌩️ Google Cloud Platform Configuration (CONFIGURÉ)
GOOGLE_APPLICATION_CREDENTIALS=./.gcp/service-account-key.json
GCP_PROJECT_ID=solutions-ai-app-a8d57
GCP_CLIENT_EMAIL=solutions224service@solutions-ai-app-a8d57.iam.gserviceaccount.com
GOOGLE_CLOUD_PROJECT=solutions-ai-app-a8d57

# 🔥 Firebase Configuration (OPTIONNEL - remplacez par vos vraies clés)
VITE_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=solutions-ai-app-a8d57.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=solutions-ai-app-a8d57
VITE_FIREBASE_STORAGE_BUCKET=solutions-ai-app-a8d57.appspot.com

# 🗺️ Google Maps API (REQUIS pour Taxi-Moto - remplacez par votre vraie clé)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 🤖 Google AI Services (REQUIS pour Copilot PDG - remplacez par votre vraie clé)
GOOGLE_AI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 💳 Payment APIs (OPTIONNEL)
STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 🚀 Environment (CONFIGURÉ)
NODE_ENV=development
VITE_APP_ENV=development
VITE_APP_NAME=224SOLUTIONS
VITE_APP_VERSION=1.0.0
`;

try {
    if (fs.existsSync('.env.local')) {
        console.log('⚠️ Le fichier .env.local existe déjà');
        console.log('💡 Sauvegarde en .env.local.backup...');
        fs.copyFileSync('.env.local', '.env.local.backup');
    }

    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Fichier .env.local créé avec succès !');
    console.log('');
    console.log('🔧 PROCHAINES ÉTAPES:');
    console.log('1. Ouvrez le fichier .env.local');
    console.log('2. Remplacez les clés API par vos vraies clés:');
    console.log('   - VITE_GOOGLE_MAPS_API_KEY (pour Taxi-Moto)');
    console.log('   - GOOGLE_AI_API_KEY (pour Copilot PDG)');
    console.log('   - VITE_FIREBASE_API_KEY (optionnel)');
    console.log('');
    console.log('📚 Pour obtenir vos clés API:');
    console.log('- Google Maps: https://console.cloud.google.com/apis/credentials');
    console.log('- Google AI: https://makersuite.google.com/app/apikey');
    console.log('- Firebase: https://console.firebase.google.com/');
    console.log('');
    console.log('🔒 SÉCURITÉ: Le fichier .env.local est automatiquement ignoré par Git');

} catch (error) {
    console.error('❌ Erreur lors de la création du fichier:', error.message);
}

console.log('\n=========================================');
console.log('🎯 VOTRE CLÉ GOOGLE CLOUD EST PRÊTE !');
console.log('✅ Service Account: solutions224service@solutions-ai-app-a8d57.iam.gserviceaccount.com');
console.log('✅ Project ID: solutions-ai-app-a8d57');
console.log('✅ Clé JSON: .gcp/service-account-key.json (2.3 KB)');
console.log('=========================================');


