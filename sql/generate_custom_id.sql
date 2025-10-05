-- Fonction pour générer des IDs personnalisés (3 lettres + 4 chiffres)
CREATE OR REPLACE FUNCTION generate_custom_id() RETURNS TEXT AS $$
DECLARE
    v_letters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    v_numbers TEXT := '0123456789';
    v_result TEXT := '';
    v_i INTEGER;
BEGIN
    -- Générer 3 lettres aléatoires
    FOR v_i IN 1..3 LOOP
        v_result := v_result || substr(v_letters, floor(random() * length(v_letters) + 1)::integer, 1);
    END LOOP;
    
    -- Générer 4 chiffres aléatoires
    FOR v_i IN 1..4 LOOP
        v_result := v_result || substr(v_numbers, floor(random() * length(v_numbers) + 1)::integer, 1);
    END LOOP;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;