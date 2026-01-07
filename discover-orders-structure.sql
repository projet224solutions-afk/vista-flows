-- ============================================================================
-- DÉCOUVERTE STRUCTURE: Table orders
-- ============================================================================

-- Découvrir la structure de la table orders
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
