-- ============================================================================
-- FIX: Politiques RLS pour les notifications
-- Permet l'insertion par service_role et les utilisateurs
-- ============================================================================

-- 1. Politique INSERT pour service_role (Edge Functions)
CREATE POLICY IF NOT EXISTS "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Politique INSERT pour les utilisateurs (auto-notifications)
CREATE POLICY IF NOT EXISTS "Users can create notifications for themselves"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Politique DELETE pour les utilisateurs (supprimer leurs notifications)
CREATE POLICY IF NOT EXISTS "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Vérifier/ajouter politique INSERT pour user_fcm_tokens si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_fcm_tokens' 
    AND policyname = 'Service role can manage FCM tokens'
  ) THEN
    CREATE POLICY "Service role can manage FCM tokens"
      ON public.user_fcm_tokens FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Index pour améliorer les performances des requêtes de notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications (user_id, read) 
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON public.notifications (type);

-- 6. Commentaires
COMMENT ON POLICY "Service role can insert notifications" ON public.notifications 
  IS 'Permet aux Edge Functions d''insérer des notifications';

COMMENT ON POLICY "Users can create notifications for themselves" ON public.notifications 
  IS 'Permet aux utilisateurs de créer leurs propres notifications';
