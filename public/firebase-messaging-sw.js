/**
 * SERVICE WORKER POUR FIREBASE MESSAGING
 * Gestion des notifications push en arrière-plan
 * 224Solutions - Taxi-Moto System
 */

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "224solutions.firebaseapp.com",
    projectId: "224solutions",
    storageBucket: "224solutions.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);

// Initialiser Firebase Messaging
const messaging = firebase.messaging();

// Gestionnaire de messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
    console.log('Message reçu en arrière-plan:', payload);

    const notificationTitle = payload.notification?.title || '224Solutions Taxi Moto';
    const notificationOptions = {
        body: payload.notification?.body || 'Nouvelle notification',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: payload.data?.rideId || 'taxi-moto-notification',
        data: payload.data || {},
        actions: [
            {
                action: 'view',
                title: 'Voir',
                icon: '/icon-192x192.png'
            },
            {
                action: 'dismiss',
                title: 'Ignorer',
                icon: '/icon-192x192.png'
            }
        ],
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200],
        timestamp: Date.now()
    };

    // Afficher la notification
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestionnaire de clic sur notification
self.addEventListener('notificationclick', (event) => {
    console.log('Clic sur notification:', event);

    event.notification.close();

    if (event.action === 'view') {
        // Ouvrir l'application
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'dismiss') {
        // Fermer la notification
        event.notification.close();
    } else {
        // Action par défaut
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Gestionnaire de fermeture de notification
self.addEventListener('notificationclose', (event) => {
    console.log('Notification fermée:', event);
});

// Gestionnaire d'erreur
self.addEventListener('error', (event) => {
    console.error('Erreur Service Worker:', event);
});

// Gestionnaire d'installation
self.addEventListener('install', (event) => {
    console.log('Service Worker installé');
    self.skipWaiting();
});

// Gestionnaire d'activation
self.addEventListener('activate', (event) => {
    console.log('Service Worker activé');
    event.waitUntil(self.clients.claim());
});
