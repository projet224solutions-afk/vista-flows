-- Analyse du système de paiement Mobile Money
-- 224SOLUTIONS

-- 1. État des paiements Djomy
SELECT 'djomy_payments' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM djomy_payments;

-- 2. État des transactions Djomy
SELECT 'djomy_transactions' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as completed,
  COUNT(CASE WHEN status IN ('PENDING', 'PROCESSING') THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
FROM djomy_transactions;

-- 3. Transactions récentes Mobile Money (derniers 7 jours)
SELECT 
  id,
  payment_method,
  amount,
  status,
  payer_phone,
  created_at,
  error_message
FROM djomy_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- 4. Logs API Djomy récents
SELECT 
  id,
  request_type,
  endpoint,
  response_status,
  duration_ms,
  error_message,
  created_at
FROM djomy_api_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Retraits Mobile Money (wallet_transactions)
SELECT 
  transaction_id,
  transaction_type,
  amount,
  status,
  description,
  metadata,
  created_at
FROM wallet_transactions
WHERE transaction_type = 'withdraw'
  AND description ILIKE '%Mobile Money%' OR description ILIKE '%Orange%' OR description ILIKE '%MTN%'
ORDER BY created_at DESC
LIMIT 20;

-- 6. Vérifier les webhooks Djomy reçus
SELECT 
  id,
  event_type,
  payload,
  processed,
  created_at
FROM djomy_webhooks
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;
