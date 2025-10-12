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

async function run() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('[ERROR] DATABASE_URL manquant');
        process.exit(1);
    }
    const sql = await readFile('./sql/security_hardening.sql', 'utf8');
    const client = buildClient(url);
    await client.connect();
    try {
        await client.query(sql);
        console.log('✅ Security hardening appliqué.');
    } catch (e) {
        console.error('[ERROR] Security SQL failed:', e?.message || e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run().catch(e => {
    console.error('[ERROR] Unexpected:', e?.message || e);
    process.exit(1);
});




