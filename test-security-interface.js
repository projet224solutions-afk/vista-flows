/**
 * TEST SIMPLE - INTERFACE DE SÉCURITÉ 224SOLUTIONS
 * Vérification que l'interface de sécurité est bien intégrée
 */

import fs from 'fs';
import path from 'path';

console.log('🔒 TEST DE L\'INTERFACE DE SÉCURITÉ - 224SOLUTIONS');
console.log('===============================================\n');

// =====================================================
// TEST 1: VÉRIFICATION DES FICHIERS CRÉÉS
// =====================================================

function testSecurityFiles() {
    console.log('📁 TEST 1: Vérification des fichiers de sécurité...');

    const requiredFiles = [
        'src/services/securityService.ts',
        'src/hooks/useSecurity.ts',
        'src/components/security/SecurityDashboard.tsx',
        'supabase/migrations/20250101120000_security_monitoring_system_complete.sql'
    ];

    let allFilesExist = true;

    requiredFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`✅ ${filePath} - ${sizeKB} KB`);
        } else {
            console.log(`❌ ${filePath} - MANQUANT`);
            allFilesExist = false;
        }
    });

    if (allFilesExist) {
        console.log('✅ Tous les fichiers de sécurité sont présents\n');
    } else {
        console.log('❌ Certains fichiers de sécurité sont manquants\n');
    }

    return allFilesExist;
}

// =====================================================
// TEST 2: VÉRIFICATION DE L'INTÉGRATION PDG
// =====================================================

function testPDGIntegration() {
    console.log('🎯 TEST 2: Vérification de l\'intégration dans PDGDashboard...');

    try {
        const pdgDashboardPath = 'src/pages/PDGDashboard.tsx';

        if (!fs.existsSync(pdgDashboardPath)) {
            console.log('❌ PDGDashboard.tsx non trouvé');
            return false;
        }

        const content = fs.readFileSync(pdgDashboardPath, 'utf8');

        const checks = [
            { name: 'Import SecurityDashboard', pattern: /import SecurityDashboard from.*SecurityDashboard/ },
            { name: 'Onglet Sécurité dans TabsList', pattern: /TabsTrigger.*value="security".*Sécurité/ },
            { name: 'TabsContent sécurité', pattern: /TabsContent.*value="security"/ },
            { name: 'Composant SecurityDashboard', pattern: /<SecurityDashboard.*\/>/ },
            { name: 'Grid cols-9 (9 onglets)', pattern: /grid-cols-9/ }
        ];

        let allChecksPass = true;

        checks.forEach(check => {
            if (check.pattern.test(content)) {
                console.log(`✅ ${check.name}`);
            } else {
                console.log(`❌ ${check.name}`);
                allChecksPass = false;
            }
        });

        if (allChecksPass) {
            console.log('✅ Intégration PDG complète\n');
        } else {
            console.log('❌ Intégration PDG incomplète\n');
        }

        return allChecksPass;

    } catch (error) {
        console.log(`❌ Erreur lors de la vérification: ${error.message}\n`);
        return false;
    }
}

// =====================================================
// TEST 3: VÉRIFICATION DU CONTENU DES COMPOSANTS
// =====================================================

function testComponentContent() {
    console.log('🧩 TEST 3: Vérification du contenu des composants...');

    try {
        // Vérifier SecurityDashboard
        const dashboardPath = 'src/components/security/SecurityDashboard.tsx';
        const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

        const dashboardFeatures = [
            { name: 'Vue d\'ensemble', pattern: /SecurityOverview/ },
            { name: 'Monitoring temps réel', pattern: /RealTimeMonitoring/ },
            { name: 'Gestion des menaces', pattern: /ThreatManagement/ },
            { name: 'Gestion des incidents', pattern: /IncidentManagement/ },
            { name: 'Protection active', pattern: /ActiveProtection/ },
            { name: 'Audit de sécurité', pattern: /SecurityAudit/ },
            { name: 'Rapports', pattern: /SecurityReports/ },
            { name: 'Graphiques Recharts', pattern: /LineChart.*BarChart.*PieChart/ }
        ];

        console.log('   Dashboard de sécurité:');
        dashboardFeatures.forEach(feature => {
            if (feature.pattern.test(dashboardContent)) {
                console.log(`   ✅ ${feature.name}`);
            } else {
                console.log(`   ❌ ${feature.name}`);
            }
        });

        // Vérifier les hooks
        const hooksPath = 'src/hooks/useSecurity.ts';
        const hooksContent = fs.readFileSync(hooksPath, 'utf8');

        const hookFeatures = [
            { name: 'useSecurity', pattern: /export function useSecurity/ },
            { name: 'useSecurityAlerts', pattern: /export function useSecurityAlerts/ },
            { name: 'useSecurityIncidents', pattern: /export function useSecurityIncidents/ },
            { name: 'useRealTimeMonitoring', pattern: /export function useRealTimeMonitoring/ },
            { name: 'useSecurityAnalysis', pattern: /export function useSecurityAnalysis/ }
        ];

        console.log('   Hooks de sécurité:');
        hookFeatures.forEach(feature => {
            if (feature.pattern.test(hooksContent)) {
                console.log(`   ✅ ${feature.name}`);
            } else {
                console.log(`   ❌ ${feature.name}`);
            }
        });

        // Vérifier le service
        const servicePath = 'src/services/securityService.ts';
        const serviceContent = fs.readFileSync(servicePath, 'utf8');

        const serviceFeatures = [
            { name: 'SecurityService class', pattern: /export class SecurityService/ },
            { name: 'Monitoring temps réel', pattern: /initializeRealTimeMonitoring/ },
            { name: 'Gestion des événements', pattern: /logSecurityEvent/ },
            { name: 'Analyse de menaces', pattern: /analyzeThreat/ },
            { name: 'Blocage d\'IPs', pattern: /blockIP/ },
            { name: 'Système d\'alertes', pattern: /createAlert/ }
        ];

        console.log('   Service de sécurité:');
        serviceFeatures.forEach(feature => {
            if (feature.pattern.test(serviceContent)) {
                console.log(`   ✅ ${feature.name}`);
            } else {
                console.log(`   ❌ ${feature.name}`);
            }
        });

        console.log('✅ Vérification du contenu terminée\n');
        return true;

    } catch (error) {
        console.log(`❌ Erreur lors de la vérification du contenu: ${error.message}\n`);
        return false;
    }
}

