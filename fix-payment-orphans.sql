-- ============================================================================
-- FIX PAIEMENT: Commande non créée + Wallet vendeur non crédité
-- Date: 2026-01-06
-- Problème: Carte facturée mais commande manquante et vendeur non payé
-- ============================================================================

-- ============================================================================
-- 1. DIAGNOSTIC: Identifier les paiements orphelins
-- ============================================================================

-- Trouver les transactions Stripe réussies SANS commande
SELECT 
  st.id,
  st.stripe_payment_intent_id,
  st.buyer_id,
  st.seller_id,
  st.amount,
  st.seller_net_amount,
  st.product_id,
  st.order_id,
  st.status,
  st.paid_at,
  st.created_at,
  CASE 
    WHEN st.order_id IS NULL THEN '❌ NO ORDER_ID'
    WHEN o.id IS NULL THEN '❌ ORDER NOT FOUND'
    ELSE '✅ ORDER EXISTS'
  END as order_status,
  CASE
    WHEN wt.id IS NULL THEN '❌ WALLET NOT CREDITED'
    ELSE '✅ WALLET CREDITED'
  END as wallet_status
FROM stripe_transactions st
LEFT JOIN orders o ON o.id = st.order_id::uuid
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE st.status = 'SUCCEEDED'
  AND st.paid_at > NOW() - INTERVAL '7 days'
ORDER BY st.created_at DESC;

-- ============================================================================
-- 2. FONCTION: Créer commande automatiquement après paiement réussi
-- ============================================================================

CREATE OR REPLACE FUNCTION create_order_from_payment(
  p_transaction_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_product RECORD;
  v_order_id UUID;
  v_order_number TEXT;
  v_result jsonb;
BEGIN
  -- Récupérer la transaction
  SELECT * INTO v_transaction
  FROM stripe_transactions
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found'
    );
  END IF;
  
  -- Vérifier si commande existe déjà
  IF v_transaction.order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_transaction.order_id,
      'message', 'Order already exists'
    );
  END IF;
  
  -- Vérifier si product_id existe
  IF v_transaction.product_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No product_id in transaction'
    );
  END IF;
  
  -- Récupérer infos produit
  SELECT * INTO v_product
  FROM products
  WHERE id = v_transaction.product_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Product not found'
    );
  END IF;
  
  -- Générer numéro de commande unique
  v_order_number := 'CMD-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
  
  -- Créer la commande
  INSERT INTO orders (
    order_number,
    buyer_id,
    seller_id,
    product_id,
    quantity,
    unit_price,
    total_amount,
    payment_method,
    payment_status,
    status,
    metadata,
    created_at
  ) VALUES (
    v_order_number,
    v_transaction.buyer_id,
    v_transaction.seller_id,
    v_transaction.product_id,
    1, -- Par défaut 1 unité
    v_transaction.seller_net_amount, -- Prix unitaire = montant net vendeur
    v_transaction.seller_net_amount,
    'card',
    'paid',
    'confirmed',
    jsonb_build_object(
      'product_name', v_product.name,
      'stripe_transaction_id', v_transaction.id,
      'stripe_payment_intent_id', v_transaction.stripe_payment_intent_id,
      'commission_amount', v_transaction.commission_amount,
      'created_from_payment', true
    ),
    v_transaction.paid_at
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;
  
  -- Mettre à jour la transaction avec order_id
  UPDATE stripe_transactions
  SET order_id = v_order_id,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'order_number', v_order_number,
        'order_created_at', NOW()::TEXT
      )
  WHERE id = p_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'message', 'Order created successfully'
  );
END;
$$;

-- ============================================================================
-- 3. FONCTION: Forcer crédit wallet vendeur (bypass anti-fraude)
-- ============================================================================

CREATE OR REPLACE FUNCTION force_credit_seller_wallet(
  p_transaction_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_wallet_id UUID;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
  v_wallet_transaction_id UUID;
BEGIN
  -- Récupérer transaction
  SELECT * INTO v_transaction
  FROM stripe_transactions
  WHERE id = p_transaction_id
    AND status = 'SUCCEEDED';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found or not succeeded'
    );
  END IF;
  
  -- Vérifier si déjà crédité
  IF EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE metadata->>'stripe_payment_intent_id' = v_transaction.stripe_payment_intent_id
      AND transaction_type = 'credit'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Wallet already credited'
    );
  END IF;
  
  -- Récupérer wallet vendeur
  SELECT id, balance INTO v_wallet_id, v_balance_before
  FROM wallets
  WHERE user_id = v_transaction.seller_id;
  
  IF NOT FOUND THEN
    -- Créer wallet si inexistant
    INSERT INTO wallets (user_id, balance, currency)
    VALUES (v_transaction.seller_id, 0, v_transaction.currency)
    RETURNING id, balance INTO v_wallet_id, v_balance_before;
  END IF;
  
  -- Créditer wallet vendeur
  UPDATE wallets
  SET 
    balance = balance + v_transaction.seller_net_amount,
    total_received = COALESCE(total_received, 0) + v_transaction.seller_net_amount,
    last_transaction_at = NOW(),
    updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_balance_after;
  
  -- Enregistrer transaction wallet
  INSERT INTO wallet_transactions (
    transaction_id,
    receiver_wallet_id,
    amount,
    fee,
    net_amount,
    currency,
    transaction_type,
    status,
    description,
    metadata
  ) VALUES (
    'STRIPE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 10)),
    v_wallet_id,
    v_transaction.seller_net_amount,
    0,
    v_transaction.seller_net_amount,
    v_transaction.currency,
    'credit',
    'completed',
    'Paiement carte reçu - Commande #' || COALESCE(v_transaction.order_id::TEXT, 'N/A'),
    jsonb_build_object(
      'stripe_transaction_id', p_transaction_id,
      'stripe_payment_intent_id', v_transaction.stripe_payment_intent_id,
      'source', 'stripe_payment',
      'seller_id', v_transaction.seller_id,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    )
  )
  RETURNING id INTO v_wallet_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'wallet_id', v_wallet_id,
    'amount_credited', v_transaction.seller_net_amount,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'wallet_transaction_id', v_wallet_transaction_id
  );
