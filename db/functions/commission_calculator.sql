-- 💰 FONCTIONS CALCUL AUTOMATIQUE COMMISSIONS - 224SOLUTIONS
-- Calcul automatique des commissions et frais selon les règles métier

-- ========================================
-- 1. FONCTION CALCUL COMMISSION TRANSFERT (1.5%)
-- ========================================
CREATE OR REPLACE FUNCTION calculate_transfer_commission(
    p_amount DECIMAL(15,2)
)
RETURNS TABLE(
    commission_amount DECIMAL(15,2),
    commission_rate DECIMAL(5,4),
    total_amount DECIMAL(15,2)
) AS $$
DECLARE
    v_commission_rate DECIMAL(5,4) := 0.0150; -- 1.5%
    v_commission_amount DECIMAL(15,2);
    v_total_amount DECIMAL(15,2);
BEGIN
    -- Calculer la commission
    v_commission_amount := p_amount * v_commission_rate;
    v_total_amount := p_amount + v_commission_amount;
    
    RETURN QUERY SELECT 
        v_commission_amount,
        v_commission_rate,
        v_total_amount;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. FONCTION CALCUL FRAIS RETRAIT (1000 GNF + commission API)
-- ========================================
CREATE OR REPLACE FUNCTION calculate_withdrawal_fees(
    p_amount DECIMAL(15,2),
    p_payment_method VARCHAR(50) DEFAULT 'paypal'
)
RETURNS TABLE(
    fixed_fee DECIMAL(15,2),
    api_commission DECIMAL(15,2),
    total_fees DECIMAL(15,2),
    net_amount DECIMAL(15,2)
) AS $$
DECLARE
    v_fixed_fee DECIMAL(15,2) := 1000.00; -- Frais fixes 1000 GNF
    v_api_commission DECIMAL(15,2);
    v_api_rate DECIMAL(5,4);
    v_total_fees DECIMAL(15,2);
    v_net_amount DECIMAL(15,2);
BEGIN
    -- Définir les taux de commission selon la méthode de paiement
    CASE p_payment_method
        WHEN 'paypal' THEN v_api_rate := 0.0349; -- 3.49% PayPal
        WHEN 'stripe' THEN v_api_rate := 0.0290; -- 2.9% Stripe
        WHEN 'mobile_money' THEN v_api_rate := 0.0200; -- 2% Mobile Money
        WHEN 'bank_card' THEN v_api_rate := 0.0250; -- 2.5% Carte bancaire
        ELSE v_api_rate := 0.0300; -- 3% par défaut
    END CASE;
    
    -- Calculer les frais
    v_api_commission := p_amount * v_api_rate;
    v_total_fees := v_fixed_fee + v_api_commission;
    v_net_amount := p_amount - v_total_fees;
    
    -- Vérifier que le montant net est positif
    IF v_net_amount <= 0 THEN
        RAISE EXCEPTION 'Montant insuffisant pour couvrir les frais de retrait';
    END IF;
    
    RETURN QUERY SELECT 
        v_fixed_fee,
        v_api_commission,
        v_total_fees,
        v_net_amount;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. FONCTION CRÉATION TRANSACTION AVEC COMMISSION
