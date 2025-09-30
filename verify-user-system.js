/**
 * Script de vérification simple du système d'ID utilisateur
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://uakkxaibujzxdiqzpnpr.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVha2t4YWlidWp6eGRpcXpwbnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDA2NTcsImV4cCI6MjA3NDU3NjY1N30.kqYNdg-73BTP0Yht7kid-EZu2APg9qw-b_KW9z5hJbM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyTables() {
    console.log('🔍 Vérification des tables...');

    // Vérifier la table profiles
    try {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, role')
            .limit(5);

        console.log(`✅ Table profiles: ${profiles?.length || 0} utilisateurs trouvés`);
        if (profiles && profiles.length > 0) {
            profiles.forEach((profile, i) => {
                console.log(`   ${i + 1}. ${profile.email} (${profile.role})`);
            });
        }
    } catch (error) {
        console.log('❌ Erreur table profiles:', error.message);
    }

    // Vérifier la table user_ids
    try {
        const { data: userIds, error: userIdsError } = await supabase
            .from('user_ids')
            .select('user_id, custom_id')
            .limit(10);

        console.log(`✅ Table user_ids: ${userIds?.length || 0} IDs trouvés`);
        if (userIds && userIds.length > 0) {
            userIds.forEach((uid, i) => {
                const isValidFormat = /^[A-Z]{3}[0-9]{4}$/.test(uid.custom_id);
                console.log(`   ${i + 1}. ${uid.custom_id} ${isValidFormat ? '✅' : '❌'} (${uid.user_id.substring(0, 8)}...)`);
            });
        }
    } catch (error) {
        console.log('❌ Erreur table user_ids:', error.message);
    }

    // Vérifier la table wallets
    try {
        const { data: wallets, error: walletsError } = await supabase
            .from('wallets')
            .select('user_id, balance, currency, status')
            .limit(5);

        console.log(`✅ Table wallets: ${wallets?.length || 0} wallets trouvés`);
        if (wallets && wallets.length > 0) {
            wallets.forEach((wallet, i) => {
                console.log(`   ${i + 1}. ${wallet.balance} ${wallet.currency} (${wallet.status}) - ${wallet.user_id.substring(0, 8)}...`);
            });
        }
    } catch (error) {
        console.log('❌ Erreur table wallets:', error.message);
    }
}

async function testIdGeneration() {
    console.log('\n🧪 Test génération d\'IDs...');

    for (let i = 0; i < 5; i++) {
        let letters = '';
        for (let j = 0; j < 3; j++) {
            letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }

        let numbers = '';
        for (let j = 0; j < 4; j++) {
            numbers += Math.floor(Math.random() * 10).toString();
        }

        const id = letters + numbers;
        const isValid = /^[A-Z]{3}[0-9]{4}$/.test(id);
        console.log(`   ${i + 1}. ${id} ${isValid ? '✅' : '❌'}`);
    }
}

async function main() {
    console.log('🚀 VÉRIFICATION SYSTÈME D\'ID UTILISATEUR');
    console.log('========================================');

    await verifyTables();
    await testIdGeneration();

    console.log('\n✅ Vérification terminée !');
}

main().catch(console.error);
