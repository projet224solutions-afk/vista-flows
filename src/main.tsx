import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/serviceWorkerRegistration";

// Masquer le loader de façon robuste
const hideLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
    setTimeout(() => {
      loader.style.display = 'none';
    }, 350);
  }
};

// Afficher une erreur visuelle
const showError = (rootElement: HTMLElement, error: unknown) => {
  hideLoader();
  const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #f8f9fa; font-family: system-ui, -apple-system, sans-serif;">
      <div style="max-width: 500px; text-align: center;">
        <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
        <h1 style="color: #e74c3c; font-size: 24px; margin-bottom: 16px;">Erreur de chargement</h1>
        <p style="color: #666; margin-bottom: 16px;">L'application n'a pas pu démarrer correctement.</p>
        <pre style="text-align: left; background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #ddd; overflow-x: auto; font-size: 12px; color: #c0392b; margin-bottom: 24px; white-space: pre-wrap;">${errorMessage}</pre>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button onclick="location.reload()" style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">Recharger</button>
          <button onclick="clearCachesAndReload()" style="padding: 12px 24px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">Vider le cache</button>
        </div>
      </div>
    </div>
  `;
  
  // Fonction globale pour vider le cache
  (window as any).clearCachesAndReload = async () => {
    try {
      // Désinscrire tous les service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      // Vider tous les caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      // Vider localStorage et sessionStorage
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Erreur nettoyage cache:', e);
    }
    // Recharger
    location.reload();
  };
};

// Initialisation de l'application
const initApp = () => {
  console.log("🚀 224Solutions - Initialisation...");
  
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Root element not found");
    const fallbackRoot = document.createElement('div');
    fallbackRoot.id = 'root';
    document.body.appendChild(fallbackRoot);
    showError(fallbackRoot, new Error('Élément root manquant'));
    return;
  }

  try {
    const root = createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log("✅ Application React montée");
    
    // Cacher le loader après que React a rendu
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideLoader();
      });
    });
    
  } catch (error) {
    console.error("❌ Erreur rendu React:", error);
    showError(rootElement, error);
  }
};

// Lancer l'app immédiatement
initApp();

// Enregistrer le Service Worker de manière différée
setTimeout(() => {
  registerServiceWorker();
}, 3000);

// Capturer les erreurs globales
window.addEventListener('error', (event) => {
  console.error('Erreur globale:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rejetée:', event.reason);
});
