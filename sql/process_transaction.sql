-- Fonction pour traiter les transactions entre wallets
CREATE OR REPLACE FUNCTION process_transaction(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_amount DECIMAL,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_from_wallet_id UUID;
    v_to_wallet_id UUID;
    v_from_balance DECIMAL;
    v_to_balance DECIMAL;
    v_tx_row_id UUID;
    v_tx_public_id VARCHAR(50);
    v_fee DECIMAL := 0.00;
    v_net_amount DECIMAL := 0.00;
    v_result JSON;
BEGIN
    -- Vérifier que l'utilisateur source a un wallet
    SELECT id, balance INTO v_from_wallet_id, v_from_balance
    FROM wallets
    WHERE user_id = p_from_user_id AND status = 'active';
    
    IF v_from_wallet_id IS NULL THEN
        RETURN json_build_object('error', 'Wallet source non trouvé');
    END IF;
    
    -- Vérifier que l'utilisateur destinataire a un wallet
    SELECT id, balance INTO v_to_wallet_id, v_to_balance
    FROM wallets
    WHERE user_id = p_to_user_id AND status = 'active';
    
    IF v_to_wallet_id IS NULL THEN
        RETURN json_build_object('error', 'Wallet destinataire non trouvé');
    END IF;
    
    -- Vérifier le solde suffisant
    IF v_from_balance < p_amount THEN
        RETURN json_build_object('error', 'Solde insuffisant');
    END IF;
    
    -- Effectuer la transaction
    BEGIN
        -- Débiter le wallet source
        UPDATE wallets 
        SET balance = balance - p_amount,
            updated_at = NOW()
        WHERE id = v_from_wallet_id;
        
        -- Créditer le wallet destinataire
        UPDATE wallets 
        SET balance = balance + p_amount,
            updated_at = NOW()
        WHERE id = v_to_wallet_id;
        
        -- Générer un identifiant public et calculer net_amount
        v_tx_public_id := COALESCE(generate_transaction_id(), 'TXN_' || FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT);
        v_fee := 0.00; -- ajuster si nécessaire (commission)
        v_net_amount := p_amount - v_fee;

        -- Enregistrer la transaction alignée avec le schéma (sender/receiver)
        INSERT INTO wallet_transactions (
            transaction_id, sender_wallet_id, receiver_wallet_id, amount, fee, net_amount, currency, transaction_type, description, status
        ) VALUES (
            v_tx_public_id, v_from_wallet_id, v_to_wallet_id, p_amount, v_fee, v_net_amount, 'GNF', p_transaction_type, p_description, 'completed'
        ) RETURNING id INTO v_tx_row_id;
        
        -- Retourner le succès
        v_result := json_build_object(
            'transaction_id', v_tx_public_id,
            'status', 'success',
            'amount', p_amount,
            'from_balance', v_from_balance - p_amount,
            'to_balance', v_to_balance + p_amount
        );
        
        RETURN v_result;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object('error', 'Erreur lors de la transaction: ' || SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;