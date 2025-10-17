-- =====================================================
-- MIGRATION 2FA & WEBAUTHN - 224SOLUTIONS
-- =====================================================
-- Date: 18 octobre 2025
-- Version: 1.0.0
-- Description: Tables pour l'authentification 2FA et WebAuthn

-- =====================================================
-- 1. TABLE USER_2FA_SECRETS
-- =====================================================

-- Table pour stocker les secrets 2FA des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_2fa_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL, -- Secret TOTP chiffré
    backup_codes TEXT[], -- Codes de sauvegarde
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_user_2fa_secrets_user_id ON public.user_2fa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_secrets_active ON public.user_2fa_secrets(is_active);

-- =====================================================
-- 2. TABLE USER_WEBAUTHN_KEYS
-- =====================================================

-- Table pour stocker les clés WebAuthn des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_webauthn_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    counter BIGINT DEFAULT 0,
    device_type VARCHAR(50) DEFAULT 'platform', -- 'platform', 'cross-platform'
    device_name VARCHAR(100), -- Nom donné par l'utilisateur
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_user_webauthn_keys_user_id ON public.user_webauthn_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webauthn_keys_credential_id ON public.user_webauthn_keys(credential_id);
CREATE INDEX IF NOT EXISTS idx_user_webauthn_keys_active ON public.user_webauthn_keys(is_active);

-- =====================================================
-- 3. TABLE WEBAUTHN_CHALLENGES
-- =====================================================

-- Table pour stocker les challenges WebAuthn temporaires
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'registration', 'authentication'
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON public.webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON public.webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_type ON public.webauthn_challenges(type);

-- =====================================================
-- 4. TABLE AUTH_AUDIT_LOGS
-- =====================================================

-- Table pour l'audit des authentifications
CREATE TABLE IF NOT EXISTS public.auth_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- '2fa_setup', '2fa_verification_success', 'webauthn_registration', etc.
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON public.auth_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_action ON public.auth_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at ON public.auth_audit_logs(created_at DESC);

-- =====================================================
-- 5. TABLE USER_AUTH_PREFERENCES
-- =====================================================

-- Table pour les préférences d'authentification des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_auth_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    require_2fa BOOLEAN DEFAULT FALSE,
    require_webauthn BOOLEAN DEFAULT FALSE,
    preferred_auth_method VARCHAR(50) DEFAULT 'password', -- 'password', '2fa', 'webauthn'
    backup_email VARCHAR(255),
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_user_auth_preferences_user_id ON public.user_auth_preferences(user_id);

-- =====================================================
-- 6. POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.user_2fa_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_webauthn_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_auth_preferences ENABLE ROW LEVEL SECURITY;

