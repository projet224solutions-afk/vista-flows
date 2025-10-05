-- =====================================================
-- SYSTÈME MULTI-DEVISES 224SOLUTIONS
-- =====================================================
-- Date: 2 janvier 2025
-- Description: Extension du système wallet pour support multi-devises
-- IMPORTANT: Ne supprime aucune table existante, ajoute uniquement les nouvelles

-- =====================================================
-- 1. TABLE DES DEVISES (ISO 4217)
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE, -- Code ISO 4217 (USD, EUR, GNF, etc.)
    name VARCHAR(100) NOT NULL, -- Nom complet (US Dollar, Euro, etc.)
    symbol VARCHAR(10) NOT NULL, -- Symbole ($, €, FG, etc.)
    country VARCHAR(100), -- Pays principal
    is_active BOOLEAN DEFAULT true,
    is_crypto BOOLEAN DEFAULT false, -- Pour les cryptomonnaies
    decimal_places INTEGER DEFAULT 2, -- Nombre de décimales
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLE DES TAUX DE CHANGE
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    rate DECIMAL(20, 8) NOT NULL, -- Taux de change (1 from_currency = rate to_currency)
    source VARCHAR(50) DEFAULT 'api', -- Source du taux (api, manual, fallback)
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT positive_rate CHECK (rate > 0),
    CONSTRAINT different_currencies CHECK (from_currency != to_currency),
    UNIQUE(from_currency, to_currency, valid_from)
);

-- =====================================================
-- 3. TABLE DES FRAIS DE TRANSFERT
-- =====================================================

CREATE TABLE IF NOT EXISTS transfer_fees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_role VARCHAR(50) NOT NULL, -- client, vendeur, transitaire, pdg, admin
    amount_min DECIMAL(15, 2) DEFAULT 0.00,
    amount_max DECIMAL(15, 2) DEFAULT 999999999.99,
    fee_fixed DECIMAL(15, 2) DEFAULT 0.00, -- Frais fixes
    fee_percentage DECIMAL(5, 4) DEFAULT 0.0000, -- Pourcentage (0.0250 = 2.5%)
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT valid_fee_percentage CHECK (fee_percentage >= 0 AND fee_percentage <= 1),
    CONSTRAINT valid_amount_range CHECK (amount_min <= amount_max)
);

-- =====================================================
-- 4. EXTENSION DE LA TABLE WALLETS EXISTANTE
-- =====================================================

-- Ajouter les colonnes manquantes à la table wallets existante
-- (Seulement si elles n'existent pas déjà)

DO $$ 
BEGIN
    -- Ajouter colonne country si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wallets' AND column_name = 'country') THEN
        ALTER TABLE wallets ADD COLUMN country VARCHAR(100) DEFAULT 'Guinea';
    END IF;
    
    -- Ajouter colonne daily_transfer_limit si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wallets' AND column_name = 'daily_transfer_limit') THEN
        ALTER TABLE wallets ADD COLUMN daily_transfer_limit DECIMAL(15, 2) DEFAULT 1000000.00;
    END IF;
    
    -- Ajouter colonne monthly_transfer_limit si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wallets' AND column_name = 'monthly_transfer_limit') THEN
        ALTER TABLE wallets ADD COLUMN monthly_transfer_limit DECIMAL(15, 2) DEFAULT 10000000.00;
    END IF;
    
    -- Ajouter colonne kyc_verified si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'wallets' AND column_name = 'kyc_verified') THEN
        ALTER TABLE wallets ADD COLUMN kyc_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =====================================================
-- 5. TABLE DES TRANSACTIONS MULTI-DEVISES
-- =====================================================

