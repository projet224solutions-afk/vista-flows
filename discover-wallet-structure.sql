-- Découvrir la structure de wallet_transactions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_transactions'
ORDER BY ordinal_position;
