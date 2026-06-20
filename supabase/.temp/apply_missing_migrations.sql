-- ================================================================
-- APPLY MISSING MIGRATIONS — Idempotent (safe à re-exécuter)
-- Coller dans Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- ── Migration 20260516100000 : images + video_url sur menu items et services ──

ALTER TABLE public.restaurant_menu_items
  ADD COLUMN IF NOT EXISTS images     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url  TEXT;

ALTER TABLE public.professional_services
  ADD COLUMN IF NOT EXISTS portfolio_images TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS promo_video_url  TEXT;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS can_upload_video BOOLEAN DEFAULT false;

UPDATE public.plans SET can_upload_video = true WHERE name = 'elite';

ALTER TABLE public.service_plans
  ADD COLUMN IF NOT EXISTS can_upload_video BOOLEAN DEFAULT false;

UPDATE public.service_plans SET can_upload_video = true WHERE name = 'elite';

-- ── Migration 20260516120000 : seed abonnements gratuits pour services actifs ──

DO $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id
  FROM public.service_plans
  WHERE name = 'free' AND is_active = true
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RAISE NOTICE 'Plan free introuvable — seed ignoré';
    RETURN;
  END IF;

  INSERT INTO public.service_subscriptions
    (professional_service_id, user_id, plan_id, status, current_period_start, current_period_end)
  SELECT
    ps.id,
    ps.user_id,
    v_free_plan_id,
    'active',
    now(),
    now() + INTERVAL '365 days'
  FROM public.professional_services ps
  WHERE ps.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.service_subscriptions ss
      WHERE ss.professional_service_id = ps.id
        AND ss.status = 'active'
        AND ss.current_period_end >= now()
    )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed abonnements gratuits terminé';
END $$;

-- ── Migration 20260516130000 : RPC public get_active_service_subscription_limits ──

CREATE OR REPLACE FUNCTION public.get_active_service_subscription_limits()
RETURNS TABLE (
  professional_service_id UUID,
  max_products            INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ss.professional_service_id,
    sp.max_products
  FROM public.service_subscriptions ss
  JOIN public.service_plans sp ON sp.id = ss.plan_id
  WHERE ss.status             = 'active'
    AND ss.current_period_end >= now();
$$;

GRANT EXECUTE ON FUNCTION public.get_active_service_subscription_limits() TO anon, authenticated;

-- ── Migration 20260518000000 : media_type + video_url + thumbnail_url sur galerie ──

ALTER TABLE public.service_gallery_images
  ADD COLUMN IF NOT EXISTS media_type    TEXT    NOT NULL DEFAULT 'image'
                                         CHECK (media_type IN ('image', 'video')),
  ADD COLUMN IF NOT EXISTS video_url     TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Bucket vidéos galerie (safe si déjà existant)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-gallery-videos',
  'service-gallery-videos',
  true,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies vidéos (DROP IF EXISTS avant de recréer)
DROP POLICY IF EXISTS "service_gallery_videos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "service_gallery_videos_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "service_gallery_videos_owner_delete"  ON storage.objects;

CREATE POLICY "service_gallery_videos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-gallery-videos');

CREATE POLICY "service_gallery_videos_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'service-gallery-videos' AND auth.uid() IS NOT NULL);

CREATE POLICY "service_gallery_videos_owner_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'service-gallery-videos' AND auth.uid() IS NOT NULL);

-- RLS galerie : policy propriétaire
DROP POLICY IF EXISTS "service_gallery_images_owner_manage" ON public.service_gallery_images;
CREATE POLICY "service_gallery_images_owner_manage"
  ON public.service_gallery_images FOR ALL
  USING (
    professional_service_id IN (
      SELECT id FROM public.professional_services WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_service_id IN (
      SELECT id FROM public.professional_services WHERE user_id = auth.uid()
    )
  );

-- ── Migration 20260518010000 : image_url nullable + policies manquantes ──

-- Rendre image_url nullable (les vidéos n'ont pas d'image_url)
ALTER TABLE public.service_gallery_images
  ALTER COLUMN image_url DROP NOT NULL;

-- Activer RLS (idempotent)
ALTER TABLE public.service_gallery_images ENABLE ROW LEVEL SECURITY;

-- Policy lecture publique
DROP POLICY IF EXISTS "service_gallery_public_read" ON public.service_gallery_images;
CREATE POLICY "service_gallery_public_read"
  ON public.service_gallery_images FOR SELECT
  USING (true);

-- Policy service_role (backend)
DROP POLICY IF EXISTS "service_gallery_service_role" ON public.service_gallery_images;
CREATE POLICY "service_gallery_service_role"
  ON public.service_gallery_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── VÉRIFICATION FINALE ──
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'service_gallery_images' AND column_name = 'media_type') AS media_type_ok,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'restaurant_menu_items'  AND column_name = 'images')      AS images_ok,
  (SELECT COUNT(*) FROM public.get_active_service_subscription_limits())         AS services_actifs;
