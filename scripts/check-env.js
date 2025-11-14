#!/usr/bin/env node

/**
 * 🔍 Script de vérification des variables d'environnement
 * Détecte les variables manquantes avant le build Netlify
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_ENCRYPTION_KEY'
];

const optionalEnvVars = [
  'VITE_MAPBOX_TOKEN',
  'VITE_FIREBASE_API_KEY',
  'VITE_EMAILJS_SERVICE_ID',
  'VITE_GOOGLE_CLOUD_API_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY'
];

console.log('🔍 Vérification des variables d\'environnement...\n');

let hasErrors = false;
let hasWarnings = false;

// Vérifier les variables obligatoires
console.log('✅ Variables OBLIGATOIRES:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === 'undefined' || value === '') {
    console.error(`❌ ERREUR: ${varName} est manquante ou vide`);
    hasErrors = true;
  } else {
    // Masquer la valeur pour la sécurité
    const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`   ✓ ${varName}: ${maskedValue}`);
  }
});

console.log('\n⚠️  Variables OPTIONNELLES:');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value === 'undefined' || value === '') {
    console.warn(`   ⚠️  ${varName} non définie (optionnelle)`);
    hasWarnings = true;
  } else {
    const maskedValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    console.log(`   ✓ ${varName}: ${maskedValue}`);
  }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.error('\n❌ ÉCHEC: Variables obligatoires manquantes!');
  console.error('📝 Ajoutez-les dans Netlify: Site settings → Environment variables');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('\n⚠️  Certaines variables optionnelles sont manquantes.');
  console.warn('   L\'application fonctionnera mais certaines fonctionnalités peuvent être limitées.');
}

console.log('\n✅ Toutes les variables obligatoires sont présentes!');
console.log('🚀 Le build peut continuer...\n');
process.exit(0);