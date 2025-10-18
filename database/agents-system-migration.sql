-- database/agents-system-migration.sql
-- Migration pour le système complet Agents/Sous-agents/Utilisateurs

-- Table PGD (Directeur Général)
CREATE TABLE IF NOT EXISTS public.pgd (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Agents
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    pgd_id UUID REFERENCES public.pgd(id) ON DELETE CASCADE,
    can_create_sub_agent BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Sous-agents
CREATE TABLE IF NOT EXISTS public.sub_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    parent_agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Utilisateurs
CREATE TABLE IF NOT EXISTS public.agent_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    creator_id UUID NOT NULL, -- Peut être agent ou sous-agent
    creator_type VARCHAR(20) NOT NULL CHECK (creator_type IN ('agent', 'sub_agent')),
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
    invite_token VARCHAR(255) UNIQUE,
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'pc')),
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Commissions
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL, -- ID de l'agent ou sous-agent
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('agent', 'sub_agent')),
    amount DECIMAL(15,2) NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('user', 'sub_agent_user')),
    source_id UUID NOT NULL, -- ID de l'utilisateur source
    transaction_id UUID,
    commission_rate DECIMAL(5,4) NOT NULL, -- Taux appliqué (ex: 0.20 pour 20%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Transactions
CREATE TABLE IF NOT EXISTS public.agent_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.agent_users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    net_amount DECIMAL(15,2) NOT NULL, -- Montant net après frais et taxes
    fees DECIMAL(15,2) DEFAULT 0,
    taxes DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Paramètres de Commission
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Historique des Actions
CREATE TABLE IF NOT EXISTS public.agent_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('pgd', 'agent', 'sub_agent')),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_agents_pgd_id ON public.agents(pgd_id);
CREATE INDEX IF NOT EXISTS idx_sub_agents_parent_id ON public.sub_agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_users_creator ON public.agent_users(creator_id, creator_type);
CREATE INDEX IF NOT EXISTS idx_commissions_recipient ON public.commissions(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_commissions_source ON public.commissions(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_user ON public.agent_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.agent_audit_logs(actor_id, actor_type);

-- RLS (Row Level Security)
ALTER TABLE public.pgd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour PGD
CREATE POLICY "PGD can manage all agents data" ON public.agents
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "PGD can manage all sub_agents data" ON public.sub_agents
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "PGD can manage all agent_users data" ON public.agent_users
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "PGD can view all commissions" ON public.commissions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "PGD can view all transactions" ON public.agent_transactions
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Politiques RLS pour Agents
CREATE POLICY "Agents can manage their own data" ON public.agents
    FOR ALL TO authenticated
    USING (id = (SELECT id FROM public.agents WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Agents can manage their sub_agents" ON public.sub_agents
    FOR ALL TO authenticated
    USING (parent_agent_id = (SELECT id FROM public.agents WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "Agents can manage their users" ON public.agent_users
    FOR ALL TO authenticated
    USING (creator_id = (SELECT id FROM public.agents WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) AND creator_type = 'agent');

-- Politiques RLS pour Sous-agents
CREATE POLICY "Sub_agents can manage their users" ON public.agent_users
    FOR ALL TO authenticated
    USING (creator_id = (SELECT id FROM public.sub_agents WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) AND creator_type = 'sub_agent');

-- Insérer les paramètres de commission par défaut
INSERT INTO public.commission_settings (key, value, description) VALUES
('base_user_commission', '0.20', 'Commission de base pour les utilisateurs (20%)'),
('parent_share_ratio', '0.50', 'Ratio de partage entre sous-agent et agent parent (50%)'),
('commission_calculation_method', 'net_revenue', 'Méthode de calcul des commissions sur le revenu net')
ON CONFLICT (key) DO NOTHING;

-- Fonction pour calculer automatiquement les commissions
CREATE OR REPLACE FUNCTION calculate_commissions(
    p_user_id UUID,
    p_amount DECIMAL(15,2),
    p_net_amount DECIMAL(15,2)
) RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
    v_agent RECORD;
    v_sub_agent RECORD;
    v_base_commission DECIMAL(5,4);
    v_parent_share_ratio DECIMAL(5,4);
    v_agent_amount DECIMAL(15,2);
    v_sub_agent_amount DECIMAL(15,2);
    v_parent_amount DECIMAL(15,2);
    v_commission_id UUID;
    v_result JSONB := '[]'::JSONB;
BEGIN
    -- Récupérer les paramètres de commission
    SELECT 
        (value->>'value')::DECIMAL(5,4) INTO v_base_commission
    FROM public.commission_settings 
    WHERE key = 'base_user_commission';
    
    SELECT 
        (value->>'value')::DECIMAL(5,4) INTO v_parent_share_ratio
    FROM public.commission_settings 
    WHERE key = 'parent_share_ratio';
    
    -- Récupérer l'utilisateur et son créateur
    SELECT * INTO v_user FROM public.agent_users WHERE id = p_user_id;
    
    IF v_user.creator_type = 'agent' THEN
        -- Utilisateur créé par un agent -> l'agent reçoit la totalité
        SELECT * INTO v_agent FROM public.agents WHERE id = v_user.creator_id;
        
        v_agent_amount := p_net_amount * v_base_commission;
        
        INSERT INTO public.commissions (recipient_id, recipient_type, amount, source_type, source_id, commission_rate)
        VALUES (v_agent.id, 'agent', v_agent_amount, 'user', p_user_id, v_base_commission)
        RETURNING id INTO v_commission_id;
        
        v_result := jsonb_build_array(
            jsonb_build_object(
                'recipient_id', v_agent.id,
                'recipient_type', 'agent',
                'amount', v_agent_amount,
                'commission_id', v_commission_id
            )
        );
        
    ELSIF v_user.creator_type = 'sub_agent' THEN
        -- Utilisateur créé par un sous-agent -> partage entre sous-agent et agent parent
        SELECT * INTO v_sub_agent FROM public.sub_agents WHERE id = v_user.creator_id;
        SELECT * INTO v_agent FROM public.agents WHERE id = v_sub_agent.parent_agent_id;
        
        v_sub_agent_amount := p_net_amount * v_base_commission * (1 - v_parent_share_ratio);
        v_parent_amount := p_net_amount * v_base_commission * v_parent_share_ratio;
        
        -- Commission pour le sous-agent
        INSERT INTO public.commissions (recipient_id, recipient_type, amount, source_type, source_id, commission_rate)
        VALUES (v_sub_agent.id, 'sub_agent', v_sub_agent_amount, 'user', p_user_id, v_base_commission * (1 - v_parent_share_ratio))
        RETURNING id INTO v_commission_id;
        
        v_result := jsonb_build_array(
            jsonb_build_object(
                'recipient_id', v_sub_agent.id,
                'recipient_type', 'sub_agent',
                'amount', v_sub_agent_amount,
                'commission_id', v_commission_id
            )
        );
        
        -- Commission pour l'agent parent
        IF v_agent.id IS NOT NULL THEN
            INSERT INTO public.commissions (recipient_id, recipient_type, amount, source_type, source_id, commission_rate)
            VALUES (v_agent.id, 'agent', v_parent_amount, 'sub_agent_user', p_user_id, v_base_commission * v_parent_share_ratio)
            RETURNING id INTO v_commission_id;
            
            v_result := v_result || jsonb_build_array(
                jsonb_build_object(
                    'recipient_id', v_agent.id,
                    'recipient_type', 'agent',
                    'amount', v_parent_amount,
                    'commission_id', v_commission_id
                )
            );
        END IF;
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement les commissions lors d'une transaction
CREATE OR REPLACE FUNCTION trigger_calculate_commissions()
RETURNS TRIGGER AS $$
DECLARE
    v_commissions JSONB;
BEGIN
    -- Calculer les commissions automatiquement
    v_commissions := calculate_commissions(NEW.user_id, NEW.amount, NEW.net_amount);
    
    -- Log de l'action
    INSERT INTO public.agent_audit_logs (actor_id, actor_type, action, target_type, target_id, details)
    VALUES (
        NEW.user_id,
        'user',
        'TRANSACTION_CREATED',
        'transaction',
        NEW.id,
        jsonb_build_object('amount', NEW.amount, 'net_amount', NEW.net_amount, 'commissions', v_commissions)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_commissions_after_insert
    AFTER INSERT ON public.agent_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_commissions();
