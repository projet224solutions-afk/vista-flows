import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, unregisterServiceWorker } from "./lib/serviceWorkerRegistration";

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
        <App />
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

// Service Worker: désactivé en preview/dev pour éviter des bundles React mélangés (Invalid hook call)
const isPreviewHost = window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname.includes('localhost') ||
  window.location.hostname.includes('127.0.0.1');

if (import.meta.env.DEV || isPreviewHost) {
  unregisterServiceWorker();
  // Nettoyer les caches éventuels (corrige les écrans blancs après déploiement)
  if ('caches' in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
} else {
  setTimeout(() => {
    registerServiceWorker();
  }, 3000);
}

// Capturer les erreurs globales
window.addEventListener('error', (event) => {
  console.error('Erreur globale:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejetée:', event.reason);
});
