-- =====================================================
-- SYSTÈME COPILOTE IA - 224SOLUTIONS
-- Tables pour ChatGPT intégral avec OpenAI
-- =====================================================

-- Table des conversations IA
CREATE TABLE IF NOT EXISTS ai_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des logs IA pour audit
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_role VARCHAR(50),
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Table des sessions IA
CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0
);

-- Table des actions métiers IA
CREATE TABLE IF NOT EXISTS ai_business_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB,
    result JSONB,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

-- Index pour ai_chats
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_created_at ON ai_chats(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_chats_role ON ai_chats(role);

-- Index pour ai_logs
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_timestamp ON ai_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_role ON ai_logs(user_role);

-- Index pour ai_sessions
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_active ON ai_sessions(is_active);

-- Index pour ai_business_actions
CREATE INDEX IF NOT EXISTS idx_ai_business_actions_user_id ON ai_business_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_business_actions_type ON ai_business_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_business_actions_executed_at ON ai_business_actions(executed_at);

-- =====================================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_business_actions ENABLE ROW LEVEL SECURITY;

-- Politiques pour ai_chats
CREATE POLICY "Users can view their own chats" ON ai_chats
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chats" ON ai_chats
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chats" ON ai_chats
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own chats" ON ai_chats
    FOR DELETE USING (user_id = auth.uid());

-- Politiques pour ai_logs
CREATE POLICY "Users can view their own logs" ON ai_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert logs" ON ai_logs
    FOR INSERT WITH CHECK (true);

-- Politiques pour ai_sessions
CREATE POLICY "Users can manage their own sessions" ON ai_sessions
    FOR ALL USING (user_id = auth.uid());

-- Politiques pour ai_business_actions
CREATE POLICY "Users can view their own actions" ON ai_business_actions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert actions" ON ai_business_actions
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour nettoyer les anciens logs
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs()
RETURNS void AS $$
BEGIN
    -- Supprimer les logs de plus de 90 jours
    DELETE FROM ai_logs 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Supprimer les chats de plus de 30 jours
    DELETE FROM ai_chats 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Supprimer les sessions inactives de plus de 7 jours
    DELETE FROM ai_sessions 
    WHERE is_active = false 
    AND last_activity < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques IA
CREATE OR REPLACE FUNCTION get_ai_stats(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_messages', COUNT(*),
        'user_messages', COUNT(*) FILTER (WHERE role = 'user'),
        'assistant_messages', COUNT(*) FILTER (WHERE role = 'assistant'),
        'last_activity', MAX(created_at),
        'session_count', (
            SELECT COUNT(*) FROM ai_sessions 
            WHERE user_id = user_id_param AND is_active = true
        )
    ) INTO result
    FROM ai_chats 
    WHERE user_id = user_id_param;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une nouvelle session IA
CREATE OR REPLACE FUNCTION create_ai_session(user_id_param UUID, session_name_param VARCHAR DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Désactiver les sessions existantes
    UPDATE ai_sessions 
    SET is_active = false 
    WHERE user_id = user_id_param AND is_active = true;
    
    -- Créer une nouvelle session
    INSERT INTO ai_sessions (user_id, session_name)
    VALUES (user_id_param, COALESCE(session_name_param, 'Session ' || NOW()::date))
    RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_ai_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_chats_updated_at
    BEFORE UPDATE ON ai_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_chats_updated_at();

-- Trigger pour mettre à jour le compteur de messages
CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_sessions 
    SET message_count = message_count + 1,
        last_activity = NOW()
    WHERE user_id = NEW.user_id AND is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_message_count
    AFTER INSERT ON ai_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_session_message_count();

-- =====================================================
-- DONNÉES DE TEST (OPTIONNEL)
-- =====================================================

-- Insérer des données de test si nécessaire
-- INSERT INTO ai_sessions (user_id, session_name) VALUES
-- ('user-uuid', 'Session de test');

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE ai_chats IS 'Conversations avec le Copilote IA';
COMMENT ON TABLE ai_logs IS 'Logs d\'audit pour les interactions IA';
COMMENT ON TABLE ai_sessions IS 'Sessions de conversation IA';
COMMENT ON TABLE ai_business_actions IS 'Actions métiers exécutées par l\'IA';

COMMENT ON COLUMN ai_chats.role IS 'Rôle du message (user, assistant, system)';
COMMENT ON COLUMN ai_logs.tokens_used IS 'Nombre de tokens utilisés par OpenAI';
COMMENT ON COLUMN ai_logs.processing_time_ms IS 'Temps de traitement en millisecondes';
COMMENT ON COLUMN ai_sessions.message_count IS 'Nombre de messages dans la session';
COMMENT ON COLUMN ai_business_actions.action_data IS 'Données d\'entrée de l\'action';
COMMENT ON COLUMN ai_business_actions.result IS 'Résultat de l\'action exécutée';