-- ========================================
CREATE OR REPLACE FUNCTION create_transaction_with_commission(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount DECIMAL(15,2),
    p_transaction_type VARCHAR(50),
    p_payment_method VARCHAR(50) DEFAULT 'wallet_transfer',
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_transaction_code VARCHAR(50);
    v_sender_wallet_id UUID;
    v_receiver_wallet_id UUID;
    v_sender_info RECORD;
    v_receiver_info RECORD;
    v_commission_amount DECIMAL(15,2) := 0.00;
    v_fees DECIMAL(15,2) := 0.00;
    v_total_amount DECIMAL(15,2);
    v_commission_rate DECIMAL(5,4) := 0.0000;
BEGIN
    -- Générer un code de transaction unique
    v_transaction_code := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- Récupérer les informations de l'expéditeur
    SELECT u.id, u.first_name, u.last_name, u.email, u.phone, w.id as wallet_id
    INTO v_sender_info
    FROM users u
    LEFT JOIN wallets w ON w.user_id = u.id
    WHERE u.id = p_sender_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expéditeur non trouvé';
    END IF;
    
    v_sender_wallet_id := v_sender_info.wallet_id;
    
    -- Récupérer les informations du destinataire (si applicable)
    IF p_receiver_id IS NOT NULL THEN
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, w.id as wallet_id
        INTO v_receiver_info
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id
        WHERE u.id = p_receiver_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Destinataire non trouvé';
        END IF;
        
        v_receiver_wallet_id := v_receiver_info.wallet_id;
    END IF;
    
    -- Calculer les commissions selon le type de transaction
    IF p_transaction_type = 'transfer' THEN
        -- Commission de transfert 1.5%
        SELECT commission_amount, commission_rate, total_amount
        INTO v_commission_amount, v_commission_rate, v_total_amount
        FROM calculate_transfer_commission(p_amount);
        
    ELSIF p_transaction_type = 'withdrawal' THEN
        -- Frais de retrait
        SELECT total_fees, net_amount
        INTO v_fees, v_total_amount
        FROM calculate_withdrawal_fees(p_amount, p_payment_method);
        v_total_amount := p_amount; -- Le montant total reste le même, les frais sont déduits
        
    ELSE
        v_total_amount := p_amount;
    END IF;
    
    -- Vérifier le solde de l'expéditeur
    IF p_transaction_type IN ('transfer', 'withdrawal') THEN
        IF (SELECT balance FROM wallets WHERE id = v_sender_wallet_id) < v_total_amount THEN
            RAISE EXCEPTION 'Solde insuffisant';
        END IF;
    END IF;
    
    -- Créer la transaction
    INSERT INTO transactions (
        transaction_code,
        sender_id,
        receiver_id,
        sender_wallet_id,
        receiver_wallet_id,
        sender_name,
        sender_email,
        sender_phone,
        receiver_name,
        receiver_email,
        receiver_phone,
        amount,
        commission,
        fees,
        total_amount,
        transaction_type,
        payment_method,
        status,
        description
    ) VALUES (
        v_transaction_code,
        p_sender_id,
        p_receiver_id,
        v_sender_wallet_id,
        v_receiver_wallet_id,
        v_sender_info.first_name || ' ' || v_sender_info.last_name,
        v_sender_info.email,
        v_sender_info.phone,
        CASE WHEN v_receiver_info IS NOT NULL THEN v_receiver_info.first_name || ' ' || v_receiver_info.last_name ELSE NULL END,
        CASE WHEN v_receiver_info IS NOT NULL THEN v_receiver_info.email ELSE NULL END,
        CASE WHEN v_receiver_info IS NOT NULL THEN v_receiver_info.phone ELSE NULL END,
        p_amount,
        v_commission_amount,
        v_fees,
        v_total_amount,
        p_transaction_type,
        p_payment_method,
        'pending',
        p_description
    ) RETURNING id INTO v_transaction_id;
    
    -- Créer l'enregistrement de commission si applicable
    IF v_commission_amount > 0 OR v_fees > 0 THEN
        INSERT INTO commissions (
            transaction_id,
            commission_type,
            base_amount,
            commission_rate,
            commission_amount,
            fixed_fee
        ) VALUES (
            v_transaction_id,
            p_transaction_type,
            p_amount,
            v_commission_rate,
            v_commission_amount,
            v_fees
        );
    END IF;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. FONCTION MISE À JOUR SOLDES WALLETS
-- ========================================
CREATE OR REPLACE FUNCTION update_wallet_balances(
    p_transaction_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_transaction RECORD;
    v_sender_balance DECIMAL(15,2);
    v_receiver_balance DECIMAL(15,2);
BEGIN
    -- Récupérer les détails de la transaction
    SELECT * INTO v_transaction
    FROM transactions
    WHERE id = p_transaction_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction non trouvée ou déjà traitée';
    END IF;
    
    -- Traitement selon le type de transaction
    CASE v_transaction.transaction_type
        WHEN 'transfer' THEN
            -- Débiter l'expéditeur
            UPDATE wallets 
            SET balance = balance - v_transaction.total_amount,
                total_sent = total_sent + v_transaction.amount,
                updated_at = NOW()
            WHERE id = v_transaction.sender_wallet_id;
            
            -- Créditer le destinataire
            UPDATE wallets 
            SET balance = balance + v_transaction.amount,
                total_received = total_received + v_transaction.amount,
                updated_at = NOW()
            WHERE id = v_transaction.receiver_wallet_id;
            
        WHEN 'withdrawal' THEN
            -- Débiter l'expéditeur du montant total (montant + frais)
            UPDATE wallets 
            SET balance = balance - (v_transaction.amount + v_transaction.fees),
                total_withdrawn = total_withdrawn + v_transaction.amount,
                updated_at = NOW()
            WHERE id = v_transaction.sender_wallet_id;
            
        WHEN 'deposit' THEN
            -- Créditer le destinataire
            UPDATE wallets 
            SET balance = balance + v_transaction.amount,
                total_received = total_received + v_transaction.amount,
                updated_at = NOW()
            WHERE id = v_transaction.receiver_wallet_id;
    END CASE;
    
    -- Mettre à jour le statut de la transaction
    UPDATE transactions 
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_transaction_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. FONCTION GÉNÉRATION LIEN BUREAU SYNDICAT
-- ========================================
CREATE OR REPLACE FUNCTION generate_syndicate_bureau_link(
    p_bureau_id UUID
)
RETURNS TABLE(
    permanent_link TEXT,
    access_token VARCHAR(255),
    bureau_code VARCHAR(50)
) AS $$
DECLARE
    v_access_token VARCHAR(255);
    v_permanent_link TEXT;
    v_bureau_code VARCHAR(50);
    v_base_url TEXT := 'https://224solutions.com'; -- À configurer
BEGIN
    -- Récupérer le code du bureau
    SELECT bureau_code INTO v_bureau_code
    FROM syndicate_bureaus
    WHERE id = p_bureau_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bureau syndical non trouvé';
    END IF;
    
    -- Générer un token d'accès sécurisé
    v_access_token := 'SYN_' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 20));
    
    -- Générer le lien permanent
    v_permanent_link := v_base_url || '/syndicat/president/' || v_access_token;
    
    -- Mettre à jour le bureau avec le lien et le token
    UPDATE syndicate_bureaus 
    SET permanent_link = v_permanent_link,
        access_token = v_access_token,
        updated_at = NOW()
    WHERE id = p_bureau_id;
    
    RETURN QUERY SELECT 
        v_permanent_link,
        v_access_token,
        v_bureau_code;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. FONCTION CRÉATION WALLET AUTOMATIQUE
