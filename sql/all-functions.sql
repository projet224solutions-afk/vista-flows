-- ===================================================
-- FONCTIONS SUPABASE - 224SOLUTIONS
-- ===================================================
-- Ce fichier contient toutes les fonctions SQL pour Supabase
-- Exécutez ces requêtes dans le dashboard Supabase
-- ===================================================


-- GENERATE_CUSTOM_ID
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


-- CREATE_USER_COMPLETE
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


-- GET_USER_COMPLETE
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


-- PROCESS_TRANSACTION
-- Fonction pour traiter les transactions entre wallets
CREATE OR REPLACE FUNCTION process_transaction(
    p_from_user_id UUID,
    p_to_user_id UUID,
    p_amount DECIMAL,
    p_transaction_type TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_from_wallet_id UUID;
    v_to_wallet_id UUID;
    v_from_balance DECIMAL;
    v_to_balance DECIMAL;
    v_transaction_id UUID;
    v_result JSON;
BEGIN
    -- Vérifier que l'utilisateur source a un wallet
    SELECT id, balance INTO v_from_wallet_id, v_from_balance
    FROM wallets
    WHERE user_id = p_from_user_id AND status = 'active';
    
    IF v_from_wallet_id IS NULL THEN
        RETURN json_build_object('error', 'Wallet source non trouvé');
    END IF;
    
    -- Vérifier que l'utilisateur destinataire a un wallet
    SELECT id, balance INTO v_to_wallet_id, v_to_balance
    FROM wallets
    WHERE user_id = p_to_user_id AND status = 'active';
    
    IF v_to_wallet_id IS NULL THEN
        RETURN json_build_object('error', 'Wallet destinataire non trouvé');
    END IF;
    
    -- Vérifier le solde suffisant
    IF v_from_balance < p_amount THEN
        RETURN json_build_object('error', 'Solde insuffisant');
    END IF;
    
    -- Effectuer la transaction
    BEGIN
        -- Débiter le wallet source
        UPDATE wallets 
        SET balance = balance - p_amount,
            updated_at = NOW()
        WHERE id = v_from_wallet_id;
        
        -- Créditer le wallet destinataire
        UPDATE wallets 
        SET balance = balance + p_amount,
            updated_at = NOW()
        WHERE id = v_to_wallet_id;
        
        -- Enregistrer la transaction
        INSERT INTO wallet_transactions (
            from_wallet_id, to_wallet_id, amount, transaction_type, description, status
        ) VALUES (
            v_from_wallet_id, v_to_wallet_id, p_amount, p_transaction_type, p_description, 'completed'
        ) RETURNING id INTO v_transaction_id;
        
        -- Retourner le succès
        v_result := json_build_object(
            'transaction_id', v_transaction_id,
            'status', 'success',
            'amount', p_amount,
            'from_balance', v_from_balance - p_amount,
            'to_balance', v_to_balance + p_amount
        );
        
        RETURN v_result;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object('error', 'Erreur lors de la transaction: ' || SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;


-- GET_WALLET_BALANCE
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


-- CREATE_ORDER
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


-- UPDATE_ORDER_STATUS
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


-- LOG_SECURITY_INCIDENT
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


-- BLOCK_IP_ADDRESS
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


-- CLEAN_DEMO_DATA
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


-- UPDATE_LOCATIONS_TO_GUINEA
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

