-- 🗄️ BASE DE DONNÉES DISTRIBUÉE - 224SOLUTIONS
-- Configuration pour 100M utilisateurs avec sharding

-- =====================================================
-- CONFIGURATION SHARDING GLOBAL
-- =====================================================

-- 1. SHARD 1 - EUROPE (Users 1M-20M)
CREATE DATABASE shard_europe_1;
CREATE DATABASE shard_europe_2;
CREATE DATABASE shard_europe_3;
CREATE DATABASE shard_europe_4;

-- 2. SHARD 2 - ASIA (Users 20M-40M)
CREATE DATABASE shard_asia_1;
CREATE DATABASE shard_asia_2;
CREATE DATABASE shard_asia_3;
CREATE DATABASE shard_asia_4;

-- 3. SHARD 3 - AMERICAS (Users 40M-60M)
CREATE DATABASE shard_americas_1;
CREATE DATABASE shard_americas_2;
CREATE DATABASE shard_americas_3;
CREATE DATABASE shard_americas_4;

-- 4. SHARD 4 - AFRICA (Users 60M-80M)
CREATE DATABASE shard_africa_1;
CREATE DATABASE shard_africa_2;
CREATE DATABASE shard_africa_3;
CREATE DATABASE shard_africa_4;

-- 5. SHARD 5 - OCEANIA (Users 80M-100M)
CREATE DATABASE shard_oceania_1;
CREATE DATABASE shard_oceania_2;
CREATE DATABASE shard_oceania_3;
CREATE DATABASE shard_oceania_4;

-- =====================================================
-- CONFIGURATION SHARDING ROUTER
-- =====================================================

