/**
 * Widget de Communication Flottant - 224SOLUTIONS
 * Widget réutilisable pour toutes les interfaces
 * Optimisé pour éviter les problèmes INP (Interaction to Next Paint)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Bell } from 'lucide-react';
import { useUniversalCommunication } from '@/hooks/useUniversalCommunication';
import { useAuth } from '@/hooks/useAuth';

interface CommunicationWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showNotifications?: boolean;
}

/**
 * Widget de Communication - VERSION SIMPLIFIÉE
 * Bouton flottant de notification qui redirige vers /messages
 */
 * Widget de Communication - VERSION SIMPLIFIÉE
 * Bouton flottant de notification qui redirige vers /messages
 */
export default function CommunicationWidget({ 
  position = 'bottom-right',
  showNotifications = true 
}: CommunicationWidgetProps) {
  const { user } = useAuth();
  const { unreadCount, notificationCount } = useUniversalCommunication();
  const navigate = useNavigate();

  if (!user) return null;

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2`}>
      {/* Bouton principal Messages */}
      <Button
        size="lg"
        onClick={() => navigate('/messages')}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
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

      {/* Bouton notifications (optionnel) */}
      {showNotifications && notificationCount > 0 && (
        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate('/messages')}
          className="h-12 w-12 rounded-full shadow-lg relative"
        >
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
          >
            {notificationCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
