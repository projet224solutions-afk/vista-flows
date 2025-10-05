-- Fonction pour nettoyer les données de démonstration
CREATE OR REPLACE FUNCTION clean_demo_data() RETURNS JSON AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_result JSON;
BEGIN
    -- Supprimer les données de démonstration
    DELETE FROM profiles WHERE email LIKE '%@demo.%' OR email LIKE '%@test.%';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Supprimer les commandes orphelines
    DELETE FROM orders WHERE customer_id NOT IN (SELECT id FROM profiles);
    v_deleted_count := v_deleted_count + ROW_COUNT;
    
    -- Supprimer les wallets orphelins
    DELETE FROM wallets WHERE user_id NOT IN (SELECT id FROM profiles);
    v_deleted_count := v_deleted_count + ROW_COUNT;
    
    v_result := json_build_object(
        'deleted_records', v_deleted_count,
        'status', 'cleaned',
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;