-- =====================================================
-- SYSTÈME DE COMMUNICATION - 224SOLUTIONS
-- Tables pour chat, appels et notifications
-- =====================================================

-- Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('private', 'group')),
    name VARCHAR(255),
    description TEXT,
    channel_name VARCHAR(255) UNIQUE,
    participant_1 UUID REFERENCES profiles(id),
    participant_2 UUID REFERENCES profiles(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des participants aux conversations
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(conversation_id, user_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'location', 'audio', 'video')),
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des appels
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    caller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    callee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('audio', 'video')),
    status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'connected', 'ended', 'missed')),
    channel_name VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- en secondes
    quality_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de présence utilisateur
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'away')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEX POUR PERFORMANCE
-- =====================================================

-- Index pour les conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at);

-- Index pour les messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Index pour les appels
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_callee ON calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politiques pour conversations
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        participant_1 = auth.uid() OR 
        participant_2 = auth.uid() OR
        id IN (
            SELECT conversation_id FROM conversation_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        participant_1 = auth.uid() OR 
        participant_2 = auth.uid()
    );

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        participant_1 = auth.uid() OR 
        participant_2 = auth.uid()
    );

-- Politiques pour participants
CREATE POLICY "Users can view conversation participants" ON conversation_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
    );

CREATE POLICY "Users can join conversations" ON conversation_participants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
    );

-- Politiques pour messages
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
        )
    );

-- Politiques pour appels
CREATE POLICY "Users can view their calls" ON calls
    FOR SELECT USING (
        caller_id = auth.uid() OR callee_id = auth.uid()
    );

CREATE POLICY "Users can create calls" ON calls
    FOR INSERT WITH CHECK (
        caller_id = auth.uid()
    );

CREATE POLICY "Users can update their calls" ON calls
    FOR UPDATE USING (
        caller_id = auth.uid() OR callee_id = auth.uid()
    );

-- Politiques pour présence
CREATE POLICY "Users can view all presence" ON user_presence
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own presence" ON user_presence
    FOR ALL USING (user_id = auth.uid());

-- Politiques pour notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour last_message_at
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Fonction pour calculer la durée d'un appel
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'ended' AND NEW.ended_at IS NOT NULL THEN
        NEW.duration = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer la durée
CREATE TRIGGER trigger_calculate_call_duration
    BEFORE UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION calculate_call_duration();

-- =====================================================
-- DONNÉES DE TEST (OPTIONNEL)
-- =====================================================

-- Insérer des données de test si nécessaire
-- INSERT INTO conversations (type, participant_1, participant_2, status) VALUES
-- ('private', 'user1-uuid', 'user2-uuid', 'active');

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE conversations IS 'Conversations entre utilisateurs';
COMMENT ON TABLE conversation_participants IS 'Participants aux conversations de groupe';
COMMENT ON TABLE messages IS 'Messages dans les conversations';
COMMENT ON TABLE calls IS 'Historique des appels audio/vidéo';
COMMENT ON TABLE user_presence IS 'Statut de présence des utilisateurs';
COMMENT ON TABLE notifications IS 'Notifications utilisateur';

COMMENT ON COLUMN conversations.channel_name IS 'Nom du canal Agora pour la conversation';
COMMENT ON COLUMN messages.metadata IS 'Métadonnées du message (fichier, localisation, etc.)';
COMMENT ON COLUMN calls.quality_metrics IS 'Métriques de qualité de l\'appel';
COMMENT ON COLUMN user_presence.device_info IS 'Informations sur l\'appareil de l\'utilisateur';
COMMENT ON COLUMN notifications.data IS 'Données supplémentaires de la notification';
