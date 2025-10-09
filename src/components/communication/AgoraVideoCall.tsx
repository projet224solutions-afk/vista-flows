/**
 * 🎥 COMPOSANT APPEL VIDÉO AGORA - 224SOLUTIONS
 * Interface complète pour les appels vidéo avec Agora
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAgora } from '@/hooks/useAgora';
import { useAuth } from '@/hooks/useAuth';
import { 
  Phone, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  PhoneOff, 
  Users, 
  Wifi,
  Clock,
  Settings
} from 'lucide-react';

interface AgoraVideoCallProps {
  channel: string;
  isIncoming?: boolean;
  callerInfo?: {
    name: string;
    avatar?: string;
    userId: string;
  };
  onCallEnd?: () => void;
}

export default function AgoraVideoCall({ 
  channel, 
  isIncoming = false, 
  callerInfo,
  onCallEnd 
}: AgoraVideoCallProps) {
  const { user } = useAuth();
  const { callState, isLoading, joinCall, leaveCall, toggleMute, toggleVideo, endCall } = useAgora();
  
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Démarrer l'appel automatiquement
  useEffect(() => {
    if (!isIncoming && channel) {
      handleJoinCall();
    }
  }, [channel, isIncoming]);

  // Gestion de la durée d'appel
  useEffect(() => {
    if (callState.isInCall) {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callState.isInCall]);

  const handleJoinCall = async () => {
    setIsConnecting(true);
    try {
      await joinCall(channel, true);
    } catch (error) {
      console.error('Erreur rejoindre appel:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndCall = async () => {
    await endCall();
    onCallEnd?.();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getNetworkQualityColor = (quality: number) => {
    if (quality >= 4) return 'text-green-500';
    if (quality >= 2) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isIncoming && !callState.isInCall) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Phone className="w-6 h-6 text-green-600" />
            Appel entrant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Avatar className="w-20 h-20 mx-auto mb-4">
              <AvatarImage src={callerInfo?.avatar} />
              <AvatarFallback>
                {callerInfo?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold">{callerInfo?.name}</h3>
            <p className="text-muted-foreground">Appel vidéo</p>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleJoinCall}
              className="bg-green-600 hover:bg-green-700"
              disabled={isConnecting}
            >
              <Phone className="w-4 h-4 mr-2" />
              {isConnecting ? 'Connexion...' : 'Accepter'}
            </Button>
            <Button
              onClick={handleEndCall}
              variant="destructive"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Refuser
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isConnecting) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Connexion à l'appel...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden relative">
      {/* Interface vidéo principale */}
      <div className="relative w-full h-full">
        {/* Vidéo distante */}
        <div 
          ref={remoteVideoRef}
          className="w-full h-full bg-gray-900 flex items-center justify-center"
        >
          {callerInfo && (
            <div className="text-center text-white">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src={callerInfo.avatar} />
                <AvatarFallback>
                  {callerInfo.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{callerInfo.name}</h3>
              <p className="text-gray-400">En attente de connexion...</p>
            </div>
          )}
        </div>

        {/* Vidéo locale (picture-in-picture) */}
        <div 
          ref={localVideoRef}
          className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white"
        >
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Video className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Informations d'appel */}
        <div className="absolute top-4 left-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatDuration(callDuration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className={`w-4 h-4 ${getNetworkQualityColor(callState.networkQuality)}`} />
            <span className="text-sm">
              Qualité: {callState.networkQuality >= 4 ? 'Excellente' : 
                       callState.networkQuality >= 2 ? 'Bonne' : 'Faible'}
            </span>
          </div>
        </div>

        {/* Contrôles d'appel */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
            {/* Microphone */}
            <Button
              onClick={toggleMute}
              variant={callState.isMuted ? "destructive" : "secondary"}
              size="sm"
              className="rounded-full w-12 h-12"
            >
              {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {/* Vidéo */}
            <Button
              onClick={toggleVideo}
              variant={!callState.isVideoEnabled ? "destructive" : "secondary"}
              size="sm"
              className="rounded-full w-12 h-12"
            >
              {callState.isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            {/* Terminer l'appel */}
            <Button
              onClick={handleEndCall}
              variant="destructive"
              size="sm"
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Statut de connexion */}
        <div className="absolute top-4 right-4">
          <Badge 
            variant={callState.isConnected ? "default" : "destructive"}
            className="bg-black/50 text-white"
          >
            {callState.isConnected ? 'Connecté' : 'Déconnecté'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
