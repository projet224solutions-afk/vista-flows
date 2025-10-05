-- Fonction pour récupérer un utilisateur complet avec ses données
CREATE OR REPLACE FUNCTION get_user_complete(p_user_id UUID) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'user', row_to_json(p.*),
        'wallet', row_to_json(w.*),
        'custom_id', ui.custom_id,
        'roles', array_agg(ur.role)
    )
    INTO v_result
    FROM profiles p
    LEFT JOIN wallets w ON p.id = w.user_id
    LEFT JOIN user_ids ui ON p.id = ui.user_id
    LEFT JOIN user_roles ur ON p.id = ur.user_id
    WHERE p.id = p_user_id
    GROUP BY p.id, w.id, ui.custom_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;