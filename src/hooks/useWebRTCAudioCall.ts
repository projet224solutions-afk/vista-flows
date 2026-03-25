/**
 * 🎤 HOOK WEBRTC AUDIO CALL - 224SOLUTIONS
 * Appels audio 1-to-1 WebRTC natif sans Agora
 * Compatible réseaux mobiles africains
 * 
 * ARCHITECTURE: Ce hook est instancié UNE SEULE FOIS dans WebRTCCallProvider.
 * Tous les composants doivent utiliser useWebRTCCallContext() pour accéder à l'état.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Configuration ICE - STUN + TURN pour réseaux africains
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN gratuit via Metered (fallback pour NAT symétrique)
  {
    urls: 'turn:a.relay.metered.ca:80',
    username: 'e8dd65c692e5e4056b location',
    credential: 'open',
  },
  {
    urls: 'turn:a.relay.metered.ca:443',
    username: 'e8dd65c692e5e4056b location',
    credential: 'open',
  },
  {
    urls: 'turn:a.relay.metered.ca:443?transport=tcp',
    username: 'e8dd65c692e5e4056b location',
    credential: 'open',
  },
];

// Timeout si l'appelé ne répond pas (30s)
const CALL_TIMEOUT_MS = 30000;

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

const RINGTONE_FREQUENCY = 440;
const RING_DURATION = 1000;
const RING_PAUSE = 2000;

const INITIAL_CALL_STATE: WebRTCCallState = {
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
};

export function useWebRTCAudioCall() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [callState, setCallState] = useState<WebRTCCallState>(INITIAL_CALL_STATE);

  // Refs pour les objets WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Ref miroir de remoteUserId pour les closures (évite stale state)
  const remoteUserIdRef = useRef<string | null>(null);

  // Synchroniser la ref avec le state
  useEffect(() => {
    remoteUserIdRef.current = callState.remoteUserId;
  }, [callState.remoteUserId]);

  // Générer un nom de canal unique pour la signalisation
  const getSignalingChannel = useCallback((userId1: string, userId2: string): string => {
    const sorted = [userId1, userId2].sort();
    return `webrtc-call-${sorted[0]}-${sorted[1]}`;
  }, []);

  // ─── Sonnerie ───
  const playRingtone = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      const playBeep = () => {
        try {
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
        } catch { /* AudioContext may be suspended */ }
      };

      playBeep();
      ringtoneIntervalRef.current = setInterval(playBeep, RING_PAUSE);
    } catch (err) {
      console.warn('Impossible de jouer la sonnerie:', err);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  // ─── Durée d'appel ───
  const startCallDuration = useCallback(() => {
    setCallState(prev => ({ ...prev, callDuration: 0 }));
    callDurationIntervalRef.current = setInterval(() => {
      setCallState(prev => ({ ...prev, callDuration: prev.callDuration + 1 }));
    }, 1000);
  }, []);

  const stopCallDuration = useCallback(() => {
    if (callDurationIntervalRef.current) {
      clearInterval(callDurationIntervalRef.current);
      callDurationIntervalRef.current = null;
    }
  }, []);

  // ─── Timeout appel ───
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  // ─── Envoyer un message de signalisation ───
  const sendSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (!signalingChannelRef.current) {
      console.warn('⚠️ Canal de signalisation non configuré');
      return;
    }
    
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

  // ─── Nettoyage complet ───
  const cleanup = useCallback(() => {
    stopRingtone();
    stopCallDuration();
    clearCallTimeout();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Nettoyer le canal de signalisation (mais pas le listener global)
    if (signalingChannelRef.current) {
      signalingChannelRef.current.unsubscribe();
      signalingChannelRef.current = null;
    }

    pendingIceCandidatesRef.current = [];
    remoteUserIdRef.current = null;

    setCallState(INITIAL_CALL_STATE);
  }, [stopRingtone, stopCallDuration, clearCallTimeout]);

  // ─── Créer la connexion peer ───
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserIdRef.current && user?.id) {
        sendSignalingMessage({
          type: 'ice-candidate',
          from: user.id,
          to: remoteUserIdRef.current,
          payload: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🔗 ICE Connection State:', pc.iceConnectionState);
      setCallState(prev => ({ ...prev, iceConnectionState: pc.iceConnectionState }));
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState(prev => ({ ...prev, isConnected: true, isCalling: false }));
        startCallDuration();
        stopRingtone();
        clearCallTimeout();
      } else if (pc.iceConnectionState === 'failed') {
        toast({
          title: "❌ Connexion échouée",
          description: "Impossible d'établir la connexion audio. Vérifiez votre réseau.",
          variant: "destructive",
        });
        cleanup();
      } else if (pc.iceConnectionState === 'disconnected') {
        toast({
          title: "⚠️ Connexion instable",
          description: "Tentative de reconnexion...",
        });
        // Give ICE 10s to recover before giving up
        setTimeout(() => {
          if (peerConnectionRef.current?.iceConnectionState === 'disconnected') {
            toast({
              title: "❌ Appel perdu",
              description: "La connexion a été perdue",
              variant: "destructive",
            });
            cleanup();
          }
        }, 10000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection State:', pc.connectionState);
      setCallState(prev => ({ ...prev, connectionState: pc.connectionState }));
      
      if (pc.connectionState === 'failed') {
        cleanup();
      }
    };

    pc.ontrack = (event) => {
      console.log('🎵 Remote track received');
      remoteStreamRef.current = event.streams[0];
      
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = event.streams[0];
      // Force play for mobile browsers
      remoteAudioRef.current.play().catch(() => {
        console.warn('Auto-play bloqué, interaction utilisateur requise');
      });
    };

    return pc;
  }, [user?.id, sendSignalingMessage, startCallDuration, stopRingtone, clearCallTimeout, cleanup, toast]);

  // ─── Obtenir le micro ───
  const getLocalAudioStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Optimisation pour réseaux africains faibles
          sampleRate: 16000,
          channelCount: 1,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      console.error('❌ Erreur accès microphone:', err);
      const message = err.name === 'NotAllowedError' 
        ? "Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur"
        : err.name === 'NotFoundError'
        ? "Aucun microphone détecté sur cet appareil"
        : "Impossible d'accéder au microphone";
      
      toast({
        title: "❌ Microphone indisponible",
        description: message,
        variant: "destructive",
      });
      throw err;
    }
  }, [toast]);

  // ─── Configurer le canal de signalisation ───
  const setupSignalingChannel = useCallback((channelName: string) => {
    // Ne pas recréer si déjà le bon canal
    if (signalingChannelRef.current) {
      signalingChannelRef.current.unsubscribe();
    }

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'signaling' }, async ({ payload }: { payload: SignalingMessage }) => {
      if (!user?.id || payload.to !== user.id) return;

      console.log('📨 Signalisation reçue:', payload.type);

      switch (payload.type) {
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
        // call-offer est géré par le listener global, pas ici
      }
    });

    channel.subscribe();
    signalingChannelRef.current = channel;
  }, [user?.id]);

  // ─── Handlers de signalisation ───
  const handleCallAnswer = useCallback(async (message: SignalingMessage) => {
    console.log('✅ Réponse appel reçue');
    clearCallTimeout();
    
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(message.payload)
      );
      
      for (const candidate of pendingIceCandidatesRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingIceCandidatesRef.current = [];
    }
    
    stopRingtone();
  }, [stopRingtone, clearCallTimeout]);

  const handleIceCandidate = useCallback(async (message: SignalingMessage) => {
    if (peerConnectionRef.current?.remoteDescription) {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(message.payload)
      );
    } else {
      pendingIceCandidatesRef.current.push(message.payload);
    }
  }, []);

  const handleCallRejected = useCallback(() => {
    toast({
      title: "📵 Appel refusé",
      description: "L'utilisateur a refusé votre appel",
    });
    cleanup();
  }, [toast, cleanup]);

  const handleCallEnded = useCallback(() => {
    toast({
      title: "📞 Appel terminé",
      description: "L'appel a pris fin",
    });
    cleanup();
  }, [toast, cleanup]);

  // ─── Gérer un appel entrant ───
  const handleIncomingCall = useCallback(async (message: SignalingMessage) => {
    console.log('📞 Appel entrant de:', message.from);
    
    // Si déjà en appel, rejeter automatiquement
    if (peerConnectionRef.current) {
      console.log('📞 Déjà en appel, rejet automatique');
      // On ne peut pas envoyer via le canal car il n'est pas encore configuré
      return;
    }
    
    setCallState(prev => ({
      ...prev,
      isReceivingCall: true,
      isInCall: true,
      remoteUserId: message.from,
      remoteUserInfo: message.userInfo || { name: 'Utilisateur' },
    }));
    remoteUserIdRef.current = message.from;

    pendingIceCandidatesRef.current = [];
    
    // Créer la connexion peer et définir l'offre distante
    const pc = createPeerConnection();
    peerConnectionRef.current = pc;
    
    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
    
    playRingtone();
    
    // Auto-timeout après 30s si pas de réponse
    callTimeoutRef.current = setTimeout(() => {
      if (callState.isReceivingCall) {
        toast({
          title: "📞 Appel manqué",
          description: `Appel de ${message.userInfo?.name || 'Utilisateur'}`,
        });
        cleanup();
      }
    }, CALL_TIMEOUT_MS);
  }, [createPeerConnection, playRingtone, cleanup, toast]);

  // ═══════════ ACTIONS PUBLIQUES ═══════════

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

    if (peerConnectionRef.current) {
      toast({
        title: "⚠️ Appel en cours",
        description: "Terminez l'appel en cours avant d'en passer un autre",
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
      remoteUserIdRef.current = userId;

      // Configurer le canal de signalisation
      const channelName = getSignalingChannel(user.id, userId);
      setupSignalingChannel(channelName);

      // Attendre que le canal soit prêt
      await new Promise(resolve => setTimeout(resolve, 500));

      // Obtenir l'accès micro
      const stream = await getLocalAudioStream();

      // Créer la connexion peer
      const pc = createPeerConnection();
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

      // Envoyer l'offre via le canal de signalisation
      await sendSignalingMessage({
        type: 'call-offer',
        from: user.id,
        to: userId,
        payload: offer,
        userInfo: callerInfo,
        timestamp: Date.now(),
      });

      // AUSSI envoyer via le canal d'écoute du destinataire
      const listenChannel = supabase.channel(`webrtc-listen-${userId}`);
      await listenChannel.subscribe();
      await listenChannel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: {
          type: 'call-offer',
          from: user.id,
          to: userId,
          payload: offer,
          userInfo: callerInfo,
          timestamp: Date.now(),
        } as SignalingMessage,
      });
      // Cleanup listen channel after sending
      setTimeout(() => listenChannel.unsubscribe(), 2000);

      playRingtone();

      toast({
        title: "📞 Appel en cours...",
        description: `Appel vers ${userInfo?.name || 'Utilisateur'}`,
      });

      // Timeout: si pas de réponse après 30s
      callTimeoutRef.current = setTimeout(() => {
        if (!peerConnectionRef.current || peerConnectionRef.current.connectionState !== 'connected') {
          toast({
            title: "📵 Pas de réponse",
            description: `${userInfo?.name || 'L\'utilisateur'} ne répond pas`,
          });
          // Envoyer call-ended pour nettoyer côté distant
          sendSignalingMessage({
            type: 'call-ended',
            from: user.id,
            to: userId,
            payload: null,
            timestamp: Date.now(),
          });
          cleanup();
        }
      }, CALL_TIMEOUT_MS);

    } catch (err) {
      console.error('❌ Erreur démarrage appel:', err);
      toast({
        title: "❌ Erreur",
        description: "Impossible de démarrer l'appel. Vérifiez votre microphone.",
        variant: "destructive",
      });
      cleanup();
    }
  }, [user?.id, toast, getSignalingChannel, setupSignalingChannel, getLocalAudioStream, createPeerConnection, sendSignalingMessage, playRingtone, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!peerConnectionRef.current || !user?.id || !remoteUserIdRef.current) return;

    try {
      console.log('✅ Acceptation de l\'appel');
      stopRingtone();
      clearCallTimeout();

      const stream = await getLocalAudioStream();

      stream.getTracks().forEach(track => {
        peerConnectionRef.current?.addTrack(track, stream);
      });

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      await sendSignalingMessage({
        type: 'call-answer',
        from: user.id,
        to: remoteUserIdRef.current,
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
  }, [user?.id, stopRingtone, clearCallTimeout, getLocalAudioStream, sendSignalingMessage, toast, cleanup]);

  const rejectCall = useCallback(() => {
    if (!user?.id || !remoteUserIdRef.current) return;

    sendSignalingMessage({
      type: 'call-rejected',
      from: user.id,
      to: remoteUserIdRef.current,
      payload: null,
      timestamp: Date.now(),
    });

    toast({ title: "📵 Appel refusé" });
    cleanup();
  }, [user?.id, sendSignalingMessage, toast, cleanup]);

  const endCall = useCallback(() => {
    if (user?.id && remoteUserIdRef.current) {
      sendSignalingMessage({
        type: 'call-ended',
        from: user.id,
        to: remoteUserIdRef.current,
        payload: null,
        timestamp: Date.now(),
      });
    }

    toast({ title: "📞 Appel terminé" });
    cleanup();
  }, [user?.id, sendSignalingMessage, toast, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  }, []);

  // ─── Listener global pour les appels entrants ───
  useEffect(() => {
    if (!user?.id) return;

    const listenChannel = supabase.channel(`webrtc-listen-${user.id}`, {
      config: { broadcast: { self: false } },
    });

    listenChannel.on('broadcast', { event: 'signaling' }, async ({ payload }: { payload: SignalingMessage }) => {
      if (payload.to === user.id && payload.type === 'call-offer') {
        // Configurer le canal de signalisation bidirectionnel
        const channelName = getSignalingChannel(user.id, payload.from);
        setupSignalingChannel(channelName);
        await handleIncomingCall(payload);
      }
    });

    listenChannel.subscribe();

    return () => {
      listenChannel.unsubscribe();
    };
  }, [user?.id, getSignalingChannel, setupSignalingChannel, handleIncomingCall]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      cleanup();
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
