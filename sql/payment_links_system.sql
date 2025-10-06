-- =====================================================
-- SYSTÈME DE LIENS DE PAIEMENT 224SOLUTIONS
-- =====================================================

-- Table principale pour les liens de paiement
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id VARCHAR(255) UNIQUE NOT NULL, -- ID unique du lien (UUID)
    vendeur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optionnel
    produit VARCHAR(255) NOT NULL,
    description TEXT,
    montant DECIMAL(15,2) NOT NULL,
    devise VARCHAR(10) NOT NULL DEFAULT 'GNF',
    frais DECIMAL(15,2) NOT NULL, -- 1% du montant
    total DECIMAL(15,2) NOT NULL, -- montant + frais
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Métadonnées
    ip_address INET,
    user_agent TEXT,
    payment_method VARCHAR(50), -- 'wallet', 'card', 'mobile_money', etc.
    transaction_id VARCHAR(255), -- ID de la transaction du prestataire
    
    -- Index pour les performances
    INDEX idx_payment_links_vendeur (vendeur_id),
    INDEX idx_payment_links_client (client_id),
    INDEX idx_payment_links_status (status),
    INDEX idx_payment_links_payment_id (payment_id),
    INDEX idx_payment_links_created_at (created_at)
);

-- Table pour l'historique des paiements
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
    vendeur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    montant DECIMAL(15,2) NOT NULL,
    frais DECIMAL(15,2) NOT NULL,
    total DECIMAL(15,2) NOT NULL,
    devise VARCHAR(10) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Index
    INDEX idx_payment_transactions_payment_link (payment_link_id),
    INDEX idx_payment_transactions_vendeur (vendeur_id),
    INDEX idx_payment_transactions_client (client_id),
    INDEX idx_payment_transactions_status (status)
);

-- Table pour les notifications de paiement
CREATE TABLE IF NOT EXISTS payment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_link_id UUID NOT NULL REFERENCES payment_links(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'payment_created', 'payment_success', 'payment_failed', 'payment_expired'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_email BOOLEAN DEFAULT FALSE,
    sent_push BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Index
    INDEX idx_payment_notifications_user (user_id),
    INDEX idx_payment_notifications_type (type),
    INDEX idx_payment_notifications_created_at (created_at)
);

-- Fonction pour calculer automatiquement les frais (1%)
CREATE OR REPLACE FUNCTION calculate_payment_fees(amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(amount * 0.01, 2);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le total (montant + frais)
CREATE OR REPLACE FUNCTION calculate_payment_total(amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(amount + calculate_payment_fees(amount), 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_links_updated_at
    BEFORE UPDATE ON payment_links
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_links_updated_at();

-- Trigger pour créer automatiquement les frais et total
CREATE OR REPLACE FUNCTION set_payment_calculations()
RETURNS TRIGGER AS $$
BEGIN
    NEW.frais = calculate_payment_fees(NEW.montant);
    NEW.total = calculate_payment_total(NEW.montant);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_payment_calculations
    BEFORE INSERT OR UPDATE ON payment_links
    FOR EACH ROW
    EXECUTE FUNCTION set_payment_calculations();

-- Vue pour les statistiques des paiements
CREATE OR REPLACE VIEW payment_stats AS
SELECT 
    vendeur_id,
    COUNT(*) as total_links,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_payments,
    SUM(CASE WHEN status = 'success' THEN total ELSE 0 END) as total_revenue,
    SUM(CASE WHEN status = 'success' THEN frais ELSE 0 END) as total_fees,
    AVG(CASE WHEN status = 'success' THEN total ELSE NULL END) as avg_payment_amount
FROM payment_links
GROUP BY vendeur_id;

-- Politiques de sécurité RLS
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour les vendeurs : peuvent voir leurs propres liens
CREATE POLICY "Vendeurs peuvent voir leurs liens" ON payment_links
    FOR ALL USING (vendeur_id = auth.uid());

-- Politique pour les clients : peuvent voir les liens qui leur sont destinés
CREATE POLICY "Clients peuvent voir leurs liens" ON payment_links
    FOR SELECT USING (client_id = auth.uid());

-- Politique pour les admins/PDG : accès complet
CREATE POLICY "Admins accès complet" ON payment_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- Politiques similaires pour payment_transactions
CREATE POLICY "Vendeurs peuvent voir leurs transactions" ON payment_transactions
    FOR ALL USING (vendeur_id = auth.uid());

CREATE POLICY "Clients peuvent voir leurs transactions" ON payment_transactions
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Admins accès complet transactions" ON payment_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- Politiques pour les notifications
CREATE POLICY "Users peuvent voir leurs notifications" ON payment_notifications
    FOR ALL USING (user_id = auth.uid());

-- Insertion de données de test (optionnel)
INSERT INTO payment_links (payment_id, vendeur_id, produit, montant, devise, status) VALUES
('test-payment-001', (SELECT id FROM auth.users LIMIT 1), 'Test Produit', 1000.00, 'GNF', 'pending')
ON CONFLICT (payment_id) DO NOTHING;

-- Commentaires sur les tables
COMMENT ON TABLE payment_links IS 'Liens de paiement créés par les vendeurs';
COMMENT ON TABLE payment_transactions IS 'Historique des transactions de paiement';
COMMENT ON TABLE payment_notifications IS 'Notifications liées aux paiements';
COMMENT ON COLUMN payment_links.frais IS 'Frais de transaction (1% du montant)';
COMMENT ON COLUMN payment_links.total IS 'Montant total (montant + frais)';
COMMENT ON COLUMN payment_links.expires_at IS 'Date d\'expiration du lien (7 jours par défaut)';
