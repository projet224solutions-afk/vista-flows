-- =====================================================
-- SCHÉMA TAXI MOTO AMÉLIORÉ - 224SOLUTIONS
-- Fonctionnalités avancées avec données réelles
-- =====================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABLES PRINCIPALES AMÉLIORÉES
-- =====================================================

-- Table des conducteurs avec informations complètes
CREATE TABLE IF NOT EXISTS public.taxi_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Statut et disponibilité
    is_online BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'offline' CHECK (status IN ('offline', 'available', 'on_trip', 'busy')),
    
    -- Informations véhicule
    vehicle_type TEXT DEFAULT 'moto_rapide' CHECK (vehicle_type IN ('moto_economique', 'moto_rapide', 'moto_premium')),
    vehicle_brand TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_color TEXT,
    license_plate TEXT UNIQUE,
    
    -- Position et géolocalisation
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_lat DECIMAL(10, 8),
    last_lng DECIMAL(11, 8),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    
    -- Statistiques et performance
    rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5),
    total_rides INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    today_earnings DECIMAL(12, 2) DEFAULT 0,
    today_rides INTEGER DEFAULT 0,
    
    -- Informations KYC et vérification
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
    documents_verified BOOLEAN DEFAULT FALSE,
    background_check BOOLEAN DEFAULT FALSE,
    
    -- Préférences de travail
    working_hours JSONB DEFAULT '{"start": "06:00", "end": "22:00"}'::jsonb,
    preferred_areas JSONB DEFAULT '[]'::jsonb,
    max_distance_km INTEGER DEFAULT 20,
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des courses avec tracking complet
CREATE TABLE IF NOT EXISTS public.taxi_trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_number TEXT UNIQUE DEFAULT 'TRIP-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) % 86400)::INTEGER::TEXT, 5, '0'),
    
    -- Participants
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.taxi_drivers(id) ON DELETE SET NULL,
    
    -- Géolocalisation
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT NOT NULL,
    
    -- Détails du trajet
    distance_km DECIMAL(8, 2),
    duration_min INTEGER,
    estimated_duration_min INTEGER,
    
    -- Tarification
    base_price DECIMAL(10, 2) DEFAULT 1000,
    distance_price DECIMAL(10, 2) DEFAULT 0,
    time_price DECIMAL(10, 2) DEFAULT 0,
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.00,
    price_total DECIMAL(12, 2),
    driver_share DECIMAL(12, 2),
    platform_fee DECIMAL(12, 2),
    
    -- Statut et timing
    status TEXT DEFAULT 'requested' CHECK (status IN (
        'requested', 'searching', 'accepted', 'driver_arriving', 
        'picked_up', 'in_progress', 'completed', 'cancelled'
    )),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    driver_arriving_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Informations de paiement
    payment_method TEXT DEFAULT 'wallet_224' CHECK (payment_method IN (
        'wallet_224', 'mobile_money', 'card', 'cash'
    )),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded'
    )),
    transaction_id UUID,
    
    -- Évaluations
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    customer_feedback TEXT,
    driver_feedback TEXT,
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de tracking en temps réel
CREATE TABLE IF NOT EXISTS public.taxi_trip_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES public.taxi_trips(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.taxi_drivers(id) ON DELETE CASCADE,
    
    -- Position
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    heading DECIMAL(5, 2),
    speed DECIMAL(8, 2),
    
    -- Événements
    event_type TEXT DEFAULT 'location_update' CHECK (event_type IN (
        'location_update', 'pickup_arrived', 'pickup_completed', 
        'trip_started', 'trip_completed', 'trip_cancelled'
    )),
    event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Métadonnées
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS public.taxi_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.taxi_trips(id) ON DELETE CASCADE,
    
    -- Contenu
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    category TEXT DEFAULT 'trip' CHECK (category IN ('trip', 'payment', 'rating', 'system')),
    
    -- Statut
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- =====================================================
-- 2. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour calculer la distance entre deux points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lng1 DECIMAL,
    lat2 DECIMAL, lng2 DECIMAL
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
    
    RETURN earth_radius * c / 1000; -- Retourne en kilomètres
END;
$$ LANGUAGE plpgsql;

-- Fonction pour trouver les conducteurs proches
CREATE OR REPLACE FUNCTION find_nearby_drivers(
    pickup_lat DECIMAL,
    pickup_lon DECIMAL,
    radius_km DECIMAL DEFAULT 5,
    vehicle_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    driver_id UUID,
    user_id UUID,
    distance_km DECIMAL,
    vehicle_type TEXT,
    rating DECIMAL,
    current_latitude DECIMAL,
    current_longitude DECIMAL,
    last_seen TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        td.id as driver_id,
        td.user_id,
        calculate_distance(pickup_lat, pickup_lon, td.current_latitude, td.current_longitude) as distance_km,
        td.vehicle_type,
        td.rating,
        td.current_latitude,
        td.current_longitude,
        td.last_seen
    FROM taxi_drivers td
    WHERE td.is_online = true 
        AND td.is_active = true
        AND td.status = 'available'
        AND td.kyc_status = 'approved'
        AND td.current_latitude IS NOT NULL
        AND td.current_longitude IS NOT NULL
        AND td.last_seen > NOW() - INTERVAL '5 minutes'
        AND calculate_distance(pickup_lat, pickup_lon, td.current_latitude, td.current_longitude) <= radius_km
        AND (vehicle_type_filter IS NULL OR td.vehicle_type = vehicle_type_filter)
    ORDER BY distance_km ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les statistiques du conducteur
CREATE OR REPLACE FUNCTION update_driver_stats(driver_uuid UUID)
RETURNS VOID AS $$
DECLARE
    today_start TIMESTAMPTZ := DATE_TRUNC('day', NOW());
    today_earnings DECIMAL(12, 2);
    today_rides_count INTEGER;
    total_earnings DECIMAL(12, 2);
    total_rides_count INTEGER;
    avg_rating DECIMAL(3, 2);
BEGIN
    -- Statistiques du jour
    SELECT 
        COALESCE(SUM(tt.driver_share), 0),
        COUNT(tt.id)
    INTO today_earnings, today_rides_count
    FROM taxi_trips tt
    WHERE tt.driver_id = driver_uuid
        AND tt.status = 'completed'
        AND tt.completed_at >= today_start;
    
    -- Statistiques globales
    SELECT 
        COALESCE(SUM(tt.driver_share), 0),
        COUNT(tt.id),
        COALESCE(AVG(tt.driver_rating), 5.0)
    INTO total_earnings, total_rides_count, avg_rating
    FROM taxi_trips tt
    WHERE tt.driver_id = driver_uuid
        AND tt.status = 'completed';
    
    -- Mise à jour
    UPDATE taxi_drivers 
    SET 
        today_earnings = today_earnings,
        today_rides = today_rides_count,
        total_earnings = total_earnings,
        total_rides = total_rides_count,
        rating = avg_rating,
        updated_at = NOW()
    WHERE id = driver_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. TRIGGERS ET AUTOMATISATIONS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application des triggers
CREATE TRIGGER update_taxi_drivers_updated_at 
    BEFORE UPDATE ON taxi_drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_taxi_trips_updated_at 
    BEFORE UPDATE ON taxi_trips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour mettre à jour les stats après completion d'une course
CREATE OR REPLACE FUNCTION trigger_update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM update_driver_stats(NEW.driver_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_stats_trigger
    AFTER UPDATE ON taxi_trips
    FOR EACH ROW EXECUTE FUNCTION trigger_update_driver_stats();

-- =====================================================
-- 4. POLITIQUES DE SÉCURITÉ (RLS)
-- =====================================================

-- Activer RLS
ALTER TABLE taxi_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_trip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_notifications ENABLE ROW LEVEL SECURITY;

-- Politiques pour taxi_drivers
CREATE POLICY "drivers_read_own" ON taxi_drivers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "drivers_update_own" ON taxi_drivers
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Politiques pour taxi_trips
CREATE POLICY "trips_read_participants" ON taxi_trips
    FOR SELECT USING (
        customer_id = auth.uid() OR 
        (driver_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM taxi_drivers td 
            WHERE td.id = taxi_trips.driver_id AND td.user_id = auth.uid()
        ))
    );

CREATE POLICY "trips_insert_customers" ON taxi_trips
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "trips_update_drivers" ON taxi_trips
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM taxi_drivers td 
            WHERE td.id = taxi_trips.driver_id AND td.user_id = auth.uid()
        )
    );

