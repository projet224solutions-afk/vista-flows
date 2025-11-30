import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Attendre que le DOM soit complètement chargé
const initApp = () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    console.error("❌ Root element not found in HTML");
    document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Erreur de chargement</h1><p>Élément root manquant. Vérifiez index.html</p></div>';
    return;
  }

  try {
    // Les clés Supabase sont configurées directement dans le code
    // Pas besoin de vérification car elles sont en dur dans client.ts

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
        <pre>${error instanceof Error ? error.message : 'Erreur inconnue'}</pre>
      </div>
    `;
  }
};

// Lancer l'app quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
