/**
 * SERVICE DE SON DE NOTIFICATION GLOBAL
 * Gère le son pour toutes les notifications et messages
 */

// Singleton audio pour éviter "play() interrupted"
let notificationAudio: HTMLAudioElement | null = null;
let isInitialized = false;

/**
 * Initialiser l'audio (doit être appelé après une interaction utilisateur)
 */
export function initNotificationSound(): void {
  if (isInitialized) return;
  
  try {
    notificationAudio = new Audio('/notification-sound.mp3');
    notificationAudio.volume = 0.6;
    notificationAudio.preload = 'auto';
    isInitialized = true;
    console.log('🔔 [NotificationSound] Service initialisé');
  } catch (error) {
    console.warn('[NotificationSound] Erreur initialisation:', error);
  }
}

/**
 * Jouer le son de notification
 */
export function playNotificationSound(): void {
  try {
    // Initialiser si pas encore fait
    if (!notificationAudio) {
      notificationAudio = new Audio('/notification-sound.mp3');
      notificationAudio.volume = 0.6;
    }
    
    // Reset avant de rejouer
    notificationAudio.pause();
    notificationAudio.currentTime = 0;
    
    // Jouer le son
    const playPromise = notificationAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // Autoplay bloqué par le navigateur - silencieux
        console.debug('[NotificationSound] Autoplay bloqué:', error.message);
      });
    }
  } catch (error) {
    // Erreur audio non critique
    console.debug('[NotificationSound] Erreur lecture:', error);
  }
}

/**
 * Définir le volume du son (0 à 1)
 */
export function setNotificationVolume(volume: number): void {
  if (notificationAudio) {
    notificationAudio.volume = Math.max(0, Math.min(1, volume));
  }
}

/**
 * Vérifier si le son est activé (pas muté par le navigateur)
 */
export async function canPlaySound(): Promise<boolean> {
  try {
    const testAudio = new Audio('/notification-sound.mp3');
    testAudio.volume = 0.01;
    await testAudio.play();
    testAudio.pause();
    return true;
  } catch {
    return false;
  }
}

export default {
  init: initNotificationSound,
  play: playNotificationSound,
  setVolume: setNotificationVolume,
  canPlay: canPlaySound
};
