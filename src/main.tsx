import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, unregisterServiceWorker } from "./lib/serviceWorkerRegistration";
import { initPWAInstallPromptListener } from "./lib/pwaInstallPrompt";
import { initMonitoring } from "./lib/monitoring";
import { initializeSecurity } from "./lib/security";

// Initialiser le monitoring (Sentry, erreurs globales, performance)
initMonitoring().catch(console.error);

// Initialiser la sécurité (watermark, anti-debug, validation env)
initializeSecurity().catch(console.error);

// --- Crash recovery (stale cache / SW / chunk load) ---
const RECOVERY_FLAG = "__224_cache_recovery_done";

function isLikelyChunkOrAssetLoadError(err: unknown): boolean {
  const message =
    (err instanceof Error ? err.message : "") ||
    (typeof err === "string" ? err : "");

  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Failed to load module script/i.test(message) ||
    /disallowed MIME type/i.test(message) ||
    /Unexpected token\s*</i.test(message)
  );
}

async function recoverFromStaleCache(trigger: string, err?: unknown) {
  try {
    if (sessionStorage.getItem(RECOVERY_FLAG) === "1") return;
    sessionStorage.setItem(RECOVERY_FLAG, "1");
    sessionStorage.removeItem("page_reloaded_for_chunk");

    console.warn("🧹 [Recovery] Tentative de récupération (cache/SW)", { trigger, err });

    // Unregister ALL service workers for this origin
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }

    // Clear caches
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // Reload with a cache-busting param (avoid reusing bad SW/HTML)
    const url = new URL(window.location.href);
    url.searchParams.set("__reload", Date.now().toString());
    window.location.replace(url.toString());
  } catch (e) {
    console.warn("🧹 [Recovery] Échec récupération", e);
    // As a last resort, hard reload
    window.location.reload();
  }
}

// Initialiser le listener PWA le plus tôt possible (évite de rater beforeinstallprompt)
initPWAInstallPromptListener();

// Hide the initial loader
const hideLoader = () => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => {
      if (loader) loader.style.display = 'none';
    }, 400);
  }
  // Also try legacy loader ID
  const legacyLoader = document.getElementById('initial-loader');
  if (legacyLoader) {
    legacyLoader.classList.add('hidden');
    setTimeout(() => {
      if (legacyLoader) legacyLoader.style.display = 'none';
    }, 400);
  }
};

// Show error if app fails to load
const showError = (rootElement: HTMLElement, error: unknown) => {
  hideLoader();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #f8f9fa; font-family: system-ui, -apple-system, sans-serif;">
      <div style="max-width: 500px; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
        <h1 style="color: #e74c3c; font-size: 24px; margin-bottom: 16px;">Erreur de chargement</h1>
        <p style="color: #666; margin-bottom: 16px;">L'application n'a pas pu démarrer.</p>
        <pre style="text-align: left; background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #ddd; overflow-x: auto; font-size: 12px; color: #c0392b; margin-bottom: 24px; white-space: pre-wrap;">${errorMessage}</pre>
        <button onclick="location.reload()" style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">Recharger</button>
      </div>
    </div>
  `;
};

// Initialize app
const initApp = () => {
  console.log("🚀 224Solutions - Starting...");
  
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Root element not found");
    return;
  }

  try {
    const root = createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </React.StrictMode>
    );
    
    console.log("✅ React app mounted");
    
    // Hide loader after React renders
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideLoader();
      });
    });
    
  } catch (error) {
    console.error("❌ React render error:", error);
    showError(rootElement, error);
  }
};

// Start app
initApp();

// Universal SW reset: works on ALL domains (224solution.net, lovable, etc.)
const resetParams = new URLSearchParams(window.location.search);
if (resetParams.has('resetSw')) {
  import('./lib/serviceWorkerRegistration').then(({ resetPWA }) => resetPWA());
} else {
  // Service Worker registration
  const enablePwaPreview =
    resetParams.has('pwa') ||
    window.localStorage.getItem('enable_pwa_preview') === '1';

  if (import.meta.env.DEV && !enablePwaPreview) {
    unregisterServiceWorker();
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
  } else {
    registerServiceWorker({ force: enablePwaPreview });
  }
}

// Capturer les erreurs globales
window.addEventListener('error', (event) => {
  console.error('Erreur globale:', event.error || event.message);

  // Auto-récupération sur erreurs typiques de cache/SW (écran blanc)
  const err = (event as any).error ?? event.message;
  if (isLikelyChunkOrAssetLoadError(err)) {
    recoverFromStaleCache("window.error", err);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejetée:', event.reason);

  if (isLikelyChunkOrAssetLoadError(event.reason)) {
    recoverFromStaleCache("unhandledrejection", event.reason);
  }
});
