-- Tables de sécurité pour le système Bureau Syndicat
-- 224Solutions - Bureau Syndicat System

-- Table des tokens de sécurité
CREATE TABLE IF NOT EXISTS security_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('install', 'access', 'admin', 'president')),
    bureau_id UUID REFERENCES syndicate_bureaus(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table d'audit de sécurité
CREATE TABLE IF NOT EXISTS security_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    bureau_id UUID REFERENCES syndicate_bureaus(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des accès aux bureaux
CREATE TABLE IF NOT EXISTS bureau_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bureau_id UUID NOT NULL REFERENCES syndicate_bureaus(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('president', 'secretary', 'treasurer', 'member')),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, bureau_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_security_tokens_token ON security_tokens(token);
CREATE INDEX IF NOT EXISTS idx_security_tokens_type ON security_tokens(type);
CREATE INDEX IF NOT EXISTS idx_security_tokens_expires_at ON security_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_tokens_used ON security_tokens(used);
CREATE INDEX IF NOT EXISTS idx_security_tokens_bureau_id ON security_tokens(bureau_id);
CREATE INDEX IF NOT EXISTS idx_security_tokens_user_id ON security_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_bureau_id ON security_audit(bureau_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit(timestamp);

CREATE INDEX IF NOT EXISTS idx_bureau_access_user_id ON bureau_access(user_id);
CREATE INDEX IF NOT EXISTS idx_bureau_access_bureau_id ON bureau_access(bureau_id);
CREATE INDEX IF NOT EXISTS idx_bureau_access_role ON bureau_access(role);
CREATE INDEX IF NOT EXISTS idx_bureau_access_active ON bureau_access(active);

-- RLS (Row Level Security)
ALTER TABLE security_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureau_access ENABLE ROW LEVEL SECURITY;

-- Politiques pour security_tokens
CREATE POLICY "Admins can manage all tokens" ON security_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin_pdg', 'admin')
        )
    );

CREATE POLICY "Users can view their own tokens" ON security_tokens
    FOR SELECT USING (
        user_id = auth.uid() OR created_by = auth.uid()
    );

-- Politiques pour security_audit
CREATE POLICY "Admins can view all audit logs" ON security_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin_pdg', 'admin')
        )
    );

CREATE POLICY "Users can view their own audit logs" ON security_audit
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Politiques pour bureau_access
CREATE POLICY "Admins can manage all bureau access" ON bureau_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin_pdg', 'admin')
        )
    );

CREATE POLICY "Presidents can manage their bureau access" ON bureau_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'president'
            AND bureau_id IN (
                SELECT id FROM syndicate_bureaus 
                WHERE president_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view their own bureau access" ON bureau_access
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Fonctions de sécurité

-- Fonction pour nettoyer les tokens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_security_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_tokens 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider un token de sécurité
CREATE OR REPLACE FUNCTION validate_security_token(
    token_param TEXT,
    type_param TEXT DEFAULT NULL
)
RETURNS TABLE(
    is_valid BOOLEAN,
    token_id UUID,
    bureau_id UUID,
    user_id UUID,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN st.id IS NULL THEN FALSE
            WHEN st.expires_at < NOW() THEN FALSE
            WHEN st.used = TRUE THEN FALSE
            WHEN type_param IS NOT NULL AND st.type != type_param THEN FALSE
            ELSE TRUE
        END as is_valid,
        st.id,
        st.bureau_id,
        st.user_id,
        CASE 
            WHEN st.id IS NULL THEN 'Token invalide'
            WHEN st.expires_at < NOW() THEN 'Token expiré'
            WHEN st.used = TRUE THEN 'Token déjà utilisé'
            WHEN type_param IS NOT NULL AND st.type != type_param THEN 'Type de token incorrect'
            ELSE NULL
        END as error_message
    FROM security_tokens st
    WHERE st.token = token_param
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour marquer un token comme utilisé
CREATE OR REPLACE FUNCTION mark_security_token_as_used(
    token_param TEXT,
    ip_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE security_tokens 
    SET 
        used = TRUE, 
        used_at = NOW(),
        ip_address = COALESCE(ip_param, ip_address),
        user_agent = COALESCE(user_agent_param, user_agent)
    WHERE token = token_param AND used = FALSE;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour révoquer un token
CREATE OR REPLACE FUNCTION revoke_security_token(token_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE security_tokens 
    SET 
        used = TRUE,
        expires_at = NOW()
    WHERE token = token_param;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier les permissions d'accès
CREATE OR REPLACE FUNCTION check_bureau_access_permissions(
    user_id_param UUID,
    bureau_id_param UUID,
    required_role_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    has_bureau_access BOOLEAN;
BEGIN
    -- Vérifier le rôle de l'utilisateur
    SELECT role INTO user_role
    FROM users
    WHERE id = user_id_param;
    
    -- Si l'utilisateur n'existe pas
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier la hiérarchie des rôles
    IF user_role = 'admin_pdg' THEN
        RETURN TRUE; -- Admin PDG a accès à tout
    END IF;
    
    IF user_role = 'admin' AND required_role_param IN ('admin', 'president', 'user') THEN
        RETURN TRUE;
    END IF;
    
    IF user_role = 'president' AND required_role_param IN ('president', 'user') THEN
        RETURN TRUE;
    END IF;
    
    IF user_role = 'user' AND required_role_param = 'user' THEN
        RETURN TRUE;
    END IF;
    
    -- Vérifier l'accès spécifique au bureau
    IF user_role != 'admin_pdg' THEN
        SELECT EXISTS(
            SELECT 1 FROM bureau_access
            WHERE user_id = user_id_param
            AND bureau_id = bureau_id_param
            AND active = TRUE
            AND (expires_at IS NULL OR expires_at > NOW())
        ) INTO has_bureau_access;
        
        RETURN has_bureau_access;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour nettoyer automatiquement les tokens expirés
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- Nettoyer les tokens expirés de plus de 7 jours
    PERFORM cleanup_expired_security_tokens();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_tokens_trigger
    AFTER INSERT ON security_tokens
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_expired_tokens();

-- Commentaires
COMMENT ON TABLE security_tokens IS 'Table pour gérer les tokens de sécurité temporaires';
COMMENT ON TABLE security_audit IS 'Table d''audit pour tracer toutes les actions de sécurité';
COMMENT ON TABLE bureau_access IS 'Table pour gérer les accès spécifiques aux bureaux syndicats';

COMMENT ON COLUMN security_tokens.type IS 'Type de token: install, access, admin, president';
COMMENT ON COLUMN security_tokens.expires_at IS 'Date d''expiration du token';
COMMENT ON COLUMN security_tokens.used IS 'Indique si le token a été utilisé';
COMMENT ON COLUMN security_tokens.used_at IS 'Date d''utilisation du token';

COMMENT ON COLUMN security_audit.action IS 'Action effectuée (token_created, access_granted, etc.)';
COMMENT ON COLUMN security_audit.details IS 'Détails de l''action en JSON';

COMMENT ON COLUMN bureau_access.role IS 'Rôle dans le bureau: president, secretary, treasurer, member';
COMMENT ON COLUMN bureau_access.expires_at IS 'Date d''expiration de l''accès (optionnel)';
COMMENT ON COLUMN bureau_access.active IS 'Indique si l''accès est actif';
