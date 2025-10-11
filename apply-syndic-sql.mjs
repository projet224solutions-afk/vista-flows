import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL manquant. Ex: postgres://user:pass@host:port/db');
  process.exit(1);
}

function buildSslConfig(urlString) {
  try {
    const { hostname } = new URL(urlString);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(hostname);
    return isLocal ? false : { require: true, rejectUnauthorized: false };
  } catch {
    return false;
  }
}

const sqlPath = process.env.SYNDIC_SCHEMA_PATH
  ? path.resolve(process.env.SYNDIC_SCHEMA_PATH)
  : path.join(__dirname, 'sql', 'syndic-schema.sql');

if (!existsSync(sqlPath)) {
  console.error(`❌ Fichier SQL introuvable: ${sqlPath}`);
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: buildSslConfig(DATABASE_URL) });
  await client.connect();

  try {
    const sql = await readFile(sqlPath, 'utf8');
    console.log(`\n📄 Applique: ${path.basename(sqlPath)}`);
    await client.query(sql);
    console.log('✅ OK');
  } catch (e) {
    console.error(`❌ Erreur ${path.basename(sqlPath)}:`, e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }

  if (process.exitCode === 1) {
    console.error('\n❌ Application échouée.');
  } else {
    console.log('\n🎉 Schéma Bureau Syndical appliqué.');
  }
}

run().catch((e) => {
  console.error('❌ Erreur application SQL:', e.message);
  process.exit(1);
});
