// 🛡️ Script d'application du système de défense et riposte
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
        console.error('❌ [ERROR] DATABASE_URL manquant');
        process.exit(1);
    }
    
    console.log('🛡️ Application du système de défense et riposte...\n');
    
    const sql = await readFile('./sql/security_defense_system.sql', 'utf8');
    const client = buildClient(url);
    await client.connect();
    
    try {
        await client.query(sql);
        console.log('✅ Système de défense appliqué avec succès!');
        console.log('\n📊 Tables créées:');
        console.log('  • security_incidents');
        console.log('  • security_alerts');
        console.log('  • blocked_ips');
        console.log('  • security_keys');
        console.log('  • security_snapshots');
        console.log('  • security_playbooks');
        console.log('  • security_audit_logs');
        console.log('  • security_detection_rules');
        console.log('  • security_metrics');
        console.log('\n🔧 Fonctions créées:');
        console.log('  • create_security_incident()');
        console.log('  • block_ip_address()');
        console.log('\n📈 Vue créée:');
        console.log('  • security_stats');
        console.log('\n🚀 Le système de défense est opérationnel!');
    } catch (e) {
        console.error('❌ [ERROR] Application du SQL échouée:', e?.message || e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run().catch(e => {
    console.error('❌ [ERROR] Erreur inattendue:', e?.message || e);
    process.exit(1);
});
