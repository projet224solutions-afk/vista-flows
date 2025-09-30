/**
 * Script de test pour le système d'ID utilisateur
 * Format: 3 lettres + 4 chiffres (ex: ABC1234)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uakkxaibujzxdiqzpnpr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fonction pour générer un ID au format 3 lettres + 4 chiffres
function generateCustomId() {
    let letters = '';
    for (let i = 0; i < 3; i++) {
        letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }

    let numbers = '';
    for (let i = 0; i < 4; i++) {
        numbers += Math.floor(Math.random() * 10).toString();
    }

    return letters + numbers;
}

// Test de génération d'ID
async function testIdGeneration() {
    console.log('🧪 Test de génération d\'ID utilisateur');
    console.log('=====================================');

    for (let i = 0; i < 10; i++) {
        const id = generateCustomId();
        console.log(`${i + 1}. ${id} (Format: ${id.length === 7 ? '✅' : '❌'} - Lettres: ${id.substring(0, 3)} - Chiffres: ${id.substring(3)})`);
    }
}

// Test de vérification des utilisateurs existants
async function testExistingUsers() {
    console.log('\n🔍 Vérification des utilisateurs existants');
    console.log('==========================================');

    try {
        // Récupérer tous les utilisateurs avec leurs IDs
        const { data: users, error } = await supabase
            .from('profiles')
            .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        user_ids!inner(custom_id)
      `);

        if (error) {
            console.error('❌ Erreur:', error);
            return;
        }

        console.log(`📊 Nombre d'utilisateurs trouvés: ${users?.length || 0}`);

        if (users && users.length > 0) {
            users.forEach((user, index) => {
                const customId = user.user_ids?.[0]?.custom_id || 'Aucun ID';
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
                const isValidFormat = /^[A-Z]{3}[0-9]{4}$/.test(customId);

                console.log(`${index + 1}. ${isValidFormat ? '✅' : '❌'} ${customId} - ${name} (${user.role})`);
            });
        }
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    }
}

// Test de vérification des wallets
async function testWallets() {
    console.log('\n💰 Vérification des wallets');
    console.log('============================');

    try {
        const { data: wallets, error } = await supabase
            .from('wallets')
            .select(`
        id,
        user_id,
        balance,
        currency,
        status,
        profiles!inner(email, first_name, last_name)
      `);

        if (error) {
            console.error('❌ Erreur:', error);
            return;
        }

        console.log(`📊 Nombre de wallets trouvés: ${wallets?.length || 0}`);

        if (wallets && wallets.length > 0) {
            wallets.forEach((wallet, index) => {
                const profile = wallet.profiles;
                const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;

                console.log(`${index + 1}. ${name} - ${wallet.balance} ${wallet.currency} (${wallet.status})`);
            });
        }
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des wallets:', error);
    }
}

// Test de création d'un utilisateur complet
async function testCompleteUserCreation() {
    console.log('\n🆕 Test de création utilisateur complet');
    console.log('======================================');

    const testEmail = `test-${Date.now()}@224solutions.com`;
    const testPassword = 'TestPassword123!';
    const customId = generateCustomId();

    console.log(`📧 Email de test: ${testEmail}`);
    console.log(`🆔 ID généré: ${customId}`);

    try {
        // Créer l'utilisateur
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    first_name: 'Test',
                    last_name: 'User',
                    role: 'client',
                    custom_id: customId
                }
            }
        });

        if (authError) {
            console.error('❌ Erreur création utilisateur:', authError);
            return;
        }

        console.log('✅ Utilisateur créé avec succès');
        console.log(`🆔 User ID: ${authData.user?.id}`);

        // Attendre un peu pour que les triggers se déclenchent
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Vérifier que tout a été créé
        if (authData.user) {
            const { data: completeInfo, error: infoError } = await supabase
                .rpc('get_user_complete_info', { target_user_id: authData.user.id });

            if (infoError) {
                console.error('❌ Erreur récupération infos:', infoError);
            } else {
                console.log('📋 Informations complètes:', JSON.stringify(completeInfo, null, 2));
            }
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
    }
}

// Fonction principale
async function runTests() {
    console.log('🚀 TESTS DU SYSTÈME D\'ID UTILISATEUR');
    console.log('====================================');
    console.log('Format attendu: 3 lettres + 4 chiffres (ex: ABC1234)');
    console.log('');

    await testIdGeneration();
    await testExistingUsers();
    await testWallets();

    // Décommenter pour tester la création d'utilisateur
    // await testCompleteUserCreation();

    console.log('\n✅ Tests terminés !');
}

// Exécuter les tests
runTests().catch(console.error);
