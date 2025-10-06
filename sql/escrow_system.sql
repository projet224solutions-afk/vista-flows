-- 🛡️ SYSTÈME ESCROW 224SECURE - 224SOLUTIONS
-- Tables pour le système de séquestre et facturation dynamique

-- =====================================================
-- TABLE DES FACTURES ESCROW
-- =====================================================

CREATE TABLE IF NOT EXISTS escrow_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(50) NOT NULL,
    client_id VARCHAR(50),
    client_name VARCHAR(100),
    client_phone VARCHAR(20),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    start_location TEXT NOT NULL,
    end_location TEXT NOT NULL,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, completed, cancelled
    payment_link TEXT NOT NULL,
    qr_code TEXT,
    notes TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les factures
CREATE INDEX IF NOT EXISTS idx_escrow_invoices_driver ON escrow_invoices(driver_id);
CREATE INDEX IF NOT EXISTS idx_escrow_invoices_client ON escrow_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_escrow_invoices_status ON escrow_invoices(status);
CREATE INDEX IF NOT EXISTS idx_escrow_invoices_expires ON escrow_invoices(expires_at);

-- =====================================================
-- TABLE DES TRANSACTIONS ESCROW
-- =====================================================

CREATE TABLE IF NOT EXISTS escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES escrow_invoices(id) ON DELETE CASCADE,
    client_id VARCHAR(50) NOT NULL,
    driver_id VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL, -- montant net pour le livreur
    fee_percent DECIMAL(5, 2) DEFAULT 1.00, -- pourcentage de frais
    fee_amount DECIMAL(12, 2) NOT NULL, -- montant des frais
    total_amount DECIMAL(12, 2) NOT NULL, -- montant total payé par le client
    status VARCHAR(20) DEFAULT 'pending', -- pending, released, refunded, disputed
    dispute_reason TEXT,
    start_location TEXT NOT NULL,
    end_location TEXT NOT NULL,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    payment_method VARCHAR(50),
    payment_data JSONB,
    proof_of_delivery JSONB, -- photo, coordinates, timestamp
    created_at TIMESTAMP DEFAULT NOW(),
    released_at TIMESTAMP,
    refunded_at TIMESTAMP,
    disputed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les transactions
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_invoice ON escrow_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_client ON escrow_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_driver ON escrow_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_created ON escrow_transactions(created_at);

-- =====================================================
-- TABLE DES LITIGES ESCROW
-- =====================================================

