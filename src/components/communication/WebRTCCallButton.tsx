/**
 * 📞 BOUTON D'APPEL WEBRTC - 224SOLUTIONS
 * Bouton pour initier un appel audio WebRTC
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Loader2 } from 'lucide-react';
import { useWebRTCAudioCall } from '@/hooks/useWebRTCAudioCall';
import { cn } from '@/lib/utils';

interface WebRTCCallButtonProps {
  userId: string;
  userName?: string;
  userAvatar?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'icon';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
}

export default function WebRTCCallButton({
  userId,
  userName = 'Utilisateur',
  userAvatar,
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
}: WebRTCCallButtonProps) {
  const { callState, startCall } = useWebRTCAudioCall();

  const isInCall = callState.isInCall || callState.isCalling || callState.isReceivingCall;

  const handleCall = async () => {
    if (isInCall || disabled) return;
    
    await startCall(userId, {
      name: userName,
      avatar: userAvatar,
    });
  };

  if (variant === 'icon') {
    return (
      <Button
        onClick={handleCall}
        variant="ghost"
        size="icon"
        disabled={isInCall || disabled}
        className={cn(
          "rounded-full",
          isInCall && "opacity-50 cursor-not-allowed",
          className
        )}
        title={isInCall ? "Appel en cours" : `Appeler ${userName}`}
      >
        {isInCall ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Phone className="w-5 h-5 text-green-600" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleCall}
      variant={variant === 'default' ? 'default' : variant}
      size={size}
      disabled={isInCall || disabled}
      className={cn(
        variant === 'default' && "bg-green-600 hover:bg-green-700",
        isInCall && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isInCall ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Phone className="w-4 h-4 mr-2" />
      )}
      {isInCall ? 'Appel en cours...' : 'Appeler'}
    </Button>
  );
}
