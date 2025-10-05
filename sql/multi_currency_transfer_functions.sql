-- =====================================================
-- FONCTIONS SQL POUR TRANSFERTS MULTI-DEVISES
-- =====================================================
-- Date: 2 janvier 2025
-- Description: Fonctions SQL pour gérer les transferts entre wallets multi-devises
-- Compatible avec le système existant 224SOLUTIONS

-- =====================================================
-- 1. FONCTION PRINCIPALE DE TRANSFERT MULTI-DEVISES
-- =====================================================

CREATE OR REPLACE FUNCTION perform_multi_currency_transfer(
    p_sender_id UUID,
    p_receiver_email VARCHAR(255),
    p_amount DECIMAL(15, 2),
    p_currency_sent VARCHAR(3),
    p_currency_received VARCHAR(3) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_reference VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_receiver_id UUID;
    v_sender_wallet_id UUID;
    v_receiver_wallet_id UUID;
    v_exchange_rate DECIMAL(20, 8);
    v_amount_received DECIMAL(15, 2);
    v_fee_amount DECIMAL(15, 2);
    v_fee_percentage DECIMAL(5, 4);
    v_fee_fixed DECIMAL(15, 2);
    v_transaction_id VARCHAR(50);
    v_sender_balance DECIMAL(15, 2);
    v_sender_role VARCHAR(50);
    v_daily_limit DECIMAL(15, 2);
    v_daily_used DECIMAL(15, 2);
    v_result JSONB;
BEGIN
    -- Validation des paramètres
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Montant invalide',
            'error_code', 'INVALID_AMOUNT'
        );
    END IF;
    
    -- Déterminer la devise de réception (même que l'envoi si non spécifiée)
    IF p_currency_received IS NULL THEN
        p_currency_received := p_currency_sent;
    END IF;
    
    -- Vérifier que l'expéditeur existe et récupérer son rôle
    SELECT p.role INTO v_sender_role
    FROM profiles p
    WHERE p.id = p_sender_id;
    
    IF v_sender_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Expéditeur non trouvé',
            'error_code', 'SENDER_NOT_FOUND'
        );
    END IF;
    
    -- Vérifier que le destinataire existe
    SELECT p.id INTO v_receiver_id
    FROM profiles p
    WHERE p.email = p_receiver_email;
    
    IF v_receiver_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Destinataire non trouvé',
            'error_code', 'RECEIVER_NOT_FOUND'
        );
    END IF;
    
    -- Vérifier qu'on ne s'envoie pas à soi-même
    IF p_sender_id = v_receiver_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Impossible de s''envoyer de l''argent à soi-même',
            'error_code', 'SELF_TRANSFER'
        );
    END IF;
    
    -- Récupérer le wallet de l'expéditeur
    SELECT w.id, w.balance INTO v_sender_wallet_id, v_sender_balance
    FROM wallets w
    WHERE w.user_id = p_sender_id AND w.currency = p_currency_sent;
    
    IF v_sender_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet expéditeur non trouvé',
            'error_code', 'SENDER_WALLET_NOT_FOUND'
        );
    END IF;
    
    -- Vérifier le solde
    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solde insuffisant',
            'error_code', 'INSUFFICIENT_BALANCE'
        );
    END IF;
    
    -- Calculer le taux de change
    v_exchange_rate := get_exchange_rate(p_currency_sent, p_currency_received);
    
    -- Calculer le montant reçu
    v_amount_received := p_amount * v_exchange_rate;
    
    -- Calculer les frais
    SELECT 
        COALESCE(tf.fee_fixed, 0),
        COALESCE(tf.fee_percentage, 0)
    INTO v_fee_fixed, v_fee_percentage
    FROM transfer_fees tf
    WHERE tf.user_role = v_sender_role
    AND tf.currency = p_currency_sent
    AND tf.is_active = true
    AND p_amount BETWEEN tf.amount_min AND tf.amount_max
    ORDER BY tf.amount_min DESC
    LIMIT 1;
    
    v_fee_amount := v_fee_fixed + (p_amount * v_fee_percentage);
    
    -- Vérifier les limites quotidiennes
    SELECT w.daily_transfer_limit INTO v_daily_limit
    FROM wallets w
    WHERE w.id = v_sender_wallet_id;
    
    SELECT COALESCE(SUM(mct.amount_sent), 0) INTO v_daily_used
    FROM multi_currency_transfers mct
    WHERE mct.sender_id = p_sender_id
    AND mct.currency_sent = p_currency_sent
    AND DATE(mct.created_at) = CURRENT_DATE
    AND mct.status = 'completed';
    
    IF (v_daily_used + p_amount + v_fee_amount) > v_daily_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Limite quotidienne dépassée',
            'error_code', 'DAILY_LIMIT_EXCEEDED'
        );
    END IF;
    
    -- Générer l'ID de transaction
    v_transaction_id := generate_transaction_id();
    
    -- Créer la transaction
    INSERT INTO multi_currency_transfers (
        transaction_id,
        sender_id,
        receiver_id,
        sender_wallet_id,
        amount_sent,
        currency_sent,
        amount_received,
        currency_received,
        exchange_rate,
        fee_amount,
        fee_currency,
        fee_percentage,
        fee_fixed,
        description,
        reference,
        status
    ) VALUES (
        v_transaction_id,
        p_sender_id,
        v_receiver_id,
        v_sender_wallet_id,
        p_amount,
        p_currency_sent,
        v_amount_received,
        p_currency_received,
        v_exchange_rate,
        v_fee_amount,
        p_currency_sent,
        v_fee_percentage,
        v_fee_fixed,
        p_description,
        p_reference,
        'processing'
    );
    
    -- Débiter l'expéditeur
    UPDATE wallets 
    SET balance = balance - p_amount - v_fee_amount,
        updated_at = NOW()
    WHERE id = v_sender_wallet_id;
    
    -- Créer ou mettre à jour le wallet du destinataire
    INSERT INTO wallets (user_id, balance, currency, status)
    VALUES (v_receiver_id, v_amount_received, p_currency_received, 'active')
    ON CONFLICT (user_id, currency) 
    DO UPDATE SET 
        balance = wallets.balance + v_amount_received,
        updated_at = NOW();
    
    -- Récupérer l'ID du wallet du destinataire
    SELECT w.id INTO v_receiver_wallet_id
    FROM wallets w
    WHERE w.user_id = v_receiver_id AND w.currency = p_currency_received;
    
    -- Mettre à jour la transaction avec l'ID du wallet destinataire
    UPDATE multi_currency_transfers 
    SET receiver_wallet_id = v_receiver_wallet_id,
        status = 'completed',
        processed_at = NOW(),
        completed_at = NOW()
    WHERE transaction_id = v_transaction_id;
    
    -- Mettre à jour les limites quotidiennes
    INSERT INTO daily_transfer_limits (user_id, amount_sent, currency, transaction_count)
    VALUES (p_sender_id, p_amount + v_fee_amount, p_currency_sent, 1)
    ON CONFLICT (user_id, date, currency)
    DO UPDATE SET 
        amount_sent = daily_transfer_limits.amount_sent + p_amount + v_fee_amount,
        transaction_count = daily_transfer_limits.transaction_count + 1,
        updated_at = NOW();
    
    -- Retourner le résultat
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'amount_sent', p_amount,
        'currency_sent', p_currency_sent,
        'amount_received', v_amount_received,
        'currency_received', p_currency_received,
        'exchange_rate', v_exchange_rate,
        'fee_amount', v_fee_amount,
        'fee_percentage', v_fee_percentage,
        'fee_fixed', v_fee_fixed,
        'new_balance', v_sender_balance - p_amount - v_fee_amount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, marquer la transaction comme échouée
        UPDATE multi_currency_transfers 
        SET status = 'failed',
            failure_reason = SQLERRM,
            processed_at = NOW()
        WHERE transaction_id = v_transaction_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erreur lors du transfert: ' || SQLERRM,
            'error_code', 'TRANSFER_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. FONCTION DE TRANSFERT PAR ID UTILISATEUR
