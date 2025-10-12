import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

function buildClient(url) {
    let ssl = undefined;
    try {
        const u = new URL(url);
        const isSupabase = /supabase\.co$/i.test(u.hostname) || /supabase/i.test(u.hostname);
        if (isSupabase) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            ssl = { require: true, rejectUnauthorized: false };
        }
    } catch { }
    return new Client({ connectionString: url, ssl });
}

function normalizeDatabaseUrl(url) {
    try {
        const u = new URL(url);
        if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1') && u.port === '54322') {
            u.port = '5432';
            return u.toString();
        }
        return url;
    } catch {
        return url;
    }
}

function buildUrlFromSupabaseEnv() {
    const supaUrl = process.env.SUPABASE_URL;
    const supaPwd = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASS;
    const user = process.env.SUPABASE_DB_USER || 'postgres';
    const db = process.env.SUPABASE_DB_NAME || 'postgres';
    if (!supaUrl || !supaPwd) return null;
    try {
        const projectRef = new URL(supaUrl).hostname.split('.')[0];
        const host = `db.${projectRef}.supabase.co`;
        return `postgresql://${user}:${encodeURIComponent(supaPwd)}@${host}:5432/${db}?sslmode=require`;
    } catch {
        return null;
    }
}

async function run() {
    let url = process.env.DATABASE_URL;
    if (!url) {
        const built = buildUrlFromSupabaseEnv();
        if (built) {
            url = built;
            console.log(`[INFO] DATABASE_URL construit depuis SUPABASE_URL`);
        }
    }
    if (!url) {
        console.error('[ERROR] DATABASE_URL manquant et variables SUPABASE_DB_PASSWORD/SUPABASE_URL indisponibles');
        process.exit(1);
    }
    url = normalizeDatabaseUrl(url);
    const sql = await readFile('./sql/taxi_moto_schema.sql', 'utf8');
    const client = buildClient(url);
    await client.connect();
    try {
        await client.query(sql);
        console.log('✅ Taxi/Moto schema applied.');
    } catch (e) {
        console.error('[ERROR] Taxi schema failed:', e?.message || e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run().catch(e => {
    console.error('[ERROR] Unexpected:', e?.message || e);
    process.exit(1);
});


