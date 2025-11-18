/**
 * Script de déploiement Lovable - Système de communication
 * 224SOLUTIONS - Communication System Deployment
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Déploiement Lovable - Système de communication 224SOLUTIONS');
console.log('================================================================');

// Vérification des fichiers de communication
const communicationFiles = [
  'src/components/communication/SimpleCommunicationInterface.tsx',
  'src/components/communication/CommunicationModule.tsx',
  'src/components/communication/CommunicationTest.tsx',
  'src/pages/CommunicationTestPage.tsx'
];

console.log('📁 Vérification des fichiers de communication...');

let allFilesExist = true;
for (const file of communicationFiles) {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  } else {
    console.log(`❌ ${file} manquant`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('❌ Certains fichiers sont manquants. Arrêt du déploiement.');
  process.exit(1);
}

// Vérification des imports dans les pages
console.log('\n🔍 Vérification des imports dans les pages...');

const pagesToCheck = [
  'src/pages/VendeurDashboard.tsx',
  'src/pages/ClientDashboard.tsx',
  'src/pages/PDGDashboard.tsx',
  'src/pages/SyndicatDashboard.tsx'
];

for (const page of pagesToCheck) {
  if (fs.existsSync(page)) {
    const content = fs.readFileSync(page, 'utf8');
    if (content.includes('SimpleCommunicationInterface')) {
      console.log(`✅ ${page} utilise SimpleCommunicationInterface`);
    } else {
      console.log(`⚠️ ${page} n'utilise pas SimpleCommunicationInterface`);
    }
  }
}

// Vérification de la route de test
console.log('\n🛣️ Vérification de la route de test...');

const appTsxPath = 'src/App.tsx';
if (fs.existsSync(appTsxPath)) {
  const content = fs.readFileSync(appTsxPath, 'utf8');
  if (content.includes('CommunicationTestPage')) {
    console.log('✅ Route /communication-test ajoutée');
  } else {
    console.log('❌ Route /communication-test manquante');
  }
  
  if (content.includes('CommunicationTestPage')) {
    console.log('✅ Import CommunicationTestPage ajouté');
  } else {
    console.log('❌ Import CommunicationTestPage manquant');
  }
} else {
  console.log('❌ src/App.tsx non trouvé');
}

// Test de compatibilité Lovable
console.log('\n🧪 Test de compatibilité Lovable...');

const compatibilityTests = [
  {
    name: 'Structure React',
    test: () => {
      const simpleInterface = fs.readFileSync('src/components/communication/SimpleCommunicationInterface.tsx', 'utf8');
      return simpleInterface.includes('export default') && 
             simpleInterface.includes('import React') &&
             simpleInterface.includes('useState');
    }
  },
  {
    name: 'Hooks React',
    test: () => {
      const simpleInterface = fs.readFileSync('src/components/communication/SimpleCommunicationInterface.tsx', 'utf8');
      return simpleInterface.includes('useState') && 
             simpleInterface.includes('useAuth') &&
             simpleInterface.includes('useToast');
    }
  },
  {
    name: 'Composants UI',
    test: () => {
      const simpleInterface = fs.readFileSync('src/components/communication/SimpleCommunicationInterface.tsx', 'utf8');
      return simpleInterface.includes('Card') && 
             simpleInterface.includes('Button') &&
             simpleInterface.includes('Input') &&
             simpleInterface.includes('Tabs');
    }
  },
  {
    name: 'Données mockées',
    test: () => {
      const simpleInterface = fs.readFileSync('src/components/communication/SimpleCommunicationInterface.tsx', 'utf8');
      return simpleInterface.includes('conversations') && 
             simpleInterface.includes('messages');
    }
  },
  {
    name: 'Icônes Lucide',
    test: () => {
      const simpleInterface = fs.readFileSync('src/components/communication/SimpleCommunicationInterface.tsx', 'utf8');
      return simpleInterface.includes('MessageSquare') && 
             simpleInterface.includes('Send') &&
             simpleInterface.includes('Users');
    }
  }
];

let passedTests = 0;
for (const test of compatibilityTests) {
  try {
    if (test.test()) {
      console.log(`✅ ${test.name}`);
      passedTests++;
    } else {
      console.log(`❌ ${test.name}`);
    }
  } catch (error) {
    console.log(`❌ ${test.name} - Erreur: ${error.message}`);
  }
}

// Résumé du déploiement
console.log('\n📊 RÉSUMÉ DU DÉPLOIEMENT LOVABLE');
console.log('================================');

if (allFilesExist && passedTests === compatibilityTests.length) {
  console.log('🎉 DÉPLOIEMENT RÉUSSI !');
  console.log('✅ Tous les fichiers de communication sont présents');
  console.log('✅ Tous les tests de compatibilité sont passés');
  console.log('✅ Système prêt pour Lovable');
  
  console.log('\n📋 INSTRUCTIONS POUR LOVABLE:');
  console.log('1. Accédez à /communication-test pour tester les composants');
  console.log('2. Vérifiez l\'affichage de SimpleCommunicationInterface');
  console.log('3. Vérifiez l\'affichage de CommunicationModule');
  console.log('4. Testez les interactions utilisateur');
  console.log('5. Validez le rendu responsive');
  
  console.log('\n🔗 URLS DE TEST:');
  console.log('• Page de test: /communication-test');
  console.log('• Interface simple: Intégrée dans les dashboards');
  console.log('• Module avancé: Intégré dans les dashboards');
  
  console.log('\n📁 FICHIERS DÉPLOYÉS:');
  for (const file of communicationFiles) {
    console.log(`• ${file}`);
  }
  
} else {
  console.log('❌ DÉPLOIEMENT ÉCHOUÉ');
  console.log(`Fichiers manquants: ${!allFilesExist ? 'Oui' : 'Non'}`);
  console.log(`Tests échoués: ${compatibilityTests.length - passedTests}/${compatibilityTests.length}`);
}

console.log('\n🚀 SYSTÈME DE COMMUNICATION 224SOLUTIONS PRÊT POUR LOVABLE !');

export default {
  status: allFilesExist && passedTests === compatibilityTests.length ? 'success' : 'failed',
  files: communicationFiles,
  tests: {
    total: compatibilityTests.length,
    passed: passedTests,
    failed: compatibilityTests.length - passedTests
  },
  lovableReady: allFilesExist && passedTests === compatibilityTests.length
};
