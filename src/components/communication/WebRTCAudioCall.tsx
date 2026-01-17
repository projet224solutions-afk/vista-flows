/**
 * 🎤 COMPOSANT APPEL AUDIO WEBRTC - 224SOLUTIONS
 * Interface pour les appels vocaux WebRTC natifs (sans Agora)
 * Compatible réseaux mobiles africains
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWebRTCAudioCall } from '@/hooks/useWebRTCAudioCall';
import { 
  Phone, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Wifi,
  Clock,
  Volume2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebRTCAudioCallProps {
  className?: string;
}

export default function WebRTCAudioCall({ className }: WebRTCAudioCallProps) {
  const { 
    callState, 
    acceptCall, 
    rejectCall, 
    endCall, 
    toggleMute 
  } = useWebRTCAudioCall();

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Formater la durée d'appel
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Obtenir la couleur selon l'état de connexion
  const getConnectionColor = () => {
    switch (callState.iceConnectionState) {
      case 'connected':
      case 'completed':
        return 'text-green-500';
      case 'checking':
      case 'new':
        return 'text-yellow-500';
      case 'disconnected':
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  // Obtenir le texte de l'état de connexion
  const getConnectionText = () => {
    switch (callState.iceConnectionState) {
      case 'connected':
      case 'completed':
        return 'Excellente';
      case 'checking':
        return 'Connexion...';
      case 'new':
        return 'Initialisation';
      case 'disconnected':
        return 'Déconnecté';
      case 'failed':
        return 'Échec';
      default:
        return 'En attente';
    }
  };

  // Ne rien afficher si pas d'appel
  if (!callState.isInCall && !callState.isReceivingCall && !callState.isCalling) {
    return null;
  }

  // Écran d'appel entrant
  if (callState.isReceivingCall && !callState.isConnected) {
    return (
      <div className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4",
        className
      )}>
        <Card className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <Phone className="w-12 h-12 text-green-500 mx-auto relative animate-bounce" />
            </div>
            <CardTitle className="text-xl">Appel entrant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-green-500/30">
                <AvatarImage src={callState.remoteUserInfo?.avatar} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {callState.remoteUserInfo?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-2xl font-semibold">{callState.remoteUserInfo?.name}</h3>
              <p className="text-muted-foreground">Appel vocal</p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button
                onClick={acceptCall}
                size="lg"
                className="bg-green-600 hover:bg-green-700 rounded-full w-16 h-16"
              >
                <Phone className="w-6 h-6" />
              </Button>
              <Button
                onClick={rejectCall}
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Écran d'appel sortant (en attente de réponse)
  if (callState.isCalling && !callState.isConnected) {
    return (
      <div className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4",
        className
      )}>
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Appel en cours...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={callState.remoteUserInfo?.avatar} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {callState.remoteUserInfo?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-2xl font-semibold">{callState.remoteUserInfo?.name}</h3>
              <p className="text-muted-foreground animate-pulse">Sonnerie...</p>
            </div>
            
            <div className="flex justify-center">
              <Button
                onClick={endCall}
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Écran d'appel en cours
  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4",
      className
    )}>
      <Card className="w-full max-w-md mx-auto bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2 text-white">
            <Phone className="w-5 h-5 text-green-500" />
            Appel en cours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations de l'appelant */}
          <div className="text-center">
            <div className="relative inline-block">
              <Avatar className="w-28 h-28 mx-auto mb-4 ring-4 ring-green-500/30">
                <AvatarImage src={callState.remoteUserInfo?.avatar} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {callState.remoteUserInfo?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {/* Indicateur de connexion */}
              <div className={cn(
                "absolute bottom-4 right-0 w-5 h-5 rounded-full border-2 border-slate-800",
                callState.isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              )} />
            </div>
            <h3 className="text-2xl font-semibold text-white">{callState.remoteUserInfo?.name}</h3>
            <p className="text-slate-400">Appel vocal</p>
          </div>

          {/* Durée et qualité */}
          <div className="flex justify-center items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-lg">{formatDuration(callState.callDuration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className={cn("w-4 h-4", getConnectionColor())} />
              <span className={getConnectionColor()}>{getConnectionText()}</span>
            </div>
          </div>

          {/* Statut de connexion */}
          <div className="text-center">
            <Badge 
              variant={callState.isConnected ? "default" : "secondary"}
              className={cn(
                "text-sm",
                callState.isConnected ? "bg-green-600" : "bg-yellow-600"
              )}
            >
              {callState.isConnected ? 'Connecté' : 'Connexion en cours...'}
            </Badge>
          </div>

          {/* Contrôles d'appel */}
          <div className="flex justify-center gap-6 pt-4">
            {/* Microphone */}
            <div className="text-center">
              <Button
                onClick={toggleMute}
                variant={callState.isMuted ? "destructive" : "secondary"}
                size="lg"
                className="rounded-full w-16 h-16 mb-2"
              >
                {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </Button>
              <p className="text-xs text-slate-400">
                {callState.isMuted ? 'Muet' : 'Micro'}
              </p>
            </div>

            {/* Haut-parleur */}
            <div className="text-center">
              <Button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                variant={isSpeakerOn ? "default" : "secondary"}
                size="lg"
                className="rounded-full w-16 h-16 mb-2"
              >
                <Volume2 className="w-6 h-6" />
              </Button>
              <p className="text-xs text-slate-400">
                {isSpeakerOn ? 'HP' : 'Écouteur'}
              </p>
            </div>

            {/* Terminer l'appel */}
            <div className="text-center">
              <Button
                onClick={endCall}
                variant="destructive"
                size="lg"
                className="rounded-full w-16 h-16 mb-2"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              <p className="text-xs text-slate-400">Fin</p>
            </div>
          </div>

          {/* Indicateurs visuels */}
          <div className="flex justify-center gap-2 pt-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              callState.isMuted ? 'bg-red-500' : 'bg-green-500'
            )} />
            <div className={cn(
              "w-2 h-2 rounded-full",
              isSpeakerOn ? 'bg-green-500' : 'bg-gray-500'
            )} />
            <div className={cn(
              "w-2 h-2 rounded-full",
              callState.isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
            )} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
