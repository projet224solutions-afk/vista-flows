-- Politiques RLS sur storage.objects pour nos buckets
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (qual ILIKE '%service-gallery%' OR with_check ILIKE '%service-gallery%')
ORDER BY policyname;

-- Politiques RLS sur service_gallery_images
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'service_gallery_images'
  AND schemaname = 'public'
ORDER BY policyname;

-- Colonnes de service_gallery_images
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'service_gallery_images' AND table_schema = 'public'
ORDER BY ordinal_position;
