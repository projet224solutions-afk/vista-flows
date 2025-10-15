import 'dotenv/config';
import fs from 'node:fs';

const LOG_FILE = 'audit_224solutions.log';
let report = `# 🔍 AUDIT DE SÉCURITÉ & CONNEXION - 224SOLUTIONS\n\nDate : ${new Date().toISOString()}\n\n`;

function log(line) {
  console.log(line);
  report += `${line}\n`;
}

function writeReport() {
  fs.writeFileSync(LOG_FILE, report, 'utf8');
}

async function checkGCP() {
  log('## ☁️ Vérification Google Cloud Platform (GCP)');
  try {
    const projectId = process.env.GCP_PROJECT_ID;
    const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const keyFile = process.env.GCP_KEY_FILE || adc || undefined;
    const bucketName = process.env.GCP_BUCKET || 'solutions224-storage';
    if (!projectId) throw new Error('GCP_PROJECT_ID manquant');
    const { Storage } = await import('@google-cloud/storage').catch(() => ({ Storage: null }));
    if (!Storage) throw new Error("@google-cloud/storage non installé");
    const storage = keyFile ? new Storage({ projectId, keyFilename: keyFile }) : new Storage({ projectId });
    const bucket = storage.bucket(bucketName);
    const testFile = bucket.file('test_connection.txt');
    await testFile.save('Audit 224Solutions OK', { resumable: false });
    log('✅ Google Cloud Storage : Connexion réussie');
    log(`📦 Bucket : ${bucketName}`);
    await testFile.delete().catch(() => { });
  } catch (e) {
    log(`❌ Google Cloud : ${e.message}`);
  }
}

async function checkFirebase() {
  log('\n## 🔥 Vérification Firebase');
  try {
    const apiKey = process.env.FIREBASE_API_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    if (!apiKey || !projectId) throw new Error('Variables Firebase manquantes');
    // Vérification simple de présence des variables et liaison projet
    log('✅ Firebase config: variables présentes');
    // Auth/browser SDK non testé en Node; recommander test e2e côté front
  } catch (e) {
    log(`❌ Firebase : ${e.message}`);
  }
}

async function checkSupabase() {
  log('\n## 🗄️ Vérification Supabase PostgreSQL');
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Variables Supabase manquantes');
    const mod = await import('@supabase/supabase-js').catch(() => null);
    if (!mod) throw new Error('@supabase/supabase-js non installé');
    const { createClient } = mod;
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('security_monitoring').select('*').limit(1);
    if (error) throw error;
    log('✅ Supabase : Connexion réussie et table security_monitoring accessible');
  } catch (e) {
    log(`❌ Supabase : ${e.message}`);
  }
}

async function checkBackend() {
  log('\n## ⚙️ Vérification Backend API (Node.js / Express)');
  try {
    const apiBase = process.env.API_BASE_URL || 'http://localhost:3001';
    const res = await fetch(`${apiBase}/api/health`).catch(() => fetch(`${apiBase}/`));
    if (!res) throw new Error('Aucune réponse');
    if (res.ok) log('✅ Backend : API opérationnelle');
    else log(`⚠️ Backend : Réponse HTTP ${res.status}`);
  } catch (e) {
    log(`❌ Backend : ${e.message}`);
  }
}

async function checkFrontend() {
  log('\n## 🖥️ Vérification Frontend (React / Vite)');
  try {
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const res = await fetch(frontUrl);
    if (res.ok) log('✅ Frontend : Application accessible');
    else log(`⚠️ Frontend : Erreur HTTP ${res.status}`);
  } catch (e) {
    log(`❌ Frontend : ${e.message}`);
  }
}

async function runAudit() {
  log('# 🚀 Lancement de l’audit 224SOLUTIONS\n');
  await checkGCP();
  await checkFirebase();
  await checkSupabase();
  await checkBackend();
  await checkFrontend();
  log('\n---\n✅ Audit terminé !');
  log(`🗂️ Rapport généré : ${LOG_FILE}`);
  writeReport();
}

runAudit().catch((e) => {
  log(`❌ Audit erreur: ${e.message}`);
  writeReport();
  process.exit(1);
});


