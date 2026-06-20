-- ================================================================
-- DIAGNOSTIC : Images/vidéos non visibles sur marketplace
-- Coller dans Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- 1. Colonnes de service_gallery_images (vérifier media_type, video_url existent)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'service_gallery_images'
ORDER BY ordinal_position;

-- 2. Nombre total d'entrées dans service_gallery_images
SELECT
  media_type,
  COUNT(*) AS total,
  COUNT(image_url) AS avec_image_url,
  COUNT(video_url) AS avec_video_url
FROM public.service_gallery_images
GROUP BY media_type;

-- 3. Services actifs avec et sans cover_image_url
SELECT
  COUNT(*) FILTER (WHERE cover_image_url IS NOT NULL AND cover_image_url <> '') AS avec_cover,
  COUNT(*) FILTER (WHERE cover_image_url IS NULL OR cover_image_url = '')       AS sans_cover,
  COUNT(*) AS total
FROM public.professional_services
WHERE status = 'active';

-- 4. Services actifs avec galerie vs sans galerie
SELECT
  ps.id,
  ps.business_name,
  ps.cover_image_url,
  COUNT(sgi.id) AS nb_galerie
FROM public.professional_services ps
LEFT JOIN public.service_gallery_images sgi
  ON sgi.professional_service_id = ps.id
WHERE ps.status = 'active'
GROUP BY ps.id, ps.business_name, ps.cover_image_url
ORDER BY nb_galerie DESC
LIMIT 20;

-- 5. Vérifier le RPC get_active_service_subscription_limits
SELECT COUNT(*) AS nb_services_avec_abonnement_actif
FROM public.get_active_service_subscription_limits();

-- 6. RLS activé sur service_gallery_images ?
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'service_gallery_images';

-- 7. Policies RLS sur service_gallery_images
SELECT policyname, cmd, permissive, roles
FROM pg_policies
WHERE tablename  = 'service_gallery_images'
  AND schemaname = 'public'
ORDER BY policyname;

-- 8. Storage bucket service-gallery public ?
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('service-gallery', 'service-gallery-videos');

-- 9. Storage policies sur service-gallery
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename  = 'objects'
  AND schemaname = 'storage'
  AND (qual ILIKE '%service-gallery%' OR with_check ILIKE '%service-gallery%')
ORDER BY policyname;