END;
$$;

-- ============================================================================
-- 4. FONCTION: Corriger paiement complet (commande + wallet)
-- ============================================================================

CREATE OR REPLACE FUNCTION fix_orphan_payment(
  p_transaction_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_result jsonb;
  v_wallet_result jsonb;
  v_final_result jsonb;
BEGIN
  -- 1. Créer commande si manquante
  v_order_result := create_order_from_payment(p_transaction_id);
  
  -- 2. Créditer wallet vendeur
  v_wallet_result := force_credit_seller_wallet(p_transaction_id);
  
  -- 3. Construire résultat final
  v_final_result := jsonb_build_object(
    'transaction_id', p_transaction_id,
    'order_creation', v_order_result,
    'wallet_credit', v_wallet_result,
    'fixed_at', NOW()
  );
  
  RETURN v_final_result;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION create_order_from_payment(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION force_credit_seller_wallet(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION fix_orphan_payment(UUID) TO service_role;

-- ============================================================================
-- 5. SCRIPT CORRECTION: Réparer TOUS les paiements orphelins
-- ============================================================================

-- À exécuter pour corriger les paiements passés
DO $$
DECLARE
  v_transaction RECORD;
  v_result jsonb;
  v_fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Début correction paiements orphelins...';
  
  FOR v_transaction IN 
    SELECT st.id
    FROM stripe_transactions st
    LEFT JOIN orders o ON o.id = st.order_id::uuid
    LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
    WHERE st.status = 'SUCCEEDED'
      AND st.paid_at > NOW() - INTERVAL '30 days'
      AND (o.id IS NULL OR wt.id IS NULL)
  LOOP
    BEGIN
      -- Corriger ce paiement
      v_result := fix_orphan_payment(v_transaction.id);
      v_fixed_count := v_fixed_count + 1;
      
      RAISE NOTICE '✅ Paiement corrigé: % - Résultat: %', 
        v_transaction.id, 
        v_result::TEXT;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Erreur correction %: %', v_transaction.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '🎯 Correction terminée: % paiement(s) corrigé(s)', v_fixed_count;
END $$;

-- ============================================================================
-- 6. INDEX POUR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stripe_transactions_orphans 
ON stripe_transactions(status, paid_at) 
WHERE status = 'SUCCEEDED' AND order_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_stripe_metadata
ON wallet_transactions((metadata->>'stripe_payment_intent_id'))
WHERE metadata->>'stripe_payment_intent_id' IS NOT NULL;

-- ============================================================================
-- RAPPORT FINAL
-- ============================================================================

DO $$
DECLARE
  v_total_succeeded INTEGER;
  v_with_orders INTEGER;
  v_with_wallet_credit INTEGER;
  v_fully_processed INTEGER;
  v_orphans INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_succeeded
  FROM stripe_transactions
  WHERE status = 'SUCCEEDED' AND paid_at > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO v_with_orders
  FROM stripe_transactions st
  INNER JOIN orders o ON o.id = st.order_id::uuid
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO v_with_wallet_credit
  FROM stripe_transactions st
  INNER JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO v_fully_processed
  FROM stripe_transactions st
  INNER JOIN orders o ON o.id = st.order_id::uuid
  INNER JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
  WHERE st.status = 'SUCCEEDED' AND st.paid_at > NOW() - INTERVAL '30 days';
  
  v_orphans := v_total_succeeded - v_fully_processed;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'RAPPORT CORRECTION PAIEMENTS';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Total paiements réussis (30j): %', v_total_succeeded;
  RAISE NOTICE 'Avec commande: % (%.0f%%)', v_with_orders, (v_with_orders::FLOAT / NULLIF(v_total_succeeded, 0) * 100);
  RAISE NOTICE 'Avec crédit wallet: % (%.0f%%)', v_with_wallet_credit, (v_with_wallet_credit::FLOAT / NULLIF(v_total_succeeded, 0) * 100);
  RAISE NOTICE 'Totalement traités: % (%.0f%%)', v_fully_processed, (v_fully_processed::FLOAT / NULLIF(v_total_succeeded, 0) * 100);
  RAISE NOTICE '❌ Paiements orphelins: %', v_orphans;
  RAISE NOTICE '==========================================';
END $$;
