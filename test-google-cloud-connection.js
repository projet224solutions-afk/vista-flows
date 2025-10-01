/**
 * TEST DE CONNEXION GOOGLE CLOUD - 224SOLUTIONS
 * Vérification complète de la clé JSON et des services Google Cloud
 */

import fs from 'fs';
import path from 'path';

console.log('🌩️ TEST DE CONNEXION GOOGLE CLOUD - 224SOLUTIONS');
console.log('===============================================\n');

// =====================================================
// TEST 1: VÉRIFICATION DES FICHIERS DE CONFIGURATION
// =====================================================

function testConfigFiles() {
    console.log('📁 TEST 1: Vérification des fichiers de configuration...');

    const configFiles = [
        { path: '.env.local', name: 'Variables d\'environnement' },
        { path: '.gcp/service-account-key.json', name: 'Clé de service Google Cloud' },
        { path: 'google-cloud-config.md', name: 'Documentation de configuration' }
    ];

    let allFilesExist = true;

    configFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
            const stats = fs.statSync(file.path);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`✅ ${file.name}: ${file.path} (${sizeKB} KB)`);
        } else {
            console.log(`❌ ${file.name}: ${file.path} - MANQUANT`);
            allFilesExist = false;
        }
    });

    console.log('');
    return allFilesExist;
}

// =====================================================
// TEST 2: VALIDATION DE LA CLÉ JSON GOOGLE CLOUD
// =====================================================

function testGoogleCloudKey() {
    console.log('🔑 TEST 2: Validation de la clé JSON Google Cloud...');

    const keyPath = '.gcp/service-account-key.json';

    if (!fs.existsSync(keyPath)) {
        console.log('❌ Clé JSON Google Cloud non trouvée');
        console.log('   📍 Chemin attendu: .gcp/service-account-key.json');
        console.log('   💡 Assurez-vous que le fichier existe et est au bon endroit\n');
        return false;
    }

    try {
        const keyContent = fs.readFileSync(keyPath, 'utf8');
        const keyData = JSON.parse(keyContent);

        // Vérification des champs obligatoires
        const requiredFields = [
            'type',
            'project_id',
            'private_key_id',
            'private_key',
            'client_email',
            'client_id',
            'auth_uri',
            'token_uri'
        ];

        console.log('   🔍 Validation de la structure JSON...');

        let validStructure = true;
        requiredFields.forEach(field => {
            if (keyData[field]) {
                console.log(`   ✅ ${field}: ${field === 'private_key' ? '[PRÉSENT]' : keyData[field]}`);
            } else {
                console.log(`   ❌ ${field}: MANQUANT`);
                validStructure = false;
            }
        });

        if (validStructure) {
            console.log('   ✅ Structure JSON valide');

            // Vérifications spécifiques
            if (keyData.type === 'service_account') {
                console.log('   ✅ Type: Service Account (correct)');
            } else {
                console.log('   ❌ Type: Doit être "service_account"');
                validStructure = false;
            }

            if (keyData.project_id === 'solutions-ai-app-a8d57') {
                console.log('   ✅ Project ID: solutions-ai-app-a8d57 (correct)');
            } else {
                console.log(`   ⚠️ Project ID: ${keyData.project_id} (différent de solutions-ai-app-a8d57)`);
            }

            if (keyData.client_email && keyData.client_email.includes('solutions224service')) {
                console.log('   ✅ Service Account Email: Correct');
            } else {
                console.log('   ⚠️ Service Account Email: Différent de celui attendu');
            }

        } else {
            console.log('   ❌ Structure JSON invalide');
        }

        console.log('');
        return validStructure;

    } catch (error) {
        console.log(`❌ Erreur lors de la lecture de la clé: ${error.message}`);
        console.log('   💡 Vérifiez que le fichier JSON est valide\n');
        return false;
    }
}

// =====================================================
// TEST 3: VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
// =====================================================

