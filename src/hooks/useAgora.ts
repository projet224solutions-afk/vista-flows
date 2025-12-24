/**
 * 🎥 HOOK AGORA - 224SOLUTIONS
 * Hook personnalisé pour gérer les communications Agora
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { agoraService, AgoraConfig, CallConfig } from '@/services/agoraService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface AgoraCallState {
  isConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isInCall: boolean;
  currentChannel: string;
  participants: string[];
  networkQuality: number;
}

export interface AgoraCallActions {
  joinCall: (channel: string, isVideo: boolean) => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  startCall: (userId: string, isVideo: boolean) => Promise<void>;
  endCall: () => Promise<void>;
}

export function useAgora() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [callState, setCallState] = useState<AgoraCallState>({
    isConnected: false,
    isMuted: false,
    isVideoEnabled: true,
    isInCall: false,
    currentChannel: '',
    participants: [],
    networkQuality: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configRef = useRef<AgoraConfig | null>(null);

  // Fonction pour récupérer les credentials Agora
  const fetchAgoraCredentials = useCallback(async (channel: string, uid: string) => {
    const { data, error } = await supabase.functions.invoke('agora-token', {
      body: { channel, uid, role: 'publisher' }
    });

    if (error) throw error;
    return data;
  }, []);

  // Note: on n'initialise plus Agora automatiquement au montage.
  // L'initialisation se fait à la demande lors de joinCall(), pour éviter
  // des erreurs (token/autorisation) quand l'utilisateur n'utilise pas les appels.

  /**
   * Initialiser Agora avec les clés
   */
  const initializeAgora = useCallback(async (config: AgoraConfig) => {
    try {
      setIsLoading(true);
      setError(null);

      await agoraService.initialize(config);
      configRef.current = config;
      setIsInitialized(true);

      toast({
        title: "✅ Agora initialisé",
        description: "Service de communication prêt"
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur initialisation Agora';
      setError(errorMsg);
      toast({
        title: "❌ Erreur Agora",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Rejoindre un appel
   */
  const joinCall = useCallback(async (channel: string, isVideo: boolean = true) => {
    if (!user?.id) {
      const errorMsg = "Utilisateur non connecté. Veuillez vous connecter.";
      setError(errorMsg);
      toast({
        title: "❌ Erreur d'authentification",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('📞 Tentative de rejoindre l\'appel:', channel, 'User:', user.id);

      // Récupérer le token (et l'appId) pour ce canal
      console.log('🔑 Récupération du token pour:', channel);
      const credentials = await fetchAgoraCredentials(channel, user.id);

      if (!credentials?.appId) {
        throw new Error('App ID Agora non reçu');
      }

      if (!isInitialized) {
        console.log('⏳ Initialisation d\'Agora (à la demande)...');
        const config: AgoraConfig = {
          appId: credentials.appId,
          appCertificate: '',
        };
        await agoraService.initialize(config);
        configRef.current = config;
        setIsInitialized(true);
      }

      if (!credentials?.token) {
        throw new Error('Token Agora non reçu');
      }

      const callConfig: CallConfig = {
        channel,
        uid: user.id,
        token: credentials.token,
        role: 'publisher'
      };

      console.log('🔗 Connexion au canal Agora...');
      await agoraService.joinChannel(callConfig);

      setCallState(prev => ({
        ...prev,
        isConnected: true,
        isInCall: true,
        currentChannel: channel,
        isVideoEnabled: isVideo
      }));

      console.log('✅ Appel rejoint avec succès');
      toast({
        title: "📞 Appel en cours",
        description: "Connexion établie"
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la connexion à l\'appel';
      console.error('❌ Erreur joinCall:', errorMsg, err);
      setError(errorMsg);
      toast({
        title: "❌ Erreur appel",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast, fetchAgoraCredentials, isInitialized]);

  /**
   * Quitter un appel
   */
  const leaveCall = useCallback(async () => {
    try {
      await agoraService.leaveChannel();

      setCallState(prev => ({
        ...prev,
        isConnected: false,
        isInCall: false,
        currentChannel: '',
        participants: []
      }));

      toast({
        title: "📞 Appel terminé",
        description: "Vous avez quitté l'appel"
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur quitter appel';
      setError(errorMsg);
      toast({
        title: "❌ Erreur",
        description: errorMsg,
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * Activer/désactiver microphone
   */
  const toggleMute = useCallback(async () => {
    try {
      const isMuted = await agoraService.toggleMicrophone();
      setCallState(prev => ({
        ...prev,
        isMuted
      }));

      toast({
        title: isMuted ? "🔇 Microphone désactivé" : "🎤 Microphone activé"
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur toggle microphone';
      setError(errorMsg);
      toast({
        title: "❌ Erreur microphone",
        description: errorMsg,
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * Activer/désactiver vidéo
   */
  const toggleVideo = useCallback(async () => {
    try {
      const isVideoEnabled = await agoraService.toggleCamera();
      setCallState(prev => ({
        ...prev,
        isVideoEnabled
      }));

      toast({
        title: isVideoEnabled ? "📹 Vidéo activée" : "📹 Vidéo désactivée"
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur toggle vidéo';
      setError(errorMsg);
      toast({
        title: "❌ Erreur vidéo",
        description: errorMsg,
        variant: "destructive"
      });
    }
  }, [toast]);

  /**
   * Démarrer un appel
   */
  const startCall = useCallback(async (userId: string, isVideo: boolean = true) => {
    const channel = `call_${user?.id}_${userId}_${Date.now()}`;
    await joinCall(channel, isVideo);
  }, [user?.id, joinCall]);

  /**
   * Terminer un appel
   */
  const endCall = useCallback(async () => {
    await leaveCall();
  }, [leaveCall]);

  /**
   * Obtenir les statistiques réseau
   */
  const updateNetworkQuality = useCallback(async () => {
    try {
      const quality = await agoraService.getNetworkQuality();
      if (quality) {
        setCallState(prev => ({
          ...prev,
          networkQuality: quality.uplinkNetworkQuality || 0
        }));
      }
    } catch (err) {
      console.error('Erreur qualité réseau:', err);
    }
  }, []);

  // Mise à jour périodique de la qualité réseau
  useEffect(() => {
    if (callState.isInCall) {
      const interval = setInterval(updateNetworkQuality, 5000);
      return () => clearInterval(interval);
    }
  }, [callState.isInCall, updateNetworkQuality]);

  // Nettoyage à la déconnexion
  useEffect(() => {
    return () => {
      if (callState.isInCall) {
        agoraService.cleanup();
      }
    };
  }, [callState.isInCall]);

  return {
    // État
    callState,
    isInitialized,
    isLoading,
    error,

    // Actions
    initializeAgora,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    startCall,
    endCall,

    // Actions groupées
    callActions: {
      joinCall,
      leaveCall,
      toggleMute,
      toggleVideo,
      startCall,
      endCall
    } as AgoraCallActions
  };
}
