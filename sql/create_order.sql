-- Fonction pour créer une commande
CREATE OR REPLACE FUNCTION create_order(
    p_customer_id UUID,
    p_vendor_id UUID,
    p_items JSON,
    p_delivery_address TEXT,
    p_delivery_city TEXT DEFAULT 'Conakry',
    p_delivery_country TEXT DEFAULT 'Guinée'
) RETURNS JSON AS $$
DECLARE
    v_order_id UUID;
    v_total_amount DECIMAL := 0;
    v_item JSON;
    v_result JSON;
BEGIN
    -- Calculer le montant total
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_total_amount := v_total_amount + (v_item->>'price')::DECIMAL * (v_item->>'quantity')::INTEGER;
    END LOOP;
    
    -- Créer la commande
    INSERT INTO orders (
        customer_id, vendor_id, total_amount, status, 
        delivery_address, delivery_city, delivery_country
    ) VALUES (
        p_customer_id, p_vendor_id, v_total_amount, 'pending',
        p_delivery_address, p_delivery_city, p_delivery_country
    ) RETURNING id INTO v_order_id;
    
    -- Créer les items de commande
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id, product_id, quantity, price, total_price
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price')::DECIMAL,
            (v_item->>'price')::DECIMAL * (v_item->>'quantity')::INTEGER
        );
    END LOOP;
    
    v_result := json_build_object(
        'order_id', v_order_id,
        'total_amount', v_total_amount,
        'status', 'created',
        'items_count', json_array_length(p_items)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;