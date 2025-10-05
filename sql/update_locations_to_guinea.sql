-- Fonction pour mettre à jour les localisations vers la Guinée
CREATE OR REPLACE FUNCTION update_locations_to_guinea() RETURNS JSON AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_result JSON;
BEGIN
    -- Mettre à jour les localisations
    UPDATE profiles 
    SET location = 'Conakry, Guinée'
    WHERE location ILIKE '%dakar%' OR location ILIKE '%sénégal%' OR location ILIKE '%senegal%';
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    UPDATE orders 
    SET delivery_city = 'Conakry', delivery_country = 'Guinée'
    WHERE delivery_city ILIKE '%dakar%' OR delivery_country ILIKE '%sénégal%' OR delivery_country ILIKE '%senegal%';
    v_updated_count := v_updated_count + ROW_COUNT;
    
    v_result := json_build_object(
        'updated_records', v_updated_count,
        'status', 'updated',
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;