-- Politiques pour taxi_trip_tracking
CREATE POLICY "tracking_read_participants" ON taxi_trip_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM taxi_trips tt 
            WHERE tt.id = taxi_trip_tracking.trip_id 
            AND (tt.customer_id = auth.uid() OR 
                 (tt.driver_id IS NOT NULL AND EXISTS (
                     SELECT 1 FROM taxi_drivers td 
                     WHERE td.id = tt.driver_id AND td.user_id = auth.uid()
                 )))
        )
    );

-- Politiques pour taxi_notifications
CREATE POLICY "notifications_read_own" ON taxi_notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_own" ON taxi_notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. INDEX POUR PERFORMANCE
-- =====================================================

-- Index pour les requêtes géospatiales
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_location 
    ON taxi_drivers USING GIST (
        ll_to_earth(current_latitude, current_longitude)
    ) WHERE is_online = true AND is_active = true;

-- Index pour les requêtes temporelles
CREATE INDEX IF NOT EXISTS idx_taxi_trips_status_time 
    ON taxi_trips (status, requested_at) 
    WHERE status IN ('requested', 'searching');

CREATE INDEX IF NOT EXISTS idx_taxi_trips_driver_status 
    ON taxi_trips (driver_id, status, completed_at);

-- Index pour le tracking
CREATE INDEX IF NOT EXISTS idx_taxi_tracking_trip_time 
    ON taxi_trip_tracking (trip_id, timestamp);

