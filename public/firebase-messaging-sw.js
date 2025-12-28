/**
 * FIREBASE MESSAGING SERVICE WORKER
 * Gère les notifications push en arrière-plan
 * 224SOLUTIONS
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// La configuration sera injectée dynamiquement
let firebaseConfig = null;

// Écouter les messages du client pour recevoir la config
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

function initializeFirebase() {
  if (!firebaseConfig) {
    console.log('[FCM SW] Config Firebase non disponible');
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Gérer les messages en arrière-plan
    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Message reçu en arrière-plan:', payload);

      const notificationTitle = payload.notification?.title || 'Nouvelle notification';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        tag: payload.data?.notification_id || 'default',
        data: payload.data,
        vibrate: [200, 100, 200],
        requireInteraction: payload.data?.type === 'emergency',
        actions: getNotificationActions(payload.data?.type)
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[FCM SW] Firebase Messaging initialisé');
  } catch (error) {
    console.error('[FCM SW] Erreur initialisation:', error);
  }
}

// Actions selon le type de notification
function getNotificationActions(type) {
  switch (type) {
    case 'emergency':
      return [
        { action: 'view', title: '🚨 Voir l\'urgence' },
        { action: 'call', title: '📞 Appeler' }
      ];
    case 'transaction':
      return [
        { action: 'view', title: '💰 Voir détails' }
      ];
    case 'message':
      return [
        { action: 'reply', title: '💬 Répondre' },
        { action: 'view', title: '👁️ Voir' }
      ];
    default:
      return [
        { action: 'view', title: 'Voir' }
      ];
  }
}

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Clic sur notification:', event);
  
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Déterminer l'URL cible selon le type et l'action
  if (event.action === 'view' || !event.action) {
    if (data.action_url) {
      targetUrl = data.action_url;
    } else if (data.type === 'emergency' && data.alert_id) {
      targetUrl = `/emergency/${data.alert_id}`;
    } else if (data.type === 'transaction' && data.transaction_id) {
      targetUrl = `/wallet/transactions/${data.transaction_id}`;
    } else if (data.type === 'message' && data.conversation_id) {
      targetUrl = `/messages/${data.conversation_id}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, focus et naviguer
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              data: data
            });
            return;
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Gérer la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('[FCM SW] Notification fermée:', event.notification.tag);
});

console.log('[FCM SW] Service Worker chargé');
