-- ============================================================================
-- TESTS COMPLETS: Vérification corrections flux paiement
-- Date: 2026-01-07
-- Objectif: Tester toutes les corrections appliquées
-- Version: Supabase SQL Editor (sans commandes psql)
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE '🧪 TESTS CORRECTIONS PAIEMENT';
  RAISE NOTICE '=========================================';
END $$;

-- ============================================================================
-- TEST 1: Vérifier que les fonctions existent
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test 1: Vérification fonctions SQL...';
END $$;

SELECT 
  routine_name,
  CASE 
    WHEN routine_name = 'create_order_from_payment' THEN '✅ Création commande auto'
    WHEN routine_name = 'force_credit_seller_wallet' THEN '✅ Crédit wallet direct'
    WHEN routine_name = 'fix_orphan_payment' THEN '✅ Correction paiements orphelins'
  END as description
FROM information_schema.routines
WHERE routine_name IN (
  'create_order_from_payment',
  'force_credit_seller_wallet',
  'fix_orphan_payment'
)
AND routine_schema = 'public';

DO $$ BEGIN
  RAISE NOTICE 'Attendu: 3 fonctions trouvées';
END $$;

-- ============================================================================
-- TEST 2: Identifier les paiements orphelins
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test 2: Détection paiements orphelins...';
END $$;

WITH orphan_payments AS (
  SELECT 
    st.id,
    st.stripe_payment_intent_id,
    st.buyer_id,
    st.seller_id,
    st.amount,
    st.seller_net_amount,
    st.status,
    st.paid_at,
    st.product_id,
    CASE WHEN st.order_id IS NULL THEN true ELSE false END as missing_order,
    CASE WHEN o.id IS NULL THEN true ELSE false END as order_not_found,
    CASE WHEN wt.metadata->>'stripe_payment_intent_id' IS NULL THEN true ELSE false END as wallet_not_credited
  FROM stripe_transactions st
  LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
)
SELECT 
  COUNT(*) as total_succeeded,
  SUM(CASE WHEN missing_order OR order_not_found THEN 1 ELSE 0 END) as orphan_orders,
  SUM(CASE WHEN wallet_not_credited THEN 1 ELSE 0 END) as orphan_wallets,
  SUM(CASE WHEN (missing_order OR order_not_found) AND wallet_not_credited THEN 1 ELSE 0 END) as full_orphans
FROM orphan_payments;

DO $$ BEGIN
  RAISE NOTICE 'Si orphan_orders > 0 ou orphan_wallets > 0 : Il y a des paiements à corriger';
  RAISE NOTICE 'Si full_orphans > 0 : Paiements complètement orphelins (critique)';
END $$;

-- ============================================================================
-- TEST 3: Détails des paiements orphelins (si existants)
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test 3: Liste des paiements à corriger...';
END $$;

SELECT 
  st.id,
  st.stripe_payment_intent_id,
  st.amount,
  st.seller_net_amount,
  st.paid_at,
  CASE 
    WHEN st.order_id IS NULL AND o.id IS NULL THEN '❌ Pas de commande'
    WHEN o.id IS NOT NULL THEN '✅ Commande existe'
    ELSE '⚠️  order_id présent mais commande introuvable'
  END as order_status,
  CASE 
    WHEN wt.id IS NULL THEN '❌ Wallet non crédité'
    ELSE '✅ Wallet crédité'
  END as wallet_status,
  p.full_name as seller_name,
  p.email as seller_email
FROM stripe_transactions st
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN profiles p ON p.id = st.seller_id
WHERE st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '7 days'
  AND (st.order_id IS NULL OR o.id IS NULL OR wt.id IS NULL)
ORDER BY st.paid_at DESC;

-- ============================================================================
-- TEST 4: Statistiques wallets vendeurs
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test 4: État des wallets vendeurs...';
END $$;

SELECT 
  p.full_name,
  p.email,
  p.role,
  w.balance,
  w.total_received,
  w.last_transaction_at,
  COUNT(wt.id) as total_transactions,
  COUNT(CASE WHEN wt.transaction_type = 'credit' THEN 1 END) as credit_count,
  SUM(CASE WHEN wt.transaction_type = 'credit' THEN wt.amount ELSE 0 END) as total_credited
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
LEFT JOIN wallet_transactions wt ON wt.receiver_wallet_id = w.id 
  AND wt.created_at > NOW() - INTERVAL '7 days'
WHERE p.role = 'vendeur'
GROUP BY p.id, p.full_name, p.email, p.role, w.balance, w.total_received, w.last_transaction_at
ORDER BY w.last_transaction_at DESC NULLS LAST
LIMIT 10;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
  v_total_succeeded INTEGER;
  v_with_orders INTEGER;
  v_with_wallets INTEGER;
  v_fully_ok INTEGER;
  v_orphans INTEGER;
  v_success_rate DECIMAL;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '📊 RAPPORT FINAL';
  RAISE NOTICE '=========================================';
  
  -- Statistiques globales
  SELECT COUNT(*) INTO v_total_succeeded
  FROM stripe_transactions
  WHERE status = 'SUCCEEDED' AND paid_at > NOW() - INTERVAL '7 days';
  
  SELECT COUNT(DISTINCT st.id) INTO v_with_orders
  FROM stripe_transactions st
  INNER JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '7 days';
  
  SELECT COUNT(DISTINCT st.id) INTO v_with_wallets
  FROM stripe_transactions st
  INNER JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '7 days';
  
  SELECT COUNT(DISTINCT st.id) INTO v_fully_ok
  FROM stripe_transactions st
  INNER JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  INNER JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '7 days';
  
  v_orphans := v_total_succeeded - v_fully_ok;
  
  IF v_total_succeeded > 0 THEN
    v_success_rate := (v_fully_ok::DECIMAL / v_total_succeeded::DECIMAL) * 100;
  ELSE
    v_success_rate := 100;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Période: 7 derniers jours';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Total paiements réussis: %', v_total_succeeded;
  RAISE NOTICE '  ├─ Avec commande: % (%.1f%%)', v_with_orders, (v_with_orders::FLOAT / NULLIF(v_total_succeeded, 0) * 100);
  RAISE NOTICE '  ├─ Avec crédit wallet: % (%.1f%%)', v_with_wallets, (v_with_wallets::FLOAT / NULLIF(v_total_succeeded, 0) * 100);
  RAISE NOTICE '  └─ Totalement traités: % (%.1f%%)', v_fully_ok, v_success_rate;
  RAISE NOTICE '';
  
  IF v_orphans > 0 THEN
    RAISE NOTICE '❌ PAIEMENTS ORPHELINS: % ⚠️', v_orphans;
    RAISE NOTICE '   → Action requise: SELECT fix_orphan_payment();';
  ELSE
    RAISE NOTICE '✅ AUCUN PAIEMENT ORPHELIN - Système sain!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF v_success_rate >= 100 THEN
    RAISE NOTICE '🎉 Taux de réussite: 100%% - EXCELLENT!';
  ELSIF v_success_rate >= 80 THEN
    RAISE NOTICE '✅ Taux de réussite: %.1f%% - BON', v_success_rate;
  ELSIF v_success_rate >= 50 THEN
    RAISE NOTICE '⚠️  Taux de réussite: %.1f%% - À AMÉLIORER', v_success_rate;
  ELSE
    RAISE NOTICE '❌ Taux de réussite: %.1f%% - CRITIQUE', v_success_rate;
  END IF;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🏁 Tests terminés';
  RAISE NOTICE '=========================================';
END $$;
