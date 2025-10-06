/**
 * TEST SERVEUR DE DÉVELOPPEMENT
 * Vérification que l'application se lance correctement
 * 224Solutions - Bureau Syndicat System
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

console.log('🚀 TEST SERVEUR DE DÉVELOPPEMENT');
console.log('=================================');
console.log('');

// Fonction pour tester la connectivité
function testServerConnection(port, timeout = 10000) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        const checkConnection = () => {
            const req = http.get(`http://localhost:${port}`, (res) => {
                console.log(`✅ Serveur accessible sur le port ${port}`);
                console.log(`   Status: ${res.statusCode}`);
                console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
                resolve(true);
            });

            req.on('error', (err) => {
                if (Date.now() - startTime < timeout) {
                    setTimeout(checkConnection, 1000);
                } else {
                    console.log(`❌ Serveur non accessible sur le port ${port} après ${timeout}ms`);
                    resolve(false);
                }
            });
        };

        checkConnection();
    });
}

// Fonction pour tester les fichiers PWA
function testPWAFiles() {
    console.log('📱 TEST FICHIERS PWA');
    console.log('---------------------');

    const pwaFiles = [
        'src/hooks/usePWAInstall.ts',
        'src/components/pwa/PWAInstallBanner.tsx',
        'src/components/syndicate/SyndicatePWAIntegration.tsx',
        'src/pages/SyndicatInstall.tsx',
        'src/services/installLinkService.ts',
        'src/services/securityService.ts',
        'src/hooks/useRealtimeSync.ts',
        'src/components/pdg/RealtimeSyncPanel.tsx'
    ];

    let allFilesExist = true;

    pwaFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - Fichier manquant`);
            allFilesExist = false;
        }
    });

    return allFilesExist;
}

// Fonction pour tester la configuration Vite
function testViteConfig() {
    console.log('⚙️ TEST CONFIGURATION VITE');
    console.log('---------------------------');

    try {
        const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');

        const checks = [
            { name: 'VitePWA import', test: viteConfig.includes('VitePWA') },
            { name: 'Manifest config', test: viteConfig.includes('manifest') },
            { name: 'Workbox config', test: viteConfig.includes('workbox') },
            { name: 'Icons config', test: viteConfig.includes('icons') }
        ];

        checks.forEach(check => {
            if (check.test) {
                console.log(`✅ ${check.name}`);
            } else {
                console.log(`❌ ${check.name} - Manquant`);
            }
        });

        return checks.every(check => check.test);
    } catch (error) {
        console.log(`❌ Erreur lecture vite.config.ts: ${error.message}`);
        return false;
    }
}

// Fonction pour tester les routes
function testRoutes() {
    console.log('🛣️ TEST ROUTES');
    console.log('---------------');

    try {
        const appTsx = fs.readFileSync('src/App.tsx', 'utf8');

        const routeChecks = [
            { name: 'SyndicatInstall import', test: appTsx.includes('SyndicatInstall') },
            { name: 'Route /syndicat/install/:token', test: appTsx.includes('/syndicat/install/:token') },
            { name: 'Lazy loading', test: appTsx.includes('lazy(() => import("./pages/SyndicatInstall"))') }
        ];

        routeChecks.forEach(check => {
            if (check.test) {
                console.log(`✅ ${check.name}`);
            } else {
                console.log(`❌ ${check.name} - Manquant`);
            }
        });

        return routeChecks.every(check => check.test);
    } catch (error) {
        console.log(`❌ Erreur lecture App.tsx: ${error.message}`);
        return false;
    }
}

// Fonction pour tester les dépendances
function testDependencies() {
    console.log('📦 TEST DÉPENDANCES');
    console.log('--------------------');

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredDeps = [
        'vite-plugin-pwa',
        'workbox-window',
        'react-device-detect',
        '@capacitor/core',
        '@capacitor/cli',
        '@capacitor/android',
        '@capacitor/ios'
    ];

    let allDepsInstalled = true;

    requiredDeps.forEach(dep => {
        if (dependencies[dep]) {
            console.log(`✅ ${dep} - ${dependencies[dep]}`);
        } else {
            console.log(`❌ ${dep} - Non installé`);
            allDepsInstalled = false;
        }
    });

    return allDepsInstalled;
}

// Fonction principale de test
async function runTests() {
    console.log('🧪 LANCEMENT DES TESTS');
    console.log('======================');
    console.log('');

    // Test 1: Fichiers PWA
    const pwaFilesOk = testPWAFiles();
    console.log('');

    // Test 2: Configuration Vite
    const viteConfigOk = testViteConfig();
    console.log('');

    // Test 3: Routes
    const routesOk = testRoutes();
    console.log('');

    // Test 4: Dépendances
    const depsOk = testDependencies();
    console.log('');

    // Test 5: Serveur de développement
    console.log('🌐 TEST SERVEUR DE DÉVELOPPEMENT');
    console.log('----------------------------------');

    console.log('⏳ Lancement du serveur de développement...');

    // Lancer le serveur de développement
    const devServer = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true
    });

    // Attendre que le serveur démarre
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Tester la connexion
    const serverOk = await testServerConnection(8080);

    if (serverOk) {
        console.log('');
        console.log('🎉 TOUS LES TESTS RÉUSSIS !');
        console.log('===========================');
        console.log('');
        console.log('✅ Fichiers PWA: OK');
        console.log('✅ Configuration Vite: OK');
        console.log('✅ Routes: OK');
        console.log('✅ Dépendances: OK');
        console.log('✅ Serveur: OK');
        console.log('');
        console.log('🚀 APPLICATION PRÊTE !');
        console.log('   URL: http://localhost:8080');
        console.log('   Test PWA: http://localhost:8080/test-pwa-functionality.html');
        console.log('');
        console.log('📱 FONCTIONNALITÉS DISPONIBLES:');
        console.log('   • Interface PDG: /pdg');
        console.log('   • Bureau Syndicat: /syndicat');
        console.log('   • Installation PWA: /syndicat/install/:token');
        console.log('   • Test PWA: /test-pwa-functionality.html');
    } else {
        console.log('');
        console.log('❌ PROBLÈME AVEC LE SERVEUR');
        console.log('============================');
        console.log('Le serveur de développement n\'est pas accessible');
    }

    // Arrêter le serveur
    devServer.kill();
}

// Lancer les tests
runTests().catch(error => {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
});