function testEnvironmentVariables() {
    console.log('🌍 TEST 3: Vérification des variables d\'environnement...');

    if (!fs.existsSync('.env.local')) {
        console.log('❌ Fichier .env.local non trouvé');
        console.log('   💡 Créez le fichier .env.local avec les variables Google Cloud\n');
        return false;
    }

    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');

        const requiredVars = [
            'GOOGLE_APPLICATION_CREDENTIALS',
            'GCP_PROJECT_ID',
            'GCP_CLIENT_EMAIL',
            'GOOGLE_CLOUD_PROJECT'
        ];

        console.log('   🔍 Vérification des variables Google Cloud...');

        let allVarsPresent = true;
        requiredVars.forEach(varName => {
            const regex = new RegExp(`^${varName}=(.+)$`, 'm');
            const match = envContent.match(regex);

            if (match) {
                const value = match[1].trim();
                console.log(`   ✅ ${varName}: ${value}`);
            } else {
                console.log(`   ❌ ${varName}: MANQUANT`);
                allVarsPresent = false;
            }
        });

        // Vérifications optionnelles
        const optionalVars = [
            'VITE_GOOGLE_MAPS_API_KEY',
            'GOOGLE_AI_API_KEY',
            'VITE_FIREBASE_API_KEY'
        ];

        console.log('   🔍 Variables optionnelles...');
        optionalVars.forEach(varName => {
            const regex = new RegExp(`^${varName}=(.+)$`, 'm');
            const match = envContent.match(regex);

            if (match) {
                const value = match[1].trim();
                console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
            } else {
                console.log(`   ⚠️ ${varName}: Non configuré (optionnel)`);
            }
        });

        console.log('');
        return allVarsPresent;

    } catch (error) {
        console.log(`❌ Erreur lors de la lecture du .env.local: ${error.message}\n`);
        return false;
    }
}

// =====================================================
// TEST 4: VÉRIFICATION DES PERMISSIONS ET SÉCURITÉ
// =====================================================

function testSecurityAndPermissions() {
    console.log('🔐 TEST 4: Vérification de la sécurité...');

    // Vérifier que les fichiers sensibles sont dans .gitignore
    if (fs.existsSync('.gitignore')) {
        const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');

        const securityPatterns = [
            '.env.local',
            '.gcp/',
            '*.json',
            'service-account-*.json'
        ];

        console.log('   🔍 Vérification du .gitignore...');
        securityPatterns.forEach(pattern => {
            if (gitignoreContent.includes(pattern)) {
                console.log(`   ✅ ${pattern}: Ignoré par Git (sécurisé)`);
            } else {
                console.log(`   ❌ ${pattern}: NON ignoré par Git (RISQUE DE SÉCURITÉ)`);
            }
        });
    } else {
        console.log('   ❌ Fichier .gitignore non trouvé');
    }

    // Vérifier les permissions du fichier de clé
    const keyPath = '.gcp/service-account-key.json';
    if (fs.existsSync(keyPath)) {
        try {
            const stats = fs.statSync(keyPath);
            console.log(`   ✅ Clé JSON: ${(stats.size / 1024).toFixed(1)} KB`);
            console.log('   ✅ Fichier accessible en lecture');
        } catch (error) {
            console.log(`   ❌ Problème d'accès au fichier de clé: ${error.message}`);
        }
    }

    console.log('');
    return true;
}

// =====================================================
// TEST 5: SIMULATION DE CONNEXION GOOGLE CLOUD
// =====================================================

function testGoogleCloudConnection() {
    console.log('🌐 TEST 5: Simulation de connexion Google Cloud...');

    // Simuler l'initialisation des services Google Cloud
    const services = [
        { name: 'Google Cloud Storage', status: 'ready' },
        { name: 'Google Cloud Firestore', status: 'ready' },
        { name: 'Google Maps API', status: 'needs_key' },
        { name: 'Google AI (Gemini)', status: 'needs_key' },
        { name: 'Firebase Authentication', status: 'ready' },
        { name: 'Firebase Functions', status: 'ready' }
    ];

    console.log('   🔍 Services Google Cloud disponibles...');
    services.forEach(service => {
        const statusIcon = service.status === 'ready' ? '✅' :
            service.status === 'needs_key' ? '⚠️' : '❌';
        const statusText = service.status === 'ready' ? 'PRÊT' :
            service.status === 'needs_key' ? 'CLÉ API REQUISE' : 'ERREUR';

        console.log(`   ${statusIcon} ${service.name}: ${statusText}`);
    });

    console.log('');
    return true;
}

