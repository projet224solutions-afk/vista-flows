-- =====================================================
-- CONFIGURATION STRIPE EN MODE PRODUCTION (LIVE)
-- 224SOLUTIONS
-- Date: 5 janvier 2026
-- =====================================================

-- Mettre à jour la configuration avec les clés LIVE
UPDATE stripe_config 
SET 
  stripe_secret_key = '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',
  stripe_publishable_key = 'pk_live_51RdKJzRxqizQJVjLFseVlmZ7qOJmOIx9PlsGPY600C0CifOqNyNlbfTb2NZAbW1cyVgk8hUt6vGAD3KQqMCIc7NB00F0KjYCqc',
  is_test_mode = false,
  updated_at = now()
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';

-- Vérifier la mise à jour
SELECT 
  id,
  substring(stripe_publishable_key, 1, 25) || '...' as cle_publique,
  substring(stripe_secret_key, 1, 20) || '...' as cle_secrete,
  is_test_mode as mode_test,
  platform_commission_rate as commission,
  currency as devise,
  updated_at as derniere_modification
FROM stripe_config
WHERE id = 'd57d8310-8e5c-40e5-ac55-ff8de48ee8ba';
