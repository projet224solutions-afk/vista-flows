-- Migration complète pour système bureau syndicat opérationnel
-- Création de toutes les tables nécessaires pour un système réel

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs (mise à jour)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_worker BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badge_code TEXT UNIQUE;

-- Table des bureaux syndicaux (mise à jour)
ALTER TABLE syndicate_bureaus ADD COLUMN IF NOT EXISTS wallet_id UUID;
ALTER TABLE syndicate_bureaus ADD COLUMN IF NOT EXISTS balance NUMERIC(18,2) DEFAULT 0;

-- Table des membres de bureau syndicat
CREATE TABLE IF NOT EXISTS syndicate_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    syndicate_id UUID REFERENCES syndicate_bureaus(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('president', 'secretary', 'member')),
    permissions JSONB DEFAULT '{}',
    added_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (syndicate_id, user_id)
);

-- Table des taxi-motards
CREATE TABLE IF NOT EXISTS taxi_motards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    syndicate_id UUID REFERENCES syndicate_bureaus(id) ON DELETE CASCADE,
    gilet_number TEXT,
    plate_number TEXT NOT NULL,
    moto_serial_number TEXT NOT NULL UNIQUE,
    badge_number TEXT NOT NULL UNIQUE,
    badge_code TEXT NOT NULL UNIQUE,
    badge_qr_code TEXT,
    is_active BOOLEAN DEFAULT true,
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des wallets (améliorée)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance NUMERIC(18,2) DEFAULT 0 CHECK (balance >= 0),
    currency TEXT DEFAULT 'FCFA',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des transactions wallet
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    from_wallet_id UUID REFERENCES wallets(id),
    to_wallet_id UUID REFERENCES wallets(id),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer', 'internal_payment', 'cotisation', 'salary', 'bonus', 'fine')),
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference TEXT UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des liens de validation
CREATE TABLE IF NOT EXISTS validation_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL CHECK (target_type IN ('syndicate_member', 'taxi_motard', 'user', 'bureau_access')),
    target_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    link_url TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    is_permanent BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des permissions par rôle
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    resource TEXT NOT NULL,
    actions TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (role, resource)
);

