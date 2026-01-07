-- ============================================================================
-- TESTS COMPLETS: Vérification corrections flux paiement
-- Date: 2026-01-06
-- Objectif: Tester toutes les corrections appliquées
-- ============================================================================

\echo '========================================='
\echo '🧪 TESTS CORRECTIONS PAIEMENT'
\echo '========================================='
\echo ''

-- ============================================================================
-- TEST 1: Vérifier que les fonctions existent
-- ============================================================================

\echo '📋 Test 1: Vérification fonctions SQL...'
\echo ''

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

\echo ''
\echo 'Attendu: 3 fonctions trouvées'
\echo ''

-- ============================================================================
-- TEST 2: Identifier les paiements orphelins
-- ============================================================================

\echo '📋 Test 2: Détection paiements orphelins...'
\echo ''

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
    CASE WHEN wt.id IS NULL THEN true ELSE false END as wallet_not_credited
  FROM stripe_transactions st
  LEFT JOIN orders o ON (o.id = st.order_id OR o.stripe_payment_intent_id = st.stripe_payment_intent_id)
  LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
)
SELECT 
  COUNT(*) as total_succeeded,
  SUM(CASE WHEN missing_order OR order_not_found THEN 1 ELSE 0 END) as orphan_orders,
  SUM(CASE WHEN wallet_not_credited THEN 1 ELSE 0 END) as orphan_wallets,
  SUM(CASE WHEN (missing_order OR order_not_found) AND wallet_not_credited THEN 1 ELSE 0 END) as full_orphans
FROM orphan_payments;

\echo ''
\echo 'Si orphan_orders > 0 ou orphan_wallets > 0 : Il y a des paiements à corriger'
\echo 'Si full_orphans > 0 : Paiements complètement orphelins (critique)'
\echo ''

-- ============================================================================
-- TEST 3: Détails des paiements orphelins (si existants)
-- ============================================================================

\echo '📋 Test 3: Liste des paiements à corriger...'
\echo ''

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
LEFT JOIN orders o ON (o.id = st.order_id OR o.stripe_payment_intent_id = st.stripe_payment_intent_id)
LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
LEFT JOIN profiles p ON p.id = st.seller_id
WHERE st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '7 days'
  AND (st.order_id IS NULL OR o.id IS NULL OR wt.id IS NULL)
ORDER BY st.paid_at DESC;

\echo ''
\echo 'Liste des paiements nécessitant correction'
\echo ''

-- ============================================================================
-- TEST 4: Simuler correction d'un paiement orphelin
-- ============================================================================

\echo '📋 Test 4: Simulation correction (dry-run)...'
\echo ''

DO $$
DECLARE
  v_test_transaction_id UUID;
  v_result jsonb;
BEGIN
  -- Trouver un paiement orphelin pour test
  SELECT st.id INTO v_test_transaction_id
  FROM stripe_transactions st
  LEFT JOIN orders o ON (o.id = st.order_id OR o.stripe_payment_intent_id = st.stripe_payment_intent_id)
  LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
    AND (st.order_id IS NULL OR o.id IS NULL OR wt.id IS NULL)
    AND st.product_id IS NOT NULL
  LIMIT 1;
  
  IF v_test_transaction_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Transaction test trouvée: %', v_test_transaction_id;
    
    -- Tester create_order_from_payment
    BEGIN
      v_result := create_order_from_payment(v_test_transaction_id);
      RAISE NOTICE '✅ create_order_from_payment: %', v_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ create_order_from_payment échoué: %', SQLERRM;
    END;
    
    -- Tester force_credit_seller_wallet
    BEGIN
      v_result := force_credit_seller_wallet(v_test_transaction_id);
      RAISE NOTICE '✅ force_credit_seller_wallet: %', v_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ force_credit_seller_wallet échoué: %', SQLERRM;
    END;
    
  ELSE
    RAISE NOTICE 'ℹ️  Aucun paiement orphelin trouvé - Système sain! ✅';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 5: Statistiques wallets vendeurs
-- ============================================================================

\echo '📋 Test 5: État des wallets vendeurs...'
\echo ''

SELECT 
  p.full_name,
  p.email,
  p.role,
  w.balance,
  w.total_received,
  w.last_transaction_at,
  COUNT(wt.id) as total_transactions,
  COUNT(CASE WHEN wt.type = 'credit' THEN 1 END) as credit_count,
  SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE 0 END) as total_credited
FROM profiles p
LEFT JOIN wallets w ON w.user_id = p.id
LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id 
  AND wt.created_at > NOW() - INTERVAL '7 days'
WHERE p.role = 'VENDOR'
GROUP BY p.id, p.full_name, p.email, p.role, w.balance, w.total_received, w.last_transaction_at
ORDER BY w.last_transaction_at DESC NULLS LAST
LIMIT 10;