-- =====================================================

CREATE OR REPLACE FUNCTION perform_multi_currency_transfer_by_user_id(
    p_sender_id UUID,
    p_receiver_user_id UUID,
    p_amount DECIMAL(15, 2),
    p_currency_sent VARCHAR(3),
    p_currency_received VARCHAR(3) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_reference VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_receiver_email VARCHAR(255);
    v_sender_wallet_id UUID;
    v_receiver_wallet_id UUID;
    v_exchange_rate DECIMAL(20, 8);
    v_amount_received DECIMAL(15, 2);
    v_fee_amount DECIMAL(15, 2);
    v_fee_percentage DECIMAL(5, 4);
    v_fee_fixed DECIMAL(15, 2);
    v_transaction_id VARCHAR(50);
    v_sender_balance DECIMAL(15, 2);
    v_sender_role VARCHAR(50);
    v_daily_limit DECIMAL(15, 2);
    v_daily_used DECIMAL(15, 2);
    v_result JSONB;
BEGIN
    -- Validation des paramètres
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Montant invalide',
            'error_code', 'INVALID_AMOUNT'
        );
    END IF;
    
    -- Déterminer la devise de réception (même que l'envoi si non spécifiée)
    IF p_currency_received IS NULL THEN
        p_currency_received := p_currency_sent;
    END IF;
    
    -- Vérifier que l'expéditeur existe et récupérer son rôle
    SELECT p.role INTO v_sender_role
    FROM profiles p
    WHERE p.id = p_sender_id;
    
    IF v_sender_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Expéditeur non trouvé',
            'error_code', 'SENDER_NOT_FOUND'
        );
    END IF;
    
    -- Vérifier que le destinataire existe et récupérer son email
    SELECT p.email INTO v_receiver_email
    FROM profiles p
    WHERE p.id = p_receiver_user_id;
    
    IF v_receiver_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Destinataire non trouvé',
            'error_code', 'RECEIVER_NOT_FOUND'
        );
    END IF;
    
    -- Vérifier qu'on ne s'envoie pas à soi-même
    IF p_sender_id = p_receiver_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Impossible de s''envoyer de l''argent à soi-même',
            'error_code', 'SELF_TRANSFER'
        );
    END IF;
    
    -- Récupérer le wallet de l'expéditeur
    SELECT w.id, w.balance INTO v_sender_wallet_id, v_sender_balance
    FROM wallets w
    WHERE w.user_id = p_sender_id AND w.currency = p_currency_sent;
    
    IF v_sender_wallet_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Wallet expéditeur non trouvé',
            'error_code', 'SENDER_WALLET_NOT_FOUND'
        );
    END IF;
    
    -- Vérifier le solde
    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Solde insuffisant',
            'error_code', 'INSUFFICIENT_BALANCE'
        );
    END IF;
    
    -- Calculer le taux de change
    v_exchange_rate := get_exchange_rate(p_currency_sent, p_currency_received);
    
    -- Calculer le montant reçu
    v_amount_received := p_amount * v_exchange_rate;
    
    -- Calculer les frais
    SELECT 
        COALESCE(tf.fee_fixed, 0),
        COALESCE(tf.fee_percentage, 0)
    INTO v_fee_fixed, v_fee_percentage
    FROM transfer_fees tf
    WHERE tf.user_role = v_sender_role
    AND tf.currency = p_currency_sent
    AND tf.is_active = true
    AND p_amount BETWEEN tf.amount_min AND tf.amount_max
    ORDER BY tf.amount_min DESC
    LIMIT 1;
    
    v_fee_amount := v_fee_fixed + (p_amount * v_fee_percentage);
    
    -- Vérifier les limites quotidiennes
    SELECT w.daily_transfer_limit INTO v_daily_limit
    FROM wallets w
    WHERE w.id = v_sender_wallet_id;
    
    SELECT COALESCE(SUM(mct.amount_sent), 0) INTO v_daily_used
    FROM multi_currency_transfers mct
    WHERE mct.sender_id = p_sender_id
    AND mct.currency_sent = p_currency_sent
    AND DATE(mct.created_at) = CURRENT_DATE
    AND mct.status = 'completed';
    
    IF (v_daily_used + p_amount + v_fee_amount) > v_daily_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Limite quotidienne dépassée',
            'error_code', 'DAILY_LIMIT_EXCEEDED'
        );
    END IF;
    
    -- Générer l'ID de transaction
    v_transaction_id := generate_transaction_id();
    
    -- Créer la transaction
    INSERT INTO multi_currency_transfers (
        transaction_id,
        sender_id,
        receiver_id,
        sender_wallet_id,
        amount_sent,
        currency_sent,
        amount_received,
        currency_received,
        exchange_rate,
        fee_amount,
        fee_currency,
        fee_percentage,
        fee_fixed,
        description,
        reference,
        status
    ) VALUES (
        v_transaction_id,
        p_sender_id,
        p_receiver_user_id,
        v_sender_wallet_id,
        p_amount,
        p_currency_sent,
        v_amount_received,
        p_currency_received,
        v_exchange_rate,
        v_fee_amount,
        p_currency_sent,
        v_fee_percentage,
        v_fee_fixed,
        p_description,
        p_reference,
        'processing'
    );
    
    -- Débiter l'expéditeur
    UPDATE wallets 
    SET balance = balance - p_amount - v_fee_amount,
        updated_at = NOW()
    WHERE id = v_sender_wallet_id;
    
    -- Créer ou mettre à jour le wallet du destinataire
    INSERT INTO wallets (user_id, balance, currency, status)
    VALUES (p_receiver_user_id, v_amount_received, p_currency_received, 'active')
    ON CONFLICT (user_id, currency) 
    DO UPDATE SET 
        balance = wallets.balance + v_amount_received,
        updated_at = NOW();
    
    -- Récupérer l'ID du wallet du destinataire
    SELECT w.id INTO v_receiver_wallet_id
    FROM wallets w
    WHERE w.user_id = p_receiver_user_id AND w.currency = p_currency_received;
    
    -- Mettre à jour la transaction avec l'ID du wallet destinataire
    UPDATE multi_currency_transfers 
    SET receiver_wallet_id = v_receiver_wallet_id,
        status = 'completed',
        processed_at = NOW(),
        completed_at = NOW()
    WHERE transaction_id = v_transaction_id;
    
    -- Mettre à jour les limites quotidiennes
    INSERT INTO daily_transfer_limits (user_id, amount_sent, currency, transaction_count)
    VALUES (p_sender_id, p_amount + v_fee_amount, p_currency_sent, 1)
    ON CONFLICT (user_id, date, currency)
    DO UPDATE SET 
        amount_sent = daily_transfer_limits.amount_sent + p_amount + v_fee_amount,
        transaction_count = daily_transfer_limits.transaction_count + 1,
        updated_at = NOW();
    
    -- Retourner le résultat
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'amount_sent', p_amount,
        'currency_sent', p_currency_sent,
        'amount_received', v_amount_received,
        'currency_received', p_currency_received,
        'exchange_rate', v_exchange_rate,
        'fee_amount', v_fee_amount,
        'fee_percentage', v_fee_percentage,
        'fee_fixed', v_fee_fixed,
        'new_balance', v_sender_balance - p_amount - v_fee_amount
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, marquer la transaction comme échouée
        UPDATE multi_currency_transfers 
        SET status = 'failed',
            failure_reason = SQLERRM,
            processed_at = NOW()
        WHERE transaction_id = v_transaction_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Erreur lors du transfert: ' || SQLERRM,
            'error_code', 'TRANSFER_ERROR'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FONCTION POUR CALCULER LES FRAIS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_transfer_fees(
    p_user_role VARCHAR(50),
    p_amount DECIMAL(15, 2),
    p_currency VARCHAR(3)
)
RETURNS JSONB AS $$
DECLARE
    v_fee_fixed DECIMAL(15, 2);
    v_fee_percentage DECIMAL(5, 4);
    v_fee_amount DECIMAL(15, 2);
    v_total_amount DECIMAL(15, 2);
