/**
 * 🔍 VÉRIFICATION DES UTILISATEURS EXISTANTS - 224SOLUTIONS
 * Script pour voir quels utilisateurs existent déjà
 */

import { createClient } from '@supabase/supabase-js';

console.log('🔍 VÉRIFICATION DES UTILISATEURS EXISTANTS');
console.log('==========================================\n');

// Configuration Supabase
const supabaseUrl = 'https://uakkxaibujzxdiqzpnpr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('🚀 VÉRIFICATION EN COURS...\n');

    // 1. Vérifier tous les utilisateurs
    console.log('👥 1. TOUS LES UTILISATEURS');
    console.log('==========================');

    try {
        const { data: allUsers, error } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, role, created_at')
            .order('created_at', { ascending: false });

        if (!error && allUsers) {
            console.log(`✅ ${allUsers.length} utilisateur(s) trouvé(s):`);
            allUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.first_name || 'Prénom'} ${user.last_name || 'Nom'}`);
                console.log(`   📧 Email: ${user.email || 'Non défini'}`);
                console.log(`   👤 Rôle: ${user.role || 'Non défini'}`);
                console.log(`   🆔 ID: ${user.id}`);
                console.log(`   📅 Créé: ${user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'Non défini'}`);
                console.log('');
            });

            // Compter par rôle
            const roleCount = {};
            allUsers.forEach(user => {
                const role = user.role || 'undefined';
                roleCount[role] = (roleCount[role] || 0) + 1;
            });

            console.log('📊 RÉPARTITION PAR RÔLE:');
            Object.entries(roleCount).forEach(([role, count]) => {
                console.log(`   • ${role}: ${count} utilisateur(s)`);
            });

            // Si on a des utilisateurs, créer des données pour le premier
            if (allUsers.length > 0) {
                const firstUser = allUsers[0];
                console.log(`\n🎯 UTILISATION DE L'UTILISATEUR: ${firstUser.first_name} ${firstUser.last_name}`);

                await createDataForUser(firstUser.id, firstUser.role);
            }

        } else {
            console.log(`❌ Erreur récupération utilisateurs: ${error?.message}`);
        }
    } catch (error) {
        console.log(`❌ Erreur: ${error.message}`);
    }
}

async function createDataForUser(userId, userRole) {
    console.log('\n🔧 CRÉATION DES DONNÉES POUR CET UTILISATEUR');
    console.log('============================================');

    let itemsCreated = 0;

    // 1. Créer les catégories de dépenses
    console.log('\n🏷️ Création des catégories...');

    const categories = [
        { name: 'Stock & Marchandises', color: '#10B981', icon: 'Package' },
        { name: 'Marketing & Publicité', color: '#8B5CF6', icon: 'Megaphone' },
        { name: 'Salaires & Personnel', color: '#F59E0B', icon: 'Users' },
        { name: 'Transport & Livraison', color: '#3B82F6', icon: 'Truck' },
        { name: 'Équipements', color: '#6B7280', icon: 'Settings' }
    ];

    const createdCategories = [];

    for (const category of categories) {
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert({
                    vendor_id: userId,
                    name: category.name,
                    description: `Catégorie ${category.name}`,
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
                itemsCreated++;
            } else if (error.code === '23505') {
                console.log(`ℹ️ ${category.name} (existe déjà)`);
            } else {
                console.log(`❌ ${category.name}: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${category.name}: ${err.message}`);
        }
    }

    // 2. Créer des dépenses d'exemple
    console.log('\n💰 Création des dépenses...');

    const expenses = [
        { title: 'Achat produits', amount: 500000, method: 'bank_transfer' },
        { title: 'Publicité Facebook', amount: 75000, method: 'card' },
        { title: 'Salaire équipe', amount: 400000, method: 'wallet' },
        { title: 'Carburant', amount: 50000, method: 'cash' }
    ];

    for (let i = 0; i < expenses.length && i < createdCategories.length; i++) {
        const expense = expenses[i];
        const category = createdCategories[i];

        try {
            const { data, error } = await supabase
                .from('vendor_expenses')
                .insert({
                    vendor_id: userId,
                    category_id: category.id,
                    title: expense.title,
                    description: `Dépense ${expense.title}`,
                    amount: expense.amount,
                    currency: 'XAF',
                    expense_date: new Date().toISOString().split('T')[0],
                    payment_method: expense.method,
                    status: 'approved'
                })
                .select()
                .single();

            if (!error) {
                console.log(`✅ ${expense.title}: ${expense.amount.toLocaleString()} XAF`);
                itemsCreated++;
            } else {
                console.log(`❌ ${expense.title}: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${expense.title}: ${err.message}`);
        }
    }

    // 3. Créer des alertes
    console.log('\n🔔 Création des alertes...');

    const alerts = [
        { title: 'Budget dépassé', message: 'Attention au budget', severity: 'high' },
        { title: 'Dépense élevée', message: 'Vérification nécessaire', severity: 'medium' }
    ];

    for (const alert of alerts) {
        try {
            const { data, error } = await supabase
                .from('expense_alerts')
                .insert({
                    vendor_id: userId,
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
                itemsCreated++;
            } else {
                console.log(`❌ ${alert.title}: ${error.message}`);
            }
        } catch (err) {
            console.log(`❌ ${alert.title}: ${err.message}`);
        }
    }

    console.log(`\n📊 TOTAL CRÉÉ: ${itemsCreated} éléments`);

    if (itemsCreated >= 8) {
        console.log('\n🎉 SUCCÈS ! DONNÉES CRÉÉES');
        console.log('==========================');
        console.log('✅ Votre système a maintenant des données réelles');
        console.log('✅ Plus besoin du mode simulation');

        console.log('\n🚀 TESTEZ MAINTENANT:');
        console.log('1. 🌐 http://localhost:8080/vendeur');
        console.log('2. 📱 Onglet "Dépenses" (rouge)');
        console.log('3. 🎉 Vos vraies données apparaîtront !');
    }
}

// Lancer la vérification
checkUsers();
