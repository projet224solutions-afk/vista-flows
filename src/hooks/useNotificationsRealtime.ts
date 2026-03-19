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

  playNotificationSound();

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
 * Abonnement Realtime global sur `notifications` + `messages`.
 * Joue un son et affiche un toast pour chaque nouveau message reçu,
 * même si l'utilisateur n'est pas sur la page de messagerie.
 */
export function useNotificationsRealtime() {
  const { user } = useAuth();

  const seenIdsRef = useRef<Set<string>>(new Set());
  const cleanupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // ─── 1. Notifications table listener ───
    const notifChannel = supabase
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
          if (!n?.id || seenIdsRef.current.has(n.id)) return;
          seenIdsRef.current.add(n.id);
          showNotificationToast(n);

          if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
          cleanupTimerRef.current = window.setTimeout(() => {
            const ids = Array.from(seenIdsRef.current);
            if (ids.length > 200) {
              seenIdsRef.current = new Set(ids.slice(ids.length - 200));
            }
          }, 5000);
        }
      )
      .subscribe();

    // ─── 2. Messages table listener (son + toast pour nouveaux messages) ───
    const msgChannel = supabase
      .channel(`msg-sound:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (!msg?.id || seenIdsRef.current.has(msg.id)) return;
          seenIdsRef.current.add(msg.id);

          // Jouer le son de notification
          playNotificationSound();

          // Afficher un toast avec le contenu du message
          const senderName = msg.sender_name || "Nouveau message";
          const content = msg.content?.substring(0, 80) || "Vous avez reçu un message";
          toast("💬 " + senderName, {
            description: content,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user?.id]);
}
