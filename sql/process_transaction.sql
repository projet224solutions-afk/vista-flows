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
    v_transaction_id UUID;
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
        
        -- Enregistrer la transaction
        INSERT INTO wallet_transactions (
            from_wallet_id, to_wallet_id, amount, transaction_type, description, status
        ) VALUES (
            v_from_wallet_id, v_to_wallet_id, p_amount, p_transaction_type, p_description, 'completed'
        ) RETURNING id INTO v_transaction_id;
        
        -- Retourner le succès
        v_result := json_build_object(
            'transaction_id', v_transaction_id,
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