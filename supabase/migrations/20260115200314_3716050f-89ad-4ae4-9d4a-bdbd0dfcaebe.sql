-- Renommer la colonne promotional_video en promotional_videos (tableau)
-- D'abord, créer la nouvelle colonne array
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS promotional_videos TEXT[];

-- Migrer les données existantes
UPDATE public.products 
SET promotional_videos = ARRAY[promotional_video]
WHERE promotional_video IS NOT NULL AND promotional_videos IS NULL;

-- Supprimer l'ancienne colonne
ALTER TABLE public.products 
DROP COLUMN IF EXISTS promotional_video;

-- Commentaire pour documentation
COMMENT ON COLUMN public.products.promotional_videos IS 'URLs des vidéos promotionnelles du produit (max 2 vidéos)';