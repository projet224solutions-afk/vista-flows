-- Script de diagnostic pour l'agent AGT0001
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si l'agent existe
SELECT 
  id,
  agent_code,
  user_id,
  status,
  created_at
FROM agents_management 
WHERE agent_code = 'AGT0001';

-- 2. Vérifier si le wallet existe
SELECT 
  aw.id as wallet_id,
  aw.agent_id,
  am.agent_code,
  aw.balance,
  aw.currency,
  aw.wallet_status,
  aw.created_at
FROM agent_wallets aw
LEFT JOIN agents_management am ON am.id = aw.agent_id
WHERE am.agent_code = 'AGT0001';

-- 3. Si le wallet n'existe pas, le créer manuellement
-- Décommentez et exécutez si nécessaire:
/*
INSERT INTO agent_wallets (agent_id, balance, currency, wallet_status)
SELECT id, 10000, 'GNF', 'active'
FROM agents_management
WHERE agent_code = 'AGT0001'
AND NOT EXISTS (
  SELECT 1 FROM agent_wallets 
  WHERE agent_id = agents_management.id
);
*/

-- 4. Vérifier les transactions récentes
SELECT 
  at.*,
  am.agent_code
FROM agent_transactions at
LEFT JOIN agent_wallets aw ON aw.id = at.agent_wallet_id
LEFT JOIN agents_management am ON am.id = aw.agent_id
WHERE am.agent_code = 'AGT0001'
ORDER BY at.created_at DESC
LIMIT 10;
