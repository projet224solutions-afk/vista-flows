/**
 * 🔍 ANALYSE DE LA STRUCTURE DE LA BASE DE DONNÉES - 224SOLUTIONS
 * 
 * Ce script analyse la structure complète de la base de données Supabase :
 * - Tables existantes
 * - Relations entre tables
 * - Fonctions manquantes
 * - Structure du backend/frontend
 * 
 * @author 224SOLUTIONS
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration Supabase
const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ANALYSE DE LA STRUCTURE DE LA BASE DE DONNÉES');
console.log('='.repeat(60));
console.log(`📅 Date: ${new Date().toLocaleString()}`);
console.log('='.repeat(60));

// ===================================================
// ANALYSE DES TABLES
// ===================================================

async function analyzeTables() {
    console.log('\n📊 ANALYSE DES TABLES');
    console.log('-'.repeat(40));

    // Liste des tables à analyser
    const tablesToAnalyze = [
        'profiles', 'wallets', 'vendors', 'products', 'orders', 'wallet_transactions',
        'customers', 'categories', 'inventory', 'warehouse_stocks', 'rides', 'drivers',
        'deliveries', 'syndicates', 'syndicate_members', 'syndicate_vehicles',
        'syndicate_road_tickets', 'pdg', 'agents', 'sub_agents', 'commissions',
        'user_roles', 'user_ids', 'driver_kyc', 'enhanced_transactions',
        'security_monitoring', 'security_incidents', 'blocked_ips', 'login_attempts',
        'api_monitoring', 'system_alerts', 'automated_responses', 'security_audits',
        'security_settings', 'product_variants', 'customer_addresses', 'order_items',
        'payment_methods', 'transactions', 'notifications', 'reviews', 'ratings',
        'coupons', 'promotions', 'loyalty_points', 'refunds', 'disputes',
        'support_tickets', 'faq', 'announcements', 'events', 'news',
        'user_preferences', 'user_sessions', 'user_activity', 'user_analytics',
        'system_logs', 'error_logs', 'performance_metrics', 'usage_statistics'
    ];

    const tableAnalysis = {
        existing: [],
        missing: [],
        withData: [],
        empty: [],
        withRelations: []
    };

    for (const table of tablesToAnalyze) {
        try {
            // Vérifier si la table existe
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                if (error.message.includes('relation') || error.message.includes('does not exist')) {
                    tableAnalysis.missing.push(table);
                    console.log(`❌ Table ${table}: N'existe pas`);
                } else {
                    console.log(`⚠️ Table ${table}: Erreur - ${error.message}`);
                }
            } else {
                tableAnalysis.existing.push(table);
                const recordCount = count || 0;

                if (recordCount > 0) {
                    tableAnalysis.withData.push({ table, count: recordCount });
                    console.log(`✅ Table ${table}: ${recordCount} enregistrements`);
                } else {
                    tableAnalysis.empty.push(table);
                    console.log(`📭 Table ${table}: Vide`);
                }
            }
        } catch (err) {
            console.log(`❌ Table ${table}: Exception - ${err.message}`);
            tableAnalysis.missing.push(table);
        }
    }

    return tableAnalysis;
}

// ===================================================
// ANALYSE DES FONCTIONS
// ===================================================

async function analyzeFunctions() {
    console.log('\n🔧 ANALYSE DES FONCTIONS');
    console.log('-'.repeat(40));

    // Requête pour obtenir les fonctions
    const { data: functions, error } = await supabase
        .rpc('get_functions_info');

    if (error) {
        console.log(`❌ Erreur récupération fonctions: ${error.message}`);
        return [];
    }

    if (functions && functions.length > 0) {
        console.log(`✅ ${functions.length} fonctions trouvées:`);
        functions.forEach(func => {
            console.log(`   • ${func.function_name} (${func.function_type})`);
        });
    } else {
        console.log('❌ Aucune fonction trouvée dans la base de données');
    }

    return functions || [];
}

// ===================================================
// ANALYSE DES RELATIONS
// ===================================================

async function analyzeRelations() {
    console.log('\n🔗 ANALYSE DES RELATIONS');
    console.log('-'.repeat(40));

    // Analyser les relations principales
    const relations = [
        { parent: 'profiles', child: 'wallets', relation: 'One-to-Many' },
        { parent: 'profiles', child: 'orders', relation: 'One-to-Many' },
        { parent: 'vendors', child: 'products', relation: 'One-to-Many' },
        { parent: 'products', child: 'order_items', relation: 'One-to-Many' },
        { parent: 'orders', child: 'order_items', relation: 'One-to-Many' },
        { parent: 'profiles', child: 'wallet_transactions', relation: 'One-to-Many' },
        { parent: 'syndicates', child: 'syndicate_members', relation: 'One-to-Many' },
        { parent: 'drivers', child: 'rides', relation: 'One-to-Many' }
    ];

    const relationAnalysis = {
        working: [],
        broken: [],
        missing: []
    };

    for (const rel of relations) {
        try {
            // Tester la relation en faisant une jointure
            const { data, error } = await supabase
                .from(rel.parent)
                .select(`
                    *,
                    ${rel.child} (*)
                `)
                .limit(1);

            if (error) {
                relationAnalysis.broken.push({ ...rel, error: error.message });
                console.log(`❌ Relation ${rel.parent} -> ${rel.child}: ${error.message}`);
            } else {
                relationAnalysis.working.push(rel);
                console.log(`✅ Relation ${rel.parent} -> ${rel.child}: OK`);
            }
        } catch (err) {
            relationAnalysis.missing.push({ ...rel, error: err.message });
            console.log(`❌ Relation ${rel.parent} -> ${rel.child}: ${err.message}`);
        }
    }

    return relationAnalysis;
}

// ===================================================
// ANALYSE DU BACKEND/FRONTEND
// ===================================================

function analyzeBackendFrontend() {
    console.log('\n🏗️ ANALYSE DU BACKEND/FRONTEND');
    console.log('-'.repeat(40));

    const analysis = {
        backend: {
            exists: fs.existsSync('backend'),
            files: [],
            services: []
        },
        frontend: {
            exists: fs.existsSync('src'),
            components: [],
            hooks: [],
            services: []
        }
    };

    // Analyser le backend
    if (analysis.backend.exists) {
        try {
            const backendFiles = fs.readdirSync('backend');
            analysis.backend.files = backendFiles;
            console.log(`✅ Backend: ${backendFiles.length} fichiers`);
        } catch (err) {
            console.log(`❌ Erreur lecture backend: ${err.message}`);
        }
    } else {
        console.log('❌ Dossier backend manquant');
    }

    // Analyser le frontend
    if (analysis.frontend.exists) {
        try {
            // Composants
            if (fs.existsSync('src/components')) {
                const components = fs.readdirSync('src/components');
                analysis.frontend.components = components;
                console.log(`✅ Composants: ${components.length} fichiers`);
            }

            // Hooks
            if (fs.existsSync('src/hooks')) {
                const hooks = fs.readdirSync('src/hooks');
                analysis.frontend.hooks = hooks;
                console.log(`✅ Hooks: ${hooks.length} fichiers`);
            }

            // Services
            if (fs.existsSync('services')) {
                const services = fs.readdirSync('services');
                analysis.frontend.services = services;
                console.log(`✅ Services: ${services.length} fichiers`);
            }
        } catch (err) {
            console.log(`❌ Erreur lecture frontend: ${err.message}`);
        }
    } else {
        console.log('❌ Dossier src manquant');
    }

    return analysis;
}

// ===================================================
// GÉNÉRATION DU RAPPORT
// ===================================================

function generateAnalysisReport(tableAnalysis, functions, relationAnalysis, backendFrontendAnalysis) {
    console.log('\n📊 RAPPORT D\'ANALYSE COMPLÈTE');
    console.log('='.repeat(60));

    console.log(`📊 TABLES:`);
    console.log(`   ✅ Existantes: ${tableAnalysis.existing.length}`);
    console.log(`   ❌ Manquantes: ${tableAnalysis.missing.length}`);
    console.log(`   📭 Vides: ${tableAnalysis.empty.length}`);
    console.log(`   📊 Avec données: ${tableAnalysis.withData.length}`);

    console.log(`\n🔧 FONCTIONS:`);
    console.log(`   📊 Total: ${functions.length}`);

    console.log(`\n🔗 RELATIONS:`);
    console.log(`   ✅ Fonctionnelles: ${relationAnalysis.working.length}`);
    console.log(`   ❌ Cassées: ${relationAnalysis.broken.length}`);
    console.log(`   ❌ Manquantes: ${relationAnalysis.missing.length}`);

    console.log(`\n🏗️ BACKEND/FRONTEND:`);
    console.log(`   Backend: ${backendFrontendAnalysis.backend.exists ? '✅' : '❌'}`);
    console.log(`   Frontend: ${backendFrontendAnalysis.frontend.exists ? '✅' : '❌'}`);

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');

    if (functions.length === 0) {
        console.log('🔧 CRITIQUE: Aucune fonction dans la base de données');
        console.log('   • Créer les fonctions essentielles');
        console.log('   • Implémenter les triggers');
        console.log('   • Ajouter les procédures stockées');
    }

    if (relationAnalysis.broken.length > 0) {
        console.log('🔗 Relations cassées détectées:');
        relationAnalysis.broken.forEach(rel => {
            console.log(`   • ${rel.parent} -> ${rel.child}: ${rel.error}`);
        });
    }

    if (tableAnalysis.missing.length > 0) {
        console.log('📊 Tables manquantes:');
        tableAnalysis.missing.forEach(table => {
            console.log(`   • ${table}`);
        });
    }

    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('1. Créer les fonctions manquantes');
    console.log('2. Réparer les relations cassées');
    console.log('3. Lier le frontend et le backend');
    console.log('4. Supprimer le contenu de démonstration');
    console.log('5. Remplacer Dakar/Sénégal par Guinée');
}

// ===================================================
// FONCTION PRINCIPALE
// ===================================================

async function runDatabaseAnalysis() {
    console.log('\n🚀 DÉMARRAGE DE L\'ANALYSE');
    console.log('='.repeat(60));

    try {
        const tableAnalysis = await analyzeTables();
        const functions = await analyzeFunctions();
        const relationAnalysis = await analyzeRelations();
        const backendFrontendAnalysis = analyzeBackendFrontend();

        generateAnalysisReport(tableAnalysis, functions, relationAnalysis, backendFrontendAnalysis);

        console.log('\n🏁 FIN DE L\'ANALYSE');
        console.log('='.repeat(60));

        return {
            tables: tableAnalysis,
            functions,
            relations: relationAnalysis,
            backendFrontend: backendFrontendAnalysis
        };

    } catch (error) {
        console.error('❌ ERREUR CRITIQUE:', error);
        process.exit(1);
    }
}

// Lancer l'analyse
runDatabaseAnalysis().catch(console.error);
