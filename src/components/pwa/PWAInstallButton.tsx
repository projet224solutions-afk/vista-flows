import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { toast } from 'sonner';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function PWAInstallButton({ 
  className, 
  variant = 'default',
  size = 'default' 
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const handleClick = async () => {
    const installed = await promptInstall();
    
    if (installed) {
      toast.success('🎉 Application installée!', {
        description: 'Ouvrez 224Solutions depuis votre écran d\'accueil'
      });
    }
  };

  // Si déjà installé
  if (isInstalled) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled
      >
        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
        Application installée
      </Button>
    );
  }

  // Si pas installable
  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Installer l'application
    </Button>
  );
}