CREATE TABLE IF NOT EXISTS escrow_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    client_id VARCHAR(50) NOT NULL,
    driver_id VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL, -- reason for dispute
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, investigating, resolved, closed
    resolution TEXT,
    evidence JSONB, -- photos, messages, coordinates
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les litiges
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_transaction ON escrow_disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_client ON escrow_disputes(client_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_driver ON escrow_disputes(driver_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_status ON escrow_disputes(status);

-- =====================================================
-- TABLE DES COMMISSIONS ESCROW
-- =====================================================

CREATE TABLE IF NOT EXISTS escrow_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL, -- montant de la commission
    currency VARCHAR(3) DEFAULT 'GNF',
    commission_type VARCHAR(20) DEFAULT 'escrow_fee', -- escrow_fee, dispute_fee
    status VARCHAR(20) DEFAULT 'pending', -- pending, collected, refunded
    collected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les commissions
CREATE INDEX IF NOT EXISTS idx_escrow_commissions_transaction ON escrow_commissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_commissions_status ON escrow_commissions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_commissions_collected ON escrow_commissions(collected_at);

-- =====================================================
-- TABLE DES NOTIFICATIONS ESCROW
-- =====================================================

CREATE TABLE IF NOT EXISTS escrow_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- escrow_initiated, escrow_released, escrow_refunded, escrow_disputed
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    transaction_id UUID REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    dispute_id UUID REFERENCES escrow_disputes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_escrow_notifications_user ON escrow_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_notifications_type ON escrow_notifications(type);
CREATE INDEX IF NOT EXISTS idx_escrow_notifications_read ON escrow_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_escrow_notifications_created ON escrow_notifications(created_at);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer les frais Escrow
CREATE OR REPLACE FUNCTION calculate_escrow_fees(
    amount DECIMAL,
    fee_percent DECIMAL DEFAULT 1.00
) RETURNS TABLE (
    fee_amount DECIMAL,
    total_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(amount * (fee_percent / 100), 2) as fee_amount,
        ROUND(amount + (amount * (fee_percent / 100)), 2) as total_amount;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques Escrow
CREATE OR REPLACE FUNCTION get_escrow_stats(
    start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP DEFAULT NOW()
) RETURNS TABLE (
    total_transactions BIGINT,
    total_amount DECIMAL,
    total_fees DECIMAL,
    pending_transactions BIGINT,
    released_transactions BIGINT,
    refunded_transactions BIGINT,
    disputed_transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(fee_amount), 0) as total_fees,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions,
        COUNT(*) FILTER (WHERE status = 'released') as released_transactions,
        COUNT(*) FILTER (WHERE status = 'refunded') as refunded_transactions,
        COUNT(*) FILTER (WHERE status = 'disputed') as disputed_transactions
    FROM escrow_transactions
    WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_escrow_invoices_updated_at
    BEFORE UPDATE ON escrow_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_transactions_updated_at
    BEFORE UPDATE ON escrow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_disputes_updated_at
    BEFORE UPDATE ON escrow_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE escrow_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_notifications ENABLE ROW LEVEL SECURITY;

-- Politiques pour escrow_invoices
CREATE POLICY "Users can view their invoices" ON escrow_invoices
    FOR SELECT USING (
        driver_id = current_setting('app.current_user_id', true) OR
        client_id = current_setting('app.current_user_id', true)
    );

CREATE POLICY "Drivers can create invoices" ON escrow_invoices
    FOR INSERT WITH CHECK (driver_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their invoices" ON escrow_invoices
    FOR UPDATE USING (
        driver_id = current_setting('app.current_user_id', true) OR
        client_id = current_setting('app.current_user_id', true)
    );

-- Politiques pour escrow_transactions
CREATE POLICY "Users can view their transactions" ON escrow_transactions
    FOR SELECT USING (
        client_id = current_setting('app.current_user_id', true) OR
        driver_id = current_setting('app.current_user_id', true)
    );

CREATE POLICY "System can create transactions" ON escrow_transactions
    FOR INSERT WITH CHECK (true); -- Le système peut créer des transactions

-- Politiques pour escrow_disputes
CREATE POLICY "Users can view their disputes" ON escrow_disputes
    FOR SELECT USING (
        client_id = current_setting('app.current_user_id', true) OR
        driver_id = current_setting('app.current_user_id', true)
    );

CREATE POLICY "Users can create disputes" ON escrow_disputes
    FOR INSERT WITH CHECK (
        client_id = current_setting('app.current_user_id', true) OR
        driver_id = current_setting('app.current_user_id', true)
    );

-- Politiques pour escrow_notifications
CREATE POLICY "Users can view their notifications" ON escrow_notifications
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "System can create notifications" ON escrow_notifications
    FOR INSERT WITH CHECK (true); -- Le système peut créer des notifications

-- =====================================================
-- VUES UTILITAIRES
-- =====================================================

-- Vue des transactions Escrow actives
CREATE VIEW active_escrow_transactions AS
SELECT 
    et.*,
    ei.driver_id,
    ei.client_name,
    ei.client_phone,
    ei.start_location,
    ei.end_location,
    ei.description
FROM escrow_transactions et
JOIN escrow_invoices ei ON et.invoice_id = ei.id
WHERE et.status = 'pending';

-- Vue des litiges ouverts
CREATE VIEW open_escrow_disputes AS
SELECT 
    ed.*,
    et.amount,
    et.total_amount,
    et.client_id,
    et.driver_id,
    ei.start_location,
    ei.end_location
FROM escrow_disputes ed
JOIN escrow_transactions et ON ed.transaction_id = et.id
JOIN escrow_invoices ei ON et.invoice_id = ei.id
WHERE ed.status = 'open';

-- Vue des statistiques par livreur
CREATE VIEW driver_escrow_stats AS
SELECT 
    et.driver_id,
    COUNT(*) as total_transactions,
    SUM(et.amount) as total_earnings,
    SUM(et.fee_amount) as total_fees_paid,
    AVG(et.amount) as average_transaction,
    COUNT(*) FILTER (WHERE et.status = 'released') as completed_transactions,
    COUNT(*) FILTER (WHERE et.status = 'disputed') as disputed_transactions
FROM escrow_transactions et
GROUP BY et.driver_id;

-- =====================================================
-- DONNÉES DE TEST
-- =====================================================

-- Insérer des factures de test
INSERT INTO escrow_invoices (id, driver_id, amount, description, start_location, end_location, status, payment_link, expires_at) VALUES
('test_invoice_001', 'delivery_001', 1500.00, 'Trajet de test', 'Conakry Centre', 'Conakry Aéroport', 'draft', 'https://224solutions.app/pay/test_invoice_001', NOW() + INTERVAL '24 hours'),
('test_invoice_002', 'delivery_002', 2000.00, 'Trajet de test 2', 'Conakry Port', 'Conakry Centre', 'draft', 'https://224solutions.app/pay/test_invoice_002', NOW() + INTERVAL '24 hours');

-- =====================================================
-- CONFIGURATION TERMINÉE
-- =====================================================

SELECT 'Système Escrow 224SECURE configuré avec succès' as status;
