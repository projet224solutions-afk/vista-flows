import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playNotificationSound } from "@/services/notificationSoundService";

type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
};

function showNotificationToast(n: AppNotification) {
  const title = n.title || "Nouvelle notification";
  const description = n.message;

  // Jouer le son de notification
  playNotificationSound();

  // Mapping simple par type (on n'a pas la priorité ici)
  switch ((n.type || "").toLowerCase()) {
    case "security":
      toast.error(title, { description });
      break;
    case "promotion":
    case "recommendation":
      toast.info(title, { description });
      break;
    case "order":
      toast.success(title, { description });
      break;
    case "system":
    default:
      toast(title, { description });
      break;
  }
}

/**
 * Abonnement Realtime global sur la table `notifications`.
 * Objectif: que l'utilisateur "reçoive" immédiatement le message (toast) dès insertion DB.
 */
export function useNotificationsRealtime() {
  const { user } = useAuth();

  // Dédoublonnage (React StrictMode, reconnexions, etc.)
  const seenIdsRef = useRef<Set<string>>(new Set());
  const cleanupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`app-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          if (!n?.id) return;

          if (seenIdsRef.current.has(n.id)) return;
          seenIdsRef.current.add(n.id);

          showNotificationToast(n);

          // Nettoyage soft pour éviter que le Set grossisse trop
          if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
          cleanupTimerRef.current = window.setTimeout(() => {
            // On garde uniquement les 200 derniers IDs
            const ids = Array.from(seenIdsRef.current);
            if (ids.length > 200) {
              seenIdsRef.current = new Set(ids.slice(ids.length - 200));
            }
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
}
