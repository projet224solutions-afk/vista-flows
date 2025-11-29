/**
 * Script de vérification simple du système d'ID utilisateur
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement depuis un fichier `.env` local si présent
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '__SUPABASE_URL__';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '__SUPABASE_KEY__';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utilitaire de log: n'affiche les messages qu'en dehors de la production
const log = (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args);
};

async function verifyTables() {
    log('🔍 Vérification des tables...');

    // Vérifier la table profiles
    try {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, role')
            .limit(5);

        log(`✅ Table profiles: ${profiles?.length || 0} utilisateurs trouvés`);
        if (profiles && profiles.length > 0) {
            profiles.forEach((profile, i) => {
                log(`   ${i + 1}. ${profile.email} (${profile.role})`);
            });
        }
    } catch (error) {
        console.error('❌ Erreur table profiles:', error.message);
    }

    // Vérifier la table user_ids
    try {
        const { data: userIds, error: userIdsError } = await supabase
            .from('user_ids')
            .select('user_id, custom_id')
            .limit(10);

        log(`✅ Table user_ids: ${userIds?.length || 0} IDs trouvés`);
        if (userIds && userIds.length > 0) {
            userIds.forEach((uid, i) => {
                const isValidFormat = /^[A-Z]{3}[0-9]{4}$/.test(uid.custom_id);
                log(`   ${i + 1}. ${uid.custom_id} ${isValidFormat ? '✅' : '❌'} (${uid.user_id.substring(0, 8)}...)`);
            });
        }
    } catch (error) {
        console.error('❌ Erreur table user_ids:', error.message);
    }

    // Vérifier la table wallets
    try {
        const { data: wallets, error: walletsError } = await supabase
            .from('wallets')
            .select('user_id, balance, currency, status')
            .limit(5);

        log(`✅ Table wallets: ${wallets?.length || 0} wallets trouvés`);
        if (wallets && wallets.length > 0) {
            wallets.forEach((wallet, i) => {
                log(`   ${i + 1}. ${wallet.balance} ${wallet.currency} (${wallet.status}) - ${wallet.user_id.substring(0, 8)}...`);
            });
        }
    } catch (error) {
        console.error('❌ Erreur table wallets:', error.message);
    }
}

async function testIdGeneration() {
    log('\n🧪 Test génération d\'IDs...');

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
        log(`   ${i + 1}. ${id} ${isValid ? '✅' : '❌'}`);
    }
}

async function main() {
    log('🚀 VÉRIFICATION SYSTÈME D\'ID UTILISATEUR');
    log('========================================');

    await verifyTables();
    await testIdGeneration();

    log('\n✅ Vérification terminée !');
}

main().catch(console.error);
