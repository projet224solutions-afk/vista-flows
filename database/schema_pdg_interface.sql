-- 🗄️ SCHEMA BASE DE DONNÉES - INTERFACE PDG 224SOLUTIONS
-- Tables nécessaires pour l'interface PDG/Vendeur

-- Table des liens de paiement
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    vendeur_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    produit VARCHAR(255) NOT NULL,
    description TEXT,
    montant DECIMAL(15,2) NOT NULL,
    frais DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    devise VARCHAR(3) DEFAULT 'GNF',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    data_json JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de détection de fraude
CREATE TABLE IF NOT EXISTS fraud_detection_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    transaction_id UUID,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_score DECIMAL(5,2) NOT NULL,
    description TEXT NOT NULL,
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Table de configuration des commissions
CREATE TABLE IF NOT EXISTS commission_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(100) NOT NULL,
    commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('percentage', 'fixed', 'hybrid')),
    commission_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des conversations du copilote
CREATE TABLE IF NOT EXISTS copilot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdg_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message_in TEXT NOT NULL,
    message_out TEXT NOT NULL,
    mfa_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_payment_links_vendeur_id ON payment_links(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_client_id ON payment_links(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_created_at ON payment_links(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON fraud_detection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_risk_level ON fraud_detection_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_reviewed ON fraud_detection_logs(reviewed);

CREATE INDEX IF NOT EXISTS idx_commission_config_service ON commission_config(service_name);
CREATE INDEX IF NOT EXISTS idx_commission_config_active ON commission_config(is_active);

CREATE INDEX IF NOT EXISTS idx_copilot_conversations_pdg_user_id ON copilot_conversations(pdg_user_id);
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_created_at ON copilot_conversations(created_at);

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_commission_config_updated_at 
    BEFORE UPDATE ON commission_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vues utiles pour l'interface PDG
CREATE OR REPLACE VIEW pdg_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE role = 'vendeur') as total_vendeurs,
    (SELECT COUNT(*) FROM profiles WHERE role = 'client') as total_clients,
    (SELECT COUNT(*) FROM payment_links WHERE status = 'success') as successful_payments,
    (SELECT COALESCE(SUM(total), 0) FROM payment_links WHERE status = 'success') as total_revenue,
    (SELECT COUNT(*) FROM fraud_detection_logs WHERE reviewed = FALSE) as pending_fraud_alerts;

-- RLS (Row Level Security) - À configurer selon vos besoins
-- ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fraud_detection_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE commission_config ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE copilot_conversations ENABLE ROW LEVEL SECURITY;
