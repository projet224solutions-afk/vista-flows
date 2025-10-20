/**
 * Widget de Communication Flottant - 224SOLUTIONS
 * Widget réutilisable pour toutes les interfaces
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Bell, X, Minimize2, Maximize2 } from 'lucide-react';
import { useUniversalCommunication } from '@/hooks/useUniversalCommunication';
import UniversalCommunicationHub from './UniversalCommunicationHub';
import CommunicationNotificationCenter from './CommunicationNotificationCenter';

interface CommunicationWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showNotifications?: boolean;
}

export default function CommunicationWidget({ 
  position = 'bottom-right',
  showNotifications = true 
}: CommunicationWidgetProps) {
  const { stats } = useUniversalCommunication();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  const unreadCount = stats.unreadCount + stats.notificationCount;

  // Auto-ouvrir si nouvelles notifications importantes
  useEffect(() => {
    if (stats.notificationCount > 0 && !isOpen) {
      // Auto-show notification badge
      const timer = setTimeout(() => {
        // Animation de notification
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [stats.notificationCount, isOpen]);

  return (
    <>
      {/* Widget flottant */}
      <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2`}>
        {/* Bouton principal */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 relative"
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
                    onClick={() => setIsMinimized(!isMinimized)}
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

        {/* Bouton notifications (optionnel) */}
        {showNotifications && stats.notificationCount > 0 && (
          <Dialog open={showNotificationCenter} onOpenChange={setShowNotificationCenter}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="lg"
                className="h-12 w-12 rounded-full shadow-lg relative"
              >
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                >
                  {stats.notificationCount}
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

      {/* Sound notification (hidden audio) */}
      <audio id="notification-sound" preload="auto">
        <source src="data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAIAAABIgCBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAAAAExhdmM1OC45MS4xMDAAAAAAAAAAAAAAAACQAAAAAAAAASIAAAAAAAAAAAAAAAAA" type="audio/mpeg" />
      </audio>
    </>
  );
}