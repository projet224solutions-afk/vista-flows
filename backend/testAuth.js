const admin = require('./googleService');

const db = admin.firestore();

(async () => {
  try {
    await db.collection('testConnection').doc('ping').set({
      message: 'Connexion réussie ✅',
      timestamp: new Date()
    });
    console.log('🎉 Connexion et écriture test Firestore réussies !');
    process.exit(0);
  } catch (err) {
    console.error('🚨 ERREUR Firestore:', err?.message || err);
    process.exit(1);
  }
})();


