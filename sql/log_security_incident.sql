-- Fonction pour enregistrer un incident de sécurité
CREATE OR REPLACE FUNCTION log_security_incident(
    p_incident_type TEXT,
    p_severity TEXT,
    p_description TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_incident_id UUID;
    v_result JSON;
BEGIN
    INSERT INTO security_incidents (
        incident_type, severity, description, user_id, ip_address, created_at
    ) VALUES (
        p_incident_type, p_severity, p_description, p_user_id, p_ip_address, NOW()
    ) RETURNING id INTO v_incident_id;
    
    v_result := json_build_object(
        'incident_id', v_incident_id,
        'status', 'logged',
        'created_at', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;