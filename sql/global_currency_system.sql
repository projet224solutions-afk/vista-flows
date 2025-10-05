-- =====================================================
-- SYSTÈME MONDIAL DE GESTION DES DEVISES
-- =====================================================
-- Date: 2 janvier 2025
-- Description: Système complet de gestion des devises mondiales avec contrôle PDG
-- Compatible avec le système existant 224SOLUTIONS

-- =====================================================
-- 1. TABLE DES DEVISES MONDIALES (ISO 4217)
-- =====================================================

CREATE TABLE IF NOT EXISTS global_currencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE, -- Code ISO 4217
    name VARCHAR(100) NOT NULL, -- Nom complet
    symbol VARCHAR(10) NOT NULL, -- Symbole monétaire
    country VARCHAR(100) NOT NULL, -- Pays principal
    flag VARCHAR(10) NOT NULL, -- Emoji du drapeau
    is_active BOOLEAN DEFAULT true,
    decimal_places INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. TABLE DES TAUX DE CHANGE AVANCÉE
-- =====================================================

CREATE TABLE IF NOT EXISTS advanced_exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL REFERENCES global_currencies(code),
    to_currency VARCHAR(3) NOT NULL REFERENCES global_currencies(code),
    rate DECIMAL(20, 8) NOT NULL,
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'fallback')),
    is_active BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES auth.users(id),
    reason TEXT, -- Raison du changement
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
-- 3. HISTORIQUE DES MODIFICATIONS DE TAUX
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rate_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    old_rate DECIMAL(20, 8) NOT NULL,
    new_rate DECIMAL(20, 8) NOT NULL,
    updated_by UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. STRUCTURE DES FRAIS AVANCÉE
-- =====================================================

CREATE TABLE IF NOT EXISTS advanced_fee_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    currency VARCHAR(3) NOT NULL REFERENCES global_currencies(code),
    internal_fee_percentage DECIMAL(5, 4) DEFAULT 0.0050, -- 0.5%
    internal_fee_min DECIMAL(15, 2) DEFAULT 0.10,
    internal_fee_max DECIMAL(15, 2) DEFAULT 20.00,
    api_commission_percentage DECIMAL(5, 4) DEFAULT 0.0010, -- 0.1%
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. DÉTECTION AUTOMATIQUE DU PAYS
-- =====================================================

CREATE TABLE IF NOT EXISTS country_currency_mapping (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL UNIQUE, -- Code ISO 3166-1 alpha-2
    country_name VARCHAR(100) NOT NULL,
    currency_code VARCHAR(3) NOT NULL REFERENCES global_currencies(code),
    flag VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. SIMULATIONS DE CONVERSION
-- =====================================================

CREATE TABLE IF NOT EXISTS conversion_simulations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    rate_used DECIMAL(20, 8) NOT NULL,
    converted_amount DECIMAL(15, 2) NOT NULL,
    internal_fees DECIMAL(15, 2) NOT NULL,
    api_commission DECIMAL(15, 2) NOT NULL,
    total_fees DECIMAL(15, 2) NOT NULL,
    total_charged DECIMAL(15, 2) NOT NULL,
    platform_gain DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. STATISTIQUES DES TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS transaction_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    currency VARCHAR(3) NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    total_volume DECIMAL(15, 2) DEFAULT 0.00,
    total_fees DECIMAL(15, 2) DEFAULT 0.00,
    platform_revenue DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date, currency)
);

