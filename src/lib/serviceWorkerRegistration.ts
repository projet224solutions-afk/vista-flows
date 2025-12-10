/**
 * Service Worker Registration
 * Gère l'enregistrement du SW de manière non-bloquante
 */

export function registerServiceWorker() {
  // Enregistrer le SW de manière différée pour ne pas bloquer le chargement initial
  if ("serviceWorker" in navigator) {
    // Attendre que l'app soit chargée avant d'enregistrer le SW
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }
  }
}

function registerSW() {
  // Petit délai pour s'assurer que l'app React est montée
  setTimeout(() => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("[PWA] Service Worker enregistré");

        // Détection nouvelle version
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.onstatechange = () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                showUpdateMessage();
              }
            };
          }
        };

        // Vérifier les mises à jour périodiquement (toutes les heures)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.warn("[PWA] Erreur SW:", error);
      });
  }, 2000); // 2 secondes de délai
}

function showUpdateMessage() {
  // Éviter les doublons
  if (document.getElementById("pwa-update-banner")) return;

  const alertBox = document.createElement("div");
  alertBox.id = "pwa-update-banner";
  alertBox.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        <path d="M12 8v4l3 3"/>
      </svg>
      <span>Nouvelle mise à jour disponible</span>
    </div>
    <button id="pwa-update-btn" style="
      background: white;
      color: #2563eb;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    ">Actualiser</button>
  `;
  
  alertBox.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    max-width: 400px;
    margin: 0 auto;
    padding: 12px 16px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border-radius: 12px;
    cursor: pointer;
    z-index: 99999;
    box-shadow: 0 10px 40px rgba(37, 99, 235, 0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: slideUp 0.3s ease-out;
  `;

  // Ajouter animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(alertBox);

  // Gestionnaire de clic
  document.getElementById("pwa-update-btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage("skipWaiting");
      }
    });
    window.location.reload();
  });
}

export function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
