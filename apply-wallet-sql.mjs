/**
 * ⚙️ Application des fonctions SQL Wallet (local -> Supabase/Postgres)
 * Utilisation:
 *   DATABASE_URL=postgres://user:pass@host:port/db node apply-wallet-sql.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL manquant. Fournissez la chaîne de connexion Postgres/Supabase.');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const files = [
    path.join(__dirname, 'sql', 'process_transaction.sql'),
    path.join(__dirname, 'sql', 'get_wallet_balance.sql')
  ];

  for (const f of files) {
    try {
      const sql = fs.readFileSync(f, 'utf8');
      console.log(`\n📄 Applique: ${path.basename(f)}`);
      await client.query(sql);
      console.log('✅ OK');
    } catch (e) {
      console.error(`❌ Erreur ${path.basename(f)}:`, e.message);
    }
  }

  await client.end();
  console.log('\n🎉 SQL Wallet appliqué.');
}

run().catch((e) => {
  console.error('❌ Erreur application SQL:', e.message);
  process.exit(1);
});


