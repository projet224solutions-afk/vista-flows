import 'dotenv/config';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

async function testPostgres() {
    console.log('🔹 Test de connexion PostgreSQL...');
    const databaseUrl = process.env.DATABASE_URL || '';
    if (databaseUrl.includes('<SUPABASE_DB_PASSWORD>')) {
        console.warn('⚠️ DATABASE_URL contient un placeholder <SUPABASE_DB_PASSWORD>. Remplis d\'abord backend/.env.');
        return false;
    }
    let client;
    try {
        const u = new URL(databaseUrl);
        const isSupabase = /supabase\.co$/i.test(u.hostname) || /supabase/i.test(u.hostname);
        if (isSupabase) {
            // Relax TLS verification for Supabase Postgres (dev)
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
        client = new Client({
            connectionString: databaseUrl,
            ssl: isSupabase ? { require: true, rejectUnauthorized: false } : undefined,
        });
    } catch {
        client = new Client({ connectionString: databaseUrl });
    }
    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log('✅ PostgreSQL connecté. Heure serveur :', res.rows[0].now);

        const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
        if (tableCheck.rows[0].exists) {
            console.log('✅ Table "users" trouvée.');
        } else {
            console.warn('⚠️ Table "users" introuvable. Veuillez vérifier votre schéma SQL.');
        }
        return true;
    } catch (err) {
        console.error('❌ Erreur PostgreSQL :', err?.stack || err?.message || String(err));
        return false;
    } finally {
        await client.end();
    }
}

async function testSupabase() {
    console.log('\n🔹 Test de connexion Supabase...');
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    let keyUsed = serviceKey || anonKey;
    let supabase = createClient(url, keyUsed);

    try {
        if (serviceKey) {
            // Test sur auth.users via l'API admin (nécessite SERVICE ROLE)
            const res = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
            if (res.error) {
                console.error('❌ Erreur Supabase (admin.listUsers) :', res.error.message);
                return false;
            }
            console.log('✅ Supabase connecté (auth.users). Exemple:', res.data?.users?.[0] || null);
            return true;
        }

        // Fallback: si pas de service role, on tente une table publique minimale
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (error) {
            console.error('❌ Erreur Supabase (public.profiles) :', error.message);
            return false;
        }
        console.log('✅ Supabase connecté (public.profiles). Exemple:', data);
        return true;
    } catch (err) {
        console.error('❌ Erreur Supabase :', err?.stack || err?.message || String(err));
        return false;
    }
}

async function main() {
    console.log('🚀 Début du test de configuration...');
    const pgStatus = await testPostgres();
    const sbStatus = await testSupabase();

    console.log('\n📊 Résumé des tests :');
    console.log(`- PostgreSQL : ${pgStatus ? '✅ OK' : '❌ Échec'}`);
    console.log(`- Supabase   : ${sbStatus ? '✅ OK' : '❌ Échec'}`);

    if (!pgStatus || !sbStatus) {
        console.error('\n⚠️ Veuillez corriger les erreurs ci-dessus avant de continuer.');
        process.exit(1);
    } else {
        console.log('\n🎉 Toutes les connexions sont opérationnelles.');
    }
}

main().catch((err) => {
    console.error('❌ Erreur inattendue :', err.message);
    process.exit(1);
});


