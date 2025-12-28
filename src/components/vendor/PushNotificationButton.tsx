/**
 * BOUTON D'ACTIVATION DES NOTIFICATIONS PUSH
 * Permet aux vendeurs d'activer/désactiver les notifications FCM
 * 224SOLUTIONS
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface PushNotificationButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  showText?: boolean;
  className?: string;
}

export function PushNotificationButton({
  variant = 'ghost',
  size = 'icon',
  showText = false,
  className = ''
}: PushNotificationButtonProps) {
  const {
    isSupported,
    isEnabled,
    permission,
    isLoading,
    enableNotifications,
    disableNotifications,
    testNotification
  } = useFirebaseMessaging();

  const [open, setOpen] = useState(false);

  const handleEnable = async () => {
    await enableNotifications();
    setOpen(false);
  };

  const handleDisable = async () => {
    await disableNotifications();
    setOpen(false);
  };

  // Icône selon l'état
  const getIcon = () => {
    if (isLoading) return <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />;
    if (!isSupported) return <BellOff className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />;
    if (isEnabled) return <BellRing className="w-4 h-4 md:w-5 md:h-5 text-green-500" />;
    if (permission === 'denied') return <BellOff className="w-4 h-4 md:w-5 md:h-5 text-red-500" />;
    return <Bell className="w-4 h-4 md:w-5 md:h-5" />;
  };

  // Couleur du badge
  const getBadgeVariant = () => {
    if (isEnabled) return 'default';
    if (permission === 'denied') return 'destructive';
    return 'secondary';
  };

  if (!isSupported) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        title="Notifications non supportées"
      >
        {getIcon()}
        {showText && <span className="ml-2">Non supporté</span>}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className} relative`}
          title={isEnabled ? 'Notifications activées' : 'Activer les notifications'}
        >
          {getIcon()}
          {showText && (
            <span className="ml-2">
              {isEnabled ? 'Notifications' : 'Activer'}
            </span>
          )}
          {isEnabled && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications Push</h4>
            <Badge variant={getBadgeVariant()}>
              {isEnabled ? 'Activées' : permission === 'denied' ? 'Bloquées' : 'Désactivées'}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            {isEnabled
              ? 'Vous recevez les notifications pour les commandes, paiements et messages.'
              : permission === 'denied'
              ? 'Les notifications sont bloquées par votre navigateur. Modifiez les paramètres du site.'
              : 'Activez les notifications pour ne rien manquer.'}
          </p>

          <div className="flex flex-col gap-2">
            {isEnabled ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testNotification}
                  className="w-full"
                >
                  <BellRing className="w-4 h-4 mr-2" />
                  Tester
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisable}
                  className="w-full"
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  Désactiver
                </Button>
              </>
            ) : permission !== 'denied' ? (
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Activer les notifications
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Cliquez sur l'icône 🔒 dans la barre d'adresse pour autoriser les notifications.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PushNotificationButton;
