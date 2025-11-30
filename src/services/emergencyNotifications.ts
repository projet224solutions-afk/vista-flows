/**
 * EMERGENCY NOTIFICATIONS - Service de notifications d'urgence
 * 224Solutions - Gestion des notifications push et sonores
 */

import { toast } from 'sonner';
import type { EmergencyNotificationPayload } from '@/types/emergency';

/**
 * Service de notifications pour les alertes d'urgence
 */
export const emergencyNotifications = {
  /**
   * Demander la permission pour les notifications push
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Les notifications ne sont pas supportées');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  /**
   * Envoyer une notification push prioritaire
   */
  async sendPushNotification(payload: EmergencyNotificationPayload): Promise<void> {
    // Vérifier la permission
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      console.warn('Permission de notification refusée');
      // Fallback: toast notification
      this.showToastNotification(payload);
      return;
    }

    // Créer la notification
    const notification = new Notification('🚨 URGENCE TAXI-MOTO', {
      body: payload.message,
      icon: '/icons/emergency-icon.png',
      badge: '/icons/emergency-badge.png',
      tag: `emergency-${payload.alert_id}`,
      requireInteraction: true, // Ne se ferme pas automatiquement
      vibrate: [200, 100, 200, 100, 200], // Vibration pattern
      silent: payload.sound === 'default', // Pas de son si 'default'
      data: payload
    });

    // Gérer le clic sur la notification
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      // Naviguer vers la page de l'alerte
      window.location.href = `/emergency/${payload.alert_id}`;
      notification.close();
    };

    // Jouer le son d'urgence si nécessaire
    if (payload.sound === 'emergency') {
      this.playEmergencySound();
    }
  },

  /**
   * Notification toast de secours
   */
  showToastNotification(payload: EmergencyNotificationPayload): void {
    const duration = payload.priority === 'critical' ? 15000 : 10000;

    toast.error(payload.message, {
      description: `${payload.driver_name} (${payload.driver_code})`,
      duration,
      action: {
        label: 'Voir',
        onClick: () => {
          window.location.href = `/emergency/${payload.alert_id}`;
        }
      }
    });
  },

  /**
   * Jouer le son d'urgence
   */
  playEmergencySound(volume: number = 0.7): void {
    try {
      const audio = new Audio('/sounds/emergency-alert.mp3');
      audio.volume = volume;
      audio.loop = false;
      audio.play().catch((error) => {
        console.warn('Impossible de jouer le son d\'urgence:', error);
      });
    } catch (error) {
      console.warn('Son d\'urgence non disponible:', error);
    }
  },

  /**
   * Jouer un son de confirmation
   */
  playConfirmationSound(): void {
    try {
      const audio = new Audio('/sounds/confirmation.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Son de confirmation non disponible');
    }
  },

  /**
   * Notification pour mise à jour d'alerte
   */
  notifyAlertUpdate(
    alertId: string,
    driverName: string,
    driverCode: string,
    message: string
  ): void {
    toast.info(message, {
      description: `${driverName} (${driverCode})`,
      duration: 5000,
      action: {
        label: 'Voir',
        onClick: () => {
          window.location.href = `/emergency/${alertId}`;
        }
      }
    });
  },

  /**
   * Notification pour résolution d'alerte
   */
  notifyAlertResolved(driverName: string, driverCode: string): void {
    toast.success('✅ Alerte Résolue', {
      description: `${driverName} (${driverCode}) est en sécurité`,
      duration: 5000
    });

    this.playConfirmationSound();
  },

  /**
   * Notification d'escalade
   */
  notifyEscalation(alertId: string, driverName: string, reason: string): void {
    toast.warning('⚠️ Alerte Escaladée', {
      description: `${driverName}: ${reason}`,
      duration: 10000,
      action: {
        label: 'Voir',
        onClick: () => {
          window.location.href = `/emergency/${alertId}`;
        }
      }
    });
  },

  /**
   * Vérifier si les notifications sont supportées
   */
  isSupported(): boolean {
    return 'Notification' in window;
  },

  /**
   * Obtenir le statut de permission
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  },

  /**
   * Tester le système de notification
   */
  async testNotification(): Promise<void> {
    const hasPermission = await this.requestPermission();
    
    if (!hasPermission) {
      toast.error('Permission de notification refusée');
      return;
    }

    const testPayload: EmergencyNotificationPayload = {
      type: 'emergency_alert',
      alert_id: 'test-123',
      driver_name: 'Test Conducteur',
      driver_code: 'TEST001',
      latitude: 9.6412,
      longitude: -13.5784,
      message: 'Ceci est un test du système de notification d\'urgence',
      priority: 'high',
      sound: 'emergency',
      timestamp: new Date().toISOString()
    };

    await this.sendPushNotification(testPayload);
    toast.success('Test de notification envoyé');
  }
};

/**
 * Hook pour initialiser les notifications au chargement de l'app
 */
export const initializeEmergencyNotifications = async (): Promise<void> => {
  // Demander la permission au chargement
  const hasPermission = await emergencyNotifications.requestPermission();
  
  if (hasPermission) {
    console.log('✅ Notifications d\'urgence activées');
  } else {
    console.warn('⚠️ Notifications d\'urgence désactivées');
  }

  // Précharger les sons
  try {
    const emergencySound = new Audio('/sounds/emergency-alert.mp3');
    const confirmationSound = new Audio('/sounds/confirmation.mp3');
    // Précharger sans jouer
    emergencySound.load();
    confirmationSound.load();
  } catch (error) {
    console.warn('Impossible de précharger les sons:', error);
  }
};

export default emergencyNotifications;
