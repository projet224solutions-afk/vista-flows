import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tlkawjrmphsnbdjwlqif.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa2F3anJtcGhzbmJkandscWlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjg5OTg5MCwiZXhwIjoyMDQ4NDc1ODkwfQ.mBzKGwHCkCzrHhL7qOvp5TmnuoZrw3XQmNzK3cMKk4o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Application migration commission agent...');
  
  const sql = `
-- Fonction améliorée: Traiter paiement réussi avec commission agent
CREATE OR REPLACE FUNCTION process_successful_payment(
  p_transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_transaction stripe_transactions;
  v_seller_wallet_id UUID;
  v_platform_wallet_id UUID;
  v_platform_user_id UUID;
BEGIN
  -- Récupérer transaction
  SELECT * INTO v_transaction
  FROM stripe_transactions
  WHERE id = p_transaction_id;
  
  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Récupérer/Créer wallet vendeur
  v_seller_wallet_id := get_or_create_wallet(v_transaction.seller_id);
  
  -- Récupérer CEO/Platform wallet
  SELECT id INTO v_platform_user_id
  FROM profiles
  WHERE role = 'CEO'
  LIMIT 1;
  
  IF v_platform_user_id IS NOT NULL THEN
    v_platform_wallet_id := get_or_create_wallet(v_platform_user_id);
  END IF;
  
  -- Mettre à jour solde vendeur (montant net)
  UPDATE wallets
  SET 
    available_balance = available_balance + v_transaction.seller_net_amount,
    total_earned = total_earned + v_transaction.seller_net_amount,
    total_transactions = total_transactions + 1,
    updated_at = NOW()
  WHERE id = v_seller_wallet_id;
  
  -- Enregistrer transaction wallet vendeur
  INSERT INTO wallet_transactions (
    wallet_id,
    type,
    amount,
    currency,
    description,
    stripe_transaction_id,
    order_id,
    balance_before,
    balance_after
  )
  SELECT
    v_seller_wallet_id,
    'PAYMENT',
    v_transaction.seller_net_amount,
    v_transaction.currency,
    'Payment received from order ' || COALESCE(v_transaction.order_id::TEXT, 'N/A'),
    v_transaction.id,
    v_transaction.order_id,
    w.available_balance - v_transaction.seller_net_amount,
    w.available_balance
  FROM wallets w
  WHERE w.id = v_seller_wallet_id;
  
  -- Mettre à jour wallet plateforme (commission)
  IF v_platform_wallet_id IS NOT NULL THEN
    UPDATE wallets
    SET 
      available_balance = available_balance + v_transaction.commission_amount,
      total_earned = total_earned + v_transaction.commission_amount,
      updated_at = NOW()
    WHERE id = v_platform_wallet_id;
    
    -- Enregistrer transaction wallet plateforme
    INSERT INTO wallet_transactions (
      wallet_id,
      type,
      amount,
      currency,
      description,
      stripe_transaction_id,
      balance_before,
      balance_after
    )
    SELECT
      v_platform_wallet_id,
      'COMMISSION',
      v_transaction.commission_amount,
      v_transaction.currency,
      'Platform commission from order ' || COALESCE(v_transaction.order_id::TEXT, 'N/A'),
      v_transaction.id,
      w.available_balance - v_transaction.commission_amount,
      w.available_balance
    FROM wallets w
    WHERE w.id = v_platform_wallet_id;
  END IF;
  
  -- ✅ NOUVEAU: Calculer et créditer commission agent
  DECLARE
    v_buyer_creator_agent_id UUID;
    v_buyer_creator_type VARCHAR(20);
    v_agent_commission_amount DECIMAL(15,2);
    v_agent_commission_rate DECIMAL(5,4);
    v_agent_wallet_id UUID;
  BEGIN
    -- 1. Identifier agent créateur du client acheteur
    SELECT creator_id, creator_type 
    INTO v_buyer_creator_agent_id, v_buyer_creator_type
    FROM agent_created_users
    WHERE user_id = v_transaction.buyer_id;
    
    IF v_buyer_creator_agent_id IS NOT NULL THEN
      -- 2. Récupérer taux commission agent depuis config
      SELECT setting_value INTO v_agent_commission_rate
      FROM commission_settings
      WHERE setting_key = 'base_user_commission';
      
      -- Par défaut 20% si non trouvé
      IF v_agent_commission_rate IS NULL THEN
        v_agent_commission_rate := 0.20;
      END IF;
      
      -- 3. Calculer commission agent (% du montant net vendeur)
      v_agent_commission_amount := v_transaction.seller_net_amount * v_agent_commission_rate;
      
      -- 4. Créer/récupérer wallet agent
      v_agent_wallet_id := get_or_create_wallet(v_buyer_creator_agent_id);
      
      -- 5. Créditer wallet agent
      UPDATE wallets
      SET 
        available_balance = available_balance + v_agent_commission_amount,
        total_earned = total_earned + v_agent_commission_amount,
        updated_at = NOW()
      WHERE id = v_agent_wallet_id;
      
      -- 6. Enregistrer commission dans agent_commissions
      INSERT INTO agent_commissions (
        commission_code,
        recipient_id,
        recipient_type,
        source_user_id,
        source_transaction_id,
        amount,
        commission_rate,
        source_type,
        calculation_details,
        status
      ) VALUES (
        'COM-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 10000000)::TEXT, 7, '0'),
        v_buyer_creator_agent_id,
        v_buyer_creator_type,
        v_transaction.buyer_id,
        v_transaction.id,
        v_agent_commission_amount,
        v_agent_commission_rate,
        'purchase',
        jsonb_build_object(
          'stripe_transaction_id', v_transaction.id,
          'product_amount', v_transaction.amount,
          'seller_net', v_transaction.seller_net_amount,
          'agent_commission_rate', v_agent_commission_rate,
          'calculation_type', 'stripe_purchase'
        ),
        'paid'
      );
      
      -- 7. Transaction wallet agent
      INSERT INTO wallet_transactions (
        wallet_id,
        type,
        amount,
        currency,
        description,
        stripe_transaction_id,
        balance_before,
        balance_after
      )
      SELECT
        v_agent_wallet_id,
        'AGENT_COMMISSION',
        v_agent_commission_amount,
        v_transaction.currency,
        'Commission agent - Achat client (ordre: ' || COALESCE(v_transaction.order_id::TEXT, 'N/A') || ')',
        v_transaction.id,
        w.available_balance - v_agent_commission_amount,
        w.available_balance
      FROM wallets w
      WHERE w.id = v_agent_wallet_id;
      
      RAISE NOTICE '✅ Commission agent créditée: % GNF pour agent %', v_agent_commission_amount, v_buyer_creator_agent_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Logger l'erreur mais ne pas bloquer le paiement principal
      RAISE WARNING '⚠️ Erreur calcul commission agent: %', SQLERRM;
  END;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Si exec_sql n'existe pas, essayer directement
      const { error: directError } = await supabase.from('_migrations').insert({
        name: '20260105020000_agent_commission_stripe_integration',
        executed_at: new Date().toISOString()
      });
      
      console.log('⚠️  Migration enregistrée manuellement (appliquer via dashboard)');
      console.log('\n📋 À faire:');
      console.log('1. Ouvrir Supabase Dashboard');
      console.log('2. SQL Editor');
      console.log('3. Copier le SQL depuis le fichier migration');
      console.log('4. Exécuter');
      
      return;
    }
    
    console.log('✅ Migration appliquée avec succès!');
    console.log('\n📊 Fonction modifiée:');
    console.log('  - process_successful_payment() inclut maintenant calcul commission agent');
    console.log('\n🎯 Tests à effectuer:');
    console.log('  1. Créer agent test');
    console.log('  2. Agent crée client utilisateur');
    console.log('  3. Client effectue achat Stripe');
    console.log('  4. Vérifier commission agent créditée dans wallet');
    console.log('  5. Vérifier entrée dans agent_commissions');
    
  } catch (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
}

applyMigration();
