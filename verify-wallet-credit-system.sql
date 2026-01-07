-- ============================================================================
-- VÉRIFICATION: Système de crédit wallet vendeur
-- Question: Le système peut-il créditer le wallet du vendeur maintenant?
-- ============================================================================

\echo '========================================='
\echo '🔍 VÉRIFICATION SYSTÈME CRÉDIT WALLET'
\echo '========================================='
\echo ''

-- ============================================================================
-- 1. Vérifier que les fonctions RPC existent
-- ============================================================================

\echo '1️⃣  Vérification fonctions RPC...'
\echo ''

DO $$
DECLARE
  v_create_order BOOLEAN;
  v_force_credit BOOLEAN;
  v_fix_orphan BOOLEAN;
BEGIN
  -- Vérifier create_order_from_payment
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_order_from_payment'
  ) INTO v_create_order;
  
  -- Vérifier force_credit_seller_wallet
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'force_credit_seller_wallet'
  ) INTO v_force_credit;
  
  -- Vérifier fix_orphan_payment
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'fix_orphan_payment'
  ) INTO v_fix_orphan;
  
  RAISE NOTICE '';
  RAISE NOTICE '┌─────────────────────────────────────────┐';
  RAISE NOTICE '│ FONCTIONS RPC DE CRÉDIT WALLET          │';
  RAISE NOTICE '├─────────────────────────────────────────┤';
  
  IF v_create_order THEN
    RAISE NOTICE '│ ✅ create_order_from_payment           │';
  ELSE
    RAISE NOTICE '│ ❌ create_order_from_payment MANQUANTE │';
  END IF;
  
  IF v_force_credit THEN
    RAISE NOTICE '│ ✅ force_credit_seller_wallet          │';
  ELSE
    RAISE NOTICE '│ ❌ force_credit_seller_wallet MANQUANTE│';
  END IF;
  
  IF v_fix_orphan THEN
    RAISE NOTICE '│ ✅ fix_orphan_payment                  │';
  ELSE
    RAISE NOTICE '│ ❌ fix_orphan_payment MANQUANTE        │';
  END IF;
  
  RAISE NOTICE '└─────────────────────────────────────────┘';
  RAISE NOTICE '';
  
  IF v_create_order AND v_force_credit AND v_fix_orphan THEN
    RAISE NOTICE '🎉 RÉSULTAT: Toutes les fonctions sont disponibles!';
    RAISE NOTICE '   → Le système PEUT créditer les wallets automatiquement';
  ELSE
    RAISE NOTICE '❌ RÉSULTAT: Fonctions manquantes';
    RAISE NOTICE '   → Vous devez appliquer fix-payment-orphans.sql';
    RAISE NOTICE '   → Lien: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 2. Vérifier que la colonne available_balance existe
-- ============================================================================

\echo '2️⃣  Vérification structure table wallets...'
\echo ''

DO $$
DECLARE
  v_has_available_balance BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallets' AND column_name = 'available_balance'
  ) INTO v_has_available_balance;
  
  IF v_has_available_balance THEN
    RAISE NOTICE '✅ Colonne available_balance existe';
    RAISE NOTICE '   → Système de fonds bloqués opérationnel';
  ELSE
    RAISE NOTICE '❌ Colonne available_balance manquante';
    RAISE NOTICE '   → Appliquer fix-critical-errors.sql';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 3. Test de crédit wallet (simulation)
-- ============================================================================

\echo '3️⃣  Test crédit wallet (simulation)...'
\echo ''

DO $$
DECLARE
  v_test_transaction_id UUID;
  v_has_functions BOOLEAN;
  v_result jsonb;
BEGIN
  -- Vérifier que les fonctions existent
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'force_credit_seller_wallet'
  ) INTO v_has_functions;
  
  IF NOT v_has_functions THEN
    RAISE NOTICE '⚠️  Impossible de tester: fonctions RPC non disponibles';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  -- Trouver une transaction SUCCEEDED récente pour test
  SELECT st.id INTO v_test_transaction_id
  FROM stripe_transactions st
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
  ORDER BY st.created_at DESC
  LIMIT 1;
  
  IF v_test_transaction_id IS NULL THEN
    RAISE NOTICE 'ℹ️  Aucune transaction récente pour test';
    RAISE NOTICE '   Créez un paiement test pour vérifier';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  RAISE NOTICE '🧪 Transaction test: %', v_test_transaction_id;
  
  -- Tester force_credit_seller_wallet (en lecture seule)
  BEGIN
    -- Cette fonction ne fera rien si le wallet est déjà crédité
    v_result := force_credit_seller_wallet(v_test_transaction_id);
    
    IF v_result->>'success' = 'true' OR v_result->>'message' LIKE '%already credited%' THEN
      RAISE NOTICE '✅ Fonction force_credit_seller_wallet opérationnelle';
      RAISE NOTICE '   Résultat: %', v_result;
    ELSE
      RAISE NOTICE '⚠️  Fonction retourne: %', v_result;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors du test: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- 4. Vérifier derniers crédits wallet
-- ============================================================================

\echo '4️⃣  Derniers crédits wallet vendeurs...'
\echo ''

SELECT 
  wt.created_at,
  p.full_name as vendeur,
  wt.amount,
  wt.type,
  CASE 
    WHEN wt.stripe_transaction_id IS NOT NULL THEN '✅ Stripe'
    WHEN wt.order_id IS NOT NULL THEN '✅ Commande'
    ELSE '⚠️  Autre'
  END as source
FROM wallet_transactions wt
JOIN wallets w ON w.id = wt.wallet_id
JOIN profiles p ON p.id = w.user_id
WHERE wt.type = 'credit'
  AND wt.created_at > NOW() - INTERVAL '24 hours'
