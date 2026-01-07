-- ============================================================================
-- TEST MANUEL: Simuler un paiement Stripe existant
-- ============================================================================

-- 1. Voir les derniers paiements Stripe réussis
SELECT 
  id,
  stripe_payment_intent_id,
  amount,
  seller_net_amount,
  paid_at,
  order_id,
  product_id,
  seller_id,
  buyer_id
FROM stripe_transactions
WHERE status = 'SUCCEEDED'
ORDER BY paid_at DESC
LIMIT 5;

-- 2. Compter les paiements orphelins (sans commande)
SELECT 
  COUNT(*) as total_orphans,
  SUM(amount) as total_amount_lost
FROM stripe_transactions st
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE st.status = 'SUCCEEDED'
  AND o.id IS NULL
  AND st.paid_at > NOW() - INTERVAL '30 days';

-- 3. Tester la création de commande pour un paiement existant
-- Copiez l'ID d'un paiement orphelin ci-dessus et remplacez 'PAYMENT_ID_ICI'
SELECT create_order_from_payment('PAYMENT_ID_ICI'::uuid);

-- 4. Tester le crédit wallet pour le même paiement
SELECT force_credit_seller_wallet('PAYMENT_ID_ICI'::uuid);
