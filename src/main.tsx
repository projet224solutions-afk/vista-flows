import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force clean rebuild after migration - v3

// Attendre que le DOM soit complètement chargé
const initApp = () => {
  console.log("🚀 [main.tsx] Initialisation de l'application...");
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Root element not found in HTML");
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Erreur de chargement</h1><p>Élément root manquant. Vérifiez index.html</p></div>';
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
  } catch (error) {
    console.error("❌ Erreur lors du montage de React:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; color: red;">
        <h1>Erreur de chargement</h1>
        <pre style="text-align: left; background: #f5f5f5; padding: 10px; border-radius: 5px;">${error instanceof Error ? error.message : 'Erreur inconnue'}</pre>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">Vérifiez la console pour plus de détails</p>
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
