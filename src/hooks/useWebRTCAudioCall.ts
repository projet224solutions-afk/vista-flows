/**
 * 🎤 HOOK WEBRTC AUDIO CALL - 224SOLUTIONS
 * Appels audio 1-to-1 WebRTC natif sans Agora
 * Compatible réseaux mobiles africains
 *
 * ARCHITECTURE:
 * - Ce hook est instancié UNE SEULE FOIS dans WebRTCCallProvider.
 * - Tous les composants utilisent useWebRTCCallContext().
 * - Signalisation: UN seul canal par utilisateur (webrtc-signal-{userId}).
 *   Tous les messages (offer, answer, ICE, reject, end) transitent par
 *   le canal personnel du DESTINATAIRE. Pas de canal pair, pas de canal
 *   temporaire, pas de délai artificiel.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ─── ICE SERVERS ───
// STUN (toujours présent, gratuit)
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Construit la liste ICE dynamiquement.
 * TURN est chargé depuis une configuration runtime locale pour éviter
 * d'embarquer des identifiants sensibles dans le bundle frontend.
 * Si elle est absente → STUN seul (fonctionne pour ~80% des cas).
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [...STUN_SERVERS];

  const turnUrl = typeof window !== 'undefined' ? window.sessionStorage.getItem('vf_turn_url') : null;
  const turnUser = typeof window !== 'undefined' ? window.sessionStorage.getItem('vf_turn_username') : null;
  const turnCred = typeof window !== 'undefined' ? window.sessionStorage.getItem('vf_turn_credential') : null;

  if (turnUrl && turnUser && turnCred) {
    // Ajouter le TURN principal
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
    // Ajouter aussi en TCP/443 si c'est un turn: classique
    if (turnUrl.startsWith('turn:') && !turnUrl.includes('?transport=')) {
      servers.push({
        urls: `${turnUrl}?transport=tcp`,
        username: turnUser,
        credential: turnCred,
      });
      // Version turns: (TLS) sur 443
      const turnsUrl = turnUrl.replace('turn:', 'turns:').replace(/:3478$/, ':443');
      servers.push({
        urls: turnsUrl,
        username: turnUser,
        credential: turnCred,
      });
    }
    console.log('🔒 TURN server configured');
  } else {
    console.warn(
      '⚠️ TURN non configuré — les appels ne fonctionneront pas sur les réseaux à NAT symétrique (4G/entreprise).\n' +
      'Injectez vf_turn_url, vf_turn_username et vf_turn_credential en configuration runtime si nécessaire.\n' +
      'Voir https://github.com/coturn/coturn pour un serveur TURN auto-hébergé.'
    );
  }

  return servers;
}

const CALL_TIMEOUT_MS = 30_000;

export interface WebRTCCallState {
  isInCall: boolean;
  isCalling: boolean;
  isReceivingCall: boolean;
  isConnected: boolean;
  isMuted: boolean;
  callDuration: number;
  remoteUserId: string | null;
  remoteUserInfo: { name: string; avatar?: string } | null;
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

  // Refs WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>(buildIceServers());

  // Ref pour le canal de signalisation personnel (persistant)
  const myChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sync ref ↔ state
  useEffect(() => {
    remoteUserIdRef.current = callState.remoteUserId;
  }, [callState.remoteUserId]);

  // ─── Sonnerie ───
  const playRingtone = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      const playBeep = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = RINGTONE_FREQUENCY;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + RING_DURATION / 1000);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + RING_DURATION / 1000);
        } catch { /* AudioContext suspended */ }
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

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  // ─── Envoyer un message au canal du DESTINATAIRE ───
  const sendToUser = useCallback(async (targetUserId: string, message: SignalingMessage) => {
    const targetChannelName = `webrtc-signal-${targetUserId}`;

    // Créer un canal éphémère pour envoyer au destinataire
    const ch = supabase.channel(targetChannelName, {
      config: { broadcast: { self: false } },
    });

    try {
      // Subscribe, attendre que le canal soit joint, puis envoyer
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Channel join timeout')), 5000);
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          }
        });
      });

      await ch.send({
        type: 'broadcast',
        event: 'webrtc',
        payload: message,
      });
    } catch (err) {
      console.error('❌ Erreur envoi signalisation vers', targetUserId, err);
    } finally {
      // Unsubscribe immédiatement — on n'a pas besoin de recevoir sur ce canal
      ch.unsubscribe();
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

    pendingIceCandidatesRef.current = [];
    remoteUserIdRef.current = null;

    setCallState(INITIAL_CALL_STATE);
  }, [stopRingtone, stopCallDuration, clearCallTimeout]);

  // ─── Créer la connexion peer ───
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserIdRef.current && user?.id) {
        sendToUser(remoteUserIdRef.current, {
          type: 'ice-candidate',
          from: user.id,
          to: remoteUserIdRef.current,
          payload: event.candidate.toJSON(),
          timestamp: Date.now(),
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🔗 ICE:', pc.iceConnectionState);
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
        setTimeout(() => {
          if (peerConnectionRef.current?.iceConnectionState === 'disconnected') {
            toast({
              title: "❌ Appel perdu",
              description: "La connexion a été perdue",
              variant: "destructive",
            });
            cleanup();
          }
        }, 10_000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection:', pc.connectionState);
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
      remoteAudioRef.current.play().catch(() => {
        console.warn('Auto-play bloqué');
      });
    };

    return pc;
  }, [user?.id, sendToUser, startCallDuration, stopRingtone, clearCallTimeout, cleanup, toast]);

  // ─── Obtenir le micro ───
  const getLocalAudioStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      console.error('❌ Erreur microphone:', err);
      const message = err.name === 'NotAllowedError'
        ? "Veuillez autoriser l'accès au microphone"
        : err.name === 'NotFoundError'
        ? "Aucun microphone détecté"
        : "Impossible d'accéder au microphone";
      toast({ title: "❌ Microphone", description: message, variant: "destructive" });
      throw err;
    }
  }, [toast]);

  // ─── Handlers de signalisation ───
  const handleIceCandidate = useCallback(async (message: SignalingMessage) => {
    if (peerConnectionRef.current?.remoteDescription) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.payload));
    } else {
      pendingIceCandidatesRef.current.push(message.payload);
    }
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    if (!peerConnectionRef.current?.remoteDescription) return;
    for (const candidate of pendingIceCandidatesRef.current) {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingIceCandidatesRef.current = [];
  }, []);

  const handleCallAnswer = useCallback(async (message: SignalingMessage) => {
    console.log('✅ Answer reçue');
    clearCallTimeout();
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.payload));
      await flushPendingCandidates();
    }
    stopRingtone();
  }, [stopRingtone, clearCallTimeout, flushPendingCandidates]);

  const handleCallRejected = useCallback(() => {
    toast({ title: "📵 Appel refusé", description: "L'utilisateur a refusé votre appel" });
    cleanup();
  }, [toast, cleanup]);

  const handleCallEnded = useCallback(() => {
    toast({ title: "📞 Appel terminé", description: "L'appel a pris fin" });
    cleanup();
  }, [toast, cleanup]);

  // ─── Gérer un appel entrant ───
  const handleIncomingCall = useCallback(async (message: SignalingMessage) => {
    console.log('📞 Appel entrant de:', message.from);

    // Si déjà en appel, rejeter automatiquement
    if (peerConnectionRef.current) {
      console.log('📞 Déjà en appel, rejet auto');
      sendToUser(message.from, {
        type: 'call-rejected',
        from: user?.id || '',
        to: message.from,
        payload: null,
        timestamp: Date.now(),
      });
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

    // Créer la peer connection et appliquer l'offre distante
    const pc = createPeerConnection();
    peerConnectionRef.current = pc;
    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
    await flushPendingCandidates();

    playRingtone();

    // Auto-timeout
    callTimeoutRef.current = setTimeout(() => {
      if (peerConnectionRef.current && !callState.isConnected) {
        toast({
          title: "📞 Appel manqué",
          description: `Appel de ${message.userInfo?.name || 'Utilisateur'}`,
        });
        cleanup();
      }
    }, CALL_TIMEOUT_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, createPeerConnection, playRingtone, cleanup, toast, sendToUser, flushPendingCandidates]);

  // ═══════════ ACTIONS PUBLIQUES ═══════════

  const startCall = useCallback(async (
    userId: string,
    userInfo?: { name: string; avatar?: string }
  ) => {
    if (!user?.id) {
      toast({ title: "❌ Non connecté", description: "Connectez-vous d'abord", variant: "destructive" });
      return;
    }
    if (peerConnectionRef.current) {
      toast({ title: "⚠️ Appel en cours", description: "Terminez l'appel en cours d'abord" });
      return;
    }

    try {
      console.log('📞 Appel vers:', userId);

      setCallState(prev => ({
        ...prev,
        isCalling: true,
        isInCall: true,
        remoteUserId: userId,
        remoteUserInfo: userInfo || { name: 'Utilisateur' },
      }));
      remoteUserIdRef.current = userId;

      // Obtenir l'accès micro AVANT de créer l'offre
      const stream = await getLocalAudioStream();

      // Créer la connexion peer
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Ajouter les pistes audio
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Créer l'offre
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Récupérer les infos du caller
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', user.id)
        .single();

      const callerInfo = {
        name: profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur'
          : 'Utilisateur',
        avatar: profile?.avatar_url,
      };

      // Envoyer l'offre au canal personnel du destinataire
      await sendToUser(userId, {
        type: 'call-offer',
        from: user.id,
        to: userId,
        payload: offer,
        userInfo: callerInfo,
        timestamp: Date.now(),
      });

      playRingtone();

      toast({ title: "📞 Appel en cours...", description: `Appel vers ${userInfo?.name || 'Utilisateur'}` });

      // Timeout
      callTimeoutRef.current = setTimeout(() => {
        if (!peerConnectionRef.current || peerConnectionRef.current.connectionState !== 'connected') {
          toast({ title: "📵 Pas de réponse", description: `${userInfo?.name || 'L\'utilisateur'} ne répond pas` });
          sendToUser(userId, {
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
      toast({ title: "❌ Erreur", description: "Impossible de démarrer l'appel", variant: "destructive" });
      cleanup();
    }
  }, [user?.id, toast, getLocalAudioStream, createPeerConnection, sendToUser, playRingtone, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!peerConnectionRef.current || !user?.id || !remoteUserIdRef.current) return;

    try {
      console.log('✅ Acceptation appel');
      stopRingtone();
      clearCallTimeout();

      const stream = await getLocalAudioStream();
      stream.getTracks().forEach(track => peerConnectionRef.current?.addTrack(track, stream));

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      // Envoyer l'answer au canal personnel de l'appelant
      await sendToUser(remoteUserIdRef.current, {
        type: 'call-answer',
        from: user.id,
        to: remoteUserIdRef.current,
        payload: answer,
        timestamp: Date.now(),
      });

      setCallState(prev => ({ ...prev, isReceivingCall: false, isInCall: true }));
      toast({ title: "📞 Appel accepté", description: "Connexion en cours..." });

    } catch (err) {
      console.error('❌ Erreur acceptation:', err);
      toast({ title: "❌ Erreur", description: "Impossible d'accepter l'appel", variant: "destructive" });
      cleanup();
    }
  }, [user?.id, stopRingtone, clearCallTimeout, getLocalAudioStream, sendToUser, toast, cleanup]);

  const rejectCall = useCallback(() => {
    if (!user?.id || !remoteUserIdRef.current) return;

    sendToUser(remoteUserIdRef.current, {
      type: 'call-rejected',
      from: user.id,
      to: remoteUserIdRef.current,
      payload: null,
      timestamp: Date.now(),
    });

    toast({ title: "📵 Appel refusé" });
    cleanup();
  }, [user?.id, sendToUser, toast, cleanup]);

  const endCall = useCallback(() => {
    if (user?.id && remoteUserIdRef.current) {
      sendToUser(remoteUserIdRef.current, {
        type: 'call-ended',
        from: user.id,
        to: remoteUserIdRef.current,
        payload: null,
        timestamp: Date.now(),
      });
    }
    toast({ title: "📞 Appel terminé" });
    cleanup();
  }, [user?.id, sendToUser, toast, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setCallState(prev => ({ ...prev, isMuted: !track.enabled }));
      }
    }
  }, []);

  // ═══════════ CANAL PERSONNEL PERSISTANT ═══════════
  // Chaque utilisateur connecté écoute sur `webrtc-signal-{userId}`.
  // TOUS les messages (offer, answer, ICE, reject, end) arrivent ici.
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `webrtc-signal-${user.id}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'webrtc' }, async ({ payload }: { payload: SignalingMessage }) => {
      // Vérification de sécurité : le message doit être adressé à moi
      if (payload.to !== user.id) return;

      console.log('📨 Signal reçu:', payload.type, 'de', payload.from);

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

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('📡 Canal signalisation prêt:', channelName);
      }
    });

    myChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      myChannelRef.current = null;
    };
  }, [user?.id, handleIncomingCall, handleCallAnswer, handleIceCandidate, handleCallRejected, handleCallEnded]);

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