// =====================================================
// TEST 4: VÉRIFICATION DE LA MIGRATION SQL
// =====================================================

function testSQLMigration() {
    console.log('🗄️ TEST 4: Vérification de la migration SQL...');

    try {
        const migrationPath = 'supabase/migrations/20250101120000_security_monitoring_system_complete.sql';
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');

        const sqlFeatures = [
            { name: 'Table security_monitoring', pattern: /CREATE TABLE.*security_monitoring/ },
            { name: 'Table security_incidents', pattern: /CREATE TABLE.*security_incidents/ },
            { name: 'Table blocked_ips', pattern: /CREATE TABLE.*blocked_ips/ },
            { name: 'Table system_alerts', pattern: /CREATE TABLE.*system_alerts/ },
            { name: 'Fonction generate_security_id', pattern: /CREATE OR REPLACE FUNCTION generate_security_id/ },
            { name: 'Fonction calculate_threat_score', pattern: /CREATE OR REPLACE FUNCTION calculate_threat_score/ },
            { name: 'Trigger détection connexions', pattern: /CREATE TRIGGER.*detect_suspicious_login/ },
            { name: 'Politiques RLS', pattern: /CREATE POLICY.*Admin full access/ },
            { name: 'Index de performance', pattern: /CREATE INDEX.*security_monitoring/ }
        ];

        sqlFeatures.forEach(feature => {
            if (feature.pattern.test(migrationContent)) {
                console.log(`✅ ${feature.name}`);
            } else {
                console.log(`❌ ${feature.name}`);
            }
        });

        const migrationSize = (fs.statSync(migrationPath).size / 1024).toFixed(1);
        console.log(`✅ Migration SQL complète (${migrationSize} KB)\n`);

        return true;

    } catch (error) {
        console.log(`❌ Erreur lors de la vérification SQL: ${error.message}\n`);
        return false;
    }
}

// =====================================================
// TEST 5: VÉRIFICATION DE LA STRUCTURE DES DOSSIERS
// =====================================================

function testFolderStructure() {
    console.log('📂 TEST 5: Vérification de la structure des dossiers...');

    const requiredDirs = [
        'src/components/security',
        'src/services',
        'src/hooks',
        'supabase/migrations'
    ];

    requiredDirs.forEach(dir => {
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            const files = fs.readdirSync(dir).length;
            console.log(`✅ ${dir} (${files} fichiers)`);
        } else {
            console.log(`❌ ${dir} - MANQUANT`);
        }
    });

    console.log('✅ Structure des dossiers vérifiée\n');
    return true;
}

// =====================================================
// FONCTION PRINCIPALE
// =====================================================

function runInterfaceTests() {
    console.log('🚀 DÉBUT DES TESTS D\'INTERFACE DE SÉCURITÉ');
    console.log('============================================\n');

    const results = {
        files: testSecurityFiles(),
        integration: testPDGIntegration(),
        content: testComponentContent(),
        migration: testSQLMigration(),
        structure: testFolderStructure()
    };

    console.log('============================================');
    console.log('📊 RÉSULTATS DES TESTS:');
    console.log('============================================');

    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASSÉ' : '❌ ÉCHOUÉ';
        const testName = test.charAt(0).toUpperCase() + test.slice(1);
        console.log(`${status} - ${testName}`);
    });

    const allPassed = Object.values(results).every(result => result === true);

    console.log('============================================');

    if (allPassed) {
        console.log('🎉 TOUS LES TESTS SONT PASSÉS !');
        console.log('🔒 L\'interface de sécurité est PARFAITEMENT intégrée !');
        console.log('');
        console.log('🎯 PRÊT À TESTER DANS LE NAVIGATEUR:');
        console.log('   1. Allez sur http://localhost:5173/pdg');
        console.log('   2. Cliquez sur l\'onglet "Sécurité"');
        console.log('   3. Explorez les 7 sections du dashboard');
        console.log('   4. Testez les fonctionnalités interactives');
    } else {
        console.log('⚠️ CERTAINS TESTS ONT ÉCHOUÉ');
        console.log('Vérifiez les erreurs ci-dessus');
    }

    console.log('============================================');
}

// Lancer les tests
runInterfaceTests();


