-- 🎥 TABLES AGORA - 224SOLUTIONS
-- Tables pour la gestion des communications Agora

-- Table des événements Agora
CREATE TABLE IF NOT EXISTS agora_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'token_generated', 'user_joined', 'user_left', 'call_started', 'call_ended'
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_agora_events_user_id ON agora_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agora_events_channel_name ON agora_events(channel_name);
CREATE INDEX IF NOT EXISTS idx_agora_events_event_type ON agora_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agora_events_created_at ON agora_events(created_at);

-- Table des canaux actifs
CREATE TABLE IF NOT EXISTS agora_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_name VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) DEFAULT 'call', -- 'call', 'meeting', 'broadcast'
    max_participants INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Index pour les canaux
CREATE INDEX IF NOT EXISTS idx_agora_channels_created_by ON agora_channels(created_by);
CREATE INDEX IF NOT EXISTS idx_agora_channels_is_active ON agora_channels(is_active);

-- Table des participants aux canaux
CREATE TABLE IF NOT EXISTS agora_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES agora_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(50) DEFAULT 'participant', -- 'host', 'participant', 'viewer'
    is_active BOOLEAN DEFAULT true,
    UNIQUE(channel_id, user_id)
);

-- Index pour les participants
CREATE INDEX IF NOT EXISTS idx_agora_participants_channel_id ON agora_participants(channel_id);
CREATE INDEX IF NOT EXISTS idx_agora_participants_user_id ON agora_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_agora_participants_is_active ON agora_participants(is_active);

-- Table des appels
CREATE TABLE IF NOT EXISTS agora_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_name VARCHAR(255) NOT NULL,
    caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    call_type VARCHAR(20) NOT NULL, -- 'audio', 'video'
    status VARCHAR(20) DEFAULT 'initiated', -- 'initiated', 'ringing', 'answered', 'ended', 'missed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    call_data JSONB DEFAULT '{}'
);

-- Index pour les appels
CREATE INDEX IF NOT EXISTS idx_agora_calls_caller_id ON agora_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_agora_calls_callee_id ON agora_calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_agora_calls_status ON agora_calls(status);
CREATE INDEX IF NOT EXISTS idx_agora_calls_started_at ON agora_calls(started_at);

-- Table des notifications d'appel
CREATE TABLE IF NOT EXISTS agora_call_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES agora_calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'incoming_call', 'call_answered', 'call_ended', 'call_missed'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_agora_call_notifications_user_id ON agora_call_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_agora_call_notifications_is_read ON agora_call_notifications(is_read);

-- Fonction pour nettoyer les canaux inactifs
CREATE OR REPLACE FUNCTION cleanup_inactive_channels()
RETURNS void AS $$
BEGIN
    -- Marquer comme inactifs les canaux sans participants actifs depuis plus de 1 heure
    UPDATE agora_channels 
    SET is_active = false, ended_at = NOW()
    WHERE is_active = true 
    AND id NOT IN (
        SELECT DISTINCT channel_id 
        FROM agora_participants 
        WHERE is_active = true 
        AND joined_at > NOW() - INTERVAL '1 hour'
    );
    
    -- Nettoyer les participants inactifs
    UPDATE agora_participants 
    SET is_active = false, left_at = NOW()
    WHERE is_active = true 
    AND joined_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer la durée d'un appel
CREATE OR REPLACE FUNCTION calculate_call_duration(call_id UUID)
RETURNS INTEGER AS $$
DECLARE
    duration INTEGER;
BEGIN
    SELECT EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
    INTO duration
    FROM agora_calls
    WHERE id = call_id AND ended_at IS NOT NULL;
    
    RETURN COALESCE(duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour la durée d'appel
CREATE OR REPLACE FUNCTION update_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_seconds = calculate_call_duration(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_duration
    BEFORE UPDATE ON agora_calls
    FOR EACH ROW
    EXECUTE FUNCTION update_call_duration();

-- RLS (Row Level Security) pour la sécurité
ALTER TABLE agora_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agora_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE agora_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE agora_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE agora_call_notifications ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité pour agora_events
CREATE POLICY "Users can view their own agora events" ON agora_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agora events" ON agora_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques de sécurité pour agora_channels
CREATE POLICY "Users can view channels they created or participate in" ON agora_channels
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.uid() IN (SELECT user_id FROM agora_participants WHERE channel_id = id)
    );

CREATE POLICY "Users can create channels" ON agora_channels
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Politiques de sécurité pour agora_participants
CREATE POLICY "Users can view participants in their channels" ON agora_participants
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT created_by FROM agora_channels WHERE id = channel_id)
    );

CREATE POLICY "Users can join channels" ON agora_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques de sécurité pour agora_calls
CREATE POLICY "Users can view their own calls" ON agora_calls
    FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls" ON agora_calls
    FOR INSERT WITH CHECK (auth.uid() = caller_id);

-- Politiques de sécurité pour agora_call_notifications
CREATE POLICY "Users can view their own notifications" ON agora_call_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON agora_call_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Vue pour les statistiques d'appels
CREATE VIEW agora_call_stats AS
SELECT 
    p.id as user_id,
    p.first_name,
    p.last_name,
    COUNT(ac.id) as total_calls,
    COUNT(CASE WHEN ac.status = 'ended' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN ac.status = 'missed' THEN 1 END) as missed_calls,
    AVG(ac.duration_seconds) as avg_duration,
    MAX(ac.started_at) as last_call_at
FROM profiles p
LEFT JOIN agora_calls ac ON (p.id = ac.caller_id OR p.id = ac.callee_id)
GROUP BY p.id, p.first_name, p.last_name;

-- Commentaires sur les tables
COMMENT ON TABLE agora_events IS 'Événements et logs des communications Agora';
COMMENT ON TABLE agora_channels IS 'Canaux de communication actifs';
COMMENT ON TABLE agora_participants IS 'Participants aux canaux de communication';
COMMENT ON TABLE agora_calls IS 'Historique des appels audio/vidéo';
COMMENT ON TABLE agora_call_notifications IS 'Notifications d\'appels pour les utilisateurs';
COMMENT ON VIEW agora_call_stats IS 'Statistiques d\'appels par utilisateur';
