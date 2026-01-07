-- ============================================================================
-- ⚠️ RÉINITIALISATION COMPLÈTE DU SYSTÈME DE PAIEMENT ⚠️
-- ATTENTION: Cette opération supprime TOUTES les données de paiement
-- ============================================================================

-- ÉTAPE 1: Supprimer toutes les transactions Stripe
DELETE FROM stripe_transactions;

-- ÉTAPE 2: Supprimer toutes les transactions wallet
DELETE FROM wallet_transactions;

-- ÉTAPE 3: Réinitialiser TOUS les wallets à 0 GNF
UPDATE wallets
SET 
  balance = 0,
  total_received = 0,
  total_sent = 0,
  last_transaction_at = NULL,
  updated_at = NOW();

-- ÉTAPE 4: Supprimer tous les escrows AVANT les commandes (dépendance)
DELETE FROM escrow_transactions;

-- ÉTAPE 5: Supprimer toutes les commandes
DELETE FROM product_reviews WHERE order_id IS NOT NULL;
DELETE FROM inventory_history WHERE order_id IS NOT NULL;
DELETE FROM order_items;
DELETE FROM orders;

-- ÉTAPE 6: Supprimer les paiements Djomy (Orange Money)
DELETE FROM djomy_transactions;

-- ÉTAPE 7: Vérification finale
SELECT 
  '✅ Réinitialisation terminée' as statut,
  (SELECT COUNT(*) FROM stripe_transactions) as stripe_count,
  (SELECT COUNT(*) FROM wallet_transactions) as wallet_transactions_count,
  (SELECT COUNT(*) FROM orders) as orders_count,
  (SELECT COUNT(*) FROM escrow_transactions) as escrow_count,
  (SELECT SUM(balance) FROM wallets) as total_balance_wallets,
  (SELECT COUNT(*) FROM wallets WHERE balance > 0) as wallets_with_balance;

-- ÉTAPE 8: Afficher tous les wallets (doivent tous être à 0)
SELECT 
  w.id,
  p.full_name,
  p.email,
  w.balance,
  w.currency,
  w.total_received,
  w.total_sent
FROM wallets w
JOIN profiles p ON p.id = w.user_id
ORDER BY p.full_name;

-- ============================================================================
-- ✅ RÉINITIALISATION COMPLÈTE TERMINÉE
-- Tous les historiques de paiement ont été supprimés
-- Tous les wallets sont à 0 GNF
-- ============================================================================
