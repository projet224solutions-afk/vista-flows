-- ============================================================================
-- CORRECTION ULTRA-CIBLÉE: Créer la commande manquante
-- ============================================================================
-- Payment Intent: pi_3SmnjrRxqizQJVjL1CthXpIa
-- Montant: 51.25 FCFA
-- État actuel: Wallet ✅, Commande ❌

-- ÉTAPE 1: Vérifier l'état actuel de ce paiement spécifique
SELECT 
  st.id,
  st.stripe_payment_intent_id,
  st.amount / 100.0 as montant_fcfa,
  st.status,
  st.paid_at,
  p.full_name,
  p.email,
  EXISTS(SELECT 1 FROM orders o WHERE o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id) as has_order,
  EXISTS(SELECT 1 FROM wallet_transactions wt WHERE wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id) as has_wallet_credit
FROM stripe_transactions st
INNER JOIN profiles p ON p.id = st.seller_id
WHERE st.stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';

-- ÉTAPE 2: Créer la commande manquante
DO $$
DECLARE
  v_transaction_id UUID;
  v_payment_intent TEXT := 'pi_3SmnjrRxqizQJVjL1CthXpIa';
  v_order_result JSONB;
BEGIN
  RAISE NOTICE '🔧 Création de la commande manquante...';
  RAISE NOTICE '';
  
  -- Récupérer l'ID de la transaction
  SELECT id INTO v_transaction_id
  FROM stripe_transactions
  WHERE stripe_payment_intent_id = v_payment_intent;
  
  IF v_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Transaction introuvable pour payment_intent: %', v_payment_intent;
  END IF;
  
  RAISE NOTICE '📦 Transaction ID: %', v_transaction_id;
  
  -- Vérifier si la commande existe déjà
  IF EXISTS (
    SELECT 1 FROM orders 
    WHERE metadata->>'stripe_payment_intent_id' = v_payment_intent
  ) THEN
    RAISE NOTICE '⚠️  La commande existe déjà!';
  ELSE
    -- Créer la commande
    RAISE NOTICE '🚀 Création de la commande...';
    SELECT create_order_from_payment(v_transaction_id) INTO v_order_result;
    RAISE NOTICE '✅ Commande créée avec succès!';
    RAISE NOTICE 'Résultat: %', v_order_result;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CORRECTION TERMINÉE';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERREUR: %', SQLERRM;
  RAISE NOTICE 'Détails: %', SQLSTATE;
  RAISE;
END $$;

-- ÉTAPE 3: Vérifier que tout est OK maintenant
SELECT 
  st.stripe_payment_intent_id,
  st.amount / 100.0 as montant_fcfa,
  st.created_at,
  p.full_name,
  CASE WHEN o.id IS NOT NULL THEN '✅ OUI' ELSE '❌ NON' END as commande,
  CASE WHEN wt.id IS NOT NULL THEN '✅ OUI' ELSE '❌ NON' END as wallet,
  CASE 
    WHEN o.id IS NOT NULL AND wt.id IS NOT NULL THEN '✅ 100% COMPLET'
    ELSE '❌ PROBLÈME'
  END as etat_final
FROM stripe_transactions st
INNER JOIN profiles p ON p.id = st.seller_id
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE st.stripe_payment_intent_id = 'pi_3SmnjrRxqizQJVjL1CthXpIa';

-- ÉTAPE 4: Vérification globale pour l'utilisateur
SELECT 
  p.full_name as vendeur,
  p.email,
  COUNT(DISTINCT st.id) as total_paiements,
  SUM(st.amount) / 100.0 as total_montant_fcfa,
  COUNT(DISTINCT o.id) as commandes_creees,
  COUNT(DISTINCT wt.id) as wallets_credites,
  CASE 
    WHEN COUNT(DISTINCT o.id) = COUNT(DISTINCT st.id) 
     AND COUNT(DISTINCT wt.id) = COUNT(DISTINCT st.id) 
    THEN '✅ 100% OK (4/4/4)'
    ELSE CONCAT('⚠️ Incomplet (', COUNT(DISTINCT st.id), '/', COUNT(DISTINCT o.id), '/', COUNT(DISTINCT wt.id), ')')
  END as statut
FROM stripe_transactions st
INNER JOIN profiles p ON p.id = st.seller_id
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE p.email = 'comptedevideoai224gn@gmail.com'
  AND st.status = 'SUCCEEDED'
  AND st.created_at > NOW() - INTERVAL '4 hours'
GROUP BY p.full_name, p.email;
