-- 🚚 SYSTÈME TRANSPORT COMPLET - 224SOLUTIONS
-- Tables et fonctions pour le système de transport/livreurs

-- Table des utilisateurs transporteurs
CREATE TABLE IF NOT EXISTS transport_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    photo TEXT,
    rating DECIMAL(3,2) DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    earnings DECIMAL(12,2) DEFAULT 0,
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, busy, on_trip
    vehicle_type VARCHAR(50) NOT NULL, -- moto, bike, car, truck
    vehicle_info JSONB, -- {model, color, plateNumber, year}
    current_position JSONB, -- {lat, lng}
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des demandes de transport
CREATE TABLE IF NOT EXISTS transport_requests (
    id VARCHAR(255) PRIMARY KEY,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    client_photo TEXT,
    transport_user_id UUID REFERENCES transport_users(id),
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_position JSONB NOT NULL, -- {lat, lng}
    delivery_position JSONB NOT NULL, -- {lat, lng}
    distance INTEGER, -- en mètres
    estimated_time INTEGER, -- en minutes
    price DECIMAL(12,2) NOT NULL, -- prix de base
    fees DECIMAL(12,2) NOT NULL, -- frais 1%
    total_price DECIMAL(12,2) NOT NULL, -- prix total
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, picked_up, delivered, cancelled, disputed
    notes TEXT,
    proof_of_delivery JSONB, -- {photo, coordinates, timestamp, clientSignature}
    created_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des positions de transport
CREATE TABLE IF NOT EXISTS transport_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) REFERENCES transport_requests(id) ON DELETE CASCADE,
    transport_user_id UUID REFERENCES transport_users(id),
    position_type VARCHAR(50) NOT NULL, -- pickup, picked_up, in_transit, delivered
    coordinates JSONB NOT NULL, -- {lat, lng}
    timestamp TIMESTAMP DEFAULT NOW(),
    accuracy DECIMAL(8,2),
    speed DECIMAL(8,2),
    heading DECIMAL(8,2)
);

-- Table des itinéraires
CREATE TABLE IF NOT EXISTS transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) REFERENCES transport_requests(id) ON DELETE CASCADE,
    waypoints JSONB NOT NULL, -- [{lat, lng}, ...]
    distance INTEGER, -- en mètres
    duration INTEGER, -- en minutes
    polyline TEXT,
    instructions JSONB, -- [{instruction, distance, duration}, ...]
    real_time_updates JSONB, -- {currentPosition, progress, estimatedArrival, lastUpdate}
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des statistiques de transport
CREATE TABLE IF NOT EXISTS transport_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(50) NOT NULL, -- daily, weekly, monthly, yearly
    period_date DATE NOT NULL,
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    disputed_trips INTEGER DEFAULT 0,
    total_distance DECIMAL(12,2) DEFAULT 0, -- en km
    total_time INTEGER DEFAULT 0, -- en minutes
    total_earnings DECIMAL(12,2) DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    commission_earned DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, period, period_date)
);

