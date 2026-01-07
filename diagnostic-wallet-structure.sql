-- ============================================================================
-- DIAGNOSTIC: Structure réelle de wallet_transactions
-- ============================================================================

-- 1. Afficher toutes les colonnes de wallet_transactions
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'wallet_transactions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Afficher les index
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'wallet_transactions'
  AND schemaname = 'public';

-- 3. Afficher un exemple de données (si existe)
SELECT *
FROM wallet_transactions
LIMIT 3;
