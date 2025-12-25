/**
 * 🟢 Hook de Présence Utilisateur en Temps Réel - 224SOLUTIONS
 * Utilise Supabase Realtime pour tracker qui est vraiment en ligne
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UserPresenceState {
  id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  currentActivity?: string;
}

interface PresencePayload {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  activity?: string;
}

export function useUserPresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresenceState>>(new Map());
  const [myStatus, setMyStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('offline');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mettre à jour le statut de présence dans la DB
  const updatePresenceInDB = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!user?.id) return;

    try {
      // Mise à jour silencieuse - le champ sera créé ou ignoré
      await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      // Ignorer les erreurs car la présence est gérée par Realtime
      console.log('Présence DB update:', error);
    }
  }, [user?.id]);

  // Tracker l'activité utilisateur
  const trackActivity = useCallback(() => {
    if (!user?.id) return;

    // Reset le timeout d'inactivité
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Si l'utilisateur était "away", le remettre "online"
    if (myStatus === 'away') {
      setMyStatus('online');
      channelRef.current?.track({
        user_id: user.id,
        status: 'online',
        last_seen: new Date().toISOString()
      });
    }

    // Marquer comme "away" après 5 minutes d'inactivité
    activityTimeoutRef.current = setTimeout(() => {
      if (myStatus === 'online') {
        setMyStatus('away');
        channelRef.current?.track({
          user_id: user.id,
          status: 'away',
          last_seen: new Date().toISOString()
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }, [user?.id, myStatus]);

  // Initialiser la présence
  useEffect(() => {
    if (!user?.id) return;

    console.log('🟢 Initialisation présence pour:', user.id);

    // Créer le channel de présence
    const channel = supabase.channel('presence:global', {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('🟢 Sync présence:', Object.keys(state).length, 'utilisateurs');
        
        const newOnlineUsers = new Map<string, UserPresenceState>();
        
        Object.entries(state).forEach(([key, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as unknown as PresencePayload;
            newOnlineUsers.set(key, {
              id: presence?.user_id || key,
              status: presence?.status || 'online',
              lastSeen: presence?.last_seen || new Date().toISOString(),
              currentActivity: presence?.activity
            });
          }
        });
        
        setOnlineUsers(newOnlineUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('🟢 Utilisateur connecté:', key);
        if (newPresences?.[0]) {
          const presence = newPresences[0] as unknown as PresencePayload;
          setOnlineUsers(prev => {
            const updated = new Map(prev);
            updated.set(key, {
              id: presence?.user_id || key,
              status: presence?.status || 'online',
              lastSeen: presence?.last_seen || new Date().toISOString(),
              currentActivity: presence?.activity
            });
            return updated;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('🔴 Utilisateur déconnecté:', key);
        setOnlineUsers(prev => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // S'annoncer comme en ligne
          await channel.track({
            user_id: user.id,
            status: 'online',
            last_seen: new Date().toISOString()
          });
          setMyStatus('online');
          await updatePresenceInDB('online');
          console.log('🟢 Présence enregistrée');
        }
      });

    channelRef.current = channel;

    // Heartbeat toutes les 30 secondes pour confirmer la présence
    heartbeatRef.current = setInterval(() => {
      if (channelRef.current) {
        channelRef.current.track({
          user_id: user.id,
          status: myStatus,
          last_seen: new Date().toISOString()
        });
      }
    }, 30000);

    // Écouter l'activité utilisateur
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    // Gérer la fermeture de la page
    const handleBeforeUnload = () => {
      updatePresenceInDB('offline');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Gérer la visibilité de la page
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setMyStatus('away');
        channelRef.current?.track({
          user_id: user.id,
          status: 'away',
          last_seen: new Date().toISOString()
        });
      } else {
        setMyStatus('online');
        channelRef.current?.track({
          user_id: user.id,
          status: 'online',
          last_seen: new Date().toISOString()
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🔴 Nettoyage présence');
      
      // Nettoyer le channel
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }

      // Nettoyer les intervals/timeouts
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Retirer les event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, trackActivity);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Marquer comme offline
      updatePresenceInDB('offline');
    };
  }, [user?.id, updatePresenceInDB, trackActivity, myStatus]);

  // Vérifier si un utilisateur est en ligne
  const isUserOnline = useCallback((userId: string): boolean => {
    const userState = onlineUsers.get(userId);
    return userState?.status === 'online' || userState?.status === 'busy';
  }, [onlineUsers]);

  // Obtenir le statut d'un utilisateur
  const getUserStatus = useCallback((userId: string): UserPresenceState | null => {
    return onlineUsers.get(userId) || null;
  }, [onlineUsers]);

  // Mettre à jour son propre statut
  const setStatus = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (!user?.id) return;

    setMyStatus(status);
    
    if (channelRef.current) {
      await channelRef.current.track({
        user_id: user.id,
        status,
        last_seen: new Date().toISOString()
      });
    }

    await updatePresenceInDB(status);
  }, [user?.id, updatePresenceInDB]);

  return {
    onlineUsers,
    myStatus,
    isUserOnline,
    getUserStatus,
    setStatus,
    onlineCount: onlineUsers.size
  };
}
