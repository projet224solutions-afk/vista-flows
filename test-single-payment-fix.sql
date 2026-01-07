-- ============================================================================
-- DIAGNOSTIC WEBHOOK: Vérifier si Stripe envoie les événements
-- ============================================================================

-- 1. Voir tous les paiements créés (même PENDING)
SELECT 
  id,
  stripe_payment_intent_id,
  amount,
  status,
  paid_at,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM stripe_transactions
ORDER BY created_at DESC
LIMIT 10;

-- 2. Vérifier le dernier paiement PENDING d'il y a 10 minutes
-- Cherchez dans Stripe Dashboard si ce payment_intent est "succeeded"
SELECT 
  id,
  stripe_payment_intent_id,
  amount,
  status,
  created_at,
  NOW() - created_at as time_pending
FROM stripe_transactions
WHERE status = 'PENDING'
  AND created_at > NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;

-- 3. Si le paiement est succeeded dans Stripe mais PENDING ici, 
-- cela signifie que le webhook ne fonctionne pas
-- Corrigeons manuellement UN paiement pour tester :

-- ⚠️ AVANT d'exécuter: Vérifiez dans Stripe Dashboard que ce payment est succeeded
-- https://dashboard.stripe.com/test/payments/pi_3Sm77jRxqizQJVjL1XYomQzw

UPDATE stripe_transactions
SET 
  status = 'SUCCEEDED',
  paid_at = NOW()
WHERE stripe_payment_intent_id = 'pi_3Sm77jRxqizQJVjL1XYomQzw'
  AND status = 'PENDING'
RETURNING 
  id,
  stripe_payment_intent_id,
  amount,
  status,
  paid_at;

-- 4. Après l'UPDATE, créons la commande manuellement pour CE paiement
DO $$
DECLARE
  v_transaction_id UUID := 'bc89cb71-0164-4235-a41f-a36ac333e0ac'::uuid;
  v_order_result JSONB;
  v_wallet_result JSONB;
BEGIN
  -- Créer la commande
  SELECT create_order_from_payment(v_transaction_id) INTO v_order_result;
  RAISE NOTICE 'Order creation: %', v_order_result;
  
  -- Créditer le wallet
  SELECT force_credit_seller_wallet(v_transaction_id) INTO v_wallet_result;
  RAISE NOTICE 'Wallet credit: %', v_wallet_result;
END $$;

-- 5. Vérifier que tout est OK pour ce paiement
SELECT 
  st.stripe_payment_intent_id,
  st.status,
  st.amount,
  o.order_number,
  o.status as order_status,
  wt.amount as wallet_credited
FROM stripe_transactions st
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE st.stripe_payment_intent_id = 'pi_3Sm77jRxqizQJVjL1XYomQzw';
