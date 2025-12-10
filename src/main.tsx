import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clean rebuild after migration - v4

// Gestion de la redirection SPA pour les hébergeurs qui supportent 200.html
const handleSpaRedirect = () => {
  const redirect = sessionStorage.getItem('spa_redirect');
  if (redirect) {
    sessionStorage.removeItem('spa_redirect');
    window.history.replaceState(null, '', '/' + redirect);
  }
};

// Attendre que le DOM soit complètement chargé
const initApp = () => {
  console.log("🚀 [main.tsx] Initialisation de l'application 224Solutions...");
  
  // Gérer la redirection SPA si nécessaire
  handleSpaRedirect();
  
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Root element not found in HTML");
    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
        <h1 style="color: #e74c3c; font-size: 24px;">Erreur de chargement</h1>
        <p style="color: #666; margin-top: 16px;">Élément root manquant. Le fichier index.html pourrait être mal configuré.</p>
        <button onclick="location.reload()" style="margin-top: 24px; padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          Recharger la page
        </button>
      </div>
    `;
    return;
  }

  try {
    console.log("✅ Root element trouvé, montage de React...");
    
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log("✅ Application React montée avec succès");
    
    // Masquer le loader si présent
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  } catch (error) {
    console.error("❌ Erreur lors du montage de React:", error);
    
    // Afficher une page d'erreur utilisable
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #f8f9fa;">
        <div style="max-width: 500px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
          <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
          <h1 style="color: #e74c3c; font-size: 24px; margin-bottom: 16px;">Erreur de chargement</h1>
          <p style="color: #666; margin-bottom: 16px;">
            L'application n'a pas pu démarrer correctement.
          </p>
          <pre style="text-align: left; background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #ddd; overflow-x: auto; font-size: 12px; color: #c0392b; margin-bottom: 24px;">
${error instanceof Error ? error.message : 'Erreur inconnue'}
          </pre>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button onclick="location.reload()" style="padding: 12px 24px; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Recharger
            </button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); location.reload()" style="padding: 12px 24px; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
              Vider le cache
            </button>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            Si le problème persiste, contactez le support technique.
          </p>
        </div>
      </div>
    `;
  }
};

// Lancer l'app quand le DOM est prêt
if (document.readyState === 'loading') {
  console.log("⏳ DOM en chargement, attente de DOMContentLoaded...");
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log("✅ DOM déjà chargé, initialisation immédiate");
  initApp();
}

// Capturer les erreurs globales non gérées
window.addEventListener('error', (event) => {
  console.error('❌ Erreur globale non gérée:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejetée non gérée:', event.reason);
});