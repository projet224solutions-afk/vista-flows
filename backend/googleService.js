const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadServiceAccount() {
  // 1) JSON direct en variable d'environnement
  const rawEnvJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawEnvJson) {
    try {
      // Peut être du JSON pur ou du base64
      const decoded = Buffer.from(rawEnvJson, 'base64').toString('utf8');
      const asJson = (() => {
        try { return JSON.parse(rawEnvJson); } catch { return JSON.parse(decoded); }
      })();
      return asJson;
    } catch (e) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON invalide (ni JSON ni base64 JSON).');
    }
  }

  // 2) Chemin fourni via GOOGLE_APPLICATION_CREDENTIALS
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credsPath && fs.existsSync(credsPath)) {
    try {
      return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    } catch (e) {
      console.warn('Impossible de lire GOOGLE_APPLICATION_CREDENTIALS:', e.message);
    }
  }

  // 3) Fallback: chemins connus dans le repo (éviter en prod, utile local/dev)
  const candidatePaths = [
    path.join(__dirname, 'service-account.json'),
    path.join(__dirname, '..', 'bahthiernosouleymane00', '224solutions-key.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch {/* ignore */}
    }
  }

  return null;
}

function ensureInitialized() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn('[googleService] Aucune credentials Firebase trouvée. Initialisation par défaut (ADC)');
    admin.initializeApp();
    return admin.app();
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL || undefined;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || undefined;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(databaseURL ? { databaseURL } : {}),
    ...(storageBucket ? { storageBucket } : {})
  });

  return admin.app();
}

// Initialize lazily
ensureInitialized();

module.exports = admin;


