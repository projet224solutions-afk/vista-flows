-- =====================================================
-- MIGRATION SSO - 224SOLUTIONS
-- =====================================================
-- Date: 18 octobre 2025
-- Version: 1.0.0
-- Description: Tables pour l'authentification SSO (Keycloak/Okta) avec fallback local

-- =====================================================
-- 1. TABLE SSO_PROVIDERS
-- =====================================================

-- Table pour stocker les configurations des providers SSO
CREATE TABLE IF NOT EXISTS public.sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id VARCHAR(50) UNIQUE NOT NULL, -- 'keycloak', 'okta', 'azure', etc.
    provider_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    base_url TEXT,
    client_id VARCHAR(255),
    client_secret TEXT, -- Chiffré
    redirect_uri TEXT,
    scope VARCHAR(255) DEFAULT 'openid profile email',
    response_type VARCHAR(50) DEFAULT 'code',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_sso_providers_provider_id ON public.sso_providers(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_providers_enabled ON public.sso_providers(is_enabled);

-- =====================================================
-- 2. TABLE SSO_SESSIONS
-- =====================================================

-- Table pour stocker les sessions SSO
CREATE TABLE IF NOT EXISTS public.sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL,
    external_user_id VARCHAR(255) NOT NULL, -- ID utilisateur dans le provider externe
    access_token TEXT, -- Chiffré
    refresh_token TEXT, -- Chiffré
    id_token TEXT, -- Chiffré
    token_expires_at TIMESTAMPTZ,
    session_data JSONB, -- Données supplémentaires de la session
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON public.sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_provider_id ON public.sso_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_external_user_id ON public.sso_sessions(external_user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_active ON public.sso_sessions(is_active);

-- =====================================================
-- 3. TABLE SSO_AUDIT_LOGS
-- =====================================================

-- Table pour l'audit des connexions SSO
CREATE TABLE IF NOT EXISTS public.sso_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'token_refresh', 'error'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_user_id ON public.sso_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_provider_id ON public.sso_audit_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_action ON public.sso_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_sso_audit_logs_created_at ON public.sso_audit_logs(created_at DESC);

-- =====================================================
-- 4. MODIFICATION TABLE PROFILES
-- =====================================================

-- Ajouter les colonnes SSO à la table profiles si elles n'existent pas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sso_external_id VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sso_login TIMESTAMPTZ;

-- Index pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_profiles_sso_provider ON public.profiles(sso_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_sso_external_id ON public.profiles(sso_external_id);

-- =====================================================
-- 5. POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour sso_providers (lecture seule pour tous les utilisateurs authentifiés)
CREATE POLICY sso_providers_read_policy ON public.sso_providers
    FOR SELECT TO authenticated
    USING (is_enabled = TRUE);

-- Politiques pour sso_sessions (accès à ses propres sessions)
CREATE POLICY sso_sessions_own_policy ON public.sso_sessions
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Politiques pour sso_audit_logs (lecture seule pour l'utilisateur)
CREATE POLICY sso_audit_logs_read_policy ON public.sso_audit_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- 6. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_sso_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.sso_sessions 
    WHERE token_expires_at < NOW() 
    OR (last_used_at < NOW() - INTERVAL '30 days' AND is_active = FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques SSO d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_sso_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'has_sso_sessions', EXISTS(SELECT 1 FROM public.sso_sessions WHERE user_id = p_user_id AND is_active = TRUE),
        'sso_providers', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'provider_id', provider_id,
                    'last_used', last_used_at,
                    'is_active', is_active
                )
            )
            FROM public.sso_sessions 
            WHERE user_id = p_user_id
        ),
        'last_sso_login', (
            SELECT MAX(last_used_at) 
            FROM public.sso_sessions 
            WHERE user_id = p_user_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour synchroniser les données utilisateur SSO
CREATE OR REPLACE FUNCTION public.sync_sso_user_data(
    p_user_id UUID,
    p_provider_id VARCHAR(50),
    p_external_user_id VARCHAR(255),
    p_user_data JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Mettre à jour le profil utilisateur avec les données SSO
    UPDATE public.profiles 
    SET 
        sso_provider = p_provider_id,
        sso_external_id = p_external_user_id,
        first_name = COALESCE(p_user_data->>'given_name', first_name),
        last_name = COALESCE(p_user_data->>'family_name', last_name),
        avatar_url = COALESCE(p_user_data->>'picture', avatar_url),
        last_sso_login = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Créer ou mettre à jour la session SSO
    INSERT INTO public.sso_sessions (
        user_id, provider_id, external_user_id, session_data, last_used_at
    ) VALUES (
        p_user_id, p_provider_id, p_external_user_id, p_user_data, NOW()
    ) ON CONFLICT (user_id, provider_id, external_user_id) 
    DO UPDATE SET 
        session_data = p_user_data,
        last_used_at = NOW(),
        is_active = TRUE;
    
    -- Enregistrer l'audit
    INSERT INTO public.sso_audit_logs (
        user_id, provider_id, action, success, metadata
    ) VALUES (
        p_user_id, p_provider_id, 'login', TRUE, 
        jsonb_build_object('sync_data', p_user_data)
    );
    
    RETURN jsonb_build_object('success', TRUE, 'user_id', p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGERS POUR AUDIT AUTOMATIQUE
-- =====================================================

-- Fonction de trigger pour l'audit des sessions SSO
CREATE OR REPLACE FUNCTION public.audit_sso_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Enregistrer l'audit pour les modifications importantes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.sso_audit_logs (user_id, provider_id, action, success, metadata)
        VALUES (
            NEW.user_id,
            NEW.provider_id,
            'session_created',
            TRUE,
            jsonb_build_object(
                'external_user_id', NEW.external_user_id,
                'timestamp', NOW()
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_active != OLD.is_active THEN
            INSERT INTO public.sso_audit_logs (user_id, provider_id, action, success, metadata)
            VALUES (
                NEW.user_id,
                NEW.provider_id,
                CASE WHEN NEW.is_active THEN 'session_activated' ELSE 'session_deactivated' END,
                TRUE,
                jsonb_build_object(
                    'external_user_id', NEW.external_user_id,
                    'timestamp', NOW()
                )
            );
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.sso_audit_logs (user_id, provider_id, action, success, metadata)
        VALUES (
            OLD.user_id,
            OLD.provider_id,
            'session_deleted',
            TRUE,
            jsonb_build_object(
                'external_user_id', OLD.external_user_id,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour l'audit automatique
CREATE TRIGGER sso_sessions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.sso_sessions
    FOR EACH ROW EXECUTE FUNCTION public.audit_sso_changes();

-- =====================================================
-- 8. INSERTION DES PROVIDERS PAR DÉFAUT
-- =====================================================

-- Insérer les providers SSO par défaut
INSERT INTO public.sso_providers (provider_id, provider_name, is_enabled, base_url, client_id, redirect_uri) VALUES
('keycloak', 'Keycloak', FALSE, 'https://keycloak.example.com', '224solutions-client', 'https://app.224solutions.com/auth/sso/keycloak/callback'),
('okta', 'Okta', FALSE, 'https://dev-123456.okta.com', '0oa1234567890abcdef', 'https://app.224solutions.com/auth/sso/okta/callback'),
('azure', 'Azure AD', FALSE, 'https://login.microsoftonline.com/tenant-id', 'client-id', 'https://app.224solutions.com/auth/sso/azure/callback')
ON CONFLICT (provider_id) DO NOTHING;

-- =====================================================
-- 9. VUES DE SÉCURITÉ
-- =====================================================

-- Vue pour les administrateurs (statistiques SSO)
CREATE OR REPLACE VIEW public.sso_stats_view AS
SELECT 
    sp.provider_id,
    sp.provider_name,
    sp.is_enabled,
    COUNT(ss.user_id) as active_sessions,
    COUNT(sal.id) as total_logins,
    MAX(sal.created_at) as last_activity
FROM public.sso_providers sp
LEFT JOIN public.sso_sessions ss ON sp.provider_id = ss.provider_id AND ss.is_active = TRUE
LEFT JOIN public.sso_audit_logs sal ON sp.provider_id = sal.provider_id AND sal.action = 'login'
GROUP BY sp.provider_id, sp.provider_name, sp.is_enabled;

-- Vue pour l'audit des connexions SSO
CREATE OR REPLACE VIEW public.sso_audit_view AS
SELECT 
    sal.id,
    sal.provider_id,
    p.first_name || ' ' || p.last_name as user_name,
    p.email,
    sal.action,
    sal.success,
    sal.ip_address,
    sal.created_at,
    sal.metadata
FROM public.sso_audit_logs sal
LEFT JOIN public.profiles p ON sal.user_id = p.id
ORDER BY sal.created_at DESC;

-- =====================================================
-- 10. PERMISSIONS
-- =====================================================

-- Accorder les permissions nécessaires
GRANT SELECT ON public.sso_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sso_sessions TO authenticated;
GRANT SELECT ON public.sso_audit_logs TO authenticated;

-- Permissions pour les vues
GRANT SELECT ON public.sso_stats_view TO authenticated;
GRANT SELECT ON public.sso_audit_view TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sso_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sso_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_sso_user_data(UUID, VARCHAR, VARCHAR, JSONB) TO authenticated;

-- =====================================================
-- 11. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.sso_providers IS 'Configuration des providers SSO (Keycloak, Okta, Azure AD)';
COMMENT ON COLUMN public.sso_providers.provider_id IS 'Identifiant unique du provider';
COMMENT ON COLUMN public.sso_providers.client_secret IS 'Secret client chiffré';
COMMENT ON COLUMN public.sso_providers.is_enabled IS 'Provider activé ou non';

COMMENT ON TABLE public.sso_sessions IS 'Sessions SSO des utilisateurs';
COMMENT ON COLUMN public.sso_sessions.external_user_id IS 'ID utilisateur dans le provider externe';
COMMENT ON COLUMN public.sso_sessions.access_token IS 'Token d''accès chiffré';
COMMENT ON COLUMN public.sso_sessions.session_data IS 'Données supplémentaires de la session';

COMMENT ON TABLE public.sso_audit_logs IS 'Logs d''audit des connexions SSO';
COMMENT ON COLUMN public.sso_audit_logs.action IS 'Action effectuée (login, logout, token_refresh, error)';
COMMENT ON COLUMN public.sso_audit_logs.metadata IS 'Métadonnées de l''action';

COMMENT ON FUNCTION public.sync_sso_user_data IS 'Synchronise les données utilisateur depuis un provider SSO';
COMMENT ON FUNCTION public.get_user_sso_stats IS 'Retourne les statistiques SSO d''un utilisateur';
COMMENT ON FUNCTION public.cleanup_expired_sso_sessions IS 'Nettoie les sessions SSO expirées';
