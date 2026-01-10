/**
 * BANDEAU DE TÉLÉCHARGEMENT APPLICATION NATIVE
 * Affiche un lien de téléchargement APK (mobile) ou EXE (desktop)
 */

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Configuration des liens de téléchargement
const DOWNLOAD_LINKS = {
  mobile: 'https://ton-serveur.com/224Solutions.apk', // À remplacer par le vrai lien APK
  desktop: 'https://ton-serveur.com/224Solutions-Setup.exe', // À remplacer par le vrai lien EXE
};

export function DownloadAppBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Vérifier si déjà dismissé
    const wasDismissed = localStorage.getItem('download-banner-dismissed');
    if (wasDismissed) return;

    // Vérifier si l'app est déjà installée en mode standalone (PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Détection mobile
    const mobileCheck = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    // Afficher après 2 secondes
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShowBanner(false);
    localStorage.setItem('download-banner-dismissed', 'true');
  };

  const downloadLink = isMobile ? DOWNLOAD_LINKS.mobile : DOWNLOAD_LINKS.desktop;

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 shadow-2xl border-t border-white/10">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          {/* Icône et texte */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="bg-orange-500/20 p-2 rounded-lg flex-shrink-0">
              {isMobile ? (
                <Smartphone className="w-5 h-5 text-orange-400" />
              ) : (
                <Monitor className="w-5 h-5 text-orange-400" />
              )}
            </div>
            <p className="text-sm md:text-base truncate">
              <span className="hidden sm:inline">Téléchargez l'application </span>
              <span className="font-bold text-orange-400">224Solutions</span>
              <span className="hidden md:inline"> pour une meilleure expérience !</span>
            </p>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              asChild
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
            >
              <a href={downloadLink} download>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger</span>
              </a>
            </Button>
            
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
