/**
 * Bouton SOS d'urgence pour conducteurs Taxi Moto
 * Pression longue de 1.5s pour déclencher
 * Inclut enregistrement audio/vidéo après déclenchement
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Video, X } from 'lucide-react';
import { taxiMotoSOSService } from '@/services/taxi/TaxiMotoSOSService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOSMediaRecorder } from './SOSMediaRecorder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaxiMotoSOSButtonProps {
  taxiId: string;
  driverName: string;
  driverPhone: string;
  bureauSyndicatId?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'floating';
}

export function TaxiMotoSOSButton({
  taxiId,
  driverName,
  driverPhone,
  bureauSyndicatId,
  className,
  variant = 'default'
}: TaxiMotoSOSButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [activeSOSId, setActiveSOSId] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimer = useRef<NodeJS.Timeout | null>(null);

  // Vérifier le cooldown au montage
  useEffect(() => {
    if (!taxiMotoSOSService.canTriggerSOS()) {
      const remaining = taxiMotoSOSService.getCooldownRemaining();
      setCooldownRemaining(remaining);
      startCooldownTimer();
    }
  }, []);

  // Nettoyage des timers
  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
      }
    };
  }, []);

  const startCooldownTimer = () => {
    if (cooldownTimer.current) {
      clearInterval(cooldownTimer.current);
    }

    cooldownTimer.current = setInterval(() => {
      const remaining = taxiMotoSOSService.getCooldownRemaining();
      setCooldownRemaining(remaining);
      
      if (remaining === 0) {
        if (cooldownTimer.current) {
          clearInterval(cooldownTimer.current);
        }
        setIsActive(false);
        setActiveSOSId(null);
      }
    }, 1000);
  };

  const handleMouseDown = () => {
    if (!taxiMotoSOSService.canTriggerSOS()) {
      toast.warning(`Attendez ${cooldownRemaining}s avant de réutiliser le SOS`);
      return;
    }

    setIsPressed(true);
    
    // Timer de 1.5 secondes
    pressTimer.current = setTimeout(async () => {
      setIsPressed(false);
      await triggerSOS();
    }, 1500);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
    setIsPressed(false);
  };

  const triggerSOS = async () => {
    try {
      setIsActive(true);
      
      const result = await taxiMotoSOSService.triggerSOS(
        taxiId,
        driverName,
        driverPhone,
        bureauSyndicatId,
        'Alerte SOS déclenchée par le conducteur'
      );

      if (result.success && result.sos_id) {
        setActiveSOSId(result.sos_id);
        
        toast.success('🚨 SOS ENVOYÉ!', {
          description: '📹 Enregistrement audio/vidéo démarré automatiquement. Bureau Syndicat notifié.',
          duration: 10000
        });
        
        // Démarrer le cooldown
        setCooldownRemaining(60);
        startCooldownTimer();
      } else {
        setIsActive(false);
        toast.error('Erreur SOS', {
          description: result.message
        });
      }
    } catch (error) {
      console.error('Erreur SOS:', error);
      setIsActive(false);
      toast.error('Erreur lors de l\'envoi du SOS');
    }
  };

  // Variantes de style
  const getButtonClasses = () => {
    const baseClasses = 'font-bold transition-all duration-300';
    
    if (variant === 'floating') {
      return cn(
        baseClasses,
        'fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl',
        isPressed && 'scale-95',
        isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
        cooldownRemaining > 0 && 'opacity-50 cursor-not-allowed',
        className
      );
    }
    
    if (variant === 'compact') {
      return cn(
        baseClasses,
        'h-9 px-3',
        isPressed && 'scale-95',
        isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
        cooldownRemaining > 0 && 'opacity-50 cursor-not-allowed',
        className
      );
    }
    
    // default
    return cn(
      baseClasses,
      'w-full h-14',
      isPressed && 'scale-95',
      isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
      cooldownRemaining > 0 && 'opacity-50 cursor-not-allowed',
      className
    );
  };

  const getButtonContent = () => {
    if (cooldownRemaining > 0) {
      return (
        <>
          <AlertTriangle className="w-5 h-5" />
          {variant !== 'floating' && <span>⏱️ {cooldownRemaining}s</span>}
        </>
      );
    }
    
    if (isActive) {
      return (
        <>
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          {variant !== 'floating' && <span>SOS ENVOYÉ</span>}
        </>
      );
    }
    
    if (isPressed) {
      return (
        <>
          <AlertTriangle className="w-5 h-5 animate-spin" />
          {variant !== 'floating' && <span>Maintenir...</span>}
        </>
      );
    }
    
    return (
      <>
        <AlertTriangle className="w-5 h-5" />
        {variant !== 'floating' && <span>SOS</span>}
      </>
    );
  };

  return (
    <>
      <Button
        className={getButtonClasses()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={cooldownRemaining > 0}
        variant="destructive"
        size={variant === 'compact' ? 'sm' : 'default'}
      >
        <div className="flex items-center gap-2">
          {getButtonContent()}
        </div>
      </Button>

      {/* Bouton flottant pour enregistrer pendant SOS actif */}
      {isActive && activeSOSId && !showRecorder && (
        <Button
          onClick={() => setShowRecorder(true)}
          className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 animate-pulse"
        >
          <Video className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Dialog d'enregistrement */}
      <Dialog open={showRecorder} onOpenChange={setShowRecorder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Video className="w-5 h-5" />
              Enregistrer une preuve
            </DialogTitle>
          </DialogHeader>
          
          {activeSOSId && (
            <SOSMediaRecorder
              sosAlertId={activeSOSId}
              driverId={taxiId}
              driverName={driverName}
              onMediaSent={() => {
                toast.success('Preuve envoyée!');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
