/**
 * BOUTON D'INSTALLATION PWA
 * Bouton permanent pour installer l'application
 */

import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

interface PWAInstallButtonProps {
  appName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function PWAInstallButton({
  appName = 'l\'application',
  variant = 'default',
  size = 'default',
  className = ''
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, promptInstall, isMobile } = usePWAInstall();

  const handleInstall = async () => {
    try {
      const success = await promptInstall();
      if (success) {
        toast.success('✅ Installation lancée !', {
          description: `${appName} sera installée sur votre appareil`
        });
      }
    } catch (error) {
      console.error('Erreur installation:', error);
      toast.error('❌ Erreur lors de l\'installation');
    }
  };

  // Si déjà installé
  if (isInstalled) {
    return (
      <Button variant="outline" size={size} className={`${className} border-green-500 text-green-700`} disabled>
        <CheckCircle className="w-4 h-4 mr-2" />
        Installé
      </Button>
    );
  }

  // Si installable
  if (isInstallable) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleInstall}
      >
        <Download className="w-4 h-4 mr-2" />
        {isMobile ? 'Installer l\'App' : 'Télécharger l\'App'}
      </Button>
    );
  }

  // Si pas installable (déjà en mode PWA ou navigateur non compatible)
  return null;
}