BEGIN
    -- Récupérer les frais
    SELECT 
        COALESCE(tf.fee_fixed, 0),
        COALESCE(tf.fee_percentage, 0)
    INTO v_fee_fixed, v_fee_percentage
    FROM transfer_fees tf
    WHERE tf.user_role = p_user_role
    AND tf.currency = p_currency
    AND tf.is_active = true
    AND p_amount BETWEEN tf.amount_min AND tf.amount_max
    ORDER BY tf.amount_min DESC
    LIMIT 1;
    
    -- Si aucun frais trouvé, utiliser les frais par défaut
    IF v_fee_fixed IS NULL THEN
        v_fee_fixed := 0;
        v_fee_percentage := 0.01; -- 1% par défaut
    END IF;
    
    -- Calculer le montant des frais
    v_fee_amount := v_fee_fixed + (p_amount * v_fee_percentage);
    v_total_amount := p_amount + v_fee_amount;
    
    RETURN jsonb_build_object(
        'fee_fixed', v_fee_fixed,
        'fee_percentage', v_fee_percentage,
        'fee_amount', v_fee_amount,
        'total_amount', v_total_amount,
        'net_amount', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. FONCTION POUR VÉRIFIER LES LIMITES
-- =====================================================

CREATE OR REPLACE FUNCTION check_transfer_limits(
    p_user_id UUID,
    p_amount DECIMAL(15, 2),
    p_currency VARCHAR(3)
)
RETURNS JSONB AS $$
DECLARE
    v_daily_limit DECIMAL(15, 2);
    v_monthly_limit DECIMAL(15, 2);
    v_daily_used DECIMAL(15, 2);
    v_monthly_used DECIMAL(15, 2);
    v_daily_remaining DECIMAL(15, 2);
    v_monthly_remaining DECIMAL(15, 2);
    v_can_transfer BOOLEAN;
BEGIN
    -- Récupérer les limites du wallet
    SELECT 
        COALESCE(w.daily_transfer_limit, 1000000),
        COALESCE(w.monthly_transfer_limit, 10000000)
    INTO v_daily_limit, v_monthly_limit
    FROM wallets w
    WHERE w.user_id = p_user_id AND w.currency = p_currency;
    
    -- Calculer l'utilisation quotidienne
    SELECT COALESCE(SUM(mct.amount_sent), 0) INTO v_daily_used
    FROM multi_currency_transfers mct
    WHERE mct.sender_id = p_user_id
    AND mct.currency_sent = p_currency
    AND DATE(mct.created_at) = CURRENT_DATE
    AND mct.status = 'completed';
    
    -- Calculer l'utilisation mensuelle
    SELECT COALESCE(SUM(mct.amount_sent), 0) INTO v_monthly_used
    FROM multi_currency_transfers mct
    WHERE mct.sender_id = p_user_id
    AND mct.currency_sent = p_currency
    AND DATE_TRUNC('month', mct.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    AND mct.status = 'completed';
    
    -- Calculer les montants restants
    v_daily_remaining := v_daily_limit - v_daily_used;
    v_monthly_remaining := v_monthly_limit - v_monthly_used;
    
    -- Vérifier si le transfert est possible
    v_can_transfer := (v_daily_remaining >= p_amount) AND (v_monthly_remaining >= p_amount);
    
    RETURN jsonb_build_object(
        'can_transfer', v_can_transfer,
        'daily_limit', v_daily_limit,
        'daily_used', v_daily_used,
        'daily_remaining', v_daily_remaining,
        'monthly_limit', v_monthly_limit,
        'monthly_used', v_monthly_used,
        'monthly_remaining', v_monthly_remaining,
        'requested_amount', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. FONCTION POUR RÉCUPÉRER L'HISTORIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION get_transfer_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_transfers JSONB;
    v_total_count INTEGER;
BEGIN
    -- Récupérer les transferts
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', mct.id,
            'transaction_id', mct.transaction_id,
            'sender_id', mct.sender_id,
            'receiver_id', mct.receiver_id,
            'amount_sent', mct.amount_sent,
            'currency_sent', mct.currency_sent,
            'amount_received', mct.amount_received,
            'currency_received', mct.currency_received,
            'exchange_rate', mct.exchange_rate,
            'fee_amount', mct.fee_amount,
            'description', mct.description,
            'reference', mct.reference,
            'status', mct.status,
            'created_at', mct.created_at,
            'completed_at', mct.completed_at,
            'is_sent', (mct.sender_id = p_user_id),
            'is_received', (mct.receiver_id = p_user_id)
        )
    ) INTO v_transfers
    FROM multi_currency_transfers mct
    WHERE (mct.sender_id = p_user_id OR mct.receiver_id = p_user_id)
    ORDER BY mct.created_at DESC
    LIMIT p_limit OFFSET p_offset;
    
    -- Compter le total
    SELECT COUNT(*) INTO v_total_count
    FROM multi_currency_transfers mct
    WHERE (mct.sender_id = p_user_id OR mct.receiver_id = p_user_id);
    
    RETURN jsonb_build_object(
        'transfers', COALESCE(v_transfers, '[]'::jsonb),
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FONCTION POUR METTRE À JOUR LES TAUX DE CHANGE
-- =====================================================

CREATE OR REPLACE FUNCTION update_exchange_rates(
    p_rates JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_rate JSONB;
    v_from_currency VARCHAR(3);
    v_to_currency VARCHAR(3);
    v_rate_value DECIMAL(20, 8);
    v_updated_count INTEGER := 0;
BEGIN
    -- Désactiver tous les taux existants
    UPDATE exchange_rates 
    SET is_active = false, updated_at = NOW();
    
    -- Insérer les nouveaux taux
    FOR v_rate IN SELECT * FROM jsonb_array_elements(p_rates)
    LOOP
        v_from_currency := v_rate->>'from_currency';
        v_to_currency := v_rate->>'to_currency';
        v_rate_value := (v_rate->>'rate')::DECIMAL(20, 8);
        
        -- Insérer le nouveau taux
        INSERT INTO exchange_rates (from_currency, to_currency, rate, source, is_active)
        VALUES (v_from_currency, v_to_currency, v_rate_value, 'api', true)
        ON CONFLICT (from_currency, to_currency, valid_from) 
        DO UPDATE SET 
            rate = v_rate_value,
            is_active = true,
            updated_at = NOW();
        
        v_updated_count := v_updated_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'message', 'Taux de change mis à jour avec succès'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FONCTION POUR STATISTIQUES DE TRANSFERT
-- =====================================================

CREATE OR REPLACE FUNCTION get_transfer_statistics(
    p_user_id UUID,
    p_period VARCHAR(10) DEFAULT 'month' -- 'day', 'week', 'month', 'year'
)
RETURNS JSONB AS $$
DECLARE
    v_start_date TIMESTAMP WITH TIME ZONE;
    v_sent_count INTEGER;
    v_received_count INTEGER;
    v_sent_amount DECIMAL(15, 2);
    v_received_amount DECIMAL(15, 2);
    v_total_fees DECIMAL(15, 2);
    v_currencies JSONB;
BEGIN
    -- Déterminer la période
    CASE p_period
        WHEN 'day' THEN v_start_date := CURRENT_DATE;
        WHEN 'week' THEN v_start_date := DATE_TRUNC('week', CURRENT_DATE);
        WHEN 'month' THEN v_start_date := DATE_TRUNC('month', CURRENT_DATE);
        WHEN 'year' THEN v_start_date := DATE_TRUNC('year', CURRENT_DATE);
        ELSE v_start_date := DATE_TRUNC('month', CURRENT_DATE);
    END CASE;
    
    -- Statistiques des transferts envoyés
    SELECT 
        COUNT(*),
        COALESCE(SUM(amount_sent), 0)
    INTO v_sent_count, v_sent_amount
    FROM multi_currency_transfers
    WHERE sender_id = p_user_id
    AND created_at >= v_start_date
    AND status = 'completed';
    
    -- Statistiques des transferts reçus
    SELECT 
        COUNT(*),
        COALESCE(SUM(amount_received), 0)
    INTO v_received_count, v_received_amount
    FROM multi_currency_transfers
    WHERE receiver_id = p_user_id
    AND created_at >= v_start_date
    AND status = 'completed';
    
    -- Total des frais payés
    SELECT COALESCE(SUM(fee_amount), 0)
    INTO v_total_fees
    FROM multi_currency_transfers
    WHERE sender_id = p_user_id
    AND created_at >= v_start_date
    AND status = 'completed';
    
    -- Devises utilisées
    SELECT jsonb_agg(
        jsonb_build_object(
            'currency', currency_sent,
            'amount', amount_sent,
            'count', COUNT(*)
        )
    ) INTO v_currencies
    FROM multi_currency_transfers
    WHERE sender_id = p_user_id
    AND created_at >= v_start_date
    AND status = 'completed'
    GROUP BY currency_sent;
    
    RETURN jsonb_build_object(
        'period', p_period,
        'start_date', v_start_date,
        'sent', jsonb_build_object(
            'count', v_sent_count,
            'amount', v_sent_amount
        ),
        'received', jsonb_build_object(
            'count', v_received_count,
            'amount', v_received_amount
        ),
        'total_fees', v_total_fees,
        'currencies', COALESCE(v_currencies, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