-- ========================================
CREATE OR REPLACE FUNCTION create_user_wallet(
    p_user_id UUID,
    p_initial_balance DECIMAL(15,2) DEFAULT 1000.00
)
RETURNS UUID AS $$
DECLARE
    v_wallet_id UUID;
    v_wallet_address VARCHAR(255);
BEGIN
    -- Générer une adresse de wallet unique
    v_wallet_address := '224W_' || UPPER(SUBSTRING(MD5(p_user_id::TEXT || NOW()::TEXT) FROM 1 FOR 16));
    
    -- Créer le wallet
    INSERT INTO wallets (
        user_id,
        wallet_address,
        balance,
        currency,
        is_active
    ) VALUES (
        p_user_id,
        v_wallet_address,
        p_initial_balance,
        'GNF',
        true
    ) RETURNING id INTO v_wallet_id;
    
    -- Mettre à jour l'utilisateur avec l'ID du wallet
    UPDATE users 
    SET wallet_id = v_wallet_id,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Créer une transaction de bonus de bienvenue si montant initial > 0
    IF p_initial_balance > 0 THEN
        INSERT INTO transactions (
            transaction_code,
            receiver_id,
            receiver_wallet_id,
            receiver_name,
            receiver_email,
            amount,
            total_amount,
            transaction_type,
            status,
            description,
            completed_at
        ) SELECT 
            'WELCOME_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
            u.id,
            v_wallet_id,
            u.first_name || ' ' || u.last_name,
            u.email,
            p_initial_balance,
            p_initial_balance,
            'deposit',
            'completed',
            'Bonus de bienvenue 224Solutions',
            NOW()
        FROM users u WHERE u.id = p_user_id;
    END IF;
    
    RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMMENTAIRES POUR DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION calculate_transfer_commission IS 'Calcule la commission de 1.5% sur les transferts';
COMMENT ON FUNCTION calculate_withdrawal_fees IS 'Calcule les frais de retrait (1000 GNF + commission API)';
COMMENT ON FUNCTION create_transaction_with_commission IS 'Crée une transaction avec calcul automatique des commissions';
COMMENT ON FUNCTION update_wallet_balances IS 'Met à jour les soldes des wallets après une transaction';
COMMENT ON FUNCTION generate_syndicate_bureau_link IS 'Génère un lien sécurisé pour l\'accès au bureau syndical';
COMMENT ON FUNCTION create_user_wallet IS 'Crée automatiquement un wallet pour un nouvel utilisateur';
