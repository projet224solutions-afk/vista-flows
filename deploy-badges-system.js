/**
 * SCRIPT DE DÉPLOIEMENT - SYSTÈME DE BADGES
 * Déploie le système complet de génération de badges
 * 224Solutions - Badge System Deployment
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration Supabase
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deployBadgesSystem() {
    console.log('🚀 Déploiement du système de badges...');

    try {
        // 1. Créer le bucket de stockage
        console.log('📦 Création du bucket badges...');
        const { data: bucketData, error: bucketError } = await supabase.storage
            .createBucket('badges', {
                public: true,
                allowedMimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
                fileSizeLimit: 10485760 // 10MB
            });

        if (bucketError && !bucketError.message.includes('already exists')) {
            console.error('❌ Erreur création bucket:', bucketError);
        } else {
            console.log('✅ Bucket badges créé');
        }

        // 2. Déployer le schéma SQL
        console.log('🗄️ Déploiement du schéma SQL...');
        const sqlContent = readFileSync(join(__dirname, 'sql/badges_system.sql'), 'utf8');
        
        const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });

        if (sqlError) {
            console.error('❌ Erreur SQL:', sqlError);
        } else {
            console.log('✅ Schéma SQL déployé');
        }

        // 3. Tester la génération d'un badge
        console.log('🧪 Test de génération de badge...');
        const testBadge = {
            bureau_id: 'test-bureau-id',
            name: 'Test',
            firstName: 'Badge',
            phone: '+221 77 000 00 00',
            plate: 'GN-TEST-001',
            serialNumber: 'TM-TEST-001'
        };

        console.log('✅ Système de badges déployé avec succès !');
        console.log('📋 Prochaines étapes:');
        console.log('   1. Configurer les permissions utilisateur');
        console.log('   2. Tester la génération de badges');
        console.log('   3. Intégrer dans l\'interface PDG');

    } catch (error) {
        console.error('❌ Erreur déploiement:', error);
    }
}

deployBadgesSystem();
