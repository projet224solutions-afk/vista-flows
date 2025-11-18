-- Script pour créer des wallets et cartes virtuelles pour les utilisateurs existants
-- qui n'en ont pas encore (notamment les vendeurs)

-- ===================================================
-- CRÉATION WALLETS POUR UTILISATEURS EXISTANTS
-- ===================================================

-- Fonction pour créer wallet et carte pour un utilisateur existant
CREATE OR REPLACE FUNCTION create_missing_wallet_and_card(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_wallet_exists BOOLEAN;
    v_card_exists BOOLEAN;
    v_wallet_id UUID;
    v_card_number VARCHAR(16);
    v_cvv VARCHAR(3);
    v_expiry_year VARCHAR(4);
    v_expiry_month VARCHAR(2);
    v_user_name TEXT;
    v_user_email TEXT;
BEGIN
    -- Vérifier si l'utilisateur a déjà un wallet
    SELECT EXISTS(SELECT 1 FROM wallets WHERE user_id = p_user_id) INTO v_wallet_exists;
    
    -- Vérifier si l'utilisateur a déjà une carte
    SELECT EXISTS(SELECT 1 FROM virtual_cards WHERE user_id = p_user_id) INTO v_card_exists;
    
    -- Récupérer les infos utilisateur
    SELECT COALESCE(full_name, email, 'Utilisateur 224Solutions'), email 
    INTO v_user_name, v_user_email
    FROM profiles 
    WHERE id = p_user_id;
    
    -- Créer le wallet s'il n'existe pas
    IF NOT v_wallet_exists THEN
        INSERT INTO wallets (user_id, balance, currency, is_active)
        VALUES (p_user_id, 0.00, 'XAF', TRUE)
        RETURNING id INTO v_wallet_id;
        
        RAISE NOTICE 'Wallet créé pour utilisateur %: %', v_user_email, v_wallet_id;
    ELSE
        -- Récupérer l'ID du wallet existant
        SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id LIMIT 1;
    END IF;
    
    -- Créer la carte virtuelle si elle n'existe pas
    IF NOT v_card_exists AND v_wallet_id IS NOT NULL THEN
        -- Générer les données de la carte
        v_card_number := generate_virtual_card_number();
        v_cvv := generate_cvv();
        v_expiry_year := EXTRACT(YEAR FROM (NOW() + INTERVAL '3 years'))::VARCHAR;
        v_expiry_month := LPAD(EXTRACT(MONTH FROM NOW())::INTEGER, 2, '0');
        
        INSERT INTO virtual_cards (
            user_id, 
            wallet_id, 
            card_number, 
            card_holder_name, 
            expiry_month, 
            expiry_year, 
            cvv,
            card_type,
            card_status,
            daily_limit,
            monthly_limit
        )
        VALUES (
            p_user_id,
            v_wallet_id,
            v_card_number,
            v_user_name,
            v_expiry_month,
            v_expiry_year,
            v_cvv,
            'virtual',
            'active',
            1000000.00, -- 1M XAF pour les vendeurs
            10000000.00  -- 10M XAF pour les vendeurs
        );
        
        RAISE NOTICE 'Carte virtuelle créée pour utilisateur %: %', v_user_email, v_card_number;
    END IF;
    
    -- Log de l'audit
    INSERT INTO audit_logs_wallet (user_id, action_type, entity_id, details)
    VALUES (p_user_id, 'wallet_create', v_wallet_id, jsonb_build_object(
        'created_retroactively', true,
        'user_email', v_user_email,
        'wallet_id', v_wallet_id
    ));
    
END;
$$ LANGUAGE plpgsql;

-- ===================================================
-- EXÉCUTION POUR TOUS LES UTILISATEURS EXISTANTS
-- ===================================================

-- Créer wallets et cartes pour tous les utilisateurs qui n'en ont pas
DO $$
DECLARE
    user_record RECORD;
    total_users INTEGER := 0;
    processed_users INTEGER := 0;
BEGIN
    -- Compter le total d'utilisateurs sans wallet
    SELECT COUNT(*) INTO total_users
    FROM profiles p
    LEFT JOIN wallets w ON p.id = w.user_id
    WHERE w.id IS NULL;
    
    RAISE NOTICE 'Début de la création de wallets pour % utilisateurs existants', total_users;
    
    -- Parcourir tous les utilisateurs sans wallet
    FOR user_record IN 
        SELECT p.id, p.email, p.full_name, p.role
        FROM profiles p
        LEFT JOIN wallets w ON p.id = w.user_id
        WHERE w.id IS NULL
    LOOP
        BEGIN
            -- Créer wallet et carte pour cet utilisateur
            PERFORM create_missing_wallet_and_card(user_record.id);
            processed_users := processed_users + 1;
            
            RAISE NOTICE 'Traité: % (%) - % sur %', 
                user_record.email, 
                user_record.role, 
                processed_users, 
                total_users;
                
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Erreur pour utilisateur %: %', user_record.email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Création terminée: % utilisateurs traités sur % total', processed_users, total_users;
END;
$$;

-- ===================================================
-- VÉRIFICATION DES RÉSULTATS
-- ===================================================

-- Statistiques après création
SELECT 
    'Utilisateurs totaux' as type,
    COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
    'Wallets créés' as type,
    COUNT(*) as count
FROM wallets
UNION ALL
SELECT 
    'Cartes virtuelles créées' as type,
    COUNT(*) as count
FROM virtual_cards
UNION ALL
SELECT 
    'Utilisateurs sans wallet' as type,
    COUNT(*) as count
FROM profiles p
LEFT JOIN wallets w ON p.id = w.user_id
WHERE w.id IS NULL;

-- Détail par rôle
SELECT 
    p.role,
    COUNT(p.id) as total_users,
    COUNT(w.id) as users_with_wallet,
    COUNT(vc.id) as users_with_card
FROM profiles p
LEFT JOIN wallets w ON p.id = w.user_id
LEFT JOIN virtual_cards vc ON p.id = vc.user_id
GROUP BY p.role
ORDER BY p.role;