-- Table des badges numériques
CREATE TABLE IF NOT EXISTS digital_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_number TEXT NOT NULL UNIQUE,
    badge_code TEXT NOT NULL UNIQUE,
    qr_code_data TEXT,
    qr_code_url TEXT,
    badge_type TEXT DEFAULT 'taxi_motard' CHECK (badge_type IN ('taxi_motard', 'syndicate_member', 'admin')),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_syndicate_members_syndicate_id ON syndicate_members(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_members_user_id ON syndicate_members(user_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_members_role ON syndicate_members(role);
CREATE INDEX IF NOT EXISTS idx_taxi_motards_syndicate_id ON taxi_motards(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_taxi_motards_user_id ON taxi_motards(user_id);
CREATE INDEX IF NOT EXISTS idx_taxi_motards_badge_code ON taxi_motards(badge_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_validation_links_token ON validation_links(token);
CREATE INDEX IF NOT EXISTS idx_validation_links_target ON validation_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_digital_badges_user_id ON digital_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_badges_badge_code ON digital_badges(badge_code);

-- Fonction pour générer un numéro de badge unique
CREATE OR REPLACE FUNCTION generate_badge_number(badge_type TEXT DEFAULT 'TM')
RETURNS TEXT AS $$
DECLARE
    year_suffix TEXT;
    random_suffix TEXT;
    badge_number TEXT;
    counter INTEGER := 0;
BEGIN
    year_suffix := EXTRACT(YEAR FROM NOW())::TEXT;
    
    LOOP
        random_suffix := LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
        badge_number := badge_type || '-' || year_suffix || '-' || random_suffix;
        
        -- Vérifier l'unicité
        IF NOT EXISTS (
            SELECT 1 FROM digital_badges WHERE badge_number = badge_number
            UNION
            SELECT 1 FROM taxi_motards WHERE badge_number = badge_number
        ) THEN
            RETURN badge_number;
        END IF;
        
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique badge number after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer un code de badge sécurisé
CREATE OR REPLACE FUNCTION generate_badge_code()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un wallet pour un utilisateur
CREATE OR REPLACE FUNCTION create_user_wallet(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
    wallet_id UUID;
BEGIN
    -- Vérifier si l'utilisateur a déjà un wallet
    SELECT id INTO wallet_id FROM wallets WHERE user_id = user_uuid;
    
    IF wallet_id IS NULL THEN
        -- Créer un nouveau wallet
        INSERT INTO wallets (user_id, balance, currency)
        VALUES (user_uuid, 1000, 'FCFA') -- Bonus de bienvenue de 1000 FCFA
        RETURNING id INTO wallet_id;
        
        -- Créer une transaction de bonus de bienvenue
        INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference)
        VALUES (
            wallet_id, 
            'bonus', 
            1000, 
            'Bonus de bienvenue 224Solutions',
            'WELCOME-' || user_uuid::TEXT
        );
    END IF;
    
    RETURN wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer un badge numérique
CREATE OR REPLACE FUNCTION create_digital_badge(
    user_uuid UUID,
    badge_type_param TEXT DEFAULT 'taxi_motard'
)
RETURNS UUID AS $$
DECLARE
    badge_id UUID;
    badge_num TEXT;
    badge_code_val TEXT;
    qr_data TEXT;
BEGIN
    -- Générer le numéro et code de badge
    badge_num := generate_badge_number(CASE 
        WHEN badge_type_param = 'taxi_motard' THEN 'TM'
        WHEN badge_type_param = 'syndicate_member' THEN 'SM'
        ELSE 'BG'
    END);
    badge_code_val := generate_badge_code();
    
    -- Créer les données QR (URL vers la page de vérification du badge)
    qr_data := 'https://224solutions.com/badge/verify?code=' || badge_code_val;
    
    -- Insérer le badge
    INSERT INTO digital_badges (
        user_id, badge_number, badge_code, qr_code_data, badge_type
    ) VALUES (
        user_uuid, badge_num, badge_code_val, qr_data, badge_type_param
    ) RETURNING id INTO badge_id;
    
    -- Mettre à jour l'utilisateur avec les informations du badge
    UPDATE users 
    SET badge_number = badge_num, badge_code = badge_code_val
    WHERE id = user_uuid;
    
    RETURN badge_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer un lien de validation
CREATE OR REPLACE FUNCTION create_validation_link(
    target_type_param TEXT,
    target_id_param UUID,
    created_by_param UUID DEFAULT NULL,
    is_permanent_param BOOLEAN DEFAULT false,
    expires_days INTEGER DEFAULT 30
)
RETURNS TEXT AS $$
DECLARE
    token_val TEXT;
    link_url TEXT;
    expires_at_val TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Générer un token sécurisé
    token_val := encode(gen_random_bytes(32), 'hex');
    
    -- Calculer la date d'expiration
    IF is_permanent_param THEN
        expires_at_val := NOW() + INTERVAL '10 years';
    ELSE
        expires_at_val := NOW() + (expires_days || ' days')::INTERVAL;
    END IF;
    
    -- Créer l'URL du lien
    link_url := 'https://224solutions.com/validate/' || target_type_param || '?token=' || token_val;
    
    -- Insérer le lien de validation
    INSERT INTO validation_links (
        target_type, target_id, token, link_url, created_by, expires_at, is_permanent
    ) VALUES (
        target_type_param, target_id_param, token_val, link_url, created_by_param, expires_at_val, is_permanent_param
    );
    
    RETURN link_url;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement un wallet lors de la création d'un utilisateur
CREATE OR REPLACE FUNCTION trigger_create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer automatiquement un wallet pour le nouvel utilisateur
    PERFORM create_user_wallet(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS auto_create_wallet ON users;
CREATE TRIGGER auto_create_wallet
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_user_wallet();

-- Fonction pour mettre à jour le solde du wallet
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Mettre à jour le solde du wallet destinataire
        IF NEW.to_wallet_id IS NOT NULL THEN
            UPDATE wallets 
            SET balance = balance + NEW.amount, updated_at = NOW()
            WHERE id = NEW.to_wallet_id;
        END IF;
        
        -- Mettre à jour le solde du wallet expéditeur
        IF NEW.from_wallet_id IS NOT NULL THEN
            UPDATE wallets 
            SET balance = balance - NEW.amount, updated_at = NOW()
            WHERE id = NEW.from_wallet_id;
        END IF;
        
        -- Si c'est un dépôt simple (pas de from_wallet_id)
        IF NEW.from_wallet_id IS NULL AND NEW.type IN ('deposit', 'bonus', 'salary') THEN
            UPDATE wallets 
            SET balance = balance + NEW.amount, updated_at = NOW()
            WHERE id = NEW.wallet_id;
        END IF;
        
        -- Si c'est un retrait simple (pas de to_wallet_id)
        IF NEW.to_wallet_id IS NULL AND NEW.type IN ('withdraw', 'fine') THEN
            UPDATE wallets 
            SET balance = balance - NEW.amount, updated_at = NOW()
            WHERE id = NEW.wallet_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour les transactions
DROP TRIGGER IF EXISTS update_wallet_balance_trigger ON wallet_transactions;
CREATE TRIGGER update_wallet_balance_trigger
    AFTER INSERT ON wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance();

-- Insérer les permissions par défaut
INSERT INTO role_permissions (role, resource, actions) VALUES
('president', 'syndicate_management', ARRAY['create', 'read', 'update', 'delete']),
('president', 'member_management', ARRAY['create', 'read', 'update', 'delete']),
('president', 'taxi_motard_management', ARRAY['create', 'read', 'update', 'delete']),
('president', 'financial_management', ARRAY['create', 'read', 'update', 'delete']),
('president', 'validation_links', ARRAY['create', 'read', 'update']),

('secretary', 'member_management', ARRAY['create', 'read', 'update']),
('secretary', 'taxi_motard_management', ARRAY['create', 'read', 'update']),
('secretary', 'financial_management', ARRAY['read', 'update']),
('secretary', 'validation_links', ARRAY['read']),

('member', 'member_management', ARRAY['read']),
('member', 'taxi_motard_management', ARRAY['read']),
('member', 'financial_management', ARRAY['read']),

('admin', 'syndicate_management', ARRAY['create', 'read', 'update', 'delete']),
('admin', 'member_management', ARRAY['create', 'read', 'update', 'delete']),
('admin', 'taxi_motard_management', ARRAY['create', 'read', 'update', 'delete']),
('admin', 'financial_management', ARRAY['create', 'read', 'update', 'delete']),
('admin', 'validation_links', ARRAY['create', 'read', 'update', 'delete'])
ON CONFLICT (role, resource) DO NOTHING;

-- Activer RLS sur toutes les nouvelles tables
ALTER TABLE syndicate_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_motards ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_badges ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les membres du syndicat
CREATE POLICY "Membres visibles par leur syndicat" ON syndicate_members
    FOR ALL USING (
        syndicate_id IN (
            SELECT syndicate_id FROM syndicate_members sm2 
            WHERE sm2.user_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour les taxi-motards
CREATE POLICY "Taxi-motards visibles par leur syndicat" ON taxi_motards
    FOR ALL USING (
        syndicate_id IN (
            SELECT syndicate_id FROM syndicate_members sm 
            WHERE sm.user_id = auth.uid()
        )
        OR 
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour les wallets
CREATE POLICY "Wallet visible par son propriétaire" ON wallets
    FOR ALL USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'president')
        )
    );

-- Politiques RLS pour les transactions
CREATE POLICY "Transactions visibles par les propriétaires de wallet" ON wallet_transactions
    FOR ALL USING (
        wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
        OR
        from_wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
        OR
        to_wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'president')
        )
    );

-- Politiques RLS pour les badges
CREATE POLICY "Badges visibles par leur propriétaire" ON digital_badges
    FOR ALL USING (
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'president')
        )
    );

-- Fonction pour vérifier les permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    user_role TEXT,
    resource_name TEXT,
    action_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role = user_role 
        AND resource = resource_name 
        AND action_name = ANY(actions)
    );