CREATE TABLE IF NOT EXISTS multi_currency_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL, -- Format: TX-224-[timestamp]-[uuid6]
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    receiver_id UUID NOT NULL REFERENCES auth.users(id),
    sender_wallet_id UUID NOT NULL REFERENCES wallets(id),
    receiver_wallet_id UUID REFERENCES wallets(id),
    
    -- Montants et devises
    amount_sent DECIMAL(15, 2) NOT NULL,
    currency_sent VARCHAR(3) NOT NULL REFERENCES currencies(code),
    amount_received DECIMAL(15, 2) NOT NULL,
    currency_received VARCHAR(3) NOT NULL REFERENCES currencies(code),
    exchange_rate DECIMAL(20, 8) NOT NULL,
    
    -- Frais
    fee_amount DECIMAL(15, 2) DEFAULT 0.00,
    fee_currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    fee_percentage DECIMAL(5, 4) DEFAULT 0.0000,
    fee_fixed DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Métadonnées
    description TEXT,
    reference VARCHAR(100), -- Référence utilisateur
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    failure_reason TEXT,
    
    -- Sécurité
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Contraintes
    CONSTRAINT positive_amounts CHECK (amount_sent > 0 AND amount_received > 0),
    CONSTRAINT valid_exchange_rate CHECK (exchange_rate > 0)
);

-- =====================================================
-- 6. TABLE DES LIMITES QUOTIDIENNES
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_transfer_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_sent DECIMAL(15, 2) DEFAULT 0.00,
    amount_received DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL REFERENCES currencies(code),
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date, currency)
);

-- =====================================================
-- 7. INDEX POUR PERFORMANCE
-- =====================================================

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active 
ON exchange_rates(from_currency, to_currency, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_multi_currency_transfers_sender 
ON multi_currency_transfers(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_multi_currency_transfers_receiver 
ON multi_currency_transfers(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_multi_currency_transfers_status 
ON multi_currency_transfers(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date 
ON daily_transfer_limits(user_id, date, currency);

-- =====================================================
-- 8. DONNÉES INITIALES
-- =====================================================

-- Insérer les devises principales
INSERT INTO currencies (code, name, symbol, country, is_active) VALUES
('GNF', 'Guinean Franc', 'FG', 'Guinea', true),
('USD', 'US Dollar', '$', 'United States', true),
('EUR', 'Euro', '€', 'European Union', true),
('XOF', 'West African CFA Franc', 'CFA', 'West Africa', true),
('XAF', 'Central African CFA Franc', 'CFA', 'Central Africa', true),
('GBP', 'British Pound', '£', 'United Kingdom', true),
('JPY', 'Japanese Yen', '¥', 'Japan', true),
('CNY', 'Chinese Yuan', '¥', 'China', true),
('CAD', 'Canadian Dollar', 'C$', 'Canada', true),
('AUD', 'Australian Dollar', 'A$', 'Australia', true)
ON CONFLICT (code) DO NOTHING;

-- Insérer les frais par défaut pour chaque rôle
INSERT INTO transfer_fees (user_role, amount_min, amount_max, fee_fixed, fee_percentage, currency) VALUES
('client', 0.00, 10000.00, 100.00, 0.0100, 'GNF'),
('client', 10000.01, 100000.00, 200.00, 0.0050, 'GNF'),
('client', 100000.01, 999999999.99, 500.00, 0.0025, 'GNF'),
('vendeur', 0.00, 50000.00, 50.00, 0.0050, 'GNF'),
('vendeur', 50000.01, 500000.00, 100.00, 0.0025, 'GNF'),
('vendeur', 500000.01, 999999999.99, 250.00, 0.0010, 'GNF'),
('transitaire', 0.00, 999999999.99, 0.00, 0.0000, 'GNF'),
('pdg', 0.00, 999999999.99, 0.00, 0.0000, 'GNF'),
('admin', 0.00, 999999999.99, 0.00, 0.0000, 'GNF')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour générer un ID de transaction unique
CREATE OR REPLACE FUNCTION generate_transaction_id()
RETURNS VARCHAR(50) AS $$
DECLARE
    timestamp_part VARCHAR(20);
    uuid_part VARCHAR(6);
BEGIN
    timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
    uuid_part := SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 6);
    RETURN 'TX-224-' || timestamp_part || '-' || uuid_part;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le taux de change actuel
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
)
RETURNS DECIMAL(20, 8) AS $$
DECLARE
    rate DECIMAL(20, 8);
BEGIN
    -- Si même devise, retourner 1
    IF p_from_currency = p_to_currency THEN
        RETURN 1.00000000;
    END IF;
    
    -- Chercher le taux direct
    SELECT er.rate INTO rate
    FROM exchange_rates er
    WHERE er.from_currency = p_from_currency 
    AND er.to_currency = p_to_currency 
    AND er.is_active = true
    AND (er.valid_until IS NULL OR er.valid_until > NOW())
    ORDER BY er.created_at DESC
    LIMIT 1;
    
    -- Si trouvé, retourner le taux
    IF rate IS NOT NULL THEN
        RETURN rate;
    END IF;
    
    -- Sinon, chercher le taux inverse et l'inverser
    SELECT (1.0 / er.rate) INTO rate
    FROM exchange_rates er
    WHERE er.from_currency = p_to_currency 
    AND er.to_currency = p_from_currency 
    AND er.is_active = true
    AND (er.valid_until IS NULL OR er.valid_until > NOW())
    ORDER BY er.created_at DESC
    LIMIT 1;
    
    -- Si toujours pas trouvé, retourner 1 (même devise)
    RETURN COALESCE(rate, 1.00000000);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. RLS (Row Level Security)
-- =====================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE multi_currency_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_transfer_limits ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour currencies (lecture publique)
CREATE POLICY "currencies_select_policy" ON currencies
    FOR SELECT USING (true);

-- Politiques RLS pour exchange_rates (lecture publique)
CREATE POLICY "exchange_rates_select_policy" ON exchange_rates
    FOR SELECT USING (true);

-- Politiques RLS pour transfer_fees (lecture publique)
CREATE POLICY "transfer_fees_select_policy" ON transfer_fees
    FOR SELECT USING (true);

-- Politiques RLS pour multi_currency_transfers
CREATE POLICY "multi_currency_transfers_select_policy" ON multi_currency_transfers
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'pdg')
        )
    );