-- =====================================================
-- 8. INDEX POUR PERFORMANCE
-- =====================================================

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_advanced_exchange_rates_active 
ON advanced_exchange_rates(from_currency, to_currency, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_currency 
ON exchange_rate_history(from_currency, to_currency, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversion_simulations_user 
ON conversion_simulations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_statistics_date 
ON transaction_statistics(date, currency);

-- =====================================================
-- 9. FONCTIONS AVANCÉES
-- =====================================================

-- Fonction pour obtenir le taux de change actuel
CREATE OR REPLACE FUNCTION get_current_exchange_rate(
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
    SELECT aer.rate INTO rate
    FROM advanced_exchange_rates aer
    WHERE aer.from_currency = p_from_currency 
    AND aer.to_currency = p_to_currency 
    AND aer.is_active = true
    AND (aer.valid_until IS NULL OR aer.valid_until > NOW())
    ORDER BY aer.updated_at DESC
    LIMIT 1;
    
    -- Si trouvé, retourner le taux
    IF rate IS NOT NULL THEN
        RETURN rate;
    END IF;
    
    -- Sinon, chercher le taux inverse et l'inverser
    SELECT (1.0 / aer.rate) INTO rate
    FROM advanced_exchange_rates aer
    WHERE aer.from_currency = p_to_currency 
    AND aer.to_currency = p_from_currency 
    AND aer.is_active = true
    AND (aer.valid_until IS NULL OR aer.valid_until > NOW())
    ORDER BY aer.updated_at DESC
    LIMIT 1;
    
    -- Si toujours pas trouvé, retourner 1 (même devise)
    RETURN COALESCE(rate, 1.00000000);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour calculer les frais avancés
CREATE OR REPLACE FUNCTION calculate_advanced_fees(
    p_amount DECIMAL(15, 2),
    p_currency VARCHAR(3)
)
RETURNS JSONB AS $$
DECLARE
    fee_structure RECORD;
    internal_fees DECIMAL(15, 2);
    api_commission DECIMAL(15, 2);
    total_fees DECIMAL(15, 2);
BEGIN
    -- Récupérer la structure des frais
    SELECT 
        internal_fee_percentage,
        internal_fee_min,
        internal_fee_max,
        api_commission_percentage
    INTO fee_structure
    FROM advanced_fee_structures
    WHERE currency = p_currency AND is_active = true
    LIMIT 1;
    
    -- Si pas de structure trouvée, utiliser les valeurs par défaut
    IF fee_structure IS NULL THEN
        internal_fees := GREATEST(LEAST(p_amount * 0.005, 20.00), 0.10);
        api_commission := p_amount * 0.001;
    ELSE
        internal_fees := GREATEST(LEAST(p_amount * fee_structure.internal_fee_percentage, fee_structure.internal_fee_max), fee_structure.internal_fee_min);
        api_commission := p_amount * fee_structure.api_commission_percentage;
    END IF;
    
    total_fees := internal_fees + api_commission;
    
    RETURN jsonb_build_object(
        'internal_fees', internal_fees,
        'api_commission', api_commission,
        'total_fees', total_fees,
        'total_charged', p_amount + total_fees,
        'platform_gain', total_fees
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour simuler une conversion
CREATE OR REPLACE FUNCTION simulate_conversion(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3),
    p_amount DECIMAL(15, 2),
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    current_rate DECIMAL(20, 8);
    converted_amount DECIMAL(15, 2);
    fees_result JSONB;
    simulation_id UUID;
BEGIN
    -- Obtenir le taux actuel
    current_rate := get_current_exchange_rate(p_from_currency, p_to_currency);
    
    -- Calculer le montant converti
    converted_amount := p_amount * current_rate;
    
    -- Calculer les frais
    fees_result := calculate_advanced_fees(p_amount, p_from_currency);
    
    -- Enregistrer la simulation si un utilisateur est fourni
    IF p_user_id IS NOT NULL THEN
        INSERT INTO conversion_simulations (
            user_id, from_currency, to_currency, amount, rate_used,
            converted_amount, internal_fees, api_commission, total_fees,
            total_charged, platform_gain
        ) VALUES (
            p_user_id, p_from_currency, p_to_currency, p_amount, current_rate,
            converted_amount, 
            (fees_result->>'internal_fees')::DECIMAL(15, 2),
            (fees_result->>'api_commission')::DECIMAL(15, 2),
            (fees_result->>'total_fees')::DECIMAL(15, 2),
            (fees_result->>'total_charged')::DECIMAL(15, 2),
            (fees_result->>'platform_gain')::DECIMAL(15, 2)
        ) RETURNING id INTO simulation_id;
    END IF;
    
    RETURN jsonb_build_object(
        'simulation_id', simulation_id,
        'from_currency', p_from_currency,
        'to_currency', p_to_currency,
        'amount', p_amount,
        'current_rate', current_rate,
        'converted_amount', converted_amount,
        'fees', fees_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. RLS (Row Level Security)
-- =====================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE global_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE advanced_fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_currency_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_statistics ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour global_currencies (lecture publique)
CREATE POLICY "global_currencies_select_policy" ON global_currencies
    FOR SELECT USING (true);

-- Politiques RLS pour advanced_exchange_rates
CREATE POLICY "advanced_exchange_rates_select_policy" ON advanced_exchange_rates
    FOR SELECT USING (true);

CREATE POLICY "advanced_exchange_rates_insert_policy" ON advanced_exchange_rates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'pdg')
        )
    );

CREATE POLICY "advanced_exchange_rates_update_policy" ON advanced_exchange_rates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'pdg')
        )
    );

