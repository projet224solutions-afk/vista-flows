-- Test automatique: Flux commission agent (end-to-end)
-- Exécuter avec: psql -f supabase/tests/test_agent_commission.sql
\set ON_ERROR_STOP on

-- Variables test
\set agent_id '00000000-0000-0000-0000-000000000001'
\set client_id '00000000-0000-0000-0000-000000000002'
\set seller_id '00000000-0000-0000-0000-000000000003'
\set tx_id '00000000-0000-0000-0000-000000000100'
\set expected_commission 10000
\set expected_rate '0.20'

BEGIN;

-- 1. Préparer environnement: profils & lien agent->client
INSERT INTO profiles (id, email, full_name, role, phone) VALUES
(:agent_id, 'agent-test@224solutions.com', 'Agent Test Commission', 'AGENT', '+224600000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, role, phone) VALUES
(:client_id, 'client-test@224solutions.com', 'Client Test Achat', 'CLIENT', '+224600000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agent_created_users (user_id, creator_id, creator_type, user_code, name) VALUES
(:client_id, :agent_id, 'agent', 'USR-TEST-001', 'Client Test Achat')
ON CONFLICT (user_id) DO NOTHING;

-- Ensure commission setting
INSERT INTO commission_settings (setting_key, setting_value)
VALUES ('base_user_commission', 0.200000)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 2. Créer transaction simulée
INSERT INTO stripe_transactions (
  id, buyer_id, seller_id, amount, commission_amount, seller_net_amount, currency, status, created_at
) VALUES (
  :tx_id,
  :client_id,
  :seller_id,
  50000,
  5000,
  50000,
  'GNF',
  'succeeded',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Appeler la fonction de traitement
SELECT process_successful_payment(:tx_id) AS processed;

-- 4A. Vérifier entrée agent_commissions
DO $$
DECLARE
  v_amount NUMERIC;
  v_rate NUMERIC;
  v_status TEXT;
BEGIN
  SELECT amount, commission_rate, status INTO v_amount, v_rate, v_status
  FROM agent_commissions
  WHERE recipient_id = :'agent_id'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'TEST FAILED: Aucune commission créée pour agent %', :'agent_id';
  END IF;

  IF v_amount <> :'expected_commission'::NUMERIC THEN
    RAISE EXCEPTION 'TEST FAILED: montant attendu % mais trouvé %', :'expected_commission', v_amount;
  END IF;

  IF v_rate::TEXT <> :'expected_rate' THEN
    RAISE EXCEPTION 'TEST FAILED: taux attendu % mais trouvé %', :'expected_rate', v_rate::TEXT;
  END IF;

  IF v_status <> 'paid' THEN
    RAISE EXCEPTION 'TEST FAILED: status attendu ''paid'' mais trouvé %', v_status;
  END IF;
END$$;

-- 4B. Vérifier transaction wallet AGENT_COMMISSION
DO $$
DECLARE
  v_count INT;
  v_amount NUMERIC;
BEGIN
  SELECT COUNT(*), SUM(amount) INTO v_count, v_amount
  FROM wallet_transactions wt
  JOIN wallets w ON w.id = wt.wallet_id
  WHERE w.user_id = :'agent_id' AND wt.type = 'AGENT_COMMISSION';

  IF v_count < 1 THEN
    RAISE EXCEPTION 'TEST FAILED: Pas de wallet_transactions type AGENT_COMMISSION pour agent %', :'agent_id';
  END IF;

  IF v_amount <> :'expected_commission'::NUMERIC THEN
    RAISE EXCEPTION 'TEST FAILED: somme AGENT_COMMISSION attendue % mais trouvée %', :'expected_commission', v_amount;
  END IF;
END$$;

COMMIT;

\echo 'TEST PASSED: Commission agent créée et wallet crédité avec succès.'

-- NOTE: le test laisse les données créées pour inspection manuelle. Pour cleanup, décommenter ci-dessous.
-- BEGIN;
-- DELETE FROM agent_commissions WHERE recipient_id = :'agent_id';
-- DELETE FROM wallet_transactions wt USING wallets w WHERE w.user_id = :'agent_id' AND wt.wallet_id = w.id AND wt.type = 'AGENT_COMMISSION';
-- DELETE FROM stripe_transactions WHERE id = :'tx_id';
-- DELETE FROM agent_created_users WHERE user_id = :'client_id';
-- DELETE FROM profiles WHERE id IN (:'agent_id', :'client_id');
-- COMMIT;
