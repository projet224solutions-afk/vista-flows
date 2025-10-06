-- 📍 SYSTÈME DE GÉOLOCALISATION - 224SOLUTIONS
-- Tables pour le partage de position et la géolocalisation

-- =====================================================
-- TABLE DES POSITIONS UTILISATEURS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    altitude DECIMAL(8, 2),
    speed DECIMAL(8, 2),
    heading DECIMAL(8, 2),
    timestamp BIGINT NOT NULL,
    battery_level INTEGER,
    network_type VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes de position
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_timestamp ON user_positions(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_positions_active ON user_positions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_positions_location ON user_positions(latitude, longitude);

-- =====================================================
-- TABLE DES PARTAGES DE POSITION
-- =====================================================

CREATE TABLE IF NOT EXISTS location_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sharing_id VARCHAR(50) UNIQUE NOT NULL,
    from_user_id VARCHAR(50) NOT NULL,
    to_user_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{"canView": true, "canTrack": true, "canShare": false}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les partages
CREATE INDEX IF NOT EXISTS idx_location_sharing_from_user ON location_sharing(from_user_id);
CREATE INDEX IF NOT EXISTS idx_location_sharing_to_user ON location_sharing(to_user_id);
CREATE INDEX IF NOT EXISTS idx_location_sharing_active ON location_sharing(is_active);
CREATE INDEX IF NOT EXISTS idx_location_sharing_expires ON location_sharing(expires_at);

-- =====================================================
-- TABLE DES GÉOFENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius INTEGER NOT NULL, -- en mètres
    is_active BOOLEAN DEFAULT true,
    user_id VARCHAR(50), -- propriétaire du géofence
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les géofences
CREATE INDEX IF NOT EXISTS idx_geofences_user_id ON geofences(user_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active);
CREATE INDEX IF NOT EXISTS idx_geofences_location ON geofences(center_latitude, center_longitude);

-- =====================================================
-- TABLE DES ÉVÉNEMENTS GÉOFENCE
-- =====================================================

CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(20) NOT NULL, -- 'enter', 'exit'
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les événements
CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence ON geofence_events(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_user ON geofence_events(user_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_timestamp ON geofence_events(timestamp);

-- =====================================================
-- TABLE DES DEMANDES DE LIVRAISON
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) NOT NULL,
    client_name VARCHAR(100),
    client_phone VARCHAR(20),
    client_photo TEXT,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    delivery_latitude DECIMAL(10, 8) NOT NULL,
    delivery_longitude DECIMAL(11, 8) NOT NULL,
    distance INTEGER, -- en mètres
    estimated_time INTEGER, -- en minutes
    price DECIMAL(10, 2) NOT NULL, -- prix de base
    fees DECIMAL(10, 2) NOT NULL, -- frais 1%
    total_price DECIMAL(10, 2) NOT NULL, -- prix total
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, picked_up, delivered, cancelled
    delivery_user_id VARCHAR(50),
    notes TEXT,
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les demandes de livraison
CREATE INDEX IF NOT EXISTS idx_delivery_requests_client ON delivery_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_delivery_user ON delivery_requests(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_created ON delivery_requests(created_at);

-- =====================================================
-- TABLE DES UTILISATEURS DE LIVRAISON
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    photo TEXT,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    total_deliveries INTEGER DEFAULT 0,
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT false,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    vehicle_type VARCHAR(20) DEFAULT 'moto', -- moto, bike, car
    vehicle_model VARCHAR(100),
    vehicle_color VARCHAR(50),
    vehicle_plate VARCHAR(20),
    status VARCHAR(20) DEFAULT 'offline', -- online, offline, busy, on_delivery
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les utilisateurs de livraison
CREATE INDEX IF NOT EXISTS idx_delivery_users_user_id ON delivery_users(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_users_online ON delivery_users(is_online);
CREATE INDEX IF NOT EXISTS idx_delivery_users_available ON delivery_users(is_available);
CREATE INDEX IF NOT EXISTS idx_delivery_users_status ON delivery_users(status);
CREATE INDEX IF NOT EXISTS idx_delivery_users_location ON delivery_users(current_latitude, current_longitude);

-- =====================================================
-- TABLE DES ITINÉRAIRES DE LIVRAISON
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
    waypoints JSONB, -- tableau de positions
    distance INTEGER, -- en mètres
    duration INTEGER, -- en secondes
    polyline TEXT, -- polyline encodée
    instructions JSONB, -- instructions de navigation
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les itinéraires
CREATE INDEX IF NOT EXISTS idx_delivery_routes_delivery ON delivery_routes(delivery_id);

-- =====================================================
-- TABLE DES STATISTIQUES DE LIVRAISON
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_distance INTEGER DEFAULT 0, -- en mètres
    total_time INTEGER DEFAULT 0, -- en minutes
    completed_deliveries INTEGER DEFAULT 0,
    cancelled_deliveries INTEGER DEFAULT 0,
    average_delivery_time INTEGER DEFAULT 0, -- en minutes
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_delivery_stats_user ON delivery_stats(user_id);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer la distance entre deux points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        6371000 * acos(
            cos(radians(lat1)) * cos(radians(lat2)) *
            cos(radians(lon2) - radians(lon1)) +
            sin(radians(lat1)) * sin(radians(lat2))
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour trouver les utilisateurs proches
CREATE OR REPLACE FUNCTION find_nearby_users(
    center_lat DECIMAL,
    center_lon DECIMAL,
    radius_meters INTEGER,
    user_type_filter VARCHAR DEFAULT NULL
) RETURNS TABLE (
    user_id VARCHAR,
    name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    photo TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance DECIMAL,
    last_seen TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        du.name,
        du.email,
        du.phone,
        du.photo,
        up.latitude,
        up.longitude,
        calculate_distance(center_lat, center_lon, up.latitude, up.longitude) as distance,
        up.created_at as last_seen
    FROM user_positions up
    JOIN delivery_users du ON up.user_id = du.user_id
    WHERE up.is_active = true
    AND up.timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '5 minutes') * 1000
    AND calculate_distance(center_lat, center_lon, up.latitude, up.longitude) <= radius_meters
    AND (user_type_filter IS NULL OR du.vehicle_type = user_type_filter)
    ORDER BY distance;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à toutes les tables
CREATE TRIGGER update_user_positions_updated_at
    BEFORE UPDATE ON user_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_sharing_updated_at
    BEFORE UPDATE ON location_sharing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at
    BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_requests_updated_at
    BEFORE UPDATE ON delivery_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_users_updated_at
    BEFORE UPDATE ON delivery_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLITIQUES RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_stats ENABLE ROW LEVEL SECURITY;

-- Politiques pour user_positions
CREATE POLICY "Users can view their own positions" ON user_positions
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own positions" ON user_positions
    FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Politiques pour location_sharing
CREATE POLICY "Users can view shared locations" ON location_sharing
    FOR SELECT USING (
        from_user_id = current_setting('app.current_user_id', true) OR
        to_user_id = current_setting('app.current_user_id', true)
    );

CREATE POLICY "Users can create location sharing" ON location_sharing
    FOR INSERT WITH CHECK (from_user_id = current_setting('app.current_user_id', true));

-- Politiques pour delivery_requests
CREATE POLICY "Users can view their delivery requests" ON delivery_requests
    FOR SELECT USING (
        client_id = current_setting('app.current_user_id', true) OR
        delivery_user_id = current_setting('app.current_user_id', true)
    );

CREATE POLICY "Users can create delivery requests" ON delivery_requests
    FOR INSERT WITH CHECK (client_id = current_setting('app.current_user_id', true));

-- =====================================================
-- VUES UTILITAIRES
-- =====================================================

-- Vue des utilisateurs de livraison en ligne
CREATE VIEW online_delivery_users AS
SELECT 
    du.*,
    up.latitude as current_latitude,
    up.longitude as current_longitude,
    up.accuracy,
    up.timestamp as position_timestamp
FROM delivery_users du
LEFT JOIN user_positions up ON du.user_id = up.user_id
WHERE du.is_online = true
AND up.is_active = true
AND up.timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '5 minutes') * 1000;

-- Vue des demandes de livraison actives
CREATE VIEW active_delivery_requests AS
SELECT 
    dr.*,
    cu.name as client_name,
    cu.phone as client_phone,
    cu.photo as client_photo,
    du.name as delivery_user_name,
    du.phone as delivery_user_phone,
    du.photo as delivery_user_photo
FROM delivery_requests dr
LEFT JOIN delivery_users cu ON dr.client_id = cu.user_id
LEFT JOIN delivery_users du ON dr.delivery_user_id = du.user_id
WHERE dr.status IN ('pending', 'accepted', 'picked_up');

-- =====================================================
-- DONNÉES DE TEST
-- =====================================================

-- Insérer des utilisateurs de livraison de test
INSERT INTO delivery_users (user_id, name, email, phone, vehicle_type, vehicle_model, vehicle_color, vehicle_plate, is_online, is_available, status) VALUES
('delivery_001', 'Moussa Diallo', 'moussa@example.com', '+224 123 45 67 89', 'moto', 'Yamaha YBR', 'Rouge', 'GN-123-AB', true, true, 'online'),
('delivery_002', 'Fatou Camara', 'fatou@example.com', '+224 234 56 78 90', 'moto', 'Honda CG', 'Bleu', 'GN-234-BC', true, true, 'online'),
('delivery_003', 'Ibrahima Traoré', 'ibrahima@example.com', '+224 345 67 89 01', 'bike', 'Vélo électrique', 'Vert', 'GN-345-CD', false, false, 'offline');

-- Insérer des positions de test
INSERT INTO user_positions (user_id, latitude, longitude, accuracy, timestamp, is_active) VALUES
('delivery_001', 9.6412, -13.5784, 5.0, EXTRACT(EPOCH FROM NOW()) * 1000, true),
('delivery_002', 9.6512, -13.5884, 5.0, EXTRACT(EPOCH FROM NOW()) * 1000, true);

-- =====================================================
-- CONFIGURATION TERMINÉE
-- =====================================================

SELECT 'Système de géolocalisation configuré avec succès' as status;
