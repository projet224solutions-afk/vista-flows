/**
 * SERVICE DE SON DE NOTIFICATION GLOBAL
 * Gère le son + vibration pour toutes les notifications et messages
 * Compatible mobile (contourne le blocage autoplay)
 */

let notificationAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

/**
 * Déverrouille l'audio sur mobile (doit être appelé depuis un geste utilisateur).
 * On joue un son silencieux pour "unlockier" le contexte audio du navigateur.
 */
function unlockAudio(): void {
  if (audioUnlocked) return;

  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Créer un buffer silencieux de 1 sample
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    // Aussi préparer l'élément Audio
    if (!notificationAudio) {
      notificationAudio = new Audio('/notification-sound.mp3');
      notificationAudio.volume = 0.7;
      notificationAudio.preload = 'auto';
    }
    // Charger le fichier (sans jouer)
    notificationAudio.load();

    audioUnlocked = true;
    console.log('🔔 [NotificationSound] Audio déverrouillé (mobile OK)');
  } catch (e) {
    console.debug('[NotificationSound] unlockAudio échoué:', e);
  }
}

// Écouter le PREMIER geste utilisateur pour déverrouiller l'audio
if (typeof window !== 'undefined') {
  const events = ['touchstart', 'touchend', 'click', 'keydown'];
  const handler = () => {
    unlockAudio();
    events.forEach(e => window.removeEventListener(e, handler, true));
  };
  events.forEach(e => window.addEventListener(e, handler, { once: false, capture: true }));
}

/**
 * Initialiser l'audio (appelé automatiquement, mais peut être invoqué manuellement)
 */
export function initNotificationSound(): void {
  unlockAudio();
}

/**
 * Faire vibrer le téléphone (si supporté)
 */
function vibrateDevice(): void {
  try {
    if (navigator.vibrate) {
      // Pattern : vibration 200ms, pause 100ms, vibration 200ms
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Vibration non supportée — silencieux
  }
}

/**
 * Jouer le son de notification + vibration
 */
export function playNotificationSound(): void {
  // 1. Vibrer le téléphone immédiatement
  vibrateDevice();

  // 2. Jouer le son audio
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/notification-sound.mp3');
      notificationAudio.volume = 0.7;
    }

    // Reset avant de rejouer
    notificationAudio.pause();
    notificationAudio.currentTime = 0;

    const playPromise = notificationAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.debug('[NotificationSound] Autoplay bloqué:', error.message);
        // Fallback : essayer de recréer l'élément audio
        try {
          notificationAudio = new Audio('/notification-sound.mp3');
          notificationAudio.volume = 0.7;
          notificationAudio.play().catch(() => {});
        } catch {
          // Rien à faire — au moins la vibration a fonctionné
        }
      });
    }
  } catch (error) {
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
 * Vérifier si le son est activé
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
