-- Table pour stocker les invitations d'installation PWA
-- 224Solutions - Bureau Syndicat System

CREATE TABLE IF NOT EXISTS bureau_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bureau_id UUID NOT NULL REFERENCES syndicate_bureaus(id) ON DELETE CASCADE,
    president_id UUID REFERENCES users(id) ON DELETE SET NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_bureau_invites_token ON bureau_invites(token);
CREATE INDEX IF NOT EXISTS idx_bureau_invites_bureau_id ON bureau_invites(bureau_id);
CREATE INDEX IF NOT EXISTS idx_bureau_invites_expires_at ON bureau_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_bureau_invites_used ON bureau_invites(used);

-- RLS (Row Level Security)
ALTER TABLE bureau_invites ENABLE ROW LEVEL SECURITY;

-- Politique pour les administrateurs (PDG)
CREATE POLICY "Admins can manage bureau invites" ON bureau_invites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin_pdg', 'admin')
        )
    );

-- Politique pour les présidents (lecture seule de leurs invitations)
CREATE POLICY "Presidents can view their invites" ON bureau_invites
    FOR SELECT USING (
        president_id = auth.uid()
    );

-- Fonction pour nettoyer les tokens expirés
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM bureau_invites 
    WHERE expires_at < NOW() AND used = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider un token d'installation
CREATE OR REPLACE FUNCTION validate_install_token(token_param TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    bureau_id UUID,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN bi.id IS NULL THEN FALSE
            WHEN bi.expires_at < NOW() THEN FALSE
            WHEN bi.used = TRUE THEN FALSE
            ELSE TRUE
        END as is_valid,
        bi.bureau_id,
        CASE 
            WHEN bi.id IS NULL THEN 'Token invalide'
            WHEN bi.expires_at < NOW() THEN 'Token expiré'
            WHEN bi.used = TRUE THEN 'Token déjà utilisé'
            ELSE NULL
        END as error_message
    FROM bureau_invites bi
    WHERE bi.token = token_param
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour marquer un token comme utilisé
CREATE OR REPLACE FUNCTION mark_token_as_used(token_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE bureau_invites 
    SET used = TRUE, used_at = NOW()
    WHERE token = token_param AND used = FALSE;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour nettoyer automatiquement les tokens expirés
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_invites()
RETURNS TRIGGER AS $$
BEGIN
    -- Nettoyer les tokens expirés de plus de 7 jours
    PERFORM cleanup_expired_invites();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_expired_invites_trigger
    AFTER INSERT ON bureau_invites
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_expired_invites();

-- Commentaires
COMMENT ON TABLE bureau_invites IS 'Table pour gérer les invitations d''installation PWA des bureaux syndicats';
COMMENT ON COLUMN bureau_invites.token IS 'Token unique pour l''installation PWA';
COMMENT ON COLUMN bureau_invites.expires_at IS 'Date d''expiration du token (24h par défaut)';
COMMENT ON COLUMN bureau_invites.used IS 'Indique si le token a été utilisé';
COMMENT ON COLUMN bureau_invites.used_at IS 'Date d''utilisation du token';