-- Table de routage des shards
CREATE TABLE shard_routing (
    shard_id VARCHAR(20) PRIMARY KEY,
    region VARCHAR(50) NOT NULL,
    database_name VARCHAR(100) NOT NULL,
    host VARCHAR(100) NOT NULL,
    port INTEGER NOT NULL,
    user_range_start BIGINT NOT NULL,
    user_range_end BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertion des configurations de shards
INSERT INTO shard_routing (shard_id, region, database_name, host, port, user_range_start, user_range_end) VALUES
-- Europe
('eu-1', 'Europe', 'shard_europe_1', 'eu-west-1.224solutions.com', 5432, 1000000, 5000000),
('eu-2', 'Europe', 'shard_europe_2', 'eu-west-2.224solutions.com', 5432, 5000001, 10000000),
('eu-3', 'Europe', 'shard_europe_3', 'eu-central-1.224solutions.com', 5432, 10000001, 15000000),
('eu-4', 'Europe', 'shard_europe_4', 'eu-north-1.224solutions.com', 5432, 15000001, 20000000),

-- Asia
('as-1', 'Asia', 'shard_asia_1', 'ap-southeast-1.224solutions.com', 5432, 20000001, 30000000),
('as-2', 'Asia', 'shard_asia_2', 'ap-northeast-1.224solutions.com', 5432, 30000001, 40000000),
('as-3', 'Asia', 'shard_asia_3', 'ap-south-1.224solutions.com', 5432, 40000001, 50000000),
('as-4', 'Asia', 'shard_asia_4', 'ap-east-1.224solutions.com', 5432, 50000001, 60000000),

-- Americas
('am-1', 'Americas', 'shard_americas_1', 'us-east-1.224solutions.com', 5432, 60000001, 70000000),
('am-2', 'Americas', 'shard_americas_2', 'us-west-1.224solutions.com', 5432, 70000001, 80000000),
('am-3', 'Americas', 'shard_americas_3', 'sa-east-1.224solutions.com', 5432, 80000001, 90000000),
('am-4', 'Americas', 'shard_americas_4', 'ca-central-1.224solutions.com', 5432, 90000001, 100000000),

-- Africa
('af-1', 'Africa', 'shard_africa_1', 'af-south-1.224solutions.com', 5432, 100000001, 120000000),
('af-2', 'Africa', 'shard_africa_2', 'af-west-1.224solutions.com', 5432, 120000001, 140000000),
('af-3', 'Africa', 'shard_africa_3', 'af-east-1.224solutions.com', 5432, 140000001, 160000000),
('af-4', 'Africa', 'shard_africa_4', 'af-north-1.224solutions.com', 5432, 160000001, 180000000),

-- Oceania
('oc-1', 'Oceania', 'shard_oceania_1', 'ap-southeast-2.224solutions.com', 5432, 180000001, 200000000),
('oc-2', 'Oceania', 'shard_oceania_2', 'ap-southeast-3.224solutions.com', 5432, 200000001, 220000000),
('oc-3', 'Oceania', 'shard_oceania_3', 'ap-southeast-4.224solutions.com', 5432, 220000001, 240000000),
('oc-4', 'Oceania', 'shard_oceania_4', 'ap-southeast-5.224solutions.com', 5432, 240000001, 260000000);

-- =====================================================
-- CONFIGURATION RÉPLICATION
-- =====================================================

-- Configuration de réplication pour chaque shard
CREATE TABLE shard_replicas (
    shard_id VARCHAR(20) NOT NULL,
    replica_id VARCHAR(20) NOT NULL,
    host VARCHAR(100) NOT NULL,
    port INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'primary', 'secondary', 'readonly'
    is_active BOOLEAN DEFAULT true,
    lag_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (shard_id, replica_id),
    FOREIGN KEY (shard_id) REFERENCES shard_routing(shard_id)
);

-- =====================================================
-- CONFIGURATION CACHE DISTRIBUÉ
-- =====================================================

-- Configuration Redis Cluster
CREATE TABLE cache_nodes (
    node_id VARCHAR(20) PRIMARY KEY,
    region VARCHAR(50) NOT NULL,
    host VARCHAR(100) NOT NULL,
    port INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'master', 'slave'
    memory_gb INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertion des nœuds de cache
INSERT INTO cache_nodes (node_id, region, host, port, role, memory_gb) VALUES
-- Europe Cache
('cache-eu-1', 'Europe', 'redis-eu-west-1.224solutions.com', 6379, 'master', 64),
('cache-eu-2', 'Europe', 'redis-eu-west-2.224solutions.com', 6379, 'slave', 64),
('cache-eu-3', 'Europe', 'redis-eu-central-1.224solutions.com', 6379, 'master', 64),
('cache-eu-4', 'Europe', 'redis-eu-north-1.224solutions.com', 6379, 'slave', 64),

-- Asia Cache
('cache-as-1', 'Asia', 'redis-ap-southeast-1.224solutions.com', 6379, 'master', 64),
('cache-as-2', 'Asia', 'redis-ap-northeast-1.224solutions.com', 6379, 'slave', 64),
('cache-as-3', 'Asia', 'redis-ap-south-1.224solutions.com', 6379, 'master', 64),
('cache-as-4', 'Asia', 'redis-ap-east-1.224solutions.com', 6379, 'slave', 64),

-- Americas Cache
('cache-am-1', 'Americas', 'redis-us-east-1.224solutions.com', 6379, 'master', 64),
('cache-am-2', 'Americas', 'redis-us-west-1.224solutions.com', 6379, 'slave', 64),
('cache-am-3', 'Americas', 'redis-sa-east-1.224solutions.com', 6379, 'master', 64),
('cache-am-4', 'Americas', 'redis-ca-central-1.224solutions.com', 6379, 'slave', 64),

-- Africa Cache
('cache-af-1', 'Africa', 'redis-af-south-1.224solutions.com', 6379, 'master', 64),
('cache-af-2', 'Africa', 'redis-af-west-1.224solutions.com', 6379, 'slave', 64),
('cache-af-3', 'Africa', 'redis-af-east-1.224solutions.com', 6379, 'master', 64),
('cache-af-4', 'Africa', 'redis-af-north-1.224solutions.com', 6379, 'slave', 64),

-- Oceania Cache
('cache-oc-1', 'Oceania', 'redis-ap-southeast-2.224solutions.com', 6379, 'master', 64),
('cache-oc-2', 'Oceania', 'redis-ap-southeast-3.224solutions.com', 6379, 'slave', 64),
('cache-oc-3', 'Oceania', 'redis-ap-southeast-4.224solutions.com', 6379, 'master', 64),
('cache-oc-4', 'Oceania', 'redis-ap-southeast-5.224solutions.com', 6379, 'slave', 64);

-- =====================================================
-- CONFIGURATION MONITORING
-- =====================================================

-- Table de monitoring des performances
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shard_id VARCHAR(20) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    region VARCHAR(50) NOT NULL,
    FOREIGN KEY (shard_id) REFERENCES shard_routing(shard_id)
);

-- Index pour les requêtes de monitoring
CREATE INDEX idx_performance_metrics_shard_time ON performance_metrics(shard_id, timestamp);
CREATE INDEX idx_performance_metrics_region_time ON performance_metrics(region, timestamp);
CREATE INDEX idx_performance_metrics_name_time ON performance_metrics(metric_name, timestamp);

-- =====================================================
-- CONFIGURATION SÉCURITÉ
-- =====================================================

-- Table de chiffrement des données
CREATE TABLE encryption_keys (
    key_id VARCHAR(50) PRIMARY KEY,
    key_type VARCHAR(20) NOT NULL, -- 'database', 'storage', 'communication'
    key_value TEXT NOT NULL,
    algorithm VARCHAR(20) NOT NULL, -- 'AES-256', 'RSA-4096'
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Table de rotation des clés
CREATE TABLE key_rotation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_key_id VARCHAR(50),
    new_key_id VARCHAR(50),
    rotation_reason VARCHAR(200),
    rotated_by VARCHAR(100),
    rotated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (old_key_id) REFERENCES encryption_keys(key_id),
    FOREIGN KEY (new_key_id) REFERENCES encryption_keys(key_id)
);

-- =====================================================
-- FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour déterminer le shard basé sur l'ID utilisateur
CREATE OR REPLACE FUNCTION get_shard_for_user(user_id BIGINT)
RETURNS TABLE (
    shard_id VARCHAR(20),
    database_name VARCHAR(100),
    host VARCHAR(100),
    port INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT sr.shard_id, sr.database_name, sr.host, sr.port
    FROM shard_routing sr
    WHERE user_id >= sr.user_range_start 
    AND user_id <= sr.user_range_end 
    AND sr.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les métriques de performance
CREATE OR REPLACE FUNCTION get_performance_metrics(
    p_shard_id VARCHAR(20),
    p_start_time TIMESTAMP,
    p_end_time TIMESTAMP
)
RETURNS TABLE (
    metric_name VARCHAR(100),
    avg_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    min_value DECIMAL(15,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.metric_name,
        AVG(pm.metric_value) as avg_value,
        MAX(pm.metric_value) as max_value,
        MIN(pm.metric_value) as min_value
    FROM performance_metrics pm
    WHERE pm.shard_id = p_shard_id
    AND pm.timestamp BETWEEN p_start_time AND p_end_time
    GROUP BY pm.metric_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONFIGURATION BACKUP
-- =====================================================

-- Table de configuration des sauvegardes
CREATE TABLE backup_config (
    shard_id VARCHAR(20) PRIMARY KEY,
    backup_frequency VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'
    retention_days INTEGER NOT NULL,
    backup_location VARCHAR(200) NOT NULL,
    is_encrypted BOOLEAN DEFAULT true,
    compression_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (shard_id) REFERENCES shard_routing(shard_id)
);

-- Configuration des sauvegardes pour chaque shard
INSERT INTO backup_config (shard_id, backup_frequency, retention_days, backup_location) VALUES
('eu-1', 'daily', 30, 's3://224solutions-backups/eu-1/'),
('eu-2', 'daily', 30, 's3://224solutions-backups/eu-2/'),
('eu-3', 'daily', 30, 's3://224solutions-backups/eu-3/'),
('eu-4', 'daily', 30, 's3://224solutions-backups/eu-4/'),
('as-1', 'daily', 30, 's3://224solutions-backups/as-1/'),
('as-2', 'daily', 30, 's3://224solutions-backups/as-2/'),
('as-3', 'daily', 30, 's3://224solutions-backups/as-3/'),
('as-4', 'daily', 30, 's3://224solutions-backups/as-4/'),
('am-1', 'daily', 30, 's3://224solutions-backups/am-1/'),
('am-2', 'daily', 30, 's3://224solutions-backups/am-2/'),
('am-3', 'daily', 30, 's3://224solutions-backups/am-3/'),
('am-4', 'daily', 30, 's3://224solutions-backups/am-4/'),
('af-1', 'daily', 30, 's3://224solutions-backups/af-1/'),
('af-2', 'daily', 30, 's3://224solutions-backups/af-2/'),
('af-3', 'daily', 30, 's3://224solutions-backups/af-3/'),
('af-4', 'daily', 30, 's3://224solutions-backups/af-4/'),
('oc-1', 'daily', 30, 's3://224solutions-backups/oc-1/'),
('oc-2', 'daily', 30, 's3://224solutions-backups/oc-2/'),
('oc-3', 'daily', 30, 's3://224solutions-backups/oc-3/'),
('oc-4', 'daily', 30, 's3://224solutions-backups/oc-4/');

-- =====================================================
-- CONFIGURATION ALERTES
-- =====================================================

-- Table de configuration des alertes
CREATE TABLE alert_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shard_id VARCHAR(20) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    threshold_value DECIMAL(15,4) NOT NULL,
    threshold_operator VARCHAR(10) NOT NULL, -- '>', '<', '>=', '<=', '='
    alert_level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    notification_channels TEXT[] NOT NULL, -- ['email', 'sms', 'slack']
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (shard_id) REFERENCES shard_routing(shard_id)
);

-- Configuration des alertes par défaut
INSERT INTO alert_config (shard_id, metric_name, threshold_value, threshold_operator, alert_level, notification_channels) VALUES
('eu-1', 'cpu_usage', 80.0, '>', 'warning', ARRAY['email', 'slack']),
('eu-1', 'memory_usage', 90.0, '>', 'critical', ARRAY['email', 'sms', 'slack']),
('eu-1', 'disk_usage', 85.0, '>', 'warning', ARRAY['email', 'slack']),
('eu-1', 'connection_count', 1000, '>', 'warning', ARRAY['email', 'slack']),
('eu-1', 'response_time', 1000, '>', 'critical', ARRAY['email', 'sms', 'slack']);

-- Répéter pour tous les shards...
-- (Configuration similaire pour tous les autres shards)

-- =====================================================
-- CONFIGURATION TERMINÉE
-- =====================================================

-- Vérification de la configuration
SELECT 
    'Configuration Sharding Terminée' as status,
    COUNT(*) as total_shards,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_shards
FROM shard_routing;

-- Vérification des nœuds de cache
SELECT 
    'Configuration Cache Terminée' as status,
    COUNT(*) as total_cache_nodes,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_cache_nodes
FROM cache_nodes;
