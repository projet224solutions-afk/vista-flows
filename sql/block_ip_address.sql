-- Fonction pour bloquer une adresse IP
CREATE OR REPLACE FUNCTION block_ip_address(
    p_ip_address INET,
    p_reason TEXT,
    p_duration_hours INTEGER DEFAULT 24
) RETURNS JSON AS $$
DECLARE
    v_block_id UUID;
    v_result JSON;
BEGIN
    INSERT INTO blocked_ips (
        ip_address, reason, blocked_until, created_at
    ) VALUES (
        p_ip_address, p_reason, NOW() + (p_duration_hours || ' hours')::INTERVAL, NOW()
    ) RETURNING id INTO v_block_id;
    
    v_result := json_build_object(
        'block_id', v_block_id,
        'ip_address', p_ip_address,
        'blocked_until', NOW() + (p_duration_hours || ' hours')::INTERVAL,
        'status', 'blocked'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;