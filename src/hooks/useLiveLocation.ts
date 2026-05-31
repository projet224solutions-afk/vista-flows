/**
 * HOOKS DE PARTAGE DE POSITION EN TEMPS RÉEL — 224Solutions
 *
 * - useShareMyLocation : le client partage sa position GPS en direct.
 * - useTrackLocation   : un suiveur (chauffeur / lien public) reçoit la position.
 *
 * Basé sur Supabase Realtime Broadcast (aucune table requise).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  liveLocationChannelName,
  LIVE_LOCATION_EVENTS,
  type LivePosition,
} from '@/lib/liveLocation';

const HEARTBEAT_MS = 4000;

/**
 * Partage la position GPS de l'utilisateur courant sur son canal.
 * Renvoie l'état du partage et la dernière position émise.
 */
export function useShareMyLocation(userId: string | undefined, name?: string) {
  const [sharing, setSharing] = useState(false);
  const [lastPosition, setLastPosition] = useState<LivePosition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPosRef = useRef<LivePosition | null>(null);

  const emit = useCallback((pos: LivePosition) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: LIVE_LOCATION_EVENTS.position,
      payload: pos,
    });
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: LIVE_LOCATION_EVENTS.stop, payload: {} });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    lastPosRef.current = null;
    setSharing(false);
  }, []);

  const start = useCallback(() => {
    setError(null);

    if (!userId) {
      setError('Utilisateur non identifié');
      return;
    }
    if (!('geolocation' in navigator)) {
      setError("La géolocalisation n'est pas supportée par cet appareil");
      return;
    }

    // Canal de l'utilisateur partageur
    const channel = supabase.channel(liveLocationChannelName(userId), {
      config: { broadcast: { self: false } },
    });

    // Répondre immédiatement aux demandes des suiveurs
    channel.on('broadcast', { event: LIVE_LOCATION_EVENTS.request }, () => {
      if (lastPosRef.current) emit(lastPosRef.current);
    });

    channel.subscribe();
    channelRef.current = channel;

    // Suivi GPS continu
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pos: LivePosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          ts: Date.now(),
          name,
        };
        lastPosRef.current = pos;
        setLastPosition(pos);
        emit(pos);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Accès GPS refusé. Autorisez la localisation pour partager votre position.'
            : 'Impossible d\'obtenir votre position GPS.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    // Battement régulier : ré-émet la dernière position pour les suiveurs récents
    heartbeatRef.current = setInterval(() => {
      if (lastPosRef.current) {
        lastPosRef.current = { ...lastPosRef.current, ts: Date.now(), name };
        emit(lastPosRef.current);
      }
    }, HEARTBEAT_MS);

    setSharing(true);
  }, [userId, name, emit]);

  // Nettoyage au démontage
  useEffect(() => stop, [stop]);

  return { sharing, lastPosition, error, start, stop };
}

/**
 * Suit la position partagée par un utilisateur (par son ID).
 * Renvoie la dernière position reçue + l'état de la connexion.
 */
export function useTrackLocation(userId: string | null | undefined) {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [connected, setConnected] = useState(false);
  const [sharerStopped, setSharerStopped] = useState(false);

  useEffect(() => {
    setPosition(null);
    setConnected(false);
    setSharerStopped(false);

    if (!userId) return;

    const channel = supabase.channel(liveLocationChannelName(userId), {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: LIVE_LOCATION_EVENTS.position }, ({ payload }) => {
      setSharerStopped(false);
      setPosition(payload as LivePosition);
    });

    channel.on('broadcast', { event: LIVE_LOCATION_EVENTS.stop }, () => {
      setSharerStopped(true);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        // Demander la position courante sans attendre le prochain battement
        channel.send({ type: 'broadcast', event: LIVE_LOCATION_EVENTS.request, payload: {} });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { position, connected, sharerStopped };
}