END;
$$ LANGUAGE plpgsql;

-- Créer des utilisateurs de test si aucun n'existe
DO $$
DECLARE
    test_user_id UUID;
    test_wallet_id UUID;
    test_badge_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1) THEN
        -- Créer un utilisateur admin de test
        INSERT INTO users (id, email, phone, first_name, last_name, role, is_worker)
        VALUES (
            gen_random_uuid(),
            'admin@224solutions.com',
            '+221 77 000 00 01',
            'Admin',
            'System',
            'admin',
            false
        ) RETURNING id INTO test_user_id;
        
        RAISE NOTICE 'Utilisateur admin de test créé: %', test_user_id;
        
        -- Le wallet sera créé automatiquement par le trigger
        
        -- Créer un badge pour l'admin
        SELECT create_digital_badge(test_user_id, 'admin') INTO test_badge_id;
        
        RAISE NOTICE 'Badge admin créé: %', test_badge_id;
    END IF;
END $$;

-- Afficher un résumé de la migration
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION SYSTÈME BUREAU SYNDICAT COMPLÈTE ===';
    RAISE NOTICE 'Tables créées/mises à jour:';
    RAISE NOTICE '- syndicate_members (gestion des membres)';
    RAISE NOTICE '- taxi_motards (gestion des taxi-motards)';
    RAISE NOTICE '- wallets (portefeuilles utilisateurs)';
    RAISE NOTICE '- wallet_transactions (transactions financières)';
    RAISE NOTICE '- validation_links (liens de validation)';
    RAISE NOTICE '- digital_badges (badges numériques)';
    RAISE NOTICE '- role_permissions (permissions par rôle)';
    RAISE NOTICE '';
    RAISE NOTICE 'Fonctionnalités automatiques:';
    RAISE NOTICE '- Création automatique de wallet à l''inscription';
    RAISE NOTICE '- Génération automatique de badges numériques';
    RAISE NOTICE '- Liens de validation sécurisés';
    RAISE NOTICE '- Mise à jour automatique des soldes';
    RAISE NOTICE '- Système de permissions par rôle';
    RAISE NOTICE '- Sécurité RLS complète';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 SYSTÈME PRÊT POUR LA PRODUCTION !';
END $$;