-- Index pour les notifications
CREATE INDEX IF NOT EXISTS idx_taxi_notifications_user_unread 
    ON taxi_notifications (user_id, is_read, created_at);

-- =====================================================
-- 6. DONNÉES DE TEST (OPTIONNEL)
-- =====================================================

-- Insertion de conducteurs de test (à supprimer en production)
INSERT INTO taxi_drivers (
    user_id, is_online, status, vehicle_type, 
    current_latitude, current_longitude, rating, total_rides
) VALUES 
    (
        (SELECT id FROM auth.users LIMIT 1), 
        true, 'available', 'moto_rapide',
        14.6937, -17.4441, 4.8, 150
    ),
    (
        (SELECT id FROM auth.users LIMIT 1 OFFSET 1), 
        true, 'available', 'moto_premium',
        14.7167, -17.4667, 4.9, 200
    )
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 7. VUES UTILES
-- =====================================================

-- Vue des statistiques des conducteurs
CREATE OR REPLACE VIEW driver_stats_view AS
SELECT 
    td.id,
    td.user_id,
    td.vehicle_type,
    td.rating,
    td.total_rides,
    td.total_earnings,
    td.today_earnings,
    td.today_rides,
    td.is_online,
    td.status,
    td.last_seen,
    CASE 
        WHEN td.last_seen > NOW() - INTERVAL '5 minutes' THEN 'active'
        WHEN td.last_seen > NOW() - INTERVAL '30 minutes' THEN 'idle'
        ELSE 'inactive'
    END as activity_status
FROM taxi_drivers td;

-- Vue des courses récentes
CREATE OR REPLACE VIEW recent_trips_view AS
SELECT 
    tt.id,
    tt.trip_number,
    tt.status,
    tt.pickup_address,
    tt.dropoff_address,
    tt.distance_km,
    tt.duration_min,
    tt.price_total,
    tt.driver_share,
    tt.requested_at,
    tt.completed_at,
    td.vehicle_type,
    td.rating as driver_rating
FROM taxi_trips tt
LEFT JOIN taxi_drivers td ON tt.driver_id = td.id
WHERE tt.requested_at > NOW() - INTERVAL '24 hours'
ORDER BY tt.requested_at DESC;