CREATE POLICY "multi_currency_transfers_insert_policy" ON multi_currency_transfers
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Politiques RLS pour daily_transfer_limits
CREATE POLICY "daily_limits_select_policy" ON daily_transfer_limits
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'pdg')
        )
    );

CREATE POLICY "daily_limits_insert_policy" ON daily_transfer_limits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 11. TRIGGERS POUR MAINTENANCE AUTOMATIQUE
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les nouvelles tables
CREATE TRIGGER update_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_fees_updated_at
    BEFORE UPDATE ON transfer_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multi_currency_transfers_updated_at
    BEFORE UPDATE ON multi_currency_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_limits_updated_at
    BEFORE UPDATE ON daily_transfer_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE currencies IS 'Table des devises supportées (ISO 4217)';
COMMENT ON TABLE exchange_rates IS 'Taux de change entre devises';
COMMENT ON TABLE transfer_fees IS 'Frais de transfert par rôle utilisateur';
COMMENT ON TABLE multi_currency_transfers IS 'Transactions multi-devises entre utilisateurs';
COMMENT ON TABLE daily_transfer_limits IS 'Limites quotidiennes de transfert par utilisateur';

COMMENT ON COLUMN currencies.code IS 'Code ISO 4217 (USD, EUR, GNF, etc.)';
COMMENT ON COLUMN exchange_rates.rate IS 'Taux de change (1 from_currency = rate to_currency)';
COMMENT ON COLUMN transfer_fees.fee_percentage IS 'Pourcentage de frais (0.0250 = 2.5%)';
COMMENT ON COLUMN multi_currency_transfers.transaction_id IS 'ID unique format: TX-224-[timestamp]-[uuid6]';
