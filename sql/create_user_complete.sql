-- Fonction pour créer un utilisateur complet avec wallet
CREATE OR REPLACE FUNCTION create_user_complete(
    p_email TEXT,
    p_full_name TEXT,
    p_phone TEXT,
    p_role TEXT DEFAULT 'client',
    p_location TEXT DEFAULT 'Conakry, Guinée'
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_wallet_id UUID;
    v_custom_id TEXT;
    v_result JSON;
BEGIN
    -- Générer un ID personnalisé (3 lettres + 4 chiffres)
    v_custom_id := generate_custom_id();
    
    -- Créer le profil utilisateur
    INSERT INTO profiles (email, full_name, phone, role, location, custom_id)
    VALUES (p_email, p_full_name, p_phone, p_role, p_location, v_custom_id)
    RETURNING id INTO v_user_id;
    
    -- Créer le wallet automatiquement
    INSERT INTO wallets (user_id, balance, currency, status)
    VALUES (v_user_id, 0, 'GNF', 'active')
    RETURNING id INTO v_wallet_id;
    
    -- Créer l'ID personnalisé
    INSERT INTO user_ids (user_id, custom_id, created_at)
    VALUES (v_user_id, v_custom_id, NOW());
    
    -- Créer le rôle utilisateur
    INSERT INTO user_roles (user_id, role, is_active)
    VALUES (v_user_id, p_role, true);
    
    -- Retourner le résultat
    v_result := json_build_object(
        'user_id', v_user_id,
        'wallet_id', v_wallet_id,
        'custom_id', v_custom_id,
        'status', 'created'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;