-- =====================================================
-- MIGRATION SECRETS MANAGER - 224SOLUTIONS
-- =====================================================
-- Date: 18 octobre 2025
-- Version: 1.0.0
-- Description: Table pour stocker les secrets de manière sécurisée

-- =====================================================
-- 1. TABLE SECRETS
-- =====================================================

-- Table pour stocker les secrets de manière chiffrée
CREATE TABLE IF NOT EXISTS public.secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL, -- Valeur chiffrée
    description TEXT,
    category VARCHAR(50) DEFAULT 'general', -- 'auth', 'api', 'database', 'general'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ -- Optionnel pour les secrets temporaires
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_secrets_key ON public.secrets(key);
CREATE INDEX IF NOT EXISTS idx_secrets_category ON public.secrets(category);
CREATE INDEX IF NOT EXISTS idx_secrets_active ON public.secrets(is_active);

-- =====================================================
-- 2. TABLE SECRETS AUDIT
-- =====================================================

-- Table d'audit pour tracer l'accès aux secrets
CREATE TABLE IF NOT EXISTS public.secrets_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_id UUID REFERENCES public.secrets(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'read', 'update', 'delete', 'create'
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour l'audit
CREATE INDEX IF NOT EXISTS idx_secrets_audit_secret_id ON public.secrets_audit(secret_id);
CREATE INDEX IF NOT EXISTS idx_secrets_audit_user_id ON public.secrets_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_secrets_audit_created_at ON public.secrets_audit(created_at DESC);

-- =====================================================
-- 3. POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur la table secrets
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

-- Politique pour les administrateurs et PDG
CREATE POLICY secrets_admin_policy ON public.secrets
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- Politique pour l'audit (lecture seule pour les utilisateurs autorisés)
CREATE POLICY secrets_audit_read_policy ON public.secrets_audit
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- =====================================================
-- 4. FONCTIONS DE CHIFFREMENT
-- =====================================================

-- Fonction pour chiffrer un secret
CREATE OR REPLACE FUNCTION public.encrypt_secret(
    secret_value TEXT,
    encryption_key TEXT DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
    -- Utiliser la clé de chiffrement par défaut ou celle fournie
    IF encryption_key IS NULL THEN
        encryption_key := current_setting('app.encryption_key', true);
    END IF;
    
    -- Chiffrement AES-256 (simulation - en production utiliser pgcrypto)
    RETURN encode(digest(secret_value || encryption_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour déchiffrer un secret
CREATE OR REPLACE FUNCTION public.decrypt_secret(
    encrypted_value TEXT,
    encryption_key TEXT DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
    -- En production, implémenter le déchiffrement réel
    -- Pour la démo, retourner la valeur telle quelle
    RETURN encrypted_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FONCTION D'AUDIT AUTOMATIQUE
-- =====================================================

-- Fonction pour enregistrer l'accès aux secrets
CREATE OR REPLACE FUNCTION public.audit_secret_access()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.secrets_audit (
        secret_id,
        action,
        user_id,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        inet_client_addr(),
        current_setting('request.headers.user-agent', true),
        jsonb_build_object(
            'operation', TG_OP,
            'timestamp', NOW()
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers pour l'audit automatique
CREATE TRIGGER secrets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.secrets
    FOR EACH ROW EXECUTE FUNCTION public.audit_secret_access();

-- =====================================================
-- 6. INSERTION DES SECRETS PAR DÉFAUT
-- =====================================================

-- Insérer les secrets par défaut (en production, utiliser le secrets manager)
INSERT INTO public.secrets (key, value, description, category) VALUES
('PDG_ACCESS_CODE', 'SECRET_MANAGER://pdg/access_code', 'Code d''accès PDG principal', 'auth'),
('ADMIN_ACCESS_CODE', 'SECRET_MANAGER://admin/access_code', 'Code d''accès administrateur', 'auth'),
('DEV_ACCESS_CODE', 'SECRET_MANAGER://dev/access_code', 'Code d''accès développeur', 'auth'),
('JWT_SECRET', 'SECRET_MANAGER://auth/jwt_secret', 'Clé secrète JWT', 'auth'),
('ENCRYPTION_KEY', 'SECRET_MANAGER://crypto/encryption_key', 'Clé de chiffrement principale', 'auth'),
('DATABASE_URL', 'SECRET_MANAGER://database/url', 'URL de connexion base de données', 'database'),
('SUPABASE_SERVICE_KEY', 'SECRET_MANAGER://supabase/service_key', 'Clé de service Supabase', 'api'),
('FIREBASE_CONFIG', 'SECRET_MANAGER://firebase/config', 'Configuration Firebase', 'api'),
('GOOGLE_CLOUD_KEY', 'SECRET_MANAGER://gcp/api_key', 'Clé API Google Cloud', 'api')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 7. COMMENTAIRES ET DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.secrets IS 'Table de stockage sécurisé des secrets de l''application';
COMMENT ON COLUMN public.secrets.key IS 'Clé unique du secret';
COMMENT ON COLUMN public.secrets.value IS 'Valeur chiffrée du secret';
COMMENT ON COLUMN public.secrets.category IS 'Catégorie du secret (auth, api, database, general)';
COMMENT ON COLUMN public.secrets.expires_at IS 'Date d''expiration du secret (optionnel)';

COMMENT ON TABLE public.secrets_audit IS 'Table d''audit pour tracer l''accès aux secrets';
COMMENT ON COLUMN public.secrets_audit.action IS 'Action effectuée (read, update, delete, create)';
COMMENT ON COLUMN public.secrets_audit.metadata IS 'Métadonnées supplémentaires de l''action';

-- =====================================================
-- 8. VUES DE SÉCURITÉ
-- =====================================================

-- Vue pour les administrateurs (masque les valeurs sensibles)
CREATE OR REPLACE VIEW public.secrets_admin_view AS
SELECT 
    id,
    key,
    CASE 
        WHEN LENGTH(value) > 10 THEN 
            LEFT(value, 4) || '...' || RIGHT(value, 4)
        ELSE 
            '***'
    END AS masked_value,
    description,
    category,
    is_active,
    created_at,
    updated_at,
    expires_at
FROM public.secrets
WHERE is_active = TRUE;

-- Vue pour l'audit des secrets
CREATE OR REPLACE VIEW public.secrets_audit_view AS
SELECT 
    sa.id,
    sa.action,
    s.key as secret_key,
    p.first_name || ' ' || p.last_name as user_name,
    sa.ip_address,
    sa.created_at,
    sa.metadata
FROM public.secrets_audit sa
JOIN public.secrets s ON sa.secret_id = s.id
LEFT JOIN public.profiles p ON sa.user_id = p.id
ORDER BY sa.created_at DESC;

-- =====================================================
-- 9. PERMISSIONS
-- =====================================================

-- Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON public.secrets TO authenticated;
GRANT SELECT ON public.secrets_audit TO authenticated;
GRANT SELECT ON public.secrets_admin_view TO authenticated;
GRANT SELECT ON public.secrets_audit_view TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION public.encrypt_secret(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_secret(TEXT, TEXT) TO authenticated;
