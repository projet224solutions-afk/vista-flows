-- ============================================================================
-- CORRECTION MANUELLE: Marquer les paiements PENDING comme SUCCEEDED
-- ============================================================================
-- Ce script corrige les paiements où Stripe a débité la carte mais 
-- le webhook n'a pas mis à jour le statut

-- 1. Vérifier d'abord dans Stripe Dashboard que ces paiements sont réellement succeeded
-- Allez sur: https://dashboard.stripe.com/test/payments

-- 2. Si les paiements sont succeeded dans Stripe, exécutez cette mise à jour :

UPDATE stripe_transactions
SET 
  status = 'SUCCEEDED',
  paid_at = NOW()
WHERE status = 'PENDING'
  AND stripe_payment_intent_id IN (
    'pi_3Sm5VBRxqizQJVjL1ENQx2Wf',
    'pi_3Sm5Y9RxqizQJVjL0jhkSPW2',
    'pi_3Sm5Y9RxqizQJVjL1MB8VUHF',
    'pi_3Sm5hIRxqizQJVjL05TY5uHg',
    'pi_3Sm5hJRxqizQJVjL0AUEpYBJ',
    'pi_3Sm5mdRxqizQJVjL1L1M7FL6',
    'pi_3Sm5mdRxqizQJVjL1BJOYQ0l',
    'pi_3Sm77jRxqizQJVjL1XYomQzw',
    'pi_3Sm77jRxqizQJVjL0CHwTTat',
    'pi_3Sm5VARxqizQJVjL1FQbP3m8'
  )
RETURNING 
  id,
  stripe_payment_intent_id,
  amount,
  status,
  paid_at;

-- 3. Créer les commandes pour ces paiements
SELECT fix_orphan_payment();

-- 4. Vérifier que tout est corrigé
SELECT 
  st.stripe_payment_intent_id,
  st.status as transaction_status,
  st.paid_at,
  o.order_number,
  o.status as order_status,
  wt.amount as wallet_credited,
  CASE 
    WHEN o.id IS NOT NULL AND wt.id IS NOT NULL THEN '✅ COMPLET'
    WHEN o.id IS NOT NULL THEN '⚠️ Commande créée, wallet manquant'
    WHEN wt.id IS NOT NULL THEN '⚠️ Wallet crédité, commande manquante'
    ELSE '❌ Rien créé'
  END as status
FROM stripe_transactions st
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
LEFT JOIN wallet_transactions wt ON wt.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE st.stripe_payment_intent_id IN (
  'pi_3Sm5VBRxqizQJVjL1ENQx2Wf',
  'pi_3Sm5Y9RxqizQJVjL0jhkSPW2',
  'pi_3Sm5Y9RxqizQJVjL1MB8VUHF',
  'pi_3Sm5hIRxqizQJVjL05TY5uHg',
  'pi_3Sm5hJRxqizQJVjL0AUEpYBJ',
  'pi_3Sm5mdRxqizQJVjL1L1M7FL6',
  'pi_3Sm5mdRxqizQJVjL1BJOYQ0l',
  'pi_3Sm77jRxqizQJVjL1XYomQzw',
  'pi_3Sm77jRxqizQJVjL0CHwTTat',
  'pi_3Sm5VARxqizQJVjL1FQbP3m8'
)
ORDER BY st.paid_at;
