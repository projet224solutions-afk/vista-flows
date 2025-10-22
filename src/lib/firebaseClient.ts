/**
 * FIREBASE CLIENT CONFIGURATION
 * Configuration du client Firebase pour Firestore
 * 224SOLUTIONS - Système dual Firestore + Supabase
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Configuration Firebase (à remplacer par vos vraies clés)
const firebaseConfig = {
  apiKey: "AIzaSyC_your_web_api_key_here",
  authDomain: "solutions224-project.firebaseapp.com",
  projectId: "solutions224-project",
  storageBucket: "solutions224-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345",
  measurementId: "G-ABCDEFGHIJ"
};

// Initialiser Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (typeof window !== 'undefined') {
  // Initialiser seulement côté client
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  auth = getAuth(app);

  // Activer la persistance hors ligne de Firestore
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistance Firestore: plusieurs onglets ouverts');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistance Firestore: navigateur non supporté');
    }
  });

  console.log('✅ Firebase initialisé avec persistance hors ligne');
}

export { db as firestore, auth as firebaseAuth, app as firebaseApp };
export default db;
