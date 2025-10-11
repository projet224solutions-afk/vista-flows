import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL manquant. Ex: postgres://user:pass@host:port/db');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const files = [path.join(__dirname, 'sql', 'taxi-moto-schema.sql')];
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
  console.log('\n🎉 Schéma Taxi Moto appliqué.');
}

run().catch((e) => {
  console.error('❌ Erreur application SQL:', e.message);
  process.exit(1);
});