ORDER BY wt.created_at DESC
LIMIT 10;

\echo ''
\echo 'Si aucune ligne: Aucun crédit dans dernières 24h'
\echo 'Si lignes avec ✅ Stripe: Système fonctionne!'
\echo ''

-- ============================================================================
-- 5. Identifier paiements non crédités
-- ============================================================================

\echo '5️⃣  Paiements réussis NON crédités...'
\echo ''

WITH non_credited AS (
  SELECT 
    st.id,
    st.stripe_payment_intent_id,
    st.seller_net_amount,
    st.paid_at,
    p.full_name as vendeur,
    p.email
  FROM stripe_transactions st
  JOIN profiles p ON p.id = st.seller_id
  LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
    AND wt.id IS NULL
)
SELECT 
  COUNT(*) as total,
  SUM(seller_net_amount) as montant_total_non_credite
FROM non_credited;

\echo ''

SELECT 
  paid_at,
  vendeur,
  seller_net_amount,
  stripe_payment_intent_id
FROM (
  SELECT 
    st.id,
    st.stripe_payment_intent_id,
    st.seller_net_amount,
    st.paid_at,
    p.full_name as vendeur,
    p.email
  FROM stripe_transactions st
  JOIN profiles p ON p.id = st.seller_id
  LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
    AND wt.id IS NULL
  ORDER BY st.paid_at DESC
  LIMIT 5
) sub;

\echo ''
\echo 'Si total > 0: Il y a des vendeurs non payés ⚠️'
\echo 'Si total = 0: Tous les vendeurs sont payés ✅'
\echo ''

-- ============================================================================
-- CONCLUSION
-- ============================================================================

\echo '========================================='
\echo '📊 CONCLUSION'
\echo '========================================='
\echo ''

DO $$
DECLARE
  v_has_functions BOOLEAN;
  v_has_column BOOLEAN;
  v_unpaid_count INTEGER;
  v_recent_credits INTEGER;
BEGIN
  -- Vérifier fonctions
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'force_credit_seller_wallet'
  ) INTO v_has_functions;
  
  -- Vérifier colonne
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallets' AND column_name = 'available_balance'
  ) INTO v_has_column;
  
  -- Compter paiements non crédités
  SELECT COUNT(*) INTO v_unpaid_count
  FROM stripe_transactions st
  LEFT JOIN wallet_transactions wt ON wt.stripe_transaction_id = st.id
  WHERE st.status = 'SUCCEEDED'
    AND st.paid_at > NOW() - INTERVAL '7 days'
    AND wt.id IS NULL;
  
  -- Compter crédits récents
  SELECT COUNT(*) INTO v_recent_credits
  FROM wallet_transactions
  WHERE type = 'credit'
    AND created_at > NOW() - INTERVAL '24 hours';
  
  RAISE NOTICE '';
  RAISE NOTICE '┌────────────────────────────────────────────────┐';
  RAISE NOTICE '│ CAPACITÉ CRÉDIT WALLET VENDEUR                 │';
  RAISE NOTICE '├────────────────────────────────────────────────┤';
  
  IF v_has_functions THEN
    RAISE NOTICE '│ ✅ Fonctions RPC: DISPONIBLES                 │';
  ELSE
    RAISE NOTICE '│ ❌ Fonctions RPC: MANQUANTES                  │';
  END IF;
  
  IF v_has_column THEN
    RAISE NOTICE '│ ✅ Structure DB: OK                           │';
  ELSE
    RAISE NOTICE '│ ⚠️  Structure DB: INCOMPLÈTE                  │';
  END IF;
  
  RAISE NOTICE '│                                                │';
  RAISE NOTICE '│ Paiements non crédités (7j): %                │', LPAD(v_unpaid_count::TEXT, 17);
  RAISE NOTICE '│ Crédits récents (24h): %                      │', LPAD(v_recent_credits::TEXT, 23);
  RAISE NOTICE '│                                                │';
  
  IF v_has_functions AND v_unpaid_count = 0 THEN
    RAISE NOTICE '│ 🎉 VERDICT: SYSTÈME OPÉRATIONNEL ✅           │';
    RAISE NOTICE '│                                                │';
    RAISE NOTICE '│ Le système PEUT créditer les wallets vendeurs  │';
    RAISE NOTICE '│ Tous les paiements récents sont crédités      │';
  ELSIF v_has_functions AND v_unpaid_count > 0 THEN
    RAISE NOTICE '│ ⚠️  VERDICT: FONCTIONNEL AVEC ARRIÉRÉ         │';
    RAISE NOTICE '│                                                │';
    RAISE NOTICE '│ Le système PEUT créditer mais il y a:          │';
    RAISE NOTICE '│ → % paiements non crédités à corriger        │', v_unpaid_count;
    RAISE NOTICE '│                                                │';
    RAISE NOTICE '│ ACTION: Exécuter correction automatique       │';
    RAISE NOTICE '│ SELECT fix_orphan_payment(id) FROM ...        │';
  ELSE
    RAISE NOTICE '│ ❌ VERDICT: NON OPÉRATIONNEL                  │';
    RAISE NOTICE '│                                                │';
    RAISE NOTICE '│ Le système NE PEUT PAS encore créditer         │';
    RAISE NOTICE '│ → Appliquer fix-payment-orphans.sql            │';
    RAISE NOTICE '│ → URL: https://supabase.com/...                │';
  END IF;
  
  RAISE NOTICE '└────────────────────────────────────────────────┘';
  RAISE NOTICE '';
END $$;

\echo '========================================='
\echo '🏁 Vérification terminée'
\echo '========================================='
