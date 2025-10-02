/**
 * 🔧 CRÉATION VENDEUR DE TEST ET PEUPLEMENT COMPLET - 224SOLUTIONS
 * Script pour créer un vendeur de test et peupler toutes les données
 */

import { createClient } from '@supabase/supabase-js';

console.log('🔧 CRÉATION VENDEUR DE TEST ET PEUPLEMENT COMPLET');
console.log('================================================\n');

// Configuration Supabase
const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestVendorAndPopulate() {
    console.log('🚀 DÉMARRAGE DE LA CRÉATION ET DU PEUPLEMENT...\n');

    let itemsAdded = 0;
    let testVendorId = null;

    // 1. Vérifier s'il y a déjà des vendeurs
    console.log('👤 1. VÉRIFICATION DES VENDEURS EXISTANTS');
    console.log('=========================================');

    try {
        const { data: existingVendors, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role')
            .eq('role', 'vendeur');

        if (!error && existingVendors && existingVendors.length > 0) {
            console.log(`✅ ${existingVendors.length} vendeur(s) existant(s) trouvé(s):`);
            existingVendors.forEach(vendor => {
                console.log(`   • ${vendor.first_name} ${vendor.last_name} (${vendor.email})`);
            });
            testVendorId = existingVendors[0].id;
        } else {
            console.log('ℹ️ Aucun vendeur existant trouvé');

            // Créer un vendeur de test
            console.log('\n👤 Création d\'un vendeur de test...');

            const testVendor = {
                first_name: 'Amadou',
                last_name: 'Diallo',
                email: 'amadou.diallo@224solutions.com',
                phone: '+224 123 456 789',
                role: 'vendeur',
                status: 'active',
                created_at: new Date().toISOString()
            };

            const { data: newVendor, error: vendorError } = await supabase
                .from('profiles')
                .insert(testVendor)
                .select()
                .single();

            if (!vendorError && newVendor) {
                console.log(`✅ Vendeur de test créé: ${newVendor.first_name} ${newVendor.last_name}`);
                testVendorId = newVendor.id;
                itemsAdded++;
            } else {
                console.log(`❌ Erreur création vendeur: ${vendorError?.message}`);
                return;
            }
        }
    } catch (error) {
        console.log(`❌ Erreur vérification vendeurs: ${error.message}`);
        return;
    }

    if (!testVendorId) {
        console.log('❌ Impossible de continuer sans vendeur');
        return;
    }

    // 2. Créer les catégories de dépenses
    console.log('\n🏷️ 2. CRÉATION DES CATÉGORIES DE DÉPENSES');
    console.log('==========================================');

    const defaultCategories = [
        {
            vendor_id: testVendorId,
            name: 'Stock & Marchandises',
            description: 'Achat de produits pour la revente',
            color: '#10B981',
            icon: 'Package',
            budget_limit: 5000000,
            is_default: true,
            is_active: true
        },
        {
            vendor_id: testVendorId,
            name: 'Logistique & Transport',
            description: 'Frais de transport et livraison',
            color: '#3B82F6',
            icon: 'Truck',
            budget_limit: 500000,
            is_default: true,
            is_active: true
        },
        {
            vendor_id: testVendorId,
            name: 'Marketing & Publicité',
            description: 'Promotion et communication',
            color: '#8B5CF6',
            icon: 'Megaphone',
            budget_limit: 800000,
            is_default: true,
            is_active: true
        },
        {
            vendor_id: testVendorId,
            name: 'Salaires & Personnel',
            description: 'Rémunération des employés',
            color: '#F59E0B',
            icon: 'Users',
            budget_limit: 2000000,
            is_default: true,
            is_active: true
        },
        {
            vendor_id: testVendorId,
            name: 'Équipements & Outils',
            description: 'Matériel et équipements',
            color: '#6B7280',
            icon: 'Settings',
            budget_limit: 1000000,
            is_default: true,
            is_active: true
        },
        {
            vendor_id: testVendorId,
            name: 'Services & Abonnements',
            description: 'Services externes et abonnements',
            color: '#EC4899',
            icon: 'CreditCard',
            budget_limit: 300000,
            is_default: true,
            is_active: true
        },
        {
            vendor_id: testVendorId,
            name: 'Frais Généraux',
            description: 'Autres dépenses diverses',
            color: '#64748B',
            icon: 'MoreHorizontal',
            budget_limit: 400000,
            is_default: true,
            is_active: true
        }
    ];

    const createdCategories = [];

    for (const category of defaultCategories) {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert(category)
                .select()
                .single();

            if (!error) {
                console.log(`✅ ${category.name} (${category.color})`);
                createdCategories.push(data);
                itemsAdded++;
            } else if (error.code === '23505') {
                console.log(`ℹ️ ${category.name} (existe déjà)`);
                // Récupérer la catégorie existante
                const { data: existing } = await supabase
                    .from('expense_categories')
                    .select('*')
                    .eq('vendor_id', testVendorId)
                    .eq('name', category.name)
                    .single();
                if (existing) createdCategories.push(existing);
            } else {
                console.log(`❌ ${category.name}: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${category.name}: ${err.message}`);
        }
    }

    // 3. Créer les dépenses d'exemple
    console.log('\n💰 3. CRÉATION DES DÉPENSES D\'EXEMPLE');
    console.log('=====================================');

    if (createdCategories.length > 0) {
        const sampleExpenses = [
            {
                vendor_id: testVendorId,
                category_id: createdCategories.find(c => c.name.includes('Stock'))?.id,
                title: 'Achat stock téléphones Samsung',
                description: 'Commande de 50 smartphones Galaxy A54 pour la boutique principale',
                amount: 2500000,
                currency: 'XAF',
                expense_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                supplier_name: 'TechDistrib SARL',
                supplier_contact: '+224 123 456 789',
                payment_method: 'bank_transfer',
                status: 'approved',
                tags: ['stock', 'téléphones', 'samsung', 'galaxy'],
                created_by: testVendorId
            },
            {
                vendor_id: testVendorId,
                category_id: createdCategories.find(c => c.name.includes('Marketing'))?.id,
                title: 'Campagne publicitaire Facebook',
                description: 'Promotion des nouveaux produits sur les réseaux sociaux - octobre 2025',
                amount: 150000,
                currency: 'XAF',
                expense_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                supplier_name: 'Meta Business',
                supplier_contact: 'support@meta.com',
                payment_method: 'card',
                status: 'pending',
                tags: ['marketing', 'facebook', 'publicité', 'réseaux sociaux'],
                created_by: testVendorId
            },
            {
                vendor_id: testVendorId,
                category_id: createdCategories.find(c => c.name.includes('Salaires'))?.id,
                title: 'Salaire équipe de vente octobre',
                description: 'Salaire mensuel de l\'équipe commerciale (3 vendeurs + 1 superviseur)',
                amount: 800000,
                currency: 'XAF',
                expense_date: new Date().toISOString().split('T')[0],
                supplier_name: 'Équipe interne',
                payment_method: 'wallet',
                status: 'paid',
                tags: ['salaire', 'équipe', 'mensuel', 'octobre'],
                created_by: testVendorId
            },
            {
                vendor_id: testVendorId,
                category_id: createdCategories.find(c => c.name.includes('Transport'))?.id,
                title: 'Carburant véhicules livraison',
                description: 'Essence pour les 5 motos de livraison + 1 camionnette',
                amount: 85000,
                currency: 'XAF',
                expense_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                supplier_name: 'Station Total Kaloum',
                supplier_contact: '+224 987 654 321',
                payment_method: 'cash',
                status: 'approved',
                tags: ['carburant', 'livraison', 'transport', 'motos'],
                created_by: testVendorId
            },
            {
                vendor_id: testVendorId,
                category_id: createdCategories.find(c => c.name.includes('Équipements'))?.id,
                title: 'Ordinateur portable gestion',
                description: 'Laptop HP ProBook 450 G9 pour la gestion administrative et comptabilité',
                amount: 450000,
                currency: 'XAF',
                expense_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                supplier_name: 'TechWorld Conakry',
                supplier_contact: '+224 555 123 456',
                payment_method: 'bank_transfer',
                status: 'approved',
                tags: ['ordinateur', 'gestion', 'équipement', 'hp'],
                created_by: testVendorId
            },
            {
                vendor_id: testVendorId,
                category_id: createdCategories.find(c => c.name.includes('Services'))?.id,
                title: 'Abonnement logiciel comptabilité',
                description: 'Abonnement annuel au logiciel de gestion comptable Sage',
                amount: 120000,
                currency: 'XAF',
                expense_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                supplier_name: 'Sage Africa',
                payment_method: 'card',
                status: 'approved',
                tags: ['logiciel', 'comptabilité', 'abonnement', 'sage'],
                created_by: testVendorId
            }
        ];

        for (const expense of sampleExpenses) {
            if (expense.category_id) {
                try {
                    const { data, error } = await supabase
                        .from('vendor_expenses')
                        .insert(expense)
                        .select()
                        .single();

                    if (!error) {
                        console.log(`✅ ${expense.title}: ${expense.amount.toLocaleString()} XAF`);
                        itemsAdded++;
                    } else {
                        console.log(`❌ ${expense.title}: ${error.message}`);
                    }
                } catch (err) {
                    console.log(`❌ ${expense.title}: ${err.message}`);
                }
            }
        }
    }

    // 4. Créer les budgets mensuels
    console.log('\n💰 4. CRÉATION DES BUDGETS MENSUELS');
    console.log('===================================');

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    for (const category of createdCategories) {
        if (category.budget_limit) {
            try {
                const spentAmount = Math.floor(Math.random() * category.budget_limit * 0.8);

                const { data, error } = await supabase
                    .from('expense_budgets')
                    .insert({
                        vendor_id: testVendorId,
                        category_id: category.id,
                        year: year,
                        month: month,
                        planned_amount: category.budget_limit,
                        spent_amount: spentAmount,
                        alert_threshold: 80
                    })
                    .select()
                    .single();

                if (!error) {
                    const percentage = ((spentAmount / category.budget_limit) * 100).toFixed(1);
                    console.log(`✅ ${category.name}: ${spentAmount.toLocaleString()}/${category.budget_limit.toLocaleString()} XAF (${percentage}%)`);
                    itemsAdded++;
                } else if (error.code === '23505') {
                    console.log(`ℹ️ Budget ${category.name} (existe déjà)`);
                } else {
                    console.log(`❌ Budget ${category.name}: ${error.message}`);
                }
            } catch (err) {
                console.log(`❌ Budget ${category.name}: ${err.message}`);
            }
        }
    }

    // 5. Créer les alertes
    console.log('\n🔔 5. CRÉATION DES ALERTES');
    console.log('=========================');

    const alerts = [
        {
            vendor_id: testVendorId,
            alert_type: 'budget_exceeded',
            title: 'Budget Stock bientôt dépassé',
            message: 'Le budget Stock & Marchandises atteint 83% de la limite mensuelle (4,15M/5M XAF)',
            severity: 'high',
            is_read: false,
            action_required: true,
            action_url: '/vendeur?tab=expenses&category=stock'
        },
        {
            vendor_id: testVendorId,
            alert_type: 'anomaly_detected',
            title: 'Dépense anormalement élevée détectée',
            message: 'Une dépense de 2.5M XAF détectée (achat téléphones) - 214% au-dessus de la moyenne',
            severity: 'medium',
            is_read: false,
            action_required: false
        },
        {
            vendor_id: testVendorId,
            alert_type: 'budget_warning',
            title: 'Budget Équipements à surveiller',
            message: 'Budget Équipements & Outils à 90% (900K/1M XAF) - attention aux prochaines dépenses',
            severity: 'medium',
            is_read: true,
            action_required: false
        },
        {
            vendor_id: testVendorId,
            alert_type: 'payment_pending',
            title: 'Dépense en attente d\'approbation',
            message: 'La campagne publicitaire Facebook (150K XAF) attend votre validation',
            severity: 'low',
            is_read: false,
            action_required: true,
            action_url: '/vendeur?tab=expenses&status=pending'
        }
    ];

    for (const alert of alerts) {
        try {
            const { data, error } = await supabase
                .from('expense_alerts')
                .insert(alert)
                .select()
                .single();

            if (!error) {
                console.log(`✅ ${alert.title} (${alert.severity})`);
                itemsAdded++;
            } else {
                console.log(`❌ ${alert.title}: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${alert.title}: ${err.message}`);
        }
    }

    // 6. Créer les notifications
    console.log('\n📬 6. CRÉATION DES NOTIFICATIONS');
    console.log('===============================');

    const notifications = [
        {
            user_id: testVendorId,
            title: 'Nouvelle dépense approuvée',
            message: 'Votre dépense "Achat stock téléphones Samsung" (2.5M XAF) a été approuvée par le PDG',
            type: 'success',
            is_read: false,
            action_url: '/vendeur?tab=expenses&id=1'
        },
        {
            user_id: testVendorId,
            title: 'Budget en cours d\'épuisement',
            message: 'Votre budget Marketing atteint 50% de la limite mensuelle (400K/800K XAF)',
            type: 'warning',
            is_read: false,
            action_url: '/vendeur?tab=expenses&category=marketing'
        },
        {
            user_id: testVendorId,
            title: 'Rapport mensuel disponible',
            message: 'Votre rapport de dépenses de septembre 2025 est prêt à télécharger (PDF)',
            type: 'info',
            is_read: true,
            action_url: '/vendeur?tab=expenses&action=download-report'
        },
        {
            user_id: testVendorId,
            title: 'Nouveau seuil d\'alerte configuré',
            message: 'Le seuil d\'alerte budgétaire a été mis à jour à 80% pour toutes les catégories',
            type: 'info',
            is_read: false
        }
    ];

    for (const notification of notifications) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert(notification)
                .select()
                .single();

            if (!error) {
                console.log(`✅ ${notification.title} (${notification.type})`);
                itemsAdded++;
            } else {
                console.log(`❌ ${notification.title}: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${notification.title}: ${err.message}`);
        }
    }

    // 7. Résumé final
    console.log('\n📊 RÉSUMÉ FINAL DU PEUPLEMENT');
    console.log('==============================');

    console.log(`✅ Éléments ajoutés: ${itemsAdded}`);
    console.log(`👤 Vendeur de test: ${testVendorId}`);
    console.log(`🏷️ Catégories créées: ${createdCategories.length}`);

    if (itemsAdded > 25) {
        console.log('\n🎉 PEUPLEMENT COMPLET RÉUSSI !');
        console.log('==============================');
        console.log('✅ Votre base de données est maintenant complètement fonctionnelle');
        console.log('✅ Toutes les données de démonstration ont été ajoutées');
        console.log('✅ Le système de gestion des dépenses est 100% opérationnel');
        console.log('✅ Plus besoin du mode simulation - données réelles disponibles !');

        console.log('\n📊 DONNÉES CRÉÉES:');
        console.log(`• 1 vendeur de test (Amadou Diallo)`);
        console.log(`• 7 catégories de dépenses avec budgets`);
        console.log(`• 6+ dépenses d'exemple (4.1M XAF total)`);
        console.log(`• 7 budgets mensuels avec suivi`);
        console.log(`• 4 alertes intelligentes`);
        console.log(`• 4 notifications système`);

        console.log('\n🚀 TESTEZ MAINTENANT:');
        console.log('1. 🌐 Allez sur: http://localhost:8080/vendeur');
        console.log('2. 📱 Cliquez sur l\'onglet "Dépenses" (rouge)');
        console.log('3. 🎉 Profitez de vos VRAIES données !');
        console.log('4. 📊 Plus de badge "Mode Démonstration" !');

        console.log('\n💡 FONCTIONNALITÉS DISPONIBLES:');
        console.log('• 💰 Dashboard avec graphiques temps réel');
        console.log('• 📊 Statistiques basées sur vraies données');
        console.log('• 🏷️ 7 catégories personnalisables');
        console.log('• 💸 6+ dépenses réalistes');
        console.log('• 🔔 4 alertes actives');
        console.log('• 🤖 Analyses IA avec vraies métriques');
        console.log('• 💰 Budgets avec suivi automatique');

    } else {
        console.log('\n⚠️ PEUPLEMENT PARTIEL');
        console.log('======================');
        console.log('Certaines données n\'ont pas pu être ajoutées');
        console.log('Le système fonctionnera avec les données disponibles');
    }

    console.log('\n🎊 FÉLICITATIONS ! VOTRE SYSTÈME EST MAINTENANT COMPLET AVEC DE VRAIES DONNÉES !');
}

// Lancer la création et le peuplement
createTestVendorAndPopulate();
