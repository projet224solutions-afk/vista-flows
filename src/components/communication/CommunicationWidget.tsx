/**
 * Widget de Communication Flottant - 224SOLUTIONS
 * Widget réutilisable pour toutes les interfaces
 * Optimisé pour éviter les problèmes INP (Interaction to Next Paint)
 */

import React, { useState, useCallback, startTransition, memo, useDeferredValue } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Bell, Minimize2, Maximize2 } from 'lucide-react';
import { useUniversalCommunication } from '@/hooks/useUniversalCommunication';
import { useAuth } from '@/hooks/useAuth';
import UniversalCommunicationHub from './UniversalCommunicationHub';
import CommunicationNotificationCenter from './CommunicationNotificationCenter';

interface CommunicationWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showNotifications?: boolean;
}

const positionClasses = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4'
};

// Mémoisation du composant principal pour éviter re-renders inutiles
const CommunicationWidgetContent = memo(function CommunicationWidgetContent({ 
  position = 'bottom-right',
  showNotifications = true,
  unreadCount,
  notificationCount
}: {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showNotifications: boolean;
  unreadCount: number;
  notificationCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Handler optimisé pour éviter le blocage du thread principal
  const handleOpenChange = useCallback((open: boolean) => {
    startTransition(() => {
      setIsOpen(open);
    });
  }, []);

  const handleNotificationOpenChange = useCallback((open: boolean) => {
    startTransition(() => {
      setShowNotificationCenter(open);
    });
  }, []);

  const handleMinimizeToggle = useCallback(() => {
    startTransition(() => {
      setIsMinimized(prev => !prev);
    });
  }, []);

  return (
    <>
      {/* Widget flottant - pointer-events-none sur le conteneur pour ne pas bloquer les clics */}
      <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 pointer-events-none`}>
        {/* Bouton principal - pointer-events-auto pour réactiver les clics sur le bouton */}
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 relative pointer-events-auto"
            >
              <MessageSquare className="h-6 w-6" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center text-xs animate-pulse"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl h-[80vh] p-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Communication 224SOLUTIONS
                </DialogTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMinimizeToggle}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="flex-1 px-6 pb-6">
              {!isMinimized && (
                <UniversalCommunicationHub className="h-full" />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Bouton notifications (optionnel) - pointer-events-auto */}
        {showNotifications && notificationCount > 0 && (
          <Dialog open={showNotificationCenter} onOpenChange={handleNotificationOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="lg"
                className="h-12 w-12 rounded-full shadow-lg relative pointer-events-auto"
              >
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                >
                  {notificationCount}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Centre de notifications</DialogTitle>
              </DialogHeader>
              <CommunicationNotificationCenter />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Sound notification (hidden audio) - uses file to avoid CSP blocking */}
      <audio id="notification-sound" preload="none" />
    </>
  );
});

export default function CommunicationWidget({ 
  position = 'bottom-right',
  showNotifications = true 
}: CommunicationWidgetProps) {
  const { user } = useAuth();
  const { stats } = useUniversalCommunication();
  
  // Utiliser useDeferredValue pour éviter le blocage du thread principal
  const deferredUnreadCount = useDeferredValue(stats.unreadCount + stats.notificationCount);
  const deferredNotificationCount = useDeferredValue(stats.notificationCount);

  // Ne pas afficher le widget si l'utilisateur n'est pas authentifié
  if (!user) {
    return null;
  }

  return (
    <CommunicationWidgetContent 
      position={position}
      showNotifications={showNotifications}
      unreadCount={deferredUnreadCount}
      notificationCount={deferredNotificationCount}
    />
  );
}
