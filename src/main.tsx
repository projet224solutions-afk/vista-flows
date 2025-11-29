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
    // Garde environnement: afficher un bandeau si les clés nécessaires manquent
    const env = (import.meta as any).env || {};
    const missing: string[] = [];
    if (!env.VITE_SUPABASE_PUBLISHABLE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
    if (!env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');
    // Service role ne doit pas être utilisé côté navigateur; on informe seulement

    if (missing.length > 0) {
      rootElement.innerHTML = `
        <div style="padding:16px;background:#FFF3CD;color:#664D03;border:1px solid #FFECB5;border-radius:8px;margin:16px;font-family:system-ui">
          <h2 style="margin:0 0 8px 0">Configuration manquante</h2>
          <p>Les variables suivantes sont absentes :</p>
          <ul>${missing.map(k => `<li><code>${k}</code></li>`).join('')}</ul>
          <p style="margin-top:8px">Allez sur Supabase → Paramètres → API et copiez la clé <strong>anon</strong> dans <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> et <code>SUPABASE_ANON_KEY</code>.</p>
          <p style="margin-top:8px">Ensuite, créez <code>.env.local</code> et relancez l'application.</p>
        </div>`;
      return;
    }

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