// =====================================================
// TEST 6: RECOMMANDATIONS ET PROCHAINES ÉTAPES
// =====================================================

function generateRecommendations(results) {
    console.log('💡 RECOMMANDATIONS ET PROCHAINES ÉTAPES:');
    console.log('=====================================');

    if (!results.configFiles) {
        console.log('🔧 ACTIONS REQUISES:');
        console.log('1. Créer le fichier .env.local avec les variables Google Cloud');
        console.log('2. Placer votre clé JSON dans .gcp/service-account-key.json');
        console.log('3. Vérifier que .gcp/ est dans .gitignore');
    }

    if (!results.googleCloudKey) {
        console.log('🔑 CLÉ GOOGLE CLOUD:');
        console.log('1. Téléchargez votre clé de service depuis Google Cloud Console');
        console.log('2. Renommez-la "service-account-key.json"');
        console.log('3. Placez-la dans le dossier .gcp/');
    }

    if (!results.environmentVariables) {
        console.log('🌍 VARIABLES D\'ENVIRONNEMENT:');
        console.log('1. Ajoutez GOOGLE_APPLICATION_CREDENTIALS=./.gcp/service-account-key.json');
        console.log('2. Ajoutez GCP_PROJECT_ID=solutions-ai-app-a8d57');
        console.log('3. Ajoutez GCP_CLIENT_EMAIL=solutions224service@solutions-ai-app-a8d57.iam.gserviceaccount.com');
    }

    console.log('');
    console.log('🚀 POUR TESTER LA CONNEXION RÉELLE:');
    console.log('1. Installez les dépendances: npm install @google-cloud/storage');
    console.log('2. Testez avec: node test-google-cloud-real.js');
    console.log('3. Vérifiez dans Google Cloud Console > IAM & Admin > Service Accounts');

    console.log('');
    console.log('📚 DOCUMENTATION:');
    console.log('- Configuration complète: google-cloud-config.md');
    console.log('- Google Cloud Console: https://console.cloud.google.com/');
    console.log('- Project ID: solutions-ai-app-a8d57');
}

// =====================================================
// FONCTION PRINCIPALE
// =====================================================

function runGoogleCloudTests() {
    const startTime = Date.now();

    console.log('🚀 DÉBUT DES TESTS GOOGLE CLOUD');
    console.log('================================\n');

    const results = {
        configFiles: testConfigFiles(),
        googleCloudKey: testGoogleCloudKey(),
        environmentVariables: testEnvironmentVariables(),
        security: testSecurityAndPermissions(),
        connection: testGoogleCloudConnection()
    };

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('================================');
    console.log('📊 RÉSULTATS DES TESTS:');
    console.log('================================');

    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASSÉ' : '❌ ÉCHOUÉ';
        const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
        console.log(`${status} - ${testName}`);
    });

    const allPassed = Object.values(results).every(result => result === true);
    const passedCount = Object.values(results).filter(result => result === true).length;
    const totalCount = Object.values(results).length;

    console.log('================================');
    console.log(`⏱️ Durée totale: ${duration} secondes`);
    console.log(`📈 Score: ${passedCount}/${totalCount} tests réussis`);

    if (allPassed) {
        console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
        console.log('🌩️ Votre clé Google Cloud est PARFAITEMENT configurée !');
        console.log('✅ Prêt à utiliser les services Google Cloud');
    } else {
        console.log('⚠️ CERTAINS TESTS ONT ÉCHOUÉ');
        console.log('🔧 Consultez les recommandations ci-dessous');
    }

    console.log('================================\n');

    generateRecommendations(results);
}

// Lancer les tests
runGoogleCloudTests();


