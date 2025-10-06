-- =====================================================
-- SYSTÈME DE COMMUNICATION 224SOLUTIONS
-- =====================================================

-- Table des conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (type IN ('private', 'group', 'channel')),
    name VARCHAR(255),
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    INDEX idx_conversations_created_by (created_by),
    INDEX idx_conversations_type (type),
    INDEX idx_conversations_updated_at (updated_at)
);

-- Table des participants aux conversations
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Contrainte unique
    UNIQUE(conversation_id, user_id),
    
    -- Index
    INDEX idx_conversation_participants_conversation (conversation_id),
    INDEX idx_conversation_participants_user (user_id),
    INDEX idx_conversation_participants_active (is_active)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio', 'video', 'location', 'system')),
    metadata JSONB DEFAULT '{}',
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    INDEX idx_messages_conversation (conversation_id),
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_created_at (created_at),
    INDEX idx_messages_type (type),
    INDEX idx_messages_status (status)
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'message', 'call', 'announcement')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_priority (priority),
    INDEX idx_notifications_created_at (created_at)
);

-- Table des appels
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('audio', 'video')),
    status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'declined')),
    duration INTEGER DEFAULT 0, -- en secondes
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    INDEX idx_calls_caller (caller_id),
    INDEX idx_calls_receiver (receiver_id),
    INDEX idx_calls_conversation (conversation_id),
    INDEX idx_calls_status (status),
    INDEX idx_calls_created_at (created_at)
);

-- Table de présence utilisateur
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'away')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE,
    typing_in UUID REFERENCES conversations(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    INDEX idx_user_presence_status (status),
    INDEX idx_user_presence_last_seen (last_seen)
);

-- Table des annonces
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    target_roles TEXT[], -- rôles ciblés
    target_users UUID[], -- utilisateurs spécifiques
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index
    INDEX idx_announcements_author (author_id),
    INDEX idx_announcements_published (is_published),
    INDEX idx_announcements_priority (priority),
    INDEX idx_announcements_created_at (created_at)
);

-- Table de lecture des annonces
CREATE TABLE IF NOT EXISTS announcement_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique
    UNIQUE(announcement_id, user_id),
    
    -- Index
    INDEX idx_announcement_reads_announcement (announcement_id),
    INDEX idx_announcement_reads_user (user_id)
);

-- Fonctions et triggers

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour mettre à jour la présence utilisateur
CREATE OR REPLACE FUNCTION update_user_presence(
    p_user_id UUID,
    p_status VARCHAR(20),
    p_is_typing BOOLEAN DEFAULT FALSE,
    p_typing_in UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_presence (user_id, status, is_typing, typing_in, last_seen, updated_at)
    VALUES (p_user_id, p_status, p_is_typing, p_typing_in, NOW(), NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        is_typing = EXCLUDED.is_typing,
        typing_in = EXCLUDED.typing_in,
        last_seen = EXCLUDED.last_seen,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(20) DEFAULT 'info',
    p_priority VARCHAR(10) DEFAULT 'medium',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, priority, metadata)
    VALUES (p_user_id, p_title, p_message, p_type, p_priority, p_metadata)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Vues utiles

-- Vue des conversations avec le dernier message
CREATE OR REPLACE VIEW conversations_with_last_message AS
SELECT 
    c.*,
    m.content as last_message_content,
    m.created_at as last_message_at,
    m.sender_id as last_message_sender_id,
    u.first_name as last_message_sender_name,
    u.last_name as last_message_sender_last_name
FROM conversations c
LEFT JOIN messages m ON c.last_message_id = m.id
LEFT JOIN user_profiles u ON m.sender_id = u.user_id;

-- Vue des statistiques de communication
CREATE OR REPLACE VIEW communication_stats AS
SELECT 
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT CASE WHEN m.created_at >= NOW() - INTERVAL '24 hours' THEN m.id END) as messages_today,
    COUNT(DISTINCT CASE WHEN n.is_read = FALSE THEN n.id END) as unread_notifications,
    COUNT(DISTINCT CASE WHEN up.status = 'online' THEN up.user_id END) as online_users
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN notifications n ON TRUE
LEFT JOIN user_presence up ON TRUE;

-- Politiques de sécurité RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Politiques pour les conversations
CREATE POLICY "Users can see their conversations" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = conversations.id 
            AND cp.user_id = auth.uid()
            AND cp.is_active = TRUE
        )
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Politiques pour les participants
CREATE POLICY "Users can see conversation participants" ON conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = conversation_participants.conversation_id 
            AND cp.user_id = auth.uid()
            AND cp.is_active = TRUE
        )
    );

-- Politiques pour les messages
CREATE POLICY "Users can see messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
            AND cp.is_active = TRUE
        )
    );

CREATE POLICY "Users can send messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversation_participants cp 
            WHERE cp.conversation_id = messages.conversation_id 
            AND cp.user_id = auth.uid()
            AND cp.is_active = TRUE
        )
    );

-- Politiques pour les notifications
CREATE POLICY "Users can see their notifications" ON notifications
    FOR ALL USING (user_id = auth.uid());

-- Politiques pour les appels
CREATE POLICY "Users can see their calls" ON calls
    FOR ALL USING (caller_id = auth.uid() OR receiver_id = auth.uid());

-- Politiques pour la présence
CREATE POLICY "Users can see presence" ON user_presence
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can update their own presence" ON user_presence
    FOR ALL USING (user_id = auth.uid());

-- Politiques pour les annonces
CREATE POLICY "Users can see published announcements" ON announcements
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Admins can manage announcements" ON announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'pdg')
        )
    );

-- Données de test (optionnel)
INSERT INTO conversations (type, name, description, created_by) VALUES
('group', 'Équipe 224Solutions', 'Conversation de l\'équipe principale', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Commentaires sur les tables
COMMENT ON TABLE conversations IS 'Conversations entre utilisateurs';
COMMENT ON TABLE conversation_participants IS 'Participants aux conversations';
COMMENT ON TABLE messages IS 'Messages dans les conversations';
COMMENT ON TABLE notifications IS 'Notifications utilisateur';
COMMENT ON TABLE calls IS 'Historique des appels audio/vidéo';
COMMENT ON TABLE user_presence IS 'Statut de présence des utilisateurs';
COMMENT ON TABLE announcements IS 'Annonces et communications officielles';
COMMENT ON TABLE announcement_reads IS 'Suivi de lecture des annonces';