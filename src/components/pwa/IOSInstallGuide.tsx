/**
 * Guide d'installation PWA spécifique pour iOS
 * iOS ne supporte pas beforeinstallprompt - installation manuelle requise
 */

import { useState, useEffect } from 'react';
import { Share, Plus, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface IOSInstallGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IOSInstallGuide({ open, onOpenChange }: IOSInstallGuideProps) {
  const [step, setStep] = useState(1);
  const [isSafari, setIsSafari] = useState(true);

  useEffect(() => {
    // Détecter si on est sur Safari (seul navigateur supportant PWA sur iOS)
    const ua = navigator.userAgent;
    const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    setIsSafari(safari);
  }, []);

  const steps = [
    {
      title: "Étape 1 : Ouvrir le menu Partager",
      description: "Appuyez sur l'icône de partage en bas de l'écran",
      icon: <Share className="w-12 h-12 text-primary" />,
      note: "L'icône ressemble à un carré avec une flèche vers le haut",
    },
    {
      title: "Étape 2 : Ajouter à l'écran d'accueil",
      description: "Faites défiler et appuyez sur \"Sur l'écran d'accueil\"",
      icon: <Plus className="w-12 h-12 text-primary p-2 border-2 border-primary rounded-lg" />,
      note: "Vous devrez peut-être faire défiler vers le bas pour trouver cette option",
    },
    {
      title: "Étape 3 : Confirmer l'installation",
      description: "Appuyez sur \"Ajouter\" en haut à droite",
      icon: <Smartphone className="w-12 h-12 text-green-600" />,
      note: "224Solutions sera maintenant sur votre écran d'accueil !",
    },
  ];

  const currentStep = steps[step - 1];

  if (!isSafari) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Ouvrir dans Safari
            </DialogTitle>
            <DialogDescription>
              Pour installer l'application sur iOS, vous devez utiliser Safari.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Chrome, Firefox et autres navigateurs</strong> ne supportent pas l'installation PWA sur iOS.
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Copiez l'adresse de cette page
              </p>
              <p className="text-sm text-muted-foreground">
                2. Ouvrez Safari
              </p>
              <p className="text-sm text-muted-foreground">
                3. Collez l'adresse et suivez les instructions
              </p>
            </div>

            <Button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
              className="w-full"
            >
              Copier l'adresse
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Installer sur iPhone/iPad
          </DialogTitle>
          <DialogDescription>
            Suivez ces étapes pour ajouter 224Solutions à votre écran d'accueil
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Indicateur de progression */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-colors ${
                  s === step 
                    ? 'bg-primary' 
                    : s < step 
                      ? 'bg-green-500' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Contenu de l'étape */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-muted rounded-2xl">
                {currentStep.icon}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg">{currentStep.title}</h3>
              <p className="text-muted-foreground mt-1">{currentStep.description}</p>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
              💡 {currentStep.note}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              Précédent
            </Button>
          )}
          
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              className="flex-1"
            >
              Suivant
            </Button>
          ) : (
            <Button 
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Compris !
            </Button>
          )}
        </div>

        {/* Bouton fermer */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

export default IOSInstallGuide;