-- Politiques RLS pour exchange_rate_history
CREATE POLICY "exchange_rate_history_select_policy" ON exchange_rate_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'pdg')
        )
    );

-- Politiques RLS pour conversion_simulations
CREATE POLICY "conversion_simulations_select_policy" ON conversion_simulations
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('admin', 'pdg')
        )
    );

CREATE POLICY "conversion_simulations_insert_policy" ON conversion_simulations
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
CREATE TRIGGER update_global_currencies_updated_at
    BEFORE UPDATE ON global_currencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advanced_exchange_rates_updated_at
    BEFORE UPDATE ON advanced_exchange_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advanced_fee_structures_updated_at
    BEFORE UPDATE ON advanced_fee_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_statistics_updated_at
    BEFORE UPDATE ON transaction_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. DONNÉES INITIALES
-- =====================================================

-- Insérer les devises mondiales principales
INSERT INTO global_currencies (code, name, symbol, country, flag, is_active, decimal_places) VALUES
-- Afrique
('GNF', 'Guinean Franc', 'FG', 'Guinea', '🇬🇳', true, 0),
('XOF', 'West African CFA Franc', 'CFA', 'West Africa', '🌍', true, 0),
('XAF', 'Central African CFA Franc', 'CFA', 'Central Africa', '🌍', true, 0),
('NGN', 'Nigerian Naira', '₦', 'Nigeria', '🇳🇬', true, 2),
('ZAR', 'South African Rand', 'R', 'South Africa', '🇿🇦', true, 2),
('EGP', 'Egyptian Pound', '£', 'Egypt', '🇪🇬', true, 2),
('MAD', 'Moroccan Dirham', 'د.م.', 'Morocco', '🇲🇦', true, 2),
('TND', 'Tunisian Dinar', 'د.ت', 'Tunisia', '🇹🇳', true, 3),
('DZD', 'Algerian Dinar', 'د.ج', 'Algeria', '🇩🇿', true, 2),
('KES', 'Kenyan Shilling', 'KSh', 'Kenya', '🇰🇪', true, 2),
('GHS', 'Ghanaian Cedi', '₵', 'Ghana', '🇬🇭', true, 2),
('ETB', 'Ethiopian Birr', 'Br', 'Ethiopia', '🇪🇹', true, 2),

-- Amérique
('USD', 'US Dollar', '$', 'United States', '🇺🇸', true, 2),
('CAD', 'Canadian Dollar', 'C$', 'Canada', '🇨🇦', true, 2),
('BRL', 'Brazilian Real', 'R$', 'Brazil', '🇧🇷', true, 2),
('MXN', 'Mexican Peso', '$', 'Mexico', '🇲🇽', true, 2),
('ARS', 'Argentine Peso', '$', 'Argentina', '🇦🇷', true, 2),
('CLP', 'Chilean Peso', '$', 'Chile', '🇨🇱', true, 0),
('COP', 'Colombian Peso', '$', 'Colombia', '🇨🇴', true, 2),
('PEN', 'Peruvian Sol', 'S/', 'Peru', '🇵🇪', true, 2),

