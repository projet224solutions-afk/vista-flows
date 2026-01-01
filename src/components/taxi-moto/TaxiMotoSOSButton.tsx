/**
 * Bouton SOS d'urgence pour conducteurs Taxi Moto
 * Pression longue de 1.5s pour déclencher
 * Inclut enregistrement audio/vidéo après déclenchement
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Video, X, Shield } from 'lucide-react';
import { taxiMotoSOSService } from '@/services/taxi/TaxiMotoSOSService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SOSMediaRecorder } from './SOSMediaRecorder';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
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

  const cancelActiveSOS = async () => {
    if (!activeSOSId) return;
    
    try {
      // Mettre à jour le statut du SOS à "cancelled" ou "resolved"
      const { error } = await supabase
        .from('sos_alerts')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: 'Annulé par le conducteur - fausse alerte'
        })
        .eq('id', activeSOSId);

      if (error) throw error;

      setIsActive(false);
      setActiveSOSId(null);
      setShowRecorder(false);
      setShowCancelConfirm(false);
      
      // Réinitialiser le cooldown
      setCooldownRemaining(0);
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
      }

      toast.success('SOS annulé', {
        description: 'Le Bureau Syndicat a été notifié de l\'annulation'
      });
    } catch (error) {
      console.error('Erreur annulation SOS:', error);
      toast.error('Impossible d\'annuler le SOS');
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
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {/* Bouton Enregistrer */}
          <Button
            onClick={() => setShowRecorder(true)}
            className="w-16 h-16 rounded-full shadow-2xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 group relative"
          >
            <Video className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
            </span>
          </Button>

          {/* Bouton Annuler SOS */}
          <Button
            onClick={() => setShowCancelConfirm(true)}
            variant="outline"
            className="w-16 h-16 rounded-full shadow-xl bg-white/95 hover:bg-red-50 border-2 border-red-200 hover:border-red-400 group"
          >
            <X className="w-7 h-7 text-red-600 group-hover:scale-110 transition-transform" />
          </Button>

          {/* Label informatif */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full mr-3 bg-black/80 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-1">
              <span className="font-semibold">🎥 Enregistrer preuve</span>
              <span className="text-gray-300">❌ Annuler SOS</span>
            </div>
          </div>
        </div>
      )}

      {/* AlertDialog de confirmation d'annulation */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Shield className="w-5 h-5" />
              Annuler l'alerte SOS ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p className="text-base">
                Êtes-vous sûr de vouloir annuler cette alerte d'urgence ?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-amber-600">⚠️</span>
                  <span className="text-amber-900">
                    Le Bureau Syndicat sera notifié de l'annulation
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">
                    L'alerte sera marquée comme "fausse alerte"
                  </span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300">
              Non, garder l'alerte
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelActiveSOS}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Oui, annuler le SOS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog d'enregistrement */}
      <Dialog open={showRecorder} onOpenChange={setShowRecorder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Video className="w-5 h-5" />
              Enregistrer une preuve
            </DialogTitle>
            <DialogDescription>
              Filmez ou enregistrez la situation pour le Bureau Syndicat
            </DialogDescription>
          </DialogHeader>
          
          {activeSOSId && (
            <SOSMediaRecorder
              sosAlertId={activeSOSId}
              driverId={taxiId}
              driverName={driverName}
              onMediaSent={() => {
                toast.success('Preuve envoyée!');
                setShowRecorder(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
