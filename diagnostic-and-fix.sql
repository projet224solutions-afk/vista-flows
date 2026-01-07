-- ============================================================================
-- DIAGNOSTIC APPROFONDI: Pourquoi la commande ne se crée pas ?
-- ============================================================================
-- Payment Intent: pi_3SmnjrRxqizQJVjL1CthXpIa

-- ÉTAPE 1: Vérifier la transaction complète
SELECT 
  st.id,
  st.stripe_payment_intent_id,
  st.amount,
  st.status,
  st.paid_at,
  st.seller_id,
  st.buyer_id,
  st.metadata,
  st.created_at,
  p.full_name as seller_name,
  p.email as seller_email
FROM stripe_transactions st
LEFT JOIN profiles p ON p.id = st.seller_id
WHERE st.stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';

-- ÉTAPE 2: Vérifier si des commandes existent déjà
SELECT 
  o.id,
  o.status,
  o.customer_id,
  o.vendor_id,
  o.order_number,
  o.total_amount,
  o.metadata,
  o.created_at
FROM orders o
WHERE o.metadata->>'stripe_payment_intent_id' = 'pi_3SmnjrRxqizQJVjL1CthXpIa';

-- ÉTAPE 3: Vérifier le wallet
SELECT 
  wt.id,
  wt.amount,
  wt.metadata,
  wt.created_at
FROM wallet_transactions wt
WHERE wt.metadata->>'stripe_payment_intent_id' = 'pi_3SmnjrRxqizQJVjL1CthXpIa';

-- ÉTAPE 4: Tester la fonction create_order_from_payment
DO $$
DECLARE
  v_transaction_id UUID;
  v_result JSONB;
  v_error TEXT;
BEGIN
  -- Récupérer l'ID
  SELECT id INTO v_transaction_id
  FROM stripe_transactions
  WHERE stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';
  
  RAISE NOTICE '📋 Transaction ID: %', v_transaction_id;
  
  IF v_transaction_id IS NULL THEN
    RAISE NOTICE '❌ Transaction introuvable!';
    RETURN;
  END IF;
  
  -- Vérifier si la fonction existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_order_from_payment'
  ) THEN
    RAISE NOTICE '❌ Fonction create_order_from_payment inexistante!';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Fonction existe';
  
  -- Essayer de créer la commande
  BEGIN
    SELECT create_order_from_payment(v_transaction_id) INTO v_result;
    RAISE NOTICE '✅ Résultat: %', v_result;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE NOTICE '❌ ERREUR lors de la création: %', v_error;
    RAISE NOTICE 'Code erreur: %', SQLSTATE;
  END;
  
END $$;

-- ÉTAPE 5: Si la fonction ne marche pas, créer la commande manuellement
DO $$
DECLARE
  v_transaction RECORD;
  v_order_id UUID;
  v_customer_id UUID;
  v_vendor_id UUID;
BEGIN
  -- Récupérer toutes les infos de la transaction
  SELECT 
    st.id,
    st.stripe_payment_intent_id,
    st.amount,
    st.seller_id,
    st.buyer_id,
    st.metadata,
    st.created_at
  INTO v_transaction
  FROM stripe_transactions st
  WHERE st.stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';
  
  -- Vérifier si une commande existe déjà
  IF EXISTS (
    SELECT 1 FROM orders 
    WHERE metadata->>'stripe_payment_intent_id' = v_transaction.stripe_payment_intent_id
  ) THEN
    RAISE NOTICE '⚠️ Commande existe déjà!';
    RETURN;
  END IF;
  
  -- Récupérer ou créer le customer_id
  SELECT id INTO v_customer_id
  FROM customers
  WHERE user_id = v_transaction.buyer_id
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    RAISE NOTICE '🔧 Création du customer manquant...';
    INSERT INTO customers (user_id, created_at, updated_at)
    VALUES (v_transaction.buyer_id, v_transaction.created_at, NOW())
    RETURNING id INTO v_customer_id;
    RAISE NOTICE '✅ Customer créé: %', v_customer_id;
  ELSE
    RAISE NOTICE '✅ Customer existant trouvé: %', v_customer_id;
  END IF;
  
  -- Récupérer ou créer le vendor_id
  SELECT id INTO v_vendor_id
  FROM vendors
  WHERE user_id = v_transaction.seller_id
  LIMIT 1;
  
  IF v_vendor_id IS NULL THEN
    RAISE NOTICE '🔧 Création du vendor manquant...';
    INSERT INTO vendors (user_id, created_at, updated_at)
    VALUES (v_transaction.seller_id, v_transaction.created_at, NOW())
    RETURNING id INTO v_vendor_id;
    RAISE NOTICE '✅ Vendor créé: %', v_vendor_id;
  ELSE
    RAISE NOTICE '✅ Vendor existant trouvé: %', v_vendor_id;
  END IF;
  
  RAISE NOTICE '🔧 Création manuelle de la commande...';
  
  -- Créer la commande manuellement avec les bonnes valeurs enum
  INSERT INTO orders (
    customer_id,
    vendor_id,
    order_number,
    status,
    payment_status,
    payment_method,
    subtotal,
    total_amount,
    shipping_address,
    source,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_customer_id,
    v_vendor_id,
    'ORD-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'completed',
    'paid',
    'card',
    v_transaction.amount,
    v_transaction.amount,
    '{}'::jsonb,
    'online',
    jsonb_build_object(
      'stripe_payment_intent_id', v_transaction.stripe_payment_intent_id,
      'payment_method', 'stripe',
      'created_from', 'manual_fix',
      'original_transaction_id', v_transaction.id::TEXT
    ),
    v_transaction.created_at,
    NOW()
  )
  RETURNING id INTO v_order_id;
  
  RAISE NOTICE '✅ Commande créée: %', v_order_id;
  
END $$;

-- ÉTAPE 6: Vérification finale
SELECT 
  st.stripe_payment_intent_id,
  st.amount / 100.0 as montant_fcfa,
  st.status,
  CASE WHEN o.id IS NOT NULL THEN '✅ OUI' ELSE '❌ NON' END as commande_existe,
  CASE WHEN wt.id IS NOT NULL THEN '✅ OUI' ELSE '❌ NON' END as wallet_existe,
  o.id as order_id,
  o.status as order_status,
  o.created_at as order_created_at
FROM stripe_transactions st
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE st.stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';