-- Europe
('EUR', 'Euro', '€', 'European Union', '🇪🇺', true, 2),
('GBP', 'British Pound', '£', 'United Kingdom', '🇬🇧', true, 2),
('CHF', 'Swiss Franc', 'CHF', 'Switzerland', '🇨🇭', true, 2),
('SEK', 'Swedish Krona', 'kr', 'Sweden', '🇸🇪', true, 2),
('NOK', 'Norwegian Krone', 'kr', 'Norway', '🇳🇴', true, 2),
('DKK', 'Danish Krone', 'kr', 'Denmark', '🇩🇰', true, 2),
('PLN', 'Polish Zloty', 'zł', 'Poland', '🇵🇱', true, 2),
('CZK', 'Czech Koruna', 'Kč', 'Czech Republic', '🇨🇿', true, 2),
('HUF', 'Hungarian Forint', 'Ft', 'Hungary', '🇭🇺', true, 2),
('RUB', 'Russian Ruble', '₽', 'Russia', '🇷🇺', true, 2),
('TRY', 'Turkish Lira', '₺', 'Turkey', '🇹🇷', true, 2),

-- Asie
('CNY', 'Chinese Yuan', '¥', 'China', '🇨🇳', true, 2),
('JPY', 'Japanese Yen', '¥', 'Japan', '🇯🇵', true, 0),
('KRW', 'South Korean Won', '₩', 'South Korea', '🇰🇷', true, 0),
('INR', 'Indian Rupee', '₹', 'India', '🇮🇳', true, 2),
('SGD', 'Singapore Dollar', 'S$', 'Singapore', '🇸🇬', true, 2),
('HKD', 'Hong Kong Dollar', 'HK$', 'Hong Kong', '🇭🇰', true, 2),
('TWD', 'Taiwan Dollar', 'NT$', 'Taiwan', '🇹🇼', true, 2),
('THB', 'Thai Baht', '฿', 'Thailand', '🇹🇭', true, 2),
('VND', 'Vietnamese Dong', '₫', 'Vietnam', '🇻🇳', true, 0),
('IDR', 'Indonesian Rupiah', 'Rp', 'Indonesia', '🇮🇩', true, 2),
('MYR', 'Malaysian Ringgit', 'RM', 'Malaysia', '🇲🇾', true, 2),
('PHP', 'Philippine Peso', '₱', 'Philippines', '🇵🇭', true, 2),
('AUD', 'Australian Dollar', 'A$', 'Australia', '🇦🇺', true, 2),
('NZD', 'New Zealand Dollar', 'NZ$', 'New Zealand', '🇳🇿', true, 2),

-- Moyen-Orient
('AED', 'UAE Dirham', 'د.إ', 'United Arab Emirates', '🇦🇪', true, 2),
('SAR', 'Saudi Riyal', '﷼', 'Saudi Arabia', '🇸🇦', true, 2),
('QAR', 'Qatari Riyal', '﷼', 'Qatar', '🇶🇦', true, 2),
('KWD', 'Kuwaiti Dinar', 'د.ك', 'Kuwait', '🇰🇼', true, 3),
('BHD', 'Bahraini Dinar', 'د.ب', 'Bahrain', '🇧🇭', true, 3),
('OMR', 'Omani Rial', '﷼', 'Oman', '🇴🇲', true, 3),
('JOD', 'Jordanian Dinar', 'د.ا', 'Jordan', '🇯🇴', true, 3),
('LBP', 'Lebanese Pound', 'ل.ل', 'Lebanon', '🇱🇧', true, 2),
('ILS', 'Israeli Shekel', '₪', 'Israel', '🇮🇱', true, 2)
ON CONFLICT (code) DO NOTHING;

