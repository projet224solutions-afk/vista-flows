/**
 * =====================================================
 * COMPOSANT: DownloadAppBanner
 * =====================================================
 * 
 * Bandeau de téléchargement pour l'application 224Solutions
 * - Détecte automatiquement si l'utilisateur est sur mobile ou desktop
 * - Propose le téléchargement APK (mobile) ou EXE (desktop)
 * - Mémorise le choix de fermeture dans localStorage
 * 
 * @author 224Solutions
 * @version 2.0
 */

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';

// =====================================================
// CONFIGURATION DES LIENS DE TÉLÉCHARGEMENT
// =====================================================
// Modifiez ces URLs selon votre serveur d'hébergement
const DOWNLOAD_CONFIG = {
  // Lien vers le fichier APK pour appareils Android
  apkUrl: 'https://224solution.net/download/224Solutions.apk',
  
  // Lien vers l'installateur EXE pour Windows
  exeUrl: 'https://224solution.net/download/224Solutions.exe',
  
  // Clé localStorage pour mémoriser la fermeture du bandeau
  storageKey: '224solutions-download-banner-dismissed',
  
  // Délai avant affichage du bandeau (en millisecondes)
  displayDelay: 2000,
};

// =====================================================
// COMPOSANT PRINCIPAL
// =====================================================
export function DownloadAppBanner() {
  // État pour contrôler l'affichage du bandeau
  const [isVisible, setIsVisible] = useState(false);
  
  // État pour stocker le type d'appareil détecté
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // =====================================================
  // EFFET: Initialisation et détection de l'appareil
  // =====================================================
  useEffect(() => {
    // Vérifier si l'utilisateur a déjà fermé le bandeau
    const wasDismissed = localStorage.getItem(DOWNLOAD_CONFIG.storageKey);
    if (wasDismissed === 'true') {
      return; // Ne pas afficher si déjà fermé
    }

    // Vérifier si l'app est déjà installée en mode PWA (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return; // Ne pas afficher si déjà installée
    }

    // Détection du type d'appareil (mobile ou desktop)
    // Utilise le User-Agent pour détecter les appareils mobiles
    const mobileRegex = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobile = mobileRegex.test(navigator.userAgent);
    setIsMobileDevice(isMobile);

    // Afficher le bandeau après un court délai pour une meilleure UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, DOWNLOAD_CONFIG.displayDelay);

    // Nettoyage du timer à la destruction du composant
    return () => clearTimeout(timer);
  }, []);

  // =====================================================
  // FONCTION: Fermer le bandeau et mémoriser le choix
  // =====================================================
  const handleClose = () => {
    setIsVisible(false);
    // Sauvegarder dans localStorage pour ne plus afficher
    localStorage.setItem(DOWNLOAD_CONFIG.storageKey, 'true');
  };

  // =====================================================
  // FONCTION: Obtenir le lien de téléchargement approprié
  // =====================================================
  const getDownloadUrl = () => {
    return isMobileDevice ? DOWNLOAD_CONFIG.apkUrl : DOWNLOAD_CONFIG.exeUrl;
  };

  // =====================================================
  // RENDU: Ne rien afficher si le bandeau n'est pas visible
  // =====================================================
  if (!isVisible) {
    return null;
  }

  // =====================================================
  // RENDU PRINCIPAL DU BANDEAU
  // =====================================================
  return (
    <div 
      id="download-banner"
      className="fixed left-0 right-0 z-40 animate-in slide-in-from-bottom duration-300"
      style={{ bottom: '80px' }} // Positionné au-dessus de la barre de navigation mobile
      role="banner"
      aria-label="Bandeau de téléchargement de l'application"
    >
      {/* Container principal avec fond gradient et shadow */}
      <div 
        className="w-full px-3 py-3 shadow-lg rounded-t-xl mx-auto max-w-[98%] sm:max-w-full sm:rounded-none"
        style={{ 
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          boxShadow: '0 -4px 20px rgba(37, 99, 235, 0.4)'
        }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          
          {/* Section gauche: Icône + Message */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Icône dynamique selon le type d'appareil */}
            <div 
              className="p-2 rounded-lg flex-shrink-0 bg-white/20"
            >
              {isMobileDevice ? (
                <Smartphone className="w-5 h-5 text-white" />
              ) : (
                <Monitor className="w-5 h-5 text-white" />
              )}
            </div>
            
            {/* Message d'invitation au téléchargement */}
            <div className="flex flex-col">
              <p className="text-sm font-bold text-white leading-tight">
                Téléchargez 224Solutions
              </p>
              <p className="text-xs text-white/80 hidden sm:block">
                Pour une meilleure expérience !
              </p>
            </div>
          </div>

          {/* Section droite: Boutons d'action */}
          <div className="flex items-center gap-2 flex-shrink-0">
            
            {/* Bouton de téléchargement principal */}
            <a
              id="download-btn"
              href={getDownloadUrl()}
              download
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 bg-white text-blue-600 hover:bg-blue-50 active:scale-95 shadow-md"
              aria-label={`Télécharger l'application ${isMobileDevice ? 'APK pour Android' : 'EXE pour Windows'}`}
            >
              <Download className="w-4 h-4" />
              <span>Installer</span>
            </a>
            
            {/* Bouton de fermeture */}
            <button
              id="close-banner"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-1.5 rounded-full transition-all duration-200 bg-white/20 hover:bg-white/30 text-white"
              aria-label="Fermer le bandeau de téléchargement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EXPORT PAR DÉFAUT
// =====================================================
// Permet d'importer facilement: import DownloadAppBanner from './DownloadAppBanner'
export default DownloadAppBanner;
