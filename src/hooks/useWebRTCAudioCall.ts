/**
 * 🎤 HOOK WEBRTC AUDIO CALL - 224SOLUTIONS
 * Appels audio 1-to-1 WebRTC natif sans Agora
 * Compatible réseaux mobiles africains
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Configuration ICE - STUN gratuit Google + TURN optionnel
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // TURN optionnel (coturn) - décommenter et configurer si nécessaire
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: 'username',
  //   credential: 'password'
  // }
];

export interface WebRTCCallState {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  isConnected: boolean;
  isMuted: boolean;
  callDuration: number;
  remoteUserId: string | null;
  remoteUserInfo: {
    name: string;
    avatar?: string;
  } | null;
  connectionState: RTCPeerConnectionState | null;
  iceConnectionState: RTCIceConnectionState | null;
}

export interface WebRTCCallActions {
  startCall: (userId: string, userInfo?: { name: string; avatar?: string }) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

type SignalingEventType = 'call-offer' | 'call-answer' | 'ice-candidate' | 'call-rejected' | 'call-ended';

interface SignalingMessage {
  type: SignalingEventType;
  from: string;
  to: string;
  payload: any;
  userInfo?: { name: string; avatar?: string };
  timestamp: number;
}

// Sonnerie d'appel (données audio inline pour éviter les dépendances)
const RINGTONE_FREQUENCY = 440; // Hz
const RING_DURATION = 1000; // ms
const RING_PAUSE = 2000; // ms

export function useWebRTCAudioCall() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [callState, setCallState] = useState<WebRTCCallState>({
    isInCall: false,
    isCalling: false,
    isReceivingCall: false,
    isConnected: false,
    isMuted: false,
    callDuration: 0,
    remoteUserId: null,
    remoteUserInfo: null,
    connectionState: null,
    iceConnectionState: null,
  });

  // Refs pour les objets WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Générer un nom de canal unique pour la signalisation
  const getSignalingChannel = useCallback((userId1: string, userId2: string): string => {
    const sorted = [userId1, userId2].sort();
    return `webrtc-call-${sorted[0]}-${sorted[1]}`;
  }, []);

  // Jouer la sonnerie d'appel
  const playRingtone = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      const playBeep = () => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = RINGTONE_FREQUENCY;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + RING_DURATION / 1000);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + RING_DURATION / 1000);
      };

      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, RING_PAUSE);
    } catch (err) {
      console.warn('Impossible de jouer la sonnerie:', err);
    }
  }, []);

  // Arrêter la sonnerie
  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  // Démarrer le compteur de durée d'appel
  const startCallDuration = useCallback(() => {
    setCallState(prev => ({ ...prev, callDuration: 0 }));
    callDurationIntervalRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  }, []);

  // Arrêter le compteur
  const stopCallDuration = useCallback(() => {
    if (callDurationIntervalRef.current) {
      clearInterval(callDurationIntervalRef.current);
      callDurationIntervalRef.current = null;
    }
  }, []);

  // Créer la connexion peer
  const createPeerConnection = useCallback(async (): Promise<RTCPeerConnection> => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && callState.remoteUserId && user?.id) {
        sendSignalingMessage({
          type: 'ice-candidate',
          from: user.id,
          to: callState.remoteUserId,
          payload: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🔗 ICE Connection State:', pc.iceConnectionState);
      setCallState(prev => ({ ...prev, iceConnectionState: pc.iceConnectionState }));
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState(prev => ({ ...prev, isConnected: true }));
        startCallDuration();
        stopRingtone();
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        toast({
          title: "⚠️ Connexion instable",
          description: "La qualité de l'appel peut être affectée",
          variant: "destructive",
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection State:', pc.connectionState);
      setCallState(prev => ({ ...prev, connectionState: pc.connectionState }));
      
      if (pc.connectionState === 'failed') {
        toast({
          title: "❌ Connexion échouée",
          description: "Impossible d'établir la connexion",
          variant: "destructive",
        });
        endCall();
      }
    };

    pc.ontrack = (event) => {
      console.log('🎵 Remote track received');
      remoteStreamRef.current = event.streams[0];
      
      // Créer l'élément audio pour le son distant
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
    };

    return pc;
  }, [callState.remoteUserId, user?.id, startCallDuration, stopRingtone, toast]);

  // Obtenir l'accès au microphone
  const getLocalAudioStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // Audio uniquement
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('❌ Erreur accès microphone:', err);
      toast({
        title: "❌ Accès microphone refusé",
        description: "Veuillez autoriser l'accès au microphone pour les appels",
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  // Envoyer un message de signalisation via Supabase Realtime
  const sendSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (!signalingChannelRef.current) return;
    
    try {
      await signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message,
      });
    } catch (err) {
      console.error('❌ Erreur envoi signalisation:', err);
    }
  }, []);

  // Configurer le canal de signalisation
  const setupSignalingChannel = useCallback((channelName: string) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.unsubscribe();
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
      },
    });

    channel.on('broadcast', { event: 'signaling' }, async ({ payload }: { payload: SignalingMessage }) => {
      if (!user?.id || payload.to !== user.id) return;

      console.log('📨 Message signalisation reçu:', payload.type);

      switch (payload.type) {
        case 'call-offer':
          await handleIncomingCall(payload);
          break;
        case 'call-answer':
          await handleCallAnswer(payload);
          break;
        case 'ice-candidate':
          await handleIceCandidate(payload);
          break;
        case 'call-rejected':
          handleCallRejected();
          break;
        case 'call-ended':
          handleCallEnded();
          break;
      }
    });

    channel.subscribe();
    signalingChannelRef.current = channel;
  }, [user?.id]);

  // Gérer un appel entrant
  const handleIncomingCall = useCallback(async (message: SignalingMessage) => {
    console.log('📞 Appel entrant de:', message.from);
    
    setCallState(prev => ({
      ...prev,
      isReceivingCall: true,
      remoteUserId: message.from,
      remoteUserInfo: message.userInfo || { name: 'Utilisateur' },
    }));

    // Stocker l'offre pour plus tard
    pendingIceCandidatesRef.current = [];
    
    // Créer la connexion peer et définir l'offre distante
    const pc = await createPeerConnection();
    peerConnectionRef.current = pc;
    
    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
    
    playRingtone();
  }, [createPeerConnection, playRingtone]);

  // Gérer la réponse à l'appel
  const handleCallAnswer = useCallback(async (message: SignalingMessage) => {
    console.log('✅ Réponse appel reçue');
    
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(message.payload)
      );
      
      // Traiter les candidats ICE en attente
      for (const candidate of pendingIceCandidatesRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingIceCandidatesRef.current = [];
    }
    
    stopRingtone();
  }, [stopRingtone]);

  // Gérer les candidats ICE
  const handleIceCandidate = useCallback(async (message: SignalingMessage) => {
    if (peerConnectionRef.current?.remoteDescription) {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(message.payload)
      );
    } else {
      // Stocker pour plus tard si pas encore de description distante
      pendingIceCandidatesRef.current.push(message.payload);
    }
  }, []);

  // Gérer le rejet d'appel
  const handleCallRejected = useCallback(() => {
    toast({
      title: "📵 Appel refusé",
      description: "L'utilisateur a refusé votre appel",
    });
    cleanup();
  }, [toast]);

  // Gérer la fin d'appel
  const handleCallEnded = useCallback(() => {
    toast({
      title: "📞 Appel terminé",
      description: "L'appel a pris fin",
    });
    cleanup();
  }, [toast]);

  // Nettoyage complet
  const cleanup = useCallback(() => {
    stopRingtone();
    stopCallDuration();

    // Arrêter les pistes locales
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Arrêter l'audio distant
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    // Fermer la connexion peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingIceCandidatesRef.current = [];

    setCallState({
      isInCall: false,
      isCalling: false,
      isReceivingCall: false,
      isConnected: false,
      isMuted: false,
      callDuration: 0,
      remoteUserId: null,
      remoteUserInfo: null,
      connectionState: null,
      iceConnectionState: null,
    });
  }, [stopRingtone, stopCallDuration]);

  // ========== ACTIONS PUBLIQUES ==========

  // Démarrer un appel
  const startCall = useCallback(async (
    userId: string,
    userInfo?: { name: string; avatar?: string }
  ) => {
    if (!user?.id) {
      toast({
        title: "❌ Non connecté",
        description: "Veuillez vous connecter pour passer un appel",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('📞 Démarrage appel vers:', userId);

      setCallState(prev => ({
        ...prev,
        isCalling: true,
        isInCall: true,
        remoteUserId: userId,
        remoteUserInfo: userInfo || { name: 'Utilisateur' },
      }));

      // Configurer le canal de signalisation
      const channelName = getSignalingChannel(user.id, userId);
      setupSignalingChannel(channelName);

      // Obtenir l'accès micro
      const stream = await getLocalAudioStream();

      // Créer la connexion peer
      const pc = await createPeerConnection();
      peerConnectionRef.current = pc;

      // Ajouter les pistes audio
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Créer l'offre
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Récupérer les infos de l'utilisateur actuel
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      const callerInfo = {
        name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur' : 'Utilisateur',
        avatar: profile?.avatar_url,
      };

      // Envoyer l'offre
      await sendSignalingMessage({
        type: 'call-offer',
        from: user.id,
        to: userId,
        payload: offer,
        userInfo: callerInfo,
        timestamp: Date.now(),
      });

      playRingtone();

      toast({
        title: "📞 Appel en cours...",
        description: `Appel vers ${userInfo?.name || 'Utilisateur'}`,
      });

    } catch (err) {
      console.error('❌ Erreur démarrage appel:', err);
      toast({
        title: "❌ Erreur",
        description: "Impossible de démarrer l'appel",
        variant: "destructive",
      });
      cleanup();
    }
  }, [user?.id, toast, getSignalingChannel, setupSignalingChannel, getLocalAudioStream, createPeerConnection, sendSignalingMessage, playRingtone, cleanup]);

  // Accepter un appel entrant
  const acceptCall = useCallback(async () => {
    if (!peerConnectionRef.current || !user?.id || !callState.remoteUserId) return;

    try {
      console.log('✅ Acceptation de l\'appel');
      stopRingtone();

      // Obtenir l'accès micro
      const stream = await getLocalAudioStream();

      // Ajouter les pistes audio
      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      // Créer la réponse
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Envoyer la réponse
      await sendSignalingMessage({
        type: 'call-answer',
        from: user.id,
        to: callState.remoteUserId,
        payload: answer,
        timestamp: Date.now(),
      });

      setCallState(prev => ({
        ...prev,
        isReceivingCall: false,
        isInCall: true,
      }));

      toast({
        title: "📞 Appel accepté",
        description: "Connexion en cours...",
      });

    } catch (err) {
      console.error('❌ Erreur acceptation appel:', err);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'accepter l'appel",
        variant: "destructive",
      });
      cleanup();
    }
  }, [user?.id, callState.remoteUserId, stopRingtone, getLocalAudioStream, sendSignalingMessage, toast, cleanup]);

  // Refuser un appel
  const rejectCall = useCallback(() => {
    if (!user?.id || !callState.remoteUserId) return;

    sendSignalingMessage({
      type: 'call-rejected',
      from: user.id,
      to: callState.remoteUserId,
      payload: null,
      timestamp: Date.now(),
    });

    toast({
      title: "📵 Appel refusé",
    });

    cleanup();
  }, [user?.id, callState.remoteUserId, sendSignalingMessage, toast, cleanup]);

  // Terminer l'appel
  const endCall = useCallback(() => {
    if (user?.id && callState.remoteUserId) {
      sendSignalingMessage({
        type: 'call-ended',
        from: user.id,
        to: callState.remoteUserId,
        payload: null,
        timestamp: Date.now(),
      });
    }

    toast({
      title: "📞 Appel terminé",
    });

    cleanup();
  }, [user?.id, callState.remoteUserId, sendSignalingMessage, toast, cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // Écouter les appels entrants globalement
  useEffect(() => {
    if (!user?.id) return;

    // Créer un canal d'écoute pour les appels entrants
    const listenChannel = supabase.channel(`webrtc-listen-${user.id}`, {
      config: { broadcast: { self: false } },
    });

    listenChannel.on('broadcast', { event: 'signaling' }, async ({ payload }: { payload: SignalingMessage }) => {
      if (payload.to === user.id && payload.type === 'call-offer') {
        // Configurer le bon canal de signalisation
        const channelName = getSignalingChannel(user.id, payload.from);
        setupSignalingChannel(channelName);
        await handleIncomingCall(payload);
      }
    });

    listenChannel.subscribe();

    return () => {
      listenChannel.unsubscribe();
      cleanup();
    };
  }, [user?.id, getSignalingChannel, setupSignalingChannel, handleIncomingCall, cleanup]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      cleanup();
      if (signalingChannelRef.current) {
        signalingChannelRef.current.unsubscribe();
      }
    };
  }, [cleanup]);

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}

export default useWebRTCAudioCall;
