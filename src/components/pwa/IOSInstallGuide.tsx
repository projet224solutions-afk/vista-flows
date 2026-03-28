/**
 * Guide d'installation PWA iOS - Style natif immersif
 * Overlay plein écran avec flèche animée pointant vers le bouton Share de Safari
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, Plus, X, Check, ArrowDown, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface IOSInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IOSInstallGuide({ open, onOpenChange }: IOSInstallGuideProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [isSafari, setIsSafari] = useState(true);
  const [isIPad, setIsIPad] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('');
  const modalCardClass = 'bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl';
  const closeButtonClass = 'absolute top-12 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors';

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyButtonText(t('pwa.ios.nonSafari.copySuccess'));
      setTimeout(() => setCopyButtonText(t('pwa.ios.nonSafari.copyLink')), 2000);
    } catch {
      setCopyButtonText(t('pwa.ios.nonSafari.copyError'));
      setTimeout(() => setCopyButtonText(t('pwa.ios.nonSafari.copyLink')), 2500);
    }
  };

  const openInSafari = async () => {
    const current = window.location.href;
    const safariUrl = current.startsWith('https://')
      ? current.replace('https://', 'x-safari-https://')
      : current.startsWith('http://')
        ? current.replace('http://', 'x-safari-http://')
        : current;

    try {
      window.location.assign(safariUrl);
      // Si le schéma n'est pas supporté, proposer la copie du lien après un court delai
      setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          await copyCurrentLink();
        }
      }, 800);
    } catch {
      await copyCurrentLink();
    }
  };

  const detectIOSAndSafari = () => {
    const ua = navigator.userAgent;
    const platform = navigator.platform || '';

    const iosByUA = /iPhone|iPad|iPod/i.test(ua);
    const ipadOSDesktopMode = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const iosDevice = iosByUA || ipadOSDesktopMode;

    const safariToken = /Safari/i.test(ua);
    const versionToken = /Version\//i.test(ua);
    const excludedBrowsers = /CriOS|FxiOS|EdgiOS|OPiOS|Chrome|GSA|DuckDuckGo|YaBrowser|UCBrowser|SamsungBrowser|Vivaldi|Brave|Firefox|Focus/i.test(ua);
    const inAppBrowser = /FBAN|FBAV|Instagram|Line|MicroMessenger|Twitter|WhatsApp|Snapchat|TikTok|wv/i.test(ua);

    const safariIOS = iosDevice && safariToken && versionToken && !excludedBrowsers && !inAppBrowser;

    return {
      isIPadDevice: /iPad/i.test(ua) || ipadOSDesktopMode,
      isSafariIOS: safariIOS,
    };
  };

  useEffect(() => {
    const detection = detectIOSAndSafari();
    setIsSafari(detection.isSafariIOS);
    setIsIPad(detection.isIPadDevice);
  }, []);

  useEffect(() => {
    if (open) {
      setStep(0);
      setCopyButtonText(t('pwa.ios.nonSafari.copyLink'));
    }
  }, [open, t]);

  if (!open) return null;

  // Si pas Safari → message "ouvrir dans Safari"
  if (!isSafari) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={modalCardClass}
          >
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300">
              {t('pwa.ios.step.preTitle')}
            </div>
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t('pwa.ios.nonSafari.title')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('pwa.ios.nonSafari.description')}
            </p>
            <Button
              onClick={openInSafari}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {t('pwa.ios.nonSafari.openSafari')}
            </Button>
            <Button
              onClick={copyCurrentLink}
              variant="outline"
              className="w-full h-12 font-semibold"
            >
              <span>{copyButtonText}</span>
            </Button>
            <button onClick={() => onOpenChange(false)} className="text-sm text-muted-foreground hover:underline">
              {t('pwa.ios.actions.close')}
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const steps = [
    {
      // Étape 0 : Flèche vers le bouton Share
      render: () => (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col"
        >
          {/* Overlay semi-transparent en haut */}
          <div className="flex-1 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300">
                {t('pwa.ios.step1.badge')}
              </div>
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <img src="/icon-192.png?v=3" alt="224Solutions" className="w-12 h-12 rounded-xl" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
              </div>
              <h2 className="text-xl font-bold text-foreground">{t('pwa.ios.step1.title')}</h2>
              <p className="text-muted-foreground text-sm">
                {t('pwa.ios.step1.description')}
              </p>
              
              {/* Icône Share stylisée */}
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                  <Share className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-11 font-medium"
                >
                  {t('pwa.ios.actions.close')}
                </Button>
                <Button
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {t('pwa.ios.actions.next')}
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Flèche animée pointant vers le bas (vers le bouton Share de Safari) */}
          <div className={`bg-black/70 ${isIPad ? 'pb-4' : 'pb-16'} pt-4 flex flex-col items-center`}>
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="flex flex-col items-center"
            >
              <ArrowDown className="w-10 h-10 text-white" />
              <span className="text-white text-xs font-medium mt-1">{t('pwa.ios.step1.hint')}</span>
            </motion.div>
          </div>

          {/* Bouton fermer discret */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
            className={closeButtonClass}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </motion.div>
      ),
    },
    {
      // Étape 1 : "Sur l'écran d'accueil"
      render: () => (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className={modalCardClass}
          >
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-300">
                {t('pwa.ios.step2.badge')}
              </div>
            {/* Simulation du menu partager iOS */}
            <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-xl border-2 border-blue-500 shadow-md">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">Sur l'écran d'accueil</p>
                  <p className="text-xs text-muted-foreground">Ajouter à l'écran d'accueil</p>
                </div>
                <motion.div
                  animate={{ x: [-4, 4, -4] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="ml-auto"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </motion.div>
              </div>
              
              {/* Faux éléments du menu */}
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-700/60 rounded-xl opacity-40">
                <div className="w-10 h-10 bg-gray-300 dark:bg-slate-600 rounded-lg" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-slate-600 rounded" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-700/60 rounded-xl opacity-30">
                <div className="w-10 h-10 bg-gray-300 dark:bg-slate-600 rounded-lg" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-slate-600 rounded" />
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm">
              {t('pwa.ios.step2.description')}
            </p>

            <Button
              onClick={() => setStep(2)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {t('pwa.ios.actions.next')}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(0)}
                className="h-11"
              >
                {t('pwa.ios.actions.back')}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11"
              >
                {t('pwa.ios.actions.close')}
              </Button>
            </div>
          </motion.div>

          <button
            onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
            className={closeButtonClass}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </motion.div>
      ),
    },
    {
      // Étape 2 : Confirmation "Ajouter"
      render: () => (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className={modalCardClass}
          >
              <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-300">
                {t('pwa.ios.step3.badge')}
              </div>
            {/* Simulation de la confirmation iOS */}
            <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <button className="text-blue-600 text-sm font-medium">Annuler</button>
                <p className="font-semibold text-sm text-foreground">Ajouter à l'écran</p>
                <motion.button
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-blue-600 text-sm font-bold px-3 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-lg"
                >
                  Ajouter
                </motion.button>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-xl">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow">
                  <img src="/icon-192.png?v=3" alt="" className="w-10 h-10 rounded-lg" onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">224Solutions</p>
                  <p className="text-xs text-muted-foreground truncate">224solution.net</p>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              {t('pwa.ios.step3.description')}
            </p>

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              <Check className="w-5 h-5 mr-2" />
              {t('pwa.ios.actions.finish')}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="h-11"
              >
                {t('pwa.ios.actions.back')}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11"
              >
                {t('pwa.ios.actions.close')}
              </Button>
            </div>
          </motion.div>

          <button
            onClick={() => onOpenChange(false)}
            className={closeButtonClass}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </motion.div>
      ),
    },
  ];

  return (
    <AnimatePresence mode="wait">
      {steps[step]?.render()}
    </AnimatePresence>
  );
}

export default IOSInstallGuide;
