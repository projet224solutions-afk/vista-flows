-- ============================================================================
-- CORRECTION MASSIVE: Tous les paiements PENDING avec vendeurs valides
-- ============================================================================

-- ÉTAPE 1: Marquer les paiements avec vendeurs valides comme SUCCEEDED
UPDATE stripe_transactions st
SET 
  status = 'SUCCEEDED',
  paid_at = NOW()
FROM profiles p
WHERE st.seller_id = p.id
  AND st.status = 'PENDING'
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = st.seller_id)
RETURNING 
  st.id,
  st.stripe_payment_intent_id,
  st.amount,
  p.full_name as seller_name;

-- ÉTAPE 2: Créer les commandes pour TOUS ces paiements
DO $$
DECLARE
  v_transaction RECORD;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_order_result JSONB;
  v_wallet_result JSONB;
BEGIN
  RAISE NOTICE '🚀 Début correction massive...';
  
  FOR v_transaction IN 
    SELECT st.id, st.stripe_payment_intent_id, st.seller_id, p.full_name
    FROM stripe_transactions st
    INNER JOIN profiles p ON p.id = st.seller_id
    WHERE st.status = 'SUCCEEDED'
      AND st.paid_at IS NOT NULL
      AND st.paid_at > NOW() - INTERVAL '1 hour'  -- Seulement ceux qu'on vient de corriger
      AND NOT EXISTS (
        SELECT 1 FROM orders o 
        WHERE o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
      )
    ORDER BY st.created_at DESC
  LOOP
    BEGIN
      -- Créer la commande
      SELECT create_order_from_payment(v_transaction.id) INTO v_order_result;
      
      -- Créditer le wallet
      SELECT force_credit_seller_wallet(v_transaction.id) INTO v_wallet_result;
      
      v_success_count := v_success_count + 1;
      RAISE NOTICE '✅ % - %', v_transaction.stripe_payment_intent_id, v_transaction.full_name;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE NOTICE '❌ % - Erreur: %', v_transaction.stripe_payment_intent_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RÉSULTAT FINAL';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Paiements corrigés: %', v_success_count;
  RAISE NOTICE '❌ Erreurs: %', v_error_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ÉTAPE 3: Vérifier le résultat final
SELECT 
  p.full_name as vendeur,
  p.email,
  COUNT(DISTINCT st.id) as total_paiements,
  SUM(st.amount) as total_montant,
  COUNT(DISTINCT o.id) as commandes_creees,
  COUNT(DISTINCT wt.id) as wallets_credites,
  CASE 
    WHEN COUNT(DISTINCT o.id) = COUNT(DISTINCT st.id) 
     AND COUNT(DISTINCT wt.id) = COUNT(DISTINCT st.id) 
    THEN '✅ 100% OK'
    ELSE '⚠️ Incomplet'
  END as statut
FROM stripe_transactions st
INNER JOIN profiles p ON p.id = st.seller_id
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '1 hour'
GROUP BY p.full_name, p.email
ORDER BY total_paiements DESC;

-- ÉTAPE 4: Lister les paiements avec vendeur inexistant (à traiter séparément)
SELECT 
  st.id,
  st.stripe_payment_intent_id,
  st.amount,
  st.seller_id,
  '❌ Vendeur inexistant - À rembourser' as action_requise
FROM stripe_transactions st
LEFT JOIN profiles p ON p.id = st.seller_id
WHERE st.status = 'PENDING'
  AND p.id IS NULL
ORDER BY st.created_at DESC;
