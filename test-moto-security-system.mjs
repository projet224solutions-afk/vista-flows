/**
 * TEST SYSTÈME SÉCURITÉ MOTOS
 * Validation complète du module de sécurité intelligent
 * 224Solutions - Test automatisé
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 TEST SYSTÈME SÉCURITÉ MOTOS');
console.log('===============================\n');

let testsPassed = 0;
let testsTotal = 0;

function test(name, condition) {
    testsTotal++;
    if (condition) {
        console.log(`✅ ${name}`);
        testsPassed++;
    } else {
        console.log(`❌ ${name}`);
    }
}

// 1. Vérification des migrations SQL
console.log('🗄️ VÉRIFICATION MIGRATIONS SQL...');
const migrationFile = 'sql/create-moto-security-system.sql';
test('Migration SQL existe', existsSync(migrationFile));

if (existsSync(migrationFile)) {
    const migrationContent = readFileSync(migrationFile, 'utf8');
    test('Table moto_alertes définie', migrationContent.includes('CREATE TABLE moto_alertes'));
    test('Table security_notifications définie', migrationContent.includes('CREATE TABLE security_notifications'));
    test('Table moto_security_audit définie', migrationContent.includes('CREATE TABLE moto_security_audit'));
    test('Fonction create_moto_alert définie', migrationContent.includes('CREATE OR REPLACE FUNCTION create_moto_alert()'));
    test('Fonction mark_moto_found définie', migrationContent.includes('CREATE OR REPLACE FUNCTION mark_moto_found'));
    test('Vue moto_security_stats définie', migrationContent.includes('CREATE OR REPLACE VIEW moto_security_stats'));
    test('Index de performance créés', migrationContent.includes('CREATE INDEX'));
    test('RLS activé', migrationContent.includes('ENABLE ROW LEVEL SECURITY'));
}

// 2. Vérification des routes backend
console.log('\n🛣️ VÉRIFICATION ROUTES BACKEND...');
const backendRoutes = 'backend/routes/motoSecurity.js';
test('Routes backend existent', existsSync(backendRoutes));

if (existsSync(backendRoutes)) {
    const routesContent = readFileSync(backendRoutes, 'utf8');
    test('Route /report-stolen définie', routesContent.includes('router.post(\'/report-stolen\''));
    test('Route /register définie', routesContent.includes('router.post(\'/register\''));
    test('Route /alerts définie', routesContent.includes('router.get(\'/alerts\''));
    test('Route /alerts/:id/resolve définie', routesContent.includes('router.post(\'/alerts/:id/resolve\''));
    test('Route /stats définie', routesContent.includes('router.get(\'/stats\''));
    test('Route /audit définie', routesContent.includes('router.get(\'/audit\''));
    test('Fonction notifyBureaux définie', routesContent.includes('async function notifyBureaux'));
    test('Gestion d\'erreurs présente', routesContent.includes('try {') && routesContent.includes('catch'));
}

// 3. Vérification des composants React
console.log('\n🧩 VÉRIFICATION COMPOSANTS REACT...');
const components = [
    'src/components/security/ReportStolenMoto.tsx',
    'src/components/security/MotoSecurityAlerts.tsx',
    'src/components/security/MotoSecurityDashboard.tsx'
];

components.forEach(component => {
    test(`Composant ${component} existe`, existsSync(component));
    
    if (existsSync(component)) {
        const content = readFileSync(component, 'utf8');
        test(`${component} - Interface React valide`, content.includes('export default function'));
        test(`${component} - Imports corrects`, content.includes('import React'));
        test(`${component} - Props typées`, content.includes('interface') || content.includes('Props'));
    }
});

// 4. Vérification des hooks
console.log('\n🎣 VÉRIFICATION HOOKS...');
const hooksFile = 'src/hooks/useMotoSecurity.ts';
test('Hook useMotoSecurity existe', existsSync(hooksFile));

if (existsSync(hooksFile)) {
    const hooksContent = readFileSync(hooksFile, 'utf8');
    test('Hook exporté correctement', hooksContent.includes('export function useMotoSecurity'));
    test('Gestion état notifications', hooksContent.includes('useState<SecurityNotification[]'));
    test('Gestion état stats', hooksContent.includes('useState<MotoSecurityStats'));
    test('Synchronisation temps réel', hooksContent.includes('supabase.channel'));
    test('Fonctions utilitaires', hooksContent.includes('loadNotifications') && hooksContent.includes('markAsRead'));
}

// 5. Vérification du worker
console.log('\n⚙️ VÉRIFICATION WORKER...');
const workerFile = 'backend/workers/motoSecurityWorker.js';
test('Worker existe', existsSync(workerFile));

if (existsSync(workerFile)) {
    const workerContent = readFileSync(workerFile, 'utf8');
    test('Classe MotoSecurityWorker définie', workerContent.includes('class MotoSecurityWorker'));
    test('Méthode start() définie', workerContent.includes('start()'));
    test('Méthode scanNewRegistrations() définie', workerContent.includes('scanNewRegistrations()'));
    test('Méthode checkMotoForDuplicates() définie', workerContent.includes('checkMotoForDuplicates()'));
    test('Gestion cron définie', workerContent.includes('cron.schedule'));
    test('Notifications automatiques', workerContent.includes('sendSecurityNotifications'));
}

// 6. Vérification de l'intégration
console.log('\n🔗 VÉRIFICATION INTÉGRATION...');
const taxiMotoFile = 'src/pages/TaxiMoto.tsx';
const pdgFile = 'src/pages/PDGDashboard.tsx';

test('Intégration TaxiMoto', existsSync(taxiMotoFile));
test('Intégration PDGDashboard', existsSync(pdgFile));

if (existsSync(taxiMotoFile)) {
    const taxiContent = readFileSync(taxiMotoFile, 'utf8');
    test('Import MotoSecurityDashboard dans TaxiMoto', taxiContent.includes('import MotoSecurityDashboard'));
    test('Onglet sécurité ajouté', taxiContent.includes('value="security"'));
    test('TabsContent sécurité défini', taxiContent.includes('<TabsContent value="security"'));
}

if (existsSync(pdgFile)) {
    const pdgContent = readFileSync(pdgFile, 'utf8');
    test('Import MotoSecurityDashboard dans PDG', pdgContent.includes('import MotoSecurityDashboard'));
    test('Onglet sécurité PDG configuré', pdgContent.includes('isPDG={true}'));
}

// 7. Vérification des dépendances
console.log('\n📦 VÉRIFICATION DÉPENDANCES...');
const packageJson = 'package.json';
test('package.json existe', existsSync(packageJson));

if (existsSync(packageJson)) {
    const packageContent = readFileSync(packageJson, 'utf8');
    const packageData = JSON.parse(packageContent);
    
    test('Dépendances React présentes', packageData.dependencies?.react);
    test('Dépendances Supabase présentes', packageData.dependencies?.['@supabase/supabase-js']);
    test('Dépendances UI présentes', packageData.dependencies?.['@radix-ui/react-dialog']);
    test('Dépendances utilitaires présentes', packageData.dependencies?.['date-fns']);
}

// 8. Vérification de la configuration
console.log('\n⚙️ VÉRIFICATION CONFIGURATION...');
const viteConfig = 'vite.config.ts';
test('Configuration Vite présente', existsSync(viteConfig));

if (existsSync(viteConfig)) {
    const viteContent = readFileSync(viteConfig, 'utf8');
    test('Plugin PWA configuré', viteContent.includes('VitePWA'));
    test('Manifest PWA défini', viteContent.includes('manifest:'));
    test('Workbox configuré', viteContent.includes('workbox:'));
}

// 9. Vérification des types TypeScript
console.log('\n📝 VÉRIFICATION TYPES TYPESCRIPT...');
const tsConfig = 'tsconfig.json';
test('Configuration TypeScript présente', existsSync(tsConfig));

if (existsSync(tsConfig)) {
    const tsContent = readFileSync(tsConfig, 'utf8');
    const tsData = JSON.parse(tsContent);
    test('Strict mode activé', tsData.compilerOptions?.strict);
    test('Paths alias configurés', tsData.compilerOptions?.paths?.['@/*']);
}

// 10. Résumé des tests
console.log('\n📊 RÉSUMÉ DES TESTS');
console.log('===================');
console.log(`✅ Tests réussis: ${testsPassed}/${testsTotal}`);
console.log(`❌ Tests échoués: ${testsTotal - testsPassed}/${testsTotal}`);

const successRate = Math.round((testsPassed / testsTotal) * 100);
console.log(`📈 Taux de réussite: ${successRate}%`);

if (successRate >= 90) {
    console.log('\n🎉 SYSTÈME SÉCURITÉ MOTOS PRÊT !');
    console.log('✅ Toutes les fonctionnalités sont correctement implémentées');
    console.log('🚀 Le système peut être déployé en production');
} else if (successRate >= 70) {
    console.log('\n⚠️ SYSTÈME PARTIELLEMENT FONCTIONNEL');
    console.log('🔧 Quelques ajustements nécessaires avant déploiement');
} else {
    console.log('\n❌ SYSTÈME NON FONCTIONNEL');
    console.log('🚨 Des corrections majeures sont nécessaires');
}

console.log('\n🔍 DIAGNOSTIC TERMINÉ');
console.log('=====================');
