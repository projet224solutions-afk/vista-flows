-- RLS activé sur service_gallery_images ?
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'service_gallery_images';

-- Toutes les policies sur service_gallery_images
SELECT policyname, cmd, permissive FROM pg_policies
WHERE tablename = 'service_gallery_images' AND schemaname = 'public';

-- Policies storage pour service-gallery et service-gallery-videos
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
