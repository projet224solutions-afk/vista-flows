-- ============================================================================
-- CORRECTION CIBLÉE: Paiements incomplets pour comptedevideoai224gn@gmail.com
-- ============================================================================

-- ÉTAPE 1: Identifier les paiements de cet utilisateur
SELECT 
  st.id,
  st.stripe_payment_intent_id,
  st.amount,
  st.status,
  st.paid_at,
  p.full_name,
  p.email,
  EXISTS(SELECT 1 FROM orders o WHERE o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id) as has_order,
  EXISTS(SELECT 1 FROM wallet_transactions wt WHERE wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id) as has_wallet_credit
FROM stripe_transactions st
INNER JOIN profiles p ON p.id = st.seller_id
WHERE p.email = 'comptedevideoai224gn@gmail.com'
  AND st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '2 hours'
ORDER BY st.created_at DESC;

-- ÉTAPE 2: Corriger les paiements sans commande
DO $$
DECLARE
  v_transaction RECORD;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_order_result JSONB;
  v_wallet_result JSONB;
BEGIN
  RAISE NOTICE '🔧 Correction des paiements incomplets...';
  RAISE NOTICE '';
  
  FOR v_transaction IN 
    SELECT st.id, st.stripe_payment_intent_id, st.seller_id, st.amount, p.full_name
    FROM stripe_transactions st
    INNER JOIN profiles p ON p.id = st.seller_id
    WHERE p.email = 'comptedevideoai224gn@gmail.com'
      AND st.status = 'SUCCEEDED'
      AND st.paid_at > NOW() - INTERVAL '2 hours'
      AND (
        NOT EXISTS (
          SELECT 1 FROM orders o 
          WHERE o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM wallet_transactions wt 
          WHERE wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
        )
      )
    ORDER BY st.created_at ASC
  LOOP
    BEGIN
      RAISE NOTICE '🔄 Traitement: % (%.2f FCFA)', v_transaction.stripe_payment_intent_id, v_transaction.amount / 100.0;
      
      -- Vérifier si commande existe
      IF NOT EXISTS (
        SELECT 1 FROM orders o 
        WHERE o.metadata->>'stripe_payment_intent_id' = v_transaction.stripe_payment_intent_id
      ) THEN
        RAISE NOTICE '  📦 Création commande...';
        SELECT create_order_from_payment(v_transaction.id) INTO v_order_result;
        RAISE NOTICE '  ✅ Commande créée';
      ELSE
        RAISE NOTICE '  ℹ️  Commande existe déjà';
      END IF;
      
      -- Vérifier si wallet crédité
      IF NOT EXISTS (
        SELECT 1 FROM wallet_transactions wt 
        WHERE wt.metadata->>'stripe_payment_intent_id' = v_transaction.stripe_payment_intent_id
      ) THEN
        RAISE NOTICE '  💰 Crédit wallet...';
        SELECT force_credit_seller_wallet(v_transaction.id) INTO v_wallet_result;
        RAISE NOTICE '  ✅ Wallet crédité';
      ELSE
        RAISE NOTICE '  ℹ️  Wallet déjà crédité';
      END IF;
      
      v_success_count := v_success_count + 1;
      RAISE NOTICE '';
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE NOTICE '  ❌ Erreur: %', SQLERRM;
      RAISE NOTICE '';
    END;
  END LOOP;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 RÉSULTAT CORRECTION CIBLÉE';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Paiements traités: %', v_success_count;
  RAISE NOTICE '❌ Erreurs: %', v_error_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ÉTAPE 3: Vérifier le résultat final pour cet utilisateur
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
WHERE p.email = 'comptedevideoai224gn@gmail.com'
  AND st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '2 hours'
GROUP BY p.full_name, p.email;

-- ÉTAPE 4: Détail par paiement
SELECT 
  st.stripe_payment_intent_id,
  st.amount / 100.0 as montant_fcfa,
  st.created_at,
  CASE WHEN o.id IS NOT NULL THEN '✅' ELSE '❌' END as commande,
  CASE WHEN wt.id IS NOT NULL THEN '✅' ELSE '❌' END as wallet,
  CASE 
    WHEN o.id IS NOT NULL AND wt.id IS NOT NULL THEN '✅ Complet'
    WHEN o.id IS NOT NULL AND wt.id IS NULL THEN '⚠️ Manque wallet'
    WHEN o.id IS NULL AND wt.id IS NOT NULL THEN '⚠️ Manque commande'
    ELSE '❌ Tout manque'
  END as etat
FROM stripe_transactions st
INNER JOIN profiles p ON p.id = st.seller_id
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE p.email = 'comptedevideoai224gn@gmail.com'
  AND st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '2 hours'
ORDER BY st.created_at DESC;
