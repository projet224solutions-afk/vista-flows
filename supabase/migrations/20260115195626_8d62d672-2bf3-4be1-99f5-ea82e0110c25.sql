-- Ajouter la colonne promotional_video à la table products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS promotional_video TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN public.products.promotional_video IS 'URL de la vidéo promotionnelle du produit';