-- TEST DIAGNOSTIC: Vérifier calcul commission

-- 1. Voir structure table stripe_transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stripe_transactions'
ORDER BY ordinal_position;

-- 2. Voir dernières transactions
SELECT 
  id,
  amount,
  commission_amount,
  seller_net_amount,
  status,
  created_at
FROM stripe_transactions
ORDER BY created_at DESC
LIMIT 5;

-- 3. Test: Si client achète produit 50,000 GNF
-- Commission 10% = 5,000 GNF
-- Client doit payer: 55,000 GNF
-- Vendeur doit recevoir: 50,000 GNF
-- Plateforme doit recevoir: 5,000 GNF

-- Vérifier les valeurs actuelles
SELECT 
  'Test calcul' as scenario,
  50000 as montant_produit,
  ROUND(50000 * 0.10) as commission_10pct,
  50000 + ROUND(50000 * 0.10) as total_client_doit_payer,
  50000 as vendeur_doit_recevoir,
  ROUND(50000 * 0.10) as plateforme_doit_recevoir;

-- 4. Vérifier si problème dans les données existantes
SELECT 
  COUNT(*) as total_transactions,
  SUM(CASE WHEN seller_net_amount < amount THEN 1 ELSE 0 END) as transactions_probleme,
  ROUND(AVG(commission_rate), 2) as commission_rate_moyenne
FROM stripe_transactions
WHERE status IN ('SUCCEEDED', 'PENDING');
