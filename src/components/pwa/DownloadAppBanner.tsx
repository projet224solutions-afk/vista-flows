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
  apkUrl: 'https://mon-serveur.com/224Solutions.apk',
  
  // Lien vers l'installateur EXE pour Windows
  exeUrl: 'https://mon-serveur.com/224Solutions-Setup.exe',
  
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
      className="fixed bottom-0 left-0 right-0 z-[9999] animate-in slide-in-from-bottom duration-300"
      role="banner"
      aria-label="Bandeau de téléchargement de l'application"
    >
      {/* Container principal avec fond sombre et shadow */}
      <div 
        className="w-full px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          
          {/* Section gauche: Icône + Message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icône dynamique selon le type d'appareil */}
            <div 
              className="p-2.5 rounded-xl flex-shrink-0"
              style={{ backgroundColor: 'rgba(255, 75, 0, 0.2)' }}
            >
              {isMobileDevice ? (
                <Smartphone className="w-6 h-6" style={{ color: '#ff4b00' }} />
              ) : (
                <Monitor className="w-6 h-6" style={{ color: '#ff4b00' }} />
              )}
            </div>
            
            {/* Message d'invitation au téléchargement */}
            <p 
              id="download-text"
              className="text-sm sm:text-base font-medium"
              style={{ color: '#ffffff' }}
            >
              <span className="hidden sm:inline">
                Téléchargez l'application{' '}
              </span>
              <span className="font-bold" style={{ color: '#ff4b00' }}>
                224Solutions
              </span>
              <span className="hidden md:inline">
                {' '}pour une meilleure expérience !
              </span>
              <span className="sm:hidden">
                {' '}- Télécharger
              </span>
            </p>
          </div>

          {/* Section droite: Boutons d'action */}
          <div className="flex items-center gap-3 flex-shrink-0">
            
            {/* Bouton de téléchargement principal */}
            <a
              id="download-btn"
              href={getDownloadUrl()}
              download
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 hover:opacity-90 hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: '#ff4b00', 
                color: '#ffffff',
                textDecoration: 'none'
              }}
              aria-label={`Télécharger l'application ${isMobileDevice ? 'APK pour Android' : 'EXE pour Windows'}`}
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Télécharger</span>
            </a>
            
            {/* Bouton de fermeture */}
            <button
              id="close-banner"
              onClick={handleClose}
              className="p-2 rounded-full transition-all duration-200 hover:bg-white/10"
              style={{ color: '#ffffff' }}
              aria-label="Fermer le bandeau de téléchargement"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
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
