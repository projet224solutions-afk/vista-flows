import 'dotenv/config';
import { Client } from 'pg';

function buildClient() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL manquant');
    }
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

async function tableExists(client, table) {
    const { rows } = await client.query('SELECT to_regclass($1) AS t', [table]);
    return !!rows[0]?.t;
}

async function getColumns(client, table) {
    const { rows } = await client.query(
        'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
        ['public', table]
    );
    return rows.map(r => r.column_name);
}

async function run() {
    const client = buildClient();
    await client.connect();
    try {
        const result = { security: { count: 0, recent: [] }, performance: { count: 0, recent: [] } };

        // 1) Security: security_incidents
        if (await tableExists(client, 'public.security_incidents')) {
            const c = await client.query('SELECT COUNT(*)::int AS c FROM security_incidents');
            const r = await client.query('SELECT * FROM security_incidents ORDER BY created_at DESC NULLS LAST LIMIT 5');
            result.security.count += c.rows[0].c;
            result.security.recent.push(...r.rows);
        }

        // 2) System metrics: security and performance
        if (await tableExists(client, 'public.system_metrics')) {
            const cols = await getColumns(client, 'system_metrics');
            const catCol = cols.includes('category') ? 'category' : (cols.includes('type') ? 'type' : (cols.includes('metric_type') ? 'metric_type' : null));
            const createdCol = cols.includes('created_at') ? 'created_at' : (cols.includes('inserted_at') ? 'inserted_at' : 'id');
            if (catCol) {
                const secC = await client.query(`SELECT COUNT(*)::int AS c FROM system_metrics WHERE ${catCol} ILIKE '%security%'`);
                const secR = await client.query(`SELECT * FROM system_metrics WHERE ${catCol} ILIKE '%security%' ORDER BY ${createdCol} DESC NULLS LAST LIMIT 5`);
                result.security.count += secC.rows[0].c;
                result.security.recent.push(...secR.rows);

                const perfC = await client.query(`SELECT COUNT(*)::int AS c FROM system_metrics WHERE ${catCol} ILIKE '%performance%'`);
                const perfR = await client.query(`SELECT * FROM system_metrics WHERE ${catCol} ILIKE '%performance%' ORDER BY ${createdCol} DESC NULLS LAST LIMIT 5`);
                result.performance.count += perfC.rows[0].c;
                result.performance.recent.push(...perfR.rows);
            }
        }

        // 3) ai_logs: use category/level/message
        if (await tableExists(client, 'public.ai_logs')) {
            const secC = await client.query(`SELECT COUNT(*)::int AS c FROM ai_logs WHERE (category ILIKE '%security%' OR level ILIKE '%security%' OR message ILIKE '%security%')`);
            const secR = await client.query(`SELECT * FROM ai_logs WHERE (category ILIKE '%security%' OR level ILIKE '%security%' OR message ILIKE '%security%') ORDER BY created_at DESC NULLS LAST LIMIT 5`);
            result.security.count += secC.rows[0].c;
            result.security.recent.push(...secR.rows);

            const perfC = await client.query(`SELECT COUNT(*)::int AS c FROM ai_logs WHERE (category ILIKE '%performance%' OR level ILIKE '%performance%' OR message ILIKE '%performance%')`);
            const perfR = await client.query(`SELECT * FROM ai_logs WHERE (category ILIKE '%performance%' OR level ILIKE '%performance%' OR message ILIKE '%performance%') ORDER BY created_at DESC NULLS LAST LIMIT 5`);
            result.performance.count += perfC.rows[0].c;
            result.performance.recent.push(...perfR.rows);
        }

        // 4) wallet_logs: similar heuristic
        if (await tableExists(client, 'public.wallet_logs')) {
            const secC = await client.query(`SELECT COUNT(*)::int AS c FROM wallet_logs WHERE (category ILIKE '%security%' OR level ILIKE '%security%' OR message ILIKE '%security%')`);
            const secR = await client.query(`SELECT * FROM wallet_logs WHERE (category ILIKE '%security%' OR level ILIKE '%security%' OR message ILIKE '%security%') ORDER BY created_at DESC NULLS LAST LIMIT 5`);
            result.security.count += secC.rows[0].c;
            result.security.recent.push(...secR.rows);

            const perfC = await client.query(`SELECT COUNT(*)::int AS c FROM wallet_logs WHERE (category ILIKE '%performance%' OR level ILIKE '%performance%' OR message ILIKE '%performance%')`);
            const perfR = await client.query(`SELECT * FROM wallet_logs WHERE (category ILIKE '%performance%' OR level ILIKE '%performance%' OR message ILIKE '%performance%') ORDER BY created_at DESC NULLS LAST LIMIT 5`);
            result.performance.count += perfC.rows[0].c;
            result.performance.recent.push(...perfR.rows);
        }

        // 5) performance_logs fallback
        if (await tableExists(client, 'public.performance_logs')) {
            const c = await client.query('SELECT COUNT(*)::int AS c FROM performance_logs');
            const r = await client.query('SELECT * FROM performance_logs ORDER BY created_at DESC NULLS LAST LIMIT 5');
            result.performance.count += c.rows[0].c;
            result.performance.recent.push(...r.rows);
        }

        // 6) Supabase logs schema (edge/http/postgres/auth/realtime/functions/storage)
        const logsTables = ['edge_logs', 'http_logs', 'postgres_logs', 'auth_logs', 'realtime_logs', 'functions_logs', 'storage_logs'];
        const { rows: logTableRows } = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='logs'"
        );
        const presentLogs = new Set(logTableRows.map(r => r.table_name));

        const secPatterns = [
            "violates row-level security",
            "permission denied",
            "auth",
            "unauthorized",
            "denied",
            "forbidden",
            "attack",
            "xss",
            "csrf",
            "sql injection"
        ];
        const perfPatterns = [
            "slow query",
            "duration",
            "timeout",
            "latency",
            "blocked on",
            "deadlock"
        ];

        for (const t of logsTables) {
            if (!presentLogs.has(t)) continue;
            // Build a simple filter over common columns if present
            const cols = await client.query(
                `SELECT column_name FROM information_schema.columns WHERE table_schema='logs' AND table_name=$1`,
                [t]
            );
            const colNames = cols.rows.map(r => r.column_name);
            const txtCol = colNames.includes('event_message') ? 'event_message' : (colNames.includes('msg') ? 'msg' : null);
            const sevCol = colNames.includes('severity_text') ? 'severity_text' : (colNames.includes('level') ? 'level' : null);
            const timeCol = colNames.includes('timestamp') ? 'timestamp' : (colNames.includes('created_at') ? 'created_at' : 'id');
            if (!txtCol && !sevCol) continue;

            // Security count
            let secWhere = [];
            if (sevCol) secWhere.push(`${sevCol} ILIKE '%error%'`);
            if (txtCol) secWhere.push(...secPatterns.map(p => `${txtCol} ILIKE '%${p}%'`));
            const secQuery = `SELECT COUNT(*)::int AS c FROM logs.${t} WHERE ${secWhere.join(' OR ')}`;
            const secCount = await client.query(secQuery).catch(() => ({ rows: [{ c: 0 }] }));
            result.security.count += secCount.rows[0].c;
            if (txtCol) {
                const secRecent = await client
                    .query(`SELECT * FROM logs.${t} WHERE ${secWhere.join(' OR ')} ORDER BY ${timeCol} DESC NULLS LAST LIMIT 3`)
                    .catch(() => ({ rows: [] }));
                result.security.recent.push(...secRecent.rows);
            }

            // Performance count
            let perfWhere = [];
            if (sevCol) perfWhere.push(`${sevCol} ILIKE '%warning%'`);
            if (txtCol) perfWhere.push(...perfPatterns.map(p => `${txtCol} ILIKE '%${p}%'`));
            const perfQuery = `SELECT COUNT(*)::int AS c FROM logs.${t} WHERE ${perfWhere.join(' OR ')}`;
            const perfCount = await client.query(perfQuery).catch(() => ({ rows: [{ c: 0 }] }));
            result.performance.count += perfCount.rows[0].c;
            if (txtCol) {
                const perfRecent = await client
                    .query(`SELECT * FROM logs.${t} WHERE ${perfWhere.join(' OR ')} ORDER BY ${timeCol} DESC NULLS LAST LIMIT 3`)
                    .catch(() => ({ rows: [] }));
                result.performance.recent.push(...perfRecent.rows);
            }
        }

        console.log(JSON.stringify(result, null, 2));
    } finally {
        await client.end();
    }
}

run().catch(e => {
    console.error('[ERROR] Inspect logs failed:', e?.stack || e?.message || String(e));
    process.exit(1);
});


