-- 🏗️ MIGRATION COMPLÈTE 224SOLUTIONS
-- Système complet : Utilisateurs, Wallets, Transactions, Commissions, Notifications
-- Ne supprime aucune table existante, ajoute uniquement les manquantes

-- ========================================
-- 1. TABLE UTILISATEURS (si pas existante)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE, -- ID Firebase Auth
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'client' CHECK (role IN ('client', 'vendeur', 'transitaire', 'pdg', 'admin', 'syndicat_president')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    wallet_id UUID, -- Référence vers le wallet
    fcm_token TEXT, -- Token FCM pour notifications
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. TABLE WALLETS (système complet)
-- ========================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) UNIQUE NOT NULL, -- Adresse unique du wallet
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'GNF',
    is_active BOOLEAN DEFAULT true,
    is_frozen BOOLEAN DEFAULT false,
    total_received DECIMAL(15,2) DEFAULT 0.00,
    total_sent DECIMAL(15,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(15,2) DEFAULT 0.00,
    commission_earned DECIMAL(15,2) DEFAULT 0.00, -- Commissions gagnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. TABLE TRANSACTIONS (historique complet)
-- ========================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL, -- Code unique de transaction
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    sender_wallet_id UUID REFERENCES wallets(id),
    receiver_wallet_id UUID REFERENCES wallets(id),
    
    -- Informations détaillées (obligatoires pour historique)
    sender_name VARCHAR(200) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(20),
    receiver_name VARCHAR(200),
    receiver_email VARCHAR(255),
    receiver_phone VARCHAR(20),
    
    -- Montants et frais
    amount DECIMAL(15,2) NOT NULL,
    commission DECIMAL(15,2) DEFAULT 0.00,
    fees DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL, -- amount + commission + fees
    currency VARCHAR(10) DEFAULT 'GNF',
    
    -- Type et méthode
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('transfer', 'withdrawal', 'deposit', 'commission', 'refund')),
    payment_method VARCHAR(50) CHECK (payment_method IN ('wallet_transfer', 'paypal', 'stripe', 'mobile_money', 'bank_card')),
    
    -- Statut et suivi
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    description TEXT,
    reference_id VARCHAR(255), -- ID de référence externe (PayPal, Stripe, etc.)
    
    -- Horodatage précis
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. TABLE COMMISSIONS (calcul automatique)
-- ========================================
CREATE TABLE IF NOT EXISTS commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    commission_type VARCHAR(50) NOT NULL CHECK (commission_type IN ('transfer', 'withdrawal', 'deposit', 'platform')),
    base_amount DECIMAL(15,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL, -- Ex: 0.0150 pour 1.5%
    commission_amount DECIMAL(15,2) NOT NULL,
    fixed_fee DECIMAL(15,2) DEFAULT 0.00, -- Frais fixes (ex: 1000 GNF)
    currency VARCHAR(10) DEFAULT 'GNF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. TABLE NOTIFICATIONS (Firebase FCM)
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSONB, -- Données additionnelles
    fcm_message_id VARCHAR(255), -- ID du message FCM
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 6. TABLE MESSAGES (communication)
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    conversation_id UUID, -- Pour grouper les messages
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location')),
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 7. TABLE ORDERS (commandes marketplace)
-- ========================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES users(id),
    vendeur_id UUID REFERENCES users(id),
    transitaire_id UUID REFERENCES users(id),
    
    -- Détails commande
    total_amount DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'GNF',
    
    -- Statut et suivi
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    tracking_number VARCHAR(100),
    
    -- Adresses
    pickup_address TEXT,
    delivery_address TEXT NOT NULL,
    
    -- Horodatage
    order_date DATE DEFAULT CURRENT_DATE,
    estimated_delivery DATE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 8. TABLE TRACKING (géolocalisation)
-- ========================================
CREATE TABLE IF NOT EXISTS tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    transitaire_id UUID REFERENCES users(id),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    location_name VARCHAR(255),
    status VARCHAR(50),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEX POUR OPTIMISATION
-- ========================================

-- Index utilisateurs
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_wallet_id ON users(wallet_id);

-- Index wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallets_active ON wallets(is_active);

-- Index transactions
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_code ON transactions(transaction_code);

-- Index notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Index messages
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Index orders
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendeur ON orders(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_orders_transitaire ON orders(transitaire_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);

-- ========================================
-- CONTRAINTES ET RELATIONS
-- ========================================

-- Lier wallet_id dans users
ALTER TABLE users ADD CONSTRAINT fk_users_wallet 
    FOREIGN KEY (wallet_id) REFERENCES wallets(id);

-- ========================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- ========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS (ROW LEVEL SECURITY)
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;

-- Politiques RLS basiques (à affiner selon les besoins)
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::text = firebase_uid OR auth.role() = 'service_role');

CREATE POLICY "Users can view their own wallet" ON wallets
    FOR SELECT USING (user_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text));

CREATE POLICY "Users can view their transactions" ON transactions
    FOR SELECT USING (
        sender_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) OR
        receiver_id IN (SELECT id FROM users WHERE firebase_uid = auth.uid()::text) OR
        auth.role() = 'service_role'
    );

-- ========================================
-- COMMENTAIRES POUR DOCUMENTATION
-- ========================================

COMMENT ON TABLE users IS 'Utilisateurs 224Solutions avec authentification Firebase';
COMMENT ON TABLE wallets IS 'Portefeuilles utilisateurs avec soldes et historique';
COMMENT ON TABLE transactions IS 'Historique complet des transactions avec détails obligatoires';
COMMENT ON TABLE commissions IS 'Calcul automatique des commissions et frais';
COMMENT ON TABLE notifications IS 'Notifications Firebase Cloud Messaging';
COMMENT ON TABLE messages IS 'Système de messagerie entre utilisateurs';
COMMENT ON TABLE orders IS 'Commandes marketplace avec suivi';
COMMENT ON TABLE tracking IS 'Géolocalisation en temps réel des livraisons';

COMMENT ON COLUMN transactions.transaction_code IS 'Code unique de transaction pour traçabilité';
COMMENT ON COLUMN transactions.commission IS 'Commission calculée automatiquement (1.5% transfert)';
COMMENT ON COLUMN transactions.fees IS 'Frais fixes (1000 GNF retrait)';
COMMENT ON COLUMN wallets.wallet_address IS 'Adresse unique du portefeuille';
COMMENT ON COLUMN users.firebase_uid IS 'ID utilisateur Firebase Authentication';
