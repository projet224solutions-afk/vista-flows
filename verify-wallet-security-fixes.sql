-- =====================================================
-- SCRIPT DE V\u00c9RIFICATION POST-CORRECTIONS
-- \u00c0 ex\u00e9cuter pour valider les corrections
-- =====================================================

-- 1. V\u00e9rifier que les RLS sont activ\u00e9es
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('wallet_transfers', 'wallet_transactions', 'wallets')
ORDER BY tablename;

-- 2. Lister toutes les policies wallet
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('wallet_transfers', 'wallet_transactions')
ORDER BY tablename, policyname;

-- 3. V\u00e9rifier les contraintes
SELECT 
  tc.constraint_name,
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('wallet_transfers', 'wallets')
  AND tc.constraint_type = 'CHECK';

-- 4. V\u00e9rifier la vue user_wallet_transfers
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_wallet_transfers'
ORDER BY ordinal_position;

-- 5. Tester acc\u00e8s user (simuler avec un user_id)
-- Remplacer 'USER_ID_TEST' par un vrai UUID
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- REMPLACER
BEGIN
  -- Essayer de s\u00e9lectionner ses propres transferts
  PERFORM * FROM wallet_transfers 
  WHERE sender_id = test_user_id 
  LIMIT 1;
  
  RAISE NOTICE 'Test SELECT sur wallet_transfers: OK';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test SELECT: ERREUR - %', SQLERRM;
END $$;

-- 6. V\u00e9rifier que les montants sont dans les limites
SELECT 
  COUNT(*) as total_transfers,
  COUNT(*) FILTER (WHERE amount_sent < 100) as below_min,
  COUNT(*) FILTER (WHERE amount_sent > 50000000) as above_max,
  MIN(amount_sent) as min_amount,
  MAX(amount_sent) as max_amount,
  AVG(amount_sent) as avg_amount
FROM wallet_transfers;

-- 7. V\u00e9rifier les index cr\u00e9\u00e9s
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('wallet_transfers', 'wallet_transactions')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 8. Statistiques des transferts
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount_sent) as total_amount,
  AVG(fee_percentage) as avg_fee_pct,
  COUNT(DISTINCT sender_id) as unique_senders,
  COUNT(DISTINCT receiver_id) as unique_receivers
FROM wallet_transfers
GROUP BY status;

-- 9. V\u00e9rifier l'absence de donn\u00e9es sensibles dans les logs
SELECT 
  id,
  action_type,
  description,
  is_suspicious,
  created_at
FROM financial_audit_logs
WHERE description ILIKE '%wallet%transfer%'
ORDER BY created_at DESC
LIMIT 10;

-- 10. Test de performance sur les queries fr\u00e9quentes
EXPLAIN ANALYZE
SELECT * FROM user_wallet_transfers
WHERE sender_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 20;

-- 11. V\u00e9rifier les grants
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('wallet_transfers', 'wallet_transactions', 'user_wallet_transfers')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- RAPPORT FINAL
SELECT 
  '\u2705 V\u00e9rification termin\u00e9e' as status,
  NOW() as checked_at;
