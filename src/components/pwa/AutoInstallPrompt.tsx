/**
 * AUTO INSTALL PROMPT - 224SOLUTIONS
 * Prompt d'installation PWA automatique et proéminent
 *
 * Fonctionnalités:
 * - S'affiche automatiquement après un délai configurable
 * - Interface attrayante avec bénéfices de l'installation
 * - Support iOS, Android et Desktop
 * - Gestion du stockage local pour ne pas re-afficher
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import {
  Download,
  X,
  Smartphone,
  WifiOff,
  Zap,
  Bell,
  Share,
  CheckCircle
} from 'lucide-react';
import IOSInstallGuide from './IOSInstallGuide';

interface AutoInstallPromptProps {
  /** Délai avant affichage en ms (défaut: 5000) */
  delayMs?: number;
  /** Afficher uniquement sur mobile */
  mobileOnly?: boolean;
  /** Afficher pour les vendeurs uniquement */
  vendorOnly?: boolean;
  /** Callback après installation */
  onInstalled?: () => void;
  /** Callback après fermeture */
  onDismissed?: () => void;
}

const STORAGE_KEY = 'pwa-auto-install-prompt';
const DISMISS_DURATION_DAYS = 7; // Ré-afficher après 7 jours si pas installé

export function AutoInstallPrompt({
  delayMs = 5000,
  mobileOnly = false,
  // vendorOnly reserved for future use
  onInstalled,
  onDismissed
}: AutoInstallPromptProps) {
  // Translation hook disponible pour future i18n
  useTranslation();
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isSafari,
    promptInstall
  } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Vérifier si on doit afficher le prompt
  const shouldShowPrompt = useCallback(() => {
    // Déjà installé
    if (isInstalled) return false;

    // Non installable (sauf iOS qui a toujours des instructions)
    if (!isInstallable && !isIOS) return false;

    // Mobile only mais pas sur mobile
    if (mobileOnly && !(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))) {
      return false;
    }

    // Vérifier le stockage local
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { dismissedAt, installed } = JSON.parse(stored);

        // Déjà installé
        if (installed) return false;

        // Dismissé récemment
        const dismissDate = new Date(dismissedAt);
        const now = new Date();
        const daysSinceDismiss = (now.getTime() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
          return false;
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    return true;
  }, [isInstalled, isInstallable, isIOS, mobileOnly]);

  // Effet pour afficher le prompt après le délai
  useEffect(() => {
    if (!shouldShowPrompt()) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, shouldShowPrompt]);

  // Gérer l'installation
  const handleInstall = async () => {
    if (isIOS || (isSafari && /Mac/i.test(navigator.userAgent))) {
      setShowIOSGuide(true);
      return;
    }

    setIsInstalling(true);

    try {
      const accepted = await promptInstall();

      if (accepted) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          installed: true,
          installedAt: new Date().toISOString()
        }));

        setIsVisible(false);
        onInstalled?.();
      }
    } catch (error) {
      console.error('[AutoInstallPrompt] Erreur installation:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Gérer la fermeture
  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dismissedAt: new Date().toISOString(),
      installed: false
    }));

    setIsVisible(false);
    onDismissed?.();
  };

  // Gérer la fermeture du guide iOS
  const handleIOSGuideClose = () => {
    setShowIOSGuide(false);
    // Considérer comme "vu" même si pas installé
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dismissedAt: new Date().toISOString(),
      installed: false
    }));
    setIsVisible(false);
  };

  if (!isVisible && !showIOSGuide) return null;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              // Fermer seulement si on clique sur le backdrop
              if (e.target === e.currentTarget) {
                handleDismiss();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header gradient */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                      {isIOS ? (
                        <Smartphone className="w-8 h-8" />
                      ) : (
                        <Download className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Installer 224Solutions</h2>
                      <p className="text-blue-100 text-sm">Application gratuite</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDismiss}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenu */}
              <div className="p-6 space-y-4">
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Installez l'application pour une meilleure expérience
                </p>

                {/* Avantages */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <WifiOff className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">Mode hors ligne</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">Plus rapide</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium">Notifications</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium">Accès direct</span>
                  </div>
                </div>

                {/* Instructions iOS */}
                {isIOS && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <Share className="w-4 h-4" />
                      Appuyez sur <strong>Partager</strong> puis <strong>"Sur l'écran d'accueil"</strong>
                    </p>
                  </div>
                )}

                {/* Boutons */}
                <div className="space-y-2 pt-2">
                  <Button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isInstalling ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                          <Download className="w-5 h-5 mr-2" />
                        </motion.div>
                        Installation...
                      </>
                    ) : isIOS ? (
                      <>
                        <Share className="w-5 h-5 mr-2" />
                        Voir les instructions
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Installer maintenant
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleDismiss}
                    className="w-full text-gray-500"
                  >
                    Continuer sur le navigateur
                  </Button>
                </div>

                {/* Note de sécurité */}
                <p className="text-xs text-center text-gray-400">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Application sécurisée - Aucun téléchargement requis
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guide iOS */}
      <IOSInstallGuide
        open={showIOSGuide}
        onOpenChange={handleIOSGuideClose}
      />
    </>
  );
}

export default AutoInstallPrompt;
