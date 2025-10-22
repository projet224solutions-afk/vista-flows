/**
 * CONFIGURATION FIREBASE POUR TAXI MOTO
 * Configuration complète avec Firestore et Cloud Messaging
 * 224Solutions - Taxi-Moto System
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

// Configuration Firebase
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "your-api-key",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "224solutions.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "224solutions",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "224solutions.appspot.com",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// Initialiser Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Services Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Configuration pour le développement
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Émulateurs Firebase pour le développement local
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectAuthEmulator(auth, 'http://localhost:9099');
    } catch (error) {
        console.log('Firebase emulators already connected');
    }
}

// Service Worker pour les notifications push
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
            console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
            console.log('Service Worker registration failed:', error);
        });
}

export default app;
