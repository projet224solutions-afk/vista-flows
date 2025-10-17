-- =====================================================
-- MIGRATION ACTIONS ADMINISTRATIVES - 224SOLUTIONS
-- =====================================================
-- Date: 18 octobre 2025
-- Version: 1.0.0
-- Description: Tables pour les actions destructrices avec confirmation double

-- =====================================================
-- 1. TABLE ADMIN_AUDIT_LOGS
-- =====================================================

-- Table pour l'audit des actions administratives
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'admin_suspend_user', 'admin_delete_user', etc.
    target_type VARCHAR(50) NOT NULL, -- 'user', 'vendor', 'transaction', 'payment'
    target_id TEXT NOT NULL, -- ID de la cible
    ip_address INET,
    user_agent TEXT,
    confirmation_data JSONB, -- Données de confirmation
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    result_data JSONB, -- Résultat de l'action
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user_id ON public.admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_type ON public.admin_audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_status ON public.admin_audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- =====================================================
-- 2. TABLE ADMIN_ACTIONS_CONFIG
-- =====================================================

-- Table pour la configuration des actions administratives
CREATE TABLE IF NOT EXISTS public.admin_actions_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    requires_password BOOLEAN DEFAULT TRUE,
    requires_confirmation_text BOOLEAN DEFAULT TRUE,
    confirmation_text VARCHAR(200),
    is_destructive BOOLEAN DEFAULT FALSE,
    allowed_roles TEXT[] DEFAULT ARRAY['admin', 'pdg'],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_admin_actions_config_action_name ON public.admin_actions_config(action_name);
CREATE INDEX IF NOT EXISTS idx_admin_actions_config_active ON public.admin_actions_config(is_active);

-- =====================================================
-- 3. TABLE ADMIN_ACTION_PERMISSIONS
-- =====================================================

-- Table pour les permissions d'actions par utilisateur
CREATE TABLE IF NOT EXISTS public.admin_action_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_name VARCHAR(100) NOT NULL REFERENCES public.admin_actions_config(action_name),
    is_allowed BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, action_name)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_admin_action_permissions_user_id ON public.admin_action_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_permissions_action_name ON public.admin_action_permissions(action_name);

-- =====================================================
-- 4. POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_permissions ENABLE ROW LEVEL SECURITY;

-- Politiques pour admin_audit_logs (lecture pour les admins)
CREATE POLICY admin_audit_logs_read_policy ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- Politiques pour admin_actions_config (lecture pour tous les utilisateurs authentifiés)
CREATE POLICY admin_actions_config_read_policy ON public.admin_actions_config
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

