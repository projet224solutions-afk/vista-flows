/**
 * PWA install prompt (beforeinstallprompt) singleton.
 *
 * Objectif: ne jamais rater l'événement `beforeinstallprompt` (qui peut arriver
 * tôt), et permettre à plusieurs composants/hooks d'y accéder.
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
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore
    }
  });
}

export function initPWAInstallPromptListener() {
  if (initialized) return;
  if (typeof window === 'undefined') return;

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
