/**
 * FIREBASE CLOUD MESSAGING (FCM)
 * Service de notifications push via Firebase
 * 224SOLUTIONS - Notifications temps réel
 */

import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import { getFirebaseAppInstance, waitForFirebase } from './firebaseClient';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let messaging: Messaging | null = null;
let currentToken: string | null = null;

// VAPID Key pour les notifications web (à configurer dans Firebase Console)
const VAPID_KEY = 'YOUR_VAPID_KEY'; // Sera récupéré via edge function

/**
 * Initialise Firebase Cloud Messaging
 */
export async function initializeMessaging(): Promise<boolean> {
  try {
    // Attendre que Firebase soit prêt
    const firebaseReady = await waitForFirebase();
    if (!firebaseReady) {
      console.warn('⚠️ Firebase non disponible, FCM désactivé');
      return false;
    }

    const app = getFirebaseAppInstance();
    if (!app) {
      console.warn('⚠️ App Firebase non initialisée');
      return false;
    }

    // Vérifier le support des notifications
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications non supportées');
      return false;
    }

    // Vérifier le service worker
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker non supporté');
      return false;
    }

    messaging = getMessaging(app);
    console.log('✅ Firebase Messaging initialisé');

    // Écouter les messages en foreground
    onMessage(messaging, (payload) => {
      console.log('📩 Message reçu (foreground):', payload);
      handleForegroundMessage(payload);
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur initialisation FCM:', error);
    return false;
  }
}

/**
 * Demande la permission et récupère le token FCM
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    // Demander la permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('⚠️ Permission notification refusée');
      return null;
    }

    if (!messaging) {
      const initialized = await initializeMessaging();
      if (!initialized) return null;
    }

    // Récupérer la VAPID key depuis l'edge function
    const vapidKey = await getVapidKey();
    if (!vapidKey) {
      console.warn('⚠️ VAPID key non disponible');
      return null;
    }

    // Enregistrer le service worker pour FCM
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    // Récupérer le token
    currentToken = await getToken(messaging!, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('✅ Token FCM obtenu');
      // Sauvegarder le token pour l'utilisateur
      await saveTokenToServer(currentToken);
    }

    return currentToken;
  } catch (error) {
    console.error('❌ Erreur obtention token FCM:', error);
    return null;
  }
}

/**
 * Récupère la VAPID key depuis le serveur
 */
async function getVapidKey(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('firebase-config');
    if (error || !data?.vapidKey) {
      return null;
    }
    return data.vapidKey;
  } catch (error) {
    console.error('Erreur récupération VAPID key:', error);
    return null;
  }
}

/**
 * Sauvegarde le token FCM sur le serveur
 */
async function saveTokenToServer(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sauvegarder dans la table user_fcm_tokens
    const { error } = await supabase
      .from('user_fcm_tokens')
      .upsert({
        user_id: user.id,
        fcm_token: token,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Erreur sauvegarde token:', error);
    } else {
      console.log('✅ Token FCM sauvegardé');
    }
  } catch (error) {
    console.error('Erreur sauvegarde token:', error);
  }
}

/**
 * Gère les messages reçus en foreground
 */
function handleForegroundMessage(payload: MessagePayload): void {
  const notification = payload.notification;
  const data = payload.data;

  if (!notification) return;

  // Afficher un toast
  const title = notification.title || 'Nouvelle notification';
  const body = notification.body || '';

  // Déterminer le type de notification
  const notificationType = data?.type || 'info';

  switch (notificationType) {
    case 'emergency':
      toast.error(`🚨 ${title}`, {
        description: body,
        duration: 15000,
        action: data?.action_url ? {
          label: 'Voir',
          onClick: () => window.location.href = data.action_url
        } : undefined
      });
      // Jouer un son d'urgence
      playNotificationSound('emergency');
      break;

    case 'transaction':
      toast.success(`💰 ${title}`, {
        description: body,
        duration: 8000
      });
      playNotificationSound('transaction');
      break;

    case 'message':
      toast.info(`💬 ${title}`, {
        description: body,
        duration: 5000,
        action: data?.conversation_id ? {
          label: 'Répondre',
          onClick: () => window.location.href = `/messages/${data.conversation_id}`
        } : undefined
      });
      playNotificationSound('message');
      break;

    default:
      toast.info(title, {
        description: body,
        duration: 5000
      });
  }

  // Créer aussi une notification native si l'app est en arrière-plan du navigateur
  if (document.visibilityState === 'hidden') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/favicon.png',
      tag: data?.notification_id || 'default',
      data
    });
  }
}

/**
 * Joue un son de notification
 */
function playNotificationSound(type: 'emergency' | 'transaction' | 'message' | 'default' = 'default'): void {
  try {
    const soundMap: Record<string, string> = {
      emergency: '/sounds/emergency-alert.mp3',
      transaction: '/sounds/transaction.mp3',
      message: '/sounds/message.mp3',
      default: '/sounds/notification.mp3'
    };

    const audio = new Audio(soundMap[type] || soundMap.default);
    audio.volume = type === 'emergency' ? 0.8 : 0.5;
    audio.play().catch(() => {});
  } catch (error) {
    console.warn('Son non disponible');
  }
}

/**
 * Supprime le token FCM (déconnexion)
 */
export async function deleteToken(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('user_id', user.id);
    }
    currentToken = null;
    console.log('✅ Token FCM supprimé');
  } catch (error) {
    console.error('Erreur suppression token:', error);
  }
}

/**
 * Vérifie si les notifications sont activées
 */
export function isNotificationEnabled(): boolean {
  return Notification.permission === 'granted' && currentToken !== null;
}

/**
 * Obtient le statut des permissions
 */
export function getPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Obtient le token actuel
 */
export function getCurrentToken(): string | null {
  return currentToken;
}

export default {
  initializeMessaging,
  requestNotificationPermission,
  deleteToken,
  isNotificationEnabled,
  getPermissionStatus,
  getCurrentToken
};