-- Politiques pour admin_action_permissions (accès à ses propres permissions)
CREATE POLICY admin_action_permissions_own_policy ON public.admin_action_permissions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- 5. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour vérifier les permissions d'action
CREATE OR REPLACE FUNCTION public.check_admin_action_permission(
    p_user_id UUID,
    p_action_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR(50);
    has_permission BOOLEAN := FALSE;
    action_config RECORD;
BEGIN
    -- Récupérer le rôle de l'utilisateur
    SELECT role INTO user_role
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- Vérifier si l'action existe et est active
    SELECT * INTO action_config
    FROM public.admin_actions_config 
    WHERE action_name = p_action_name 
    AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier si le rôle est autorisé
    IF user_role = ANY(action_config.allowed_roles) THEN
        has_permission := TRUE;
    END IF;
    
    -- Vérifier les permissions spécifiques
    SELECT EXISTS(
        SELECT 1 FROM public.admin_action_permissions 
        WHERE user_id = p_user_id 
        AND action_name = p_action_name 
        AND is_allowed = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les actions disponibles pour un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_available_actions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'action_name', aac.action_name,
            'display_name', aac.display_name,
            'description', aac.description,
            'severity', aac.severity,
            'requires_password', aac.requires_password,
            'requires_confirmation_text', aac.requires_confirmation_text,
            'confirmation_text', aac.confirmation_text,
            'is_destructive', aac.is_destructive
        )
    ) INTO result
    FROM public.admin_actions_config aac
    WHERE aac.is_active = TRUE
    AND (
        (SELECT role FROM public.profiles WHERE id = p_user_id) = ANY(aac.allowed_roles)
        OR EXISTS(
            SELECT 1 FROM public.admin_action_permissions 
            WHERE user_id = p_user_id 
            AND action_name = aac.action_name 
            AND is_allowed = TRUE
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les logs d'audit anciens
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    -- Supprimer les logs d'audit de plus de 1 an
    DELETE FROM public.admin_audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Supprimer les logs d'audit échoués de plus de 30 jours
    DELETE FROM public.admin_audit_logs 
    WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGERS POUR AUDIT AUTOMATIQUE
-- =====================================================

-- Fonction de trigger pour l'audit des modifications
CREATE OR REPLACE FUNCTION public.audit_admin_action_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Enregistrer l'audit pour les modifications importantes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, status)
        VALUES (
            NEW.user_id,
            'admin_action_permission_granted',
            'permission',
            NEW.id::TEXT,
            'completed'
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_allowed != OLD.is_allowed THEN
            INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, status)
            VALUES (
                NEW.user_id,
                CASE WHEN NEW.is_allowed THEN 'admin_action_permission_granted' ELSE 'admin_action_permission_revoked' END,
                'permission',
                NEW.id::TEXT,
                'completed'
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, status)
        VALUES (
            OLD.user_id,
            'admin_action_permission_revoked',
            'permission',
            OLD.id::TEXT,
            'completed'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour l'audit automatique
CREATE TRIGGER admin_action_permissions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_action_permissions
    FOR EACH ROW EXECUTE FUNCTION public.audit_admin_action_changes();

-- =====================================================
-- 7. INSERTION DES ACTIONS PAR DÉFAUT
-- =====================================================

-- Insérer les actions administratives par défaut
INSERT INTO public.admin_actions_config (action_name, display_name, description, severity, requires_password, requires_confirmation_text, confirmation_text, is_destructive, allowed_roles) VALUES
('admin_suspend_user', 'Suspendre un utilisateur', 'Suspendre temporairement un utilisateur', 'high', TRUE, TRUE, 'SUSPEND', TRUE, ARRAY['admin', 'pdg']),
('admin_delete_user', 'Supprimer un utilisateur', 'Supprimer définitivement un utilisateur', 'critical', TRUE, TRUE, 'DELETE', TRUE, ARRAY['pdg']),
('admin_suspend_vendor', 'Suspendre un vendeur', 'Suspendre temporairement un vendeur', 'high', TRUE, TRUE, 'SUSPEND', TRUE, ARRAY['admin', 'pdg']),
('admin_delete_vendor', 'Supprimer un vendeur', 'Supprimer définitivement un vendeur', 'critical', TRUE, TRUE, 'DELETE', TRUE, ARRAY['pdg']),
('admin_rollback_transaction', 'Annuler une transaction', 'Annuler une transaction financière', 'critical', TRUE, TRUE, 'ROLLBACK', TRUE, ARRAY['pdg']),
('admin_suspend_payment', 'Suspendre un paiement', 'Suspendre un lien de paiement', 'medium', TRUE, TRUE, 'SUSPEND', TRUE, ARRAY['admin', 'pdg']),
('admin_delete_payment', 'Supprimer un paiement', 'Supprimer un lien de paiement', 'high', TRUE, TRUE, 'DELETE', TRUE, ARRAY['admin', 'pdg']),
('admin_system_rollback', 'Rollback système', 'Effectuer un rollback système', 'critical', TRUE, TRUE, 'SYSTEM_ROLLBACK', TRUE, ARRAY['pdg'])
ON CONFLICT (action_name) DO NOTHING;

-- =====================================================
-- 8. VUES DE SÉCURITÉ
-- =====================================================

-- Vue pour les administrateurs (statistiques des actions)
CREATE OR REPLACE VIEW public.admin_actions_stats_view AS
SELECT 
    aal.action,
    aal.target_type,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN aal.status = 'completed' THEN 1 END) as successful_actions,
    COUNT(CASE WHEN aal.status = 'failed' THEN 1 END) as failed_actions,
    COUNT(CASE WHEN aal.status = 'pending' THEN 1 END) as pending_actions,
    MAX(aal.created_at) as last_action_date
FROM public.admin_audit_logs aal
GROUP BY aal.action, aal.target_type
ORDER BY total_actions DESC;

-- Vue pour l'audit des actions administratives
CREATE OR REPLACE VIEW public.admin_audit_view AS
SELECT 
    aal.id,
    aal.action,
    aal.target_type,
    aal.target_id,
    p.first_name || ' ' || p.last_name as actor_name,
    p.email as actor_email,
    aal.status,
    aal.ip_address,
    aal.created_at,
    aal.completed_at,
    aal.error_message
FROM public.admin_audit_logs aal
LEFT JOIN public.profiles p ON aal.user_id = p.id
ORDER BY aal.created_at DESC;

-- =====================================================
-- 9. PERMISSIONS
-- =====================================================

-- Accorder les permissions nécessaires
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT SELECT ON public.admin_actions_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_action_permissions TO authenticated;

-- Permissions pour les vues
GRANT SELECT ON public.admin_actions_stats_view TO authenticated;
GRANT SELECT ON public.admin_audit_view TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION public.check_admin_action_permission(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_available_actions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_audit_logs() TO authenticated;

-- =====================================================
-- 10. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.admin_audit_logs IS 'Logs d''audit pour les actions administratives destructrices';
COMMENT ON COLUMN public.admin_audit_logs.action IS 'Action administrative effectuée';
COMMENT ON COLUMN public.admin_audit_logs.target_type IS 'Type de cible (user, vendor, transaction, payment)';
COMMENT ON COLUMN public.admin_audit_logs.confirmation_data IS 'Données de confirmation de l''action';
COMMENT ON COLUMN public.admin_audit_logs.status IS 'Statut de l''action (pending, completed, failed)';

COMMENT ON TABLE public.admin_actions_config IS 'Configuration des actions administratives disponibles';
COMMENT ON COLUMN public.admin_actions_config.severity IS 'Niveau de sévérité de l''action';
COMMENT ON COLUMN public.admin_actions_config.requires_password IS 'Exige un mot de passe pour confirmer';
COMMENT ON COLUMN public.admin_actions_config.is_destructive IS 'Action destructrice ou non';

COMMENT ON TABLE public.admin_action_permissions IS 'Permissions d''actions par utilisateur';
COMMENT ON COLUMN public.admin_action_permissions.is_allowed IS 'Permission accordée ou non';
COMMENT ON COLUMN public.admin_action_permissions.expires_at IS 'Date d''expiration de la permission';

COMMENT ON FUNCTION public.check_admin_action_permission IS 'Vérifie si un utilisateur peut effectuer une action administrative';
COMMENT ON FUNCTION public.get_user_available_actions IS 'Retourne les actions disponibles pour un utilisateur';
COMMENT ON FUNCTION public.cleanup_old_audit_logs IS 'Nettoie les logs d''audit anciens';
