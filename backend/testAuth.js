const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Resolve credentials: env JSON/base64 -> GOOGLE_APPLICATION_CREDENTIALS -> local fallbacks
function resolveKeyFilePath() {
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (envJson) {
    try {
      const decoded = Buffer.from(envJson, 'base64').toString('utf8');
      const jsonStr = (() => { try { JSON.parse(envJson); return envJson; } catch { return decoded; } })();
      const tmpPath = path.join(__dirname, '.gcp-key.tmp.json');
      fs.writeFileSync(tmpPath, jsonStr, { encoding: 'utf8' });
      return tmpPath;
    } catch {}
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const candidates = [
    path.join(__dirname, 'service_account.json'),
    path.join(__dirname, 'service-account.json'),
    path.join(__dirname, '..', 'bahthiernosouleymane00', '224solutions-key.json')
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

const KEYFILEPATH = resolveKeyFilePath();
const SCOPES = ['https://www.googleapis.com/auth/cloud-platform'];

async function testAuth() {
  try {
    if (!KEYFILEPATH) throw new Error('Aucune clé de service trouvée. Configurez GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS ou placez le JSON dans backend/.');

    const auth = new google.auth.GoogleAuth({ keyFile: KEYFILEPATH, scopes: SCOPES });
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    console.log('✅ Authentification réussie !');
    console.log('Project ID:', projectId);

    const cloudResource = google.cloudresourcemanager({ version: 'v1', auth: client });
    const res = await cloudResource.projects.list();
    const projects = (res.data.projects || []).map(p => p.projectId);
    console.log('Projets disponibles:', projects);
  } catch (error) {
    console.error('❌ Erreur lors de l’authentification :', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testAuth();
}