-- Politiques pour user_2fa_secrets
CREATE POLICY user_2fa_secrets_own_policy ON public.user_2fa_secrets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Politiques pour user_webauthn_keys
CREATE POLICY user_webauthn_keys_own_policy ON public.user_webauthn_keys
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Politiques pour webauthn_challenges
CREATE POLICY webauthn_challenges_own_policy ON public.webauthn_challenges
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Politiques pour auth_audit_logs (lecture seule pour l'utilisateur)
CREATE POLICY auth_audit_logs_read_policy ON public.auth_audit_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Politiques pour user_auth_preferences
CREATE POLICY user_auth_preferences_own_policy ON public.user_auth_preferences
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- 7. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour nettoyer les challenges expirés
CREATE OR REPLACE FUNCTION public.cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
    DELETE FROM public.webauthn_challenges 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les statistiques d'authentification d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_auth_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'has_2fa', EXISTS(SELECT 1 FROM public.user_2fa_secrets WHERE user_id = p_user_id AND is_active = TRUE),
        'has_webauthn', EXISTS(SELECT 1 FROM public.user_webauthn_keys WHERE user_id = p_user_id AND is_active = TRUE),
        'webauthn_keys_count', (SELECT COUNT(*) FROM public.user_webauthn_keys WHERE user_id = p_user_id AND is_active = TRUE),
        'last_2fa_used', (SELECT last_used_at FROM public.user_2fa_secrets WHERE user_id = p_user_id AND is_active = TRUE),
        'last_webauthn_used', (SELECT MAX(last_used_at) FROM public.user_webauthn_keys WHERE user_id = p_user_id AND is_active = TRUE)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. TRIGGERS POUR AUDIT AUTOMATIQUE
-- =====================================================

-- Fonction de trigger pour l'audit des modifications
CREATE OR REPLACE FUNCTION public.audit_auth_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Enregistrer l'audit pour les modifications importantes
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.auth_audit_logs (user_id, action, metadata)
        VALUES (
            NEW.user_id,
            CASE 
                WHEN TG_TABLE_NAME = 'user_2fa_secrets' THEN '2fa_setup'
                WHEN TG_TABLE_NAME = 'user_webauthn_keys' THEN 'webauthn_key_added'
                ELSE 'auth_change'
            END,
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'timestamp', NOW()
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.auth_audit_logs (user_id, action, metadata)
        VALUES (
            NEW.user_id,
            CASE 
                WHEN TG_TABLE_NAME = 'user_2fa_secrets' AND NEW.is_active != OLD.is_active THEN '2fa_status_changed'
                WHEN TG_TABLE_NAME = 'user_webauthn_keys' AND NEW.is_active != OLD.is_active THEN 'webauthn_key_status_changed'
                ELSE 'auth_change'
            END,
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'old_values', row_to_json(OLD),
                'new_values', row_to_json(NEW),
                'timestamp', NOW()
            )
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.auth_audit_logs (user_id, action, metadata)
        VALUES (
            OLD.user_id,
            CASE 
                WHEN TG_TABLE_NAME = 'user_2fa_secrets' THEN '2fa_removed'
                WHEN TG_TABLE_NAME = 'user_webauthn_keys' THEN 'webauthn_key_removed'
                ELSE 'auth_change'
            END,
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'operation', TG_OP,
                'deleted_values', row_to_json(OLD),
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour l'audit automatique
CREATE TRIGGER user_2fa_secrets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_2fa_secrets
    FOR EACH ROW EXECUTE FUNCTION public.audit_auth_changes();

CREATE TRIGGER user_webauthn_keys_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.user_webauthn_keys
    FOR EACH ROW EXECUTE FUNCTION public.audit_auth_changes();

-- =====================================================
-- 9. VUES DE SÉCURITÉ
-- =====================================================

-- Vue pour les administrateurs (statistiques d'authentification)
CREATE OR REPLACE VIEW public.auth_stats_view AS
SELECT 
    u.id as user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    CASE WHEN s2fa.id IS NOT NULL THEN TRUE ELSE FALSE END as has_2fa,
    CASE WHEN wk.id IS NOT NULL THEN TRUE ELSE FALSE END as has_webauthn,
    s2fa.is_active as is_2fa_active,
    s2fa.created_at as two_fa_setup_date,
    wk.created_at as webauthn_setup_date,
    s2fa.last_used_at as last_2fa_used,
    wk.last_used_at as last_webauthn_used
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_2fa_secrets s2fa ON u.id = s2fa.user_id
LEFT JOIN public.user_webauthn_keys wk ON u.id = wk.user_id AND wk.is_active = TRUE
WHERE p.role IN ('admin', 'pdg');

-- Vue pour l'audit des authentifications
CREATE OR REPLACE VIEW public.auth_audit_view AS
SELECT 
    aal.id,
    aal.action,
    p.first_name || ' ' || p.last_name as user_name,
    p.email,
    aal.ip_address,
    aal.created_at,
    aal.metadata
FROM public.auth_audit_logs aal
LEFT JOIN public.profiles p ON aal.user_id = p.id
ORDER BY aal.created_at DESC;

-- =====================================================
-- 10. PERMISSIONS
-- =====================================================

-- Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_2fa_secrets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_webauthn_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_challenges TO authenticated;
GRANT SELECT ON public.auth_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_auth_preferences TO authenticated;

-- Permissions pour les vues
GRANT SELECT ON public.auth_stats_view TO authenticated;
GRANT SELECT ON public.auth_audit_view TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_auth_stats(UUID) TO authenticated;

-- =====================================================
-- 11. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.user_2fa_secrets IS 'Secrets 2FA (TOTP) des utilisateurs';
COMMENT ON COLUMN public.user_2fa_secrets.secret IS 'Secret TOTP chiffré';
COMMENT ON COLUMN public.user_2fa_secrets.backup_codes IS 'Codes de sauvegarde pour l''accès en cas de perte';

COMMENT ON TABLE public.user_webauthn_keys IS 'Clés WebAuthn des utilisateurs';
COMMENT ON COLUMN public.user_webauthn_keys.credential_id IS 'ID unique de la clé WebAuthn';
COMMENT ON COLUMN public.user_webauthn_keys.public_key IS 'Clé publique de la clé WebAuthn';
COMMENT ON COLUMN public.user_webauthn_keys.counter IS 'Compteur de la clé WebAuthn';

COMMENT ON TABLE public.webauthn_challenges IS 'Challenges WebAuthn temporaires';
COMMENT ON COLUMN public.webauthn_challenges.challenge IS 'Challenge WebAuthn';
COMMENT ON COLUMN public.webauthn_challenges.type IS 'Type de challenge (registration, authentication)';

COMMENT ON TABLE public.auth_audit_logs IS 'Logs d''audit des authentifications';
COMMENT ON COLUMN public.auth_audit_logs.action IS 'Action d''authentification effectuée';
COMMENT ON COLUMN public.auth_audit_logs.metadata IS 'Métadonnées de l''action';

COMMENT ON TABLE public.user_auth_preferences IS 'Préférences d''authentification des utilisateurs';
COMMENT ON COLUMN public.user_auth_preferences.require_2fa IS 'Exiger 2FA pour cet utilisateur';
COMMENT ON COLUMN public.user_auth_preferences.require_webauthn IS 'Exiger WebAuthn pour cet utilisateur';