\echo ''
\echo 'Top 10 vendeurs avec transactions récentes'
\echo ''

-- ============================================================================
-- TEST 6: Commandes récentes liées à Stripe
-- ============================================================================

\echo '📋 Test 6: Commandes Stripe récentes...'
\echo ''

SELECT 
  o.id,
  o.order_number,
  o.total_amount,
  o.payment_status,
  o.status,
  o.created_at,
  st.stripe_payment_intent_id,
  st.amount as stripe_amount,
  CASE 
    WHEN st.id IS NOT NULL THEN '✅ Liée à Stripe'
    ELSE '⚠️  Pas de transaction Stripe'
  END as stripe_link
FROM orders o
LEFT JOIN stripe_transactions st ON (st.order_id = o.id OR st.stripe_payment_intent_id = o.stripe_payment_intent_id)
WHERE o.payment_method = 'card'
  AND o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 10;

\echo ''
\echo 'Dernières commandes par carte (7 jours)'
\echo ''

-- ============================================================================
-- TEST 7: Transactions wallet vs Stripe
-- ============================================================================

\echo '📋 Test 7: Cohérence Stripe ↔ Wallet...'
\echo ''

WITH stripe_wallet_match AS (
  SELECT 
    st.id as stripe_transaction_id,
    st.stripe_payment_intent_id,
    st.seller_net_amount as expected_credit,
    wt.id as wallet_transaction_id,
    wt.amount as actual_credit,
    CASE 
      WHEN wt.id IS NULL THEN '❌ Wallet non crédité'
      WHEN wt.amount = st.seller_net_amount THEN '✅ Montant correct'
      WHEN wt.amount != st.seller_net_amount THEN '⚠️  Montant différent'
      ELSE '❓ Statut inconnu'
    END as status
  FROM stripe_transactions st
  LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
)
SELECT 
  status,
  COUNT(*) as count,
  SUM(expected_credit) as total_expected,
  SUM(actual_credit) as total_credited
FROM stripe_wallet_match
GROUP BY status
ORDER BY 
  CASE status
    WHEN '✅ Montant correct' THEN 1
    WHEN '⚠️  Montant différent' THEN 2
    WHEN '❌ Wallet non crédité' THEN 3
    ELSE 4
  END;

\echo ''
\echo 'Cohérence entre transactions Stripe et crédits wallet'
\echo ''

-- ============================================================================
-- TEST 8: Performance des index
-- ============================================================================

\echo '📋 Test 8: Vérification index...'
\echo ''

SELECT 
  schemaname,
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE '%stripe%' THEN '✅ Index Stripe'
    WHEN indexname LIKE '%wallet%' THEN '✅ Index Wallet'
    WHEN indexname LIKE '%order%' THEN '✅ Index Orders'
    ELSE 'ℹ️  Autre'
  END as type
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE '%stripe%' OR 
    indexname LIKE '%wallet%' OR 
    indexname LIKE '%orphan%'
  )
ORDER BY tablename, indexname;

\echo ''

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

\echo ''
\echo '========================================='
\echo '📊 RAPPORT FINAL'
\echo '========================================='
\echo ''

DO $$
DECLARE
  v_total_succeeded INTEGER;
  v_with_orders INTEGER;
  v_with_wallets INTEGER;
  v_fully_ok INTEGER;
  v_orphans INTEGER;
  v_success_rate DECIMAL;
BEGIN
  -- Statistiques globales
  SELECT COUNT(*) INTO v_total_succeeded
  FROM stripe_transactions
  WHERE status = 'SUCCEEDED' AND paid_at > NOW() - INTERVAL '7 days';
  
  SELECT COUNT(DISTINCT st.id) INTO v_with_orders
  FROM stripe_transactions st
  INNER JOIN orders o ON (o.id = st.order_id OR o.stripe_payment_intent_id = st.stripe_payment_intent_id)
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '7 days';
  
  SELECT COUNT(DISTINCT st.id) INTO v_with_wallets
  FROM stripe_transactions st
  INNER JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '7 days';
  
  SELECT COUNT(DISTINCT st.id) INTO v_fully_ok
  FROM stripe_transactions st
  INNER JOIN orders o ON (o.id = st.order_id OR o.stripe_payment_intent_id = st.stripe_payment_intent_id)
  INNER JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '7 days';
  
  v_orphans := v_total_succeeded - v_fully_ok;
  
  IF v_total_succeeded > 0 THEN
    v_success_rate := (v_fully_ok::DECIMAL / v_total_succeeded::DECIMAL) * 100;
  ELSE
    v_success_rate := 100;
  END IF;
  
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
    RAISE NOTICE '   → Action requise: Exécuter fix_orphan_payment()';
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
END $$;

\echo ''
\echo '========================================='
\echo '🏁 Tests terminés'
\echo '========================================='
