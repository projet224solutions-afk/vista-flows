-- =====================================================
-- MISE À JOUR FORCÉE DES CLÉS STRIPE (AVEC BYPASS RLS)
-- 224SOLUTIONS - 5 janvier 2026
-- =====================================================

-- Temporairement désactiver RLS pour cette transaction
BEGIN;

-- Désactiver RLS temporairement
ALTER TABLE stripe_config DISABLE ROW LEVEL SECURITY;

-- Mettre à jour la configuration
UPDATE stripe_config 
SET 
  stripe_secret_key = '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',
  stripe_publishable_key = 'pk_live_51RdKJzRxqizQJVjLFseVlmZ7qOJmOIx9PlsGPY600C0CifOqNyNlbfTb2NZAbW1cyVgk8hUt6vGAD3KQqMCIc7NB00F0KjYCqc',
  is_test_mode = false,
  updated_at = now()
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';

-- Réactiver RLS
ALTER TABLE stripe_config ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Vérification finale
SELECT 
  id,
  substring(stripe_publishable_key, 1, 30) || '...' as cle_publique,
  substring(stripe_secret_key, 1, 25) || '...' as cle_secrete,
  CASE 
    WHEN is_test_mode = false THEN 'PRODUCTION (LIVE)'
    ELSE 'TEST'
  END as mode,
  platform_commission_rate as commission,
  currency as devise,
  CASE 
    WHEN webhook_secret IS NOT NULL THEN 'Configuré'
    ELSE 'À configurer'
  END as webhook_status,
  updated_at as derniere_modification
FROM stripe_config
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';
