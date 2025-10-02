/**
 * 🔧 CRÉATION VENDEUR ET DONNÉES SIMPLIFIÉE - 224SOLUTIONS
 * Script simplifié pour créer un vendeur et peupler les données essentielles
 */

import { createClient } from '@supabase/supabase-js';

console.log('🔧 CRÉATION VENDEUR ET DONNÉES SIMPLIFIÉE');
console.log('=========================================\n');

// Configuration Supabase
const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createVendorAndData() {
    console.log('🚀 DÉMARRAGE...\n');

    let itemsAdded = 0;
    let testVendorId = null;

    // 1. D'abord, vérifier la structure de la table profiles
    console.log('📊 1. VÉRIFICATION DE LA STRUCTURE PROFILES');
    console.log('===========================================');

    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

        if (!error) {
            console.log('✅ Table profiles accessible');
            if (profiles && profiles.length > 0) {
                console.log('📋 Colonnes disponibles:', Object.keys(profiles[0]));
                // Utiliser le premier profil existant s'il y en a un
                if (profiles[0].role === 'vendeur') {
                    testVendorId = profiles[0].id;
                    console.log(`✅ Vendeur existant trouvé: ${profiles[0].first_name || 'Utilisateur'}`);
                }
            }
        } else {
            console.log(`❌ Erreur accès profiles: ${error.message}`);
        }
    } catch (error) {
        console.log(`❌ Erreur vérification: ${error.message}`);
    }

    // 2. Si pas de vendeur, essayer d'en créer un avec les colonnes de base
    if (!testVendorId) {
        console.log('\n👤 2. CRÉATION D\'UN VENDEUR DE TEST');
        console.log('==================================');

        try {
            // Créer avec seulement les colonnes essentielles
            const testVendor = {
                first_name: 'Amadou',
                last_name: 'Diallo',
                email: 'amadou.diallo@224solutions.com',
                role: 'vendeur'
            };

            const { data: newVendor, error: vendorError } = await supabase
                .from('profiles')
                .insert(testVendor)
                .select()
                .single();

            if (!vendorError && newVendor) {
                console.log(`✅ Vendeur créé: ${newVendor.first_name} ${newVendor.last_name}`);
                testVendorId = newVendor.id;
                itemsAdded++;
            } else {
                console.log(`❌ Erreur création vendeur: ${vendorError?.message}`);

                // Essayer de récupérer n'importe quel utilisateur existant
                const { data: anyUser } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, role')
                    .limit(1);

                if (anyUser && anyUser.length > 0) {
                    testVendorId = anyUser[0].id;
                    console.log(`ℹ️ Utilisation utilisateur existant: ${anyUser[0].first_name || 'Utilisateur'} (${anyUser[0].role})`);
                }
            }
        } catch (error) {
            console.log(`❌ Erreur création: ${error.message}`);
        }
    }

    if (!testVendorId) {
        console.log('❌ Impossible de continuer sans utilisateur');
        return;
    }

    // 3. Créer les catégories de dépenses
    console.log('\n🏷️ 3. CRÉATION DES CATÉGORIES DE DÉPENSES');
    console.log('==========================================');

    const categories = [
        { name: 'Stock & Marchandises', color: '#10B981', icon: 'Package' },
        { name: 'Marketing & Publicité', color: '#8B5CF6', icon: 'Megaphone' },
        { name: 'Salaires & Personnel', color: '#F59E0B', icon: 'Users' },
        { name: 'Transport & Livraison', color: '#3B82F6', icon: 'Truck' },
        { name: 'Équipements & Outils', color: '#6B7280', icon: 'Settings' }
    ];

    const createdCategories = [];

    for (const category of categories) {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert({
                    vendor_id: testVendorId,
                    name: category.name,
                    description: `Catégorie ${category.name.toLowerCase()}`,
                    color: category.color,
                    icon: category.icon,
                    is_default: true,
                    is_active: true
                })
                .select()
                .single();

            if (!error) {
                console.log(`✅ ${category.name}`);
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

    // 4. Créer quelques dépenses d'exemple
    console.log('\n💰 4. CRÉATION DES DÉPENSES D\'EXEMPLE');
    console.log('=====================================');

    if (createdCategories.length > 0) {
        const expenses = [
            {
                title: 'Achat stock téléphones',
                amount: 2500000,
                category_id: createdCategories[0]?.id,
                payment_method: 'bank_transfer',
                status: 'approved'
            },
            {
                title: 'Campagne Facebook Ads',
                amount: 150000,
                category_id: createdCategories[1]?.id,
                payment_method: 'card',
                status: 'pending'
            },
            {
                title: 'Salaires équipe octobre',
                amount: 800000,
                category_id: createdCategories[2]?.id,
                payment_method: 'wallet',
                status: 'paid'
            },
            {
                title: 'Carburant livraisons',
                amount: 85000,
                category_id: createdCategories[3]?.id,
                payment_method: 'cash',
                status: 'approved'
            }
        ];

        for (const expense of expenses) {
            if (expense.category_id) {
                try {
                    const { data, error } = await supabase
                        .from('vendor_expenses')
                        .insert({
                            vendor_id: testVendorId,
                            category_id: expense.category_id,
                            title: expense.title,
                            description: `Dépense ${expense.title.toLowerCase()}`,
                            amount: expense.amount,
                            currency: 'XAF',
                            expense_date: new Date().toISOString().split('T')[0],
                            payment_method: expense.payment_method,
                            status: expense.status,
                            created_by: testVendorId
                        })
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

    // 5. Créer quelques alertes
    console.log('\n🔔 5. CRÉATION DES ALERTES');
    console.log('=========================');

    const alerts = [
        {
            title: 'Budget Stock dépassé',
            message: 'Le budget stock atteint 85% de la limite',
            severity: 'high'
        },
        {
            title: 'Dépense élevée détectée',
            message: 'Dépense de 2.5M XAF nécessite vérification',
            severity: 'medium'
        }
    ];

    for (const alert of alerts) {
        try {
            const { data, error } = await supabase
                .from('expense_alerts')
                .insert({
                    vendor_id: testVendorId,
                    alert_type: 'budget_warning',
                    title: alert.title,
                    message: alert.message,
                    severity: alert.severity,
                    is_read: false
                })
                .select()
                .single();

            if (!error) {
                console.log(`✅ ${alert.title}`);
                itemsAdded++;
            } else {
                console.log(`❌ ${alert.title}: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${alert.title}: ${err.message}`);
        }
    }

    // 6. Résumé
    console.log('\n📊 RÉSUMÉ FINAL');
    console.log('===============');

    console.log(`✅ Éléments créés: ${itemsAdded}`);
    console.log(`👤 Utilisateur: ${testVendorId}`);
    console.log(`🏷️ Catégories: ${createdCategories.length}`);

    if (itemsAdded >= 10) {
        console.log('\n🎉 SUCCÈS !');
        console.log('===========');
        console.log('✅ Données de base créées avec succès');
        console.log('✅ Le système peut maintenant fonctionner');

        console.log('\n🚀 TESTEZ MAINTENANT:');
        console.log('1. 🌐 http://localhost:8080/vendeur');
        console.log('2. 📱 Onglet "Dépenses" (rouge)');
        console.log('3. 🎉 Vos données sont là !');

    } else {
        console.log('\n⚠️ SUCCÈS PARTIEL');
        console.log('==================');
        console.log('Quelques données ont été créées');
        console.log('Le système fonctionnera partiellement');
    }
}

// Lancer la création
createVendorAndData();
