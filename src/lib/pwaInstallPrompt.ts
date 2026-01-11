/**
 * PWA install prompt (beforeinstallprompt) singleton v2.
 *
 * Objectif: ne jamais rater l'événement `beforeinstallprompt` (qui peut arriver
 * tôt), et permettre à plusieurs composants/hooks d'y accéder.
 * 
 * Version 2: Protection contre les erreurs HMR et SSR.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let initialized = false;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installable = false;

const listeners = new Set<() => void>();

function notify() {
  // Utiliser queueMicrotask pour éviter les problèmes de synchronisation React
  queueMicrotask(() => {
    listeners.forEach((l) => {
      try {
        l();
      } catch {
        // ignore
      }
    });
  });
}

export function initPWAInstallPromptListener() {
  // Guard SSR
  if (typeof window === 'undefined') return;
  if (initialized) return;

  initialized = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Important: empêcher le mini-infobar automatique pour garder un flow contrôlé
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installable = true;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installable = false;
    notify();
  });
}

export function subscribePWAInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPWAInstallPromptState() {
  return {
    deferredPrompt,
    isInstallable: installable,
  };
}

export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Le prompt n'est utilisable qu'une seule fois
    deferredPrompt = null;
    installable = false;
    notify();

    return outcome;
  } catch {
    deferredPrompt = null;
    installable = false;
    notify();
    return 'dismissed';
  }
}

// Initialiser automatiquement si on est côté client
if (typeof window !== 'undefined') {
  // Utiliser requestIdleCallback ou setTimeout pour ne pas bloquer le rendu initial
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      initPWAInstallPromptListener();
    });
  } else {
    setTimeout(() => {
      initPWAInstallPromptListener();
    }, 0);
  }
}