-- Table des litiges de transport
CREATE TABLE IF NOT EXISTS transport_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) REFERENCES transport_requests(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id),
    transport_user_id UUID REFERENCES transport_users(id),
    dispute_type VARCHAR(50) NOT NULL, -- payment, service, behavior, other
    reason TEXT NOT NULL,
    description TEXT,
    evidence JSONB, -- {photos: [], messages: [], coordinates: []}
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, closed
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_transport_users_online ON transport_users(is_online, is_available);
CREATE INDEX IF NOT EXISTS idx_transport_users_status ON transport_users(status);
CREATE INDEX IF NOT EXISTS idx_transport_users_position ON transport_users USING GIST(current_position);
CREATE INDEX IF NOT EXISTS idx_transport_requests_status ON transport_requests(status);
CREATE INDEX IF NOT EXISTS idx_transport_requests_client ON transport_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_transport_user ON transport_requests(transport_user_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_created ON transport_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_transport_positions_request ON transport_positions(request_id);
CREATE INDEX IF NOT EXISTS idx_transport_positions_timestamp ON transport_positions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transport_stats_user_period ON transport_stats(user_id, period, period_date);

-- Fonction pour calculer la distance entre deux points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lng1 DECIMAL,
    lat2 DECIMAL,
    lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    earth_radius DECIMAL := 6371000; -- Rayon de la Terre en mètres
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := radians(lat2 - lat1);
    dlng := radians(lng2 - lng1);
    
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlng/2) * sin(dlng/2);
    
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour trouver les transporteurs les plus proches
CREATE OR REPLACE FUNCTION find_nearest_transport_users(
    client_lat DECIMAL,
    client_lng DECIMAL,
    max_distance DECIMAL DEFAULT 10000, -- 10km par défaut
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE (
    id UUID,
    name VARCHAR,
    distance DECIMAL,
    rating DECIMAL,
    vehicle_type VARCHAR,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tu.id,
        tu.name,
        calculate_distance(client_lat, client_lng, 
            (tu.current_position->>'lat')::DECIMAL, 
            (tu.current_position->>'lng')::DECIMAL
        ) as distance,
        tu.rating,
        tu.vehicle_type,
        tu.is_available
    FROM transport_users tu
    WHERE tu.is_online = true 
        AND tu.is_available = true
        AND tu.status = 'online'
        AND tu.current_position IS NOT NULL
        AND calculate_distance(client_lat, client_lng, 
            (tu.current_position->>'lat')::DECIMAL, 
            (tu.current_position->>'lng')::DECIMAL
        ) <= max_distance
    ORDER BY distance
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les statistiques
CREATE OR REPLACE FUNCTION update_transport_stats(
    p_user_id UUID,
    p_period VARCHAR,
    p_period_date DATE
) RETURNS VOID AS $$
DECLARE
    v_total_trips INTEGER;
    v_completed_trips INTEGER;
    v_cancelled_trips INTEGER;
    v_disputed_trips INTEGER;
    v_total_distance DECIMAL;
    v_total_time INTEGER;
    v_total_earnings DECIMAL;
    v_average_rating DECIMAL;
BEGIN
    -- Compter les demandes
    SELECT COUNT(*) INTO v_total_trips
    FROM transport_requests tr
    WHERE tr.client_id = p_user_id 
        AND DATE(tr.created_at) = p_period_date;
    
    -- Compter les demandes terminées
    SELECT COUNT(*) INTO v_completed_trips
    FROM transport_requests tr
    WHERE tr.client_id = p_user_id 
        AND tr.status = 'delivered'
        AND DATE(tr.created_at) = p_period_date;
    
    -- Compter les demandes annulées
    SELECT COUNT(*) INTO v_cancelled_trips
    FROM transport_requests tr
    WHERE tr.client_id = p_user_id 
        AND tr.status = 'cancelled'
        AND DATE(tr.created_at) = p_period_date;
    
    -- Compter les litiges
    SELECT COUNT(*) INTO v_disputed_trips
    FROM transport_requests tr
    WHERE tr.client_id = p_user_id 
        AND tr.status = 'disputed'
        AND DATE(tr.created_at) = p_period_date;
    
    -- Calculer la distance totale
    SELECT COALESCE(SUM(tr.distance), 0) INTO v_total_distance
    FROM transport_requests tr
    WHERE tr.client_id = p_user_id 
        AND DATE(tr.created_at) = p_period_date;
    
    -- Calculer le temps total
    SELECT COALESCE(SUM(tr.estimated_time), 0) INTO v_total_time
    FROM transport_requests tr
    WHERE tr.client_id = p_user_id 
        AND DATE(tr.created_at) = p_period_date;
    
    -- Calculer les gains totaux
    SELECT COALESCE(SUM(tr.price), 0) INTO v_total_earnings
    FROM transport_requests tr
    WHERE tr.client_id = p_user_id 
        AND tr.status = 'delivered'
        AND DATE(tr.created_at) = p_period_date;
    
    -- Calculer la note moyenne
    SELECT COALESCE(AVG(tu.rating), 0) INTO v_average_rating
    FROM transport_users tu
    WHERE tu.user_id = p_user_id;
    
    -- Insérer ou mettre à jour les statistiques
    INSERT INTO transport_stats (
        user_id, period, period_date,
        total_trips, completed_trips, cancelled_trips, disputed_trips,
        total_distance, total_time, total_earnings, average_rating
    ) VALUES (
        p_user_id, p_period, p_period_date,
        v_total_trips, v_completed_trips, v_cancelled_trips, v_disputed_trips,
        v_total_distance, v_total_time, v_total_earnings, v_average_rating
    )
    ON CONFLICT (user_id, period, period_date)
    DO UPDATE SET
        total_trips = EXCLUDED.total_trips,
        completed_trips = EXCLUDED.completed_trips,
        cancelled_trips = EXCLUDED.cancelled_trips,
        disputed_trips = EXCLUDED.disputed_trips,
        total_distance = EXCLUDED.total_distance,
        total_time = EXCLUDED.total_time,
        total_earnings = EXCLUDED.total_earnings,
        average_rating = EXCLUDED.average_rating,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mise à jour automatique
CREATE OR REPLACE FUNCTION trigger_update_transport_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les statistiques quotidiennes
    PERFORM update_transport_stats(
        NEW.client_id,
        'daily',
        DATE(NEW.created_at)
    );
    
    -- Mettre à jour les statistiques hebdomadaires
    PERFORM update_transport_stats(
        NEW.client_id,
        'weekly',
        DATE_TRUNC('week', NEW.created_at)::DATE
    );
    
    -- Mettre à jour les statistiques mensuelles
    PERFORM update_transport_stats(
        NEW.client_id,
        'monthly',
        DATE_TRUNC('month', NEW.created_at)::DATE
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_transport_requests_stats
    AFTER INSERT OR UPDATE ON transport_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_transport_stats();

-- Vue pour les statistiques globales
CREATE OR REPLACE VIEW transport_global_stats AS
SELECT 
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_requests,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
    COUNT(CASE WHEN status = 'disputed' THEN 1 END) as disputed_requests,
    COALESCE(SUM(CASE WHEN status = 'delivered' THEN price END), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN status = 'delivered' THEN fees END), 0) as total_commissions,
    COALESCE(AVG(CASE WHEN status = 'delivered' THEN estimated_time END), 0) as avg_delivery_time,
    COALESCE(AVG(CASE WHEN status = 'delivered' THEN distance END), 0) as avg_distance
FROM transport_requests;

-- Politiques RLS (Row Level Security)
ALTER TABLE transport_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_disputes ENABLE ROW LEVEL SECURITY;

-- Politiques pour transport_users
CREATE POLICY "Users can view transport users" ON transport_users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own transport profile" ON transport_users
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transport profile" ON transport_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Politiques pour transport_requests
CREATE POLICY "Users can view own requests" ON transport_requests
    FOR SELECT USING (client_id = auth.uid() OR transport_user_id = auth.uid());

CREATE POLICY "Users can create requests" ON transport_requests
    FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "Transport users can update assigned requests" ON transport_requests
    FOR UPDATE USING (transport_user_id = auth.uid());

-- Politiques pour transport_positions
CREATE POLICY "Users can view positions for own requests" ON transport_positions
    FOR SELECT USING (
        request_id IN (
            SELECT id FROM transport_requests 
            WHERE client_id = auth.uid() OR transport_user_id = auth.uid()
        )
    );

CREATE POLICY "Transport users can insert positions" ON transport_positions
    FOR INSERT WITH CHECK (transport_user_id = auth.uid());

-- Politiques pour transport_stats
CREATE POLICY "Users can view own stats" ON transport_stats
    FOR SELECT USING (user_id = auth.uid());

-- Politiques pour transport_disputes
CREATE POLICY "Users can view own disputes" ON transport_disputes
    FOR SELECT USING (client_id = auth.uid() OR transport_user_id = auth.uid());

CREATE POLICY "Users can create disputes" ON transport_disputes
    FOR INSERT WITH CHECK (client_id = auth.uid() OR transport_user_id = auth.uid());

-- Données de test
INSERT INTO transport_users (
    id, user_id, name, email, phone, vehicle_type, vehicle_info, 
    is_online, is_available, status, current_position
) VALUES 
(
    gen_random_uuid(),
    (SELECT id FROM users LIMIT 1),
    'Mamadou Diallo',
    'mamadou@example.com',
    '+224 123 45 67 89',
    'moto',
    '{"model": "Yamaha YBR", "color": "Rouge", "plateNumber": "GN-123-AB"}',
    true,
    true,
    'online',
    '{"lat": 9.6412, "lng": -13.5784}'
),
(
    gen_random_uuid(),
    (SELECT id FROM users LIMIT 1),
    'Fatoumata Camara',
    'fatoumata@example.com',
    '+224 987 65 43 21',
    'moto',
    '{"model": "Honda CG", "color": "Bleu", "plateNumber": "GN-456-CD"}',
    true,
    true,
    'online',
    '{"lat": 9.6415, "lng": -13.5780}'
);

-- Commentaires
COMMENT ON TABLE transport_users IS 'Utilisateurs transporteurs/livreurs';
COMMENT ON TABLE transport_requests IS 'Demandes de transport';
COMMENT ON TABLE transport_positions IS 'Positions GPS des transports';
COMMENT ON TABLE transport_routes IS 'Itinéraires de transport';
COMMENT ON TABLE transport_stats IS 'Statistiques de transport';
COMMENT ON TABLE transport_disputes IS 'Litiges de transport';

COMMENT ON FUNCTION calculate_distance IS 'Calcule la distance entre deux points GPS';
COMMENT ON FUNCTION find_nearest_transport_users IS 'Trouve les transporteurs les plus proches';
COMMENT ON FUNCTION update_transport_stats IS 'Met à jour les statistiques de transport';
