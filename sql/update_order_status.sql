-- Fonction pour mettre à jour le statut d'une commande
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_status TEXT
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    UPDATE orders 
    SET status = p_status, updated_at = NOW()
    WHERE id = p_order_id;
    
    IF FOUND THEN
        v_result := json_build_object(
            'order_id', p_order_id,
            'status', p_status,
            'updated_at', NOW()
        );
    ELSE
        v_result := json_build_object('error', 'Commande non trouvée');
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;