-- Insérer le mapping pays → devise
INSERT INTO country_currency_mapping (country_code, country_name, currency_code, flag) VALUES
-- Afrique
('GN', 'Guinea', 'GNF', '🇬🇳'),
('CI', 'Côte d\'Ivoire', 'XOF', '🇨🇮'),
('SN', 'Senegal', 'XOF', '🇸🇳'),
('ML', 'Mali', 'XOF', '🇲🇱'),
('BF', 'Burkina Faso', 'XOF', '🇧🇫'),
('NE', 'Niger', 'XOF', '🇳🇪'),
('CM', 'Cameroon', 'XAF', '🇨🇲'),
('TD', 'Chad', 'XAF', '🇹🇩'),
('CF', 'Central African Republic', 'XAF', '🇨🇫'),
('GQ', 'Equatorial Guinea', 'XAF', '🇬🇶'),
('GA', 'Gabon', 'XAF', '🇬🇦'),
('CG', 'Republic of the Congo', 'XAF', '🇨🇬'),
('NG', 'Nigeria', 'NGN', '🇳🇬'),
('ZA', 'South Africa', 'ZAR', '🇿🇦'),
('EG', 'Egypt', 'EGP', '🇪🇬'),
('MA', 'Morocco', 'MAD', '🇲🇦'),
('TN', 'Tunisia', 'TND', '🇹🇳'),
('DZ', 'Algeria', 'DZD', '🇩🇿'),
('KE', 'Kenya', 'KES', '🇰🇪'),
('GH', 'Ghana', 'GHS', '🇬🇭'),
('ET', 'Ethiopia', 'ETB', '🇪🇹'),

-- Amérique
('US', 'United States', 'USD', '🇺🇸'),
('CA', 'Canada', 'CAD', '🇨🇦'),
('BR', 'Brazil', 'BRL', '🇧🇷'),
('MX', 'Mexico', 'MXN', '🇲🇽'),
('AR', 'Argentina', 'ARS', '🇦🇷'),
('CL', 'Chile', 'CLP', '🇨🇱'),
('CO', 'Colombia', 'COP', '🇨🇴'),
('PE', 'Peru', 'PEN', '🇵🇪'),

-- Europe
('FR', 'France', 'EUR', '🇫🇷'),
('DE', 'Germany', 'EUR', '🇩🇪'),
('IT', 'Italy', 'EUR', '🇮🇹'),
('ES', 'Spain', 'EUR', '🇪🇸'),
('NL', 'Netherlands', 'EUR', '🇳🇱'),
('BE', 'Belgium', 'EUR', '🇧🇪'),
('AT', 'Austria', 'EUR', '🇦🇹'),
('PT', 'Portugal', 'EUR', '🇵🇹'),
('IE', 'Ireland', 'EUR', '🇮🇪'),
('FI', 'Finland', 'EUR', '🇫🇮'),
('LU', 'Luxembourg', 'EUR', '🇱🇺'),
('MT', 'Malta', 'EUR', '🇲🇹'),
('CY', 'Cyprus', 'EUR', '🇨🇾'),
('SK', 'Slovakia', 'EUR', '🇸🇰'),
('SI', 'Slovenia', 'EUR', '🇸🇮'),
('EE', 'Estonia', 'EUR', '🇪🇪'),
('LV', 'Latvia', 'EUR', '🇱🇻'),
('LT', 'Lithuania', 'EUR', '🇱🇹'),
('GB', 'United Kingdom', 'GBP', '🇬🇧'),
('CH', 'Switzerland', 'CHF', '🇨🇭'),
('SE', 'Sweden', 'SEK', '🇸🇪'),
('NO', 'Norway', 'NOK', '🇳🇴'),
('DK', 'Denmark', 'DKK', '🇩🇰'),
('PL', 'Poland', 'PLN', '🇵🇱'),
('CZ', 'Czech Republic', 'CZK', '🇨🇿'),
('HU', 'Hungary', 'HUF', '🇭🇺'),
('RU', 'Russia', 'RUB', '🇷🇺'),
('TR', 'Turkey', 'TRY', '🇹🇷'),

-- Asie
('CN', 'China', 'CNY', '🇨🇳'),
('JP', 'Japan', 'JPY', '🇯🇵'),
('KR', 'South Korea', 'KRW', '🇰🇷'),
('IN', 'India', 'INR', '🇮🇳'),
('SG', 'Singapore', 'SGD', '🇸🇬'),
('HK', 'Hong Kong', 'HKD', '🇭🇰'),
('TW', 'Taiwan', 'TWD', '🇹🇼'),
('TH', 'Thailand', 'THB', '🇹🇭'),
('VN', 'Vietnam', 'VND', '🇻🇳'),
('ID', 'Indonesia', 'IDR', '🇮🇩'),
('MY', 'Malaysia', 'MYR', '🇲🇾'),
('PH', 'Philippines', 'PHP', '🇵🇭'),
('AU', 'Australia', 'AUD', '🇦🇺'),
('NZ', 'New Zealand', 'NZD', '🇳🇿'),

-- Moyen-Orient
('AE', 'United Arab Emirates', 'AED', '🇦🇪'),
('SA', 'Saudi Arabia', 'SAR', '🇸🇦'),
('QA', 'Qatar', 'QAR', '🇶🇦'),
('KW', 'Kuwait', 'KWD', '🇰🇼'),
('BH', 'Bahrain', 'BHD', '🇧🇭'),
('OM', 'Oman', 'OMR', '🇴🇲'),
('JO', 'Jordan', 'JOD', '🇯🇴'),
('LB', 'Lebanon', 'LBP', '🇱🇧'),
('IL', 'Israel', 'ILS', '🇮🇱')
ON CONFLICT (country_code) DO NOTHING;

-- Insérer les structures de frais par défaut
INSERT INTO advanced_fee_structures (currency, internal_fee_percentage, internal_fee_min, internal_fee_max, api_commission_percentage) VALUES
('GNF', 0.005, 1000, 100000, 0.001),
('USD', 0.005, 0.10, 20.00, 0.001),
('EUR', 0.005, 0.10, 20.00, 0.001),
('XOF', 0.005, 50, 10000, 0.001),
('XAF', 0.005, 50, 10000, 0.001),
('NGN', 0.005, 50, 10000, 0.001),
('GBP', 0.005, 0.10, 20.00, 0.001),
('CAD', 0.005, 0.10, 20.00, 0.001),
('CNY', 0.005, 1.00, 150.00, 0.001),
('JPY', 0.005, 10, 3000, 0.001)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 13. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE global_currencies IS 'Devises mondiales ISO 4217 avec métadonnées complètes';
COMMENT ON TABLE advanced_exchange_rates IS 'Taux de change avancés avec contrôle manuel PDG';
COMMENT ON TABLE exchange_rate_history IS 'Historique des modifications de taux de change';
COMMENT ON TABLE advanced_fee_structures IS 'Structures de frais avancées par devise';
COMMENT ON TABLE country_currency_mapping IS 'Mapping pays → devise par défaut';
COMMENT ON TABLE conversion_simulations IS 'Simulations de conversion pour tests';
COMMENT ON TABLE transaction_statistics IS 'Statistiques des transactions par devise';

COMMENT ON COLUMN global_currencies.flag IS 'Emoji du drapeau du pays';
COMMENT ON COLUMN advanced_exchange_rates.source IS 'Source du taux: manual, api, fallback';
COMMENT ON COLUMN advanced_exchange_rates.updated_by IS 'ID de l\'utilisateur qui a mis à jour le taux';
COMMENT ON COLUMN exchange_rate_history.reason IS 'Raison du changement de taux';
COMMENT ON COLUMN advanced_fee_structures.internal_fee_percentage IS 'Pourcentage des frais internes (0.005 = 0.5%)';
COMMENT ON COLUMN advanced_fee_structures.api_commission_percentage IS 'Pourcentage de commission API (0.001 = 0.1%)';
