-- Fonction pour récupérer le solde d'un wallet
CREATE OR REPLACE FUNCTION get_wallet_balance(p_user_id UUID) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'user_id', p_user_id,
        'balance', w.balance,
        'currency', w.currency,
        'status', w.status,
        'last_transaction', (
            SELECT json_build_object(
                'date', wt.created_at,
                'amount', wt.amount,
                'type', wt.transaction_type
            )
            FROM wallet_transactions wt
            WHERE wt.from_wallet_id = w.id OR wt.to_wallet_id = w.id
            ORDER BY wt.created_at DESC
            LIMIT 1
        )
    )
    INTO v_result
    FROM wallets w
    WHERE w.user_id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;