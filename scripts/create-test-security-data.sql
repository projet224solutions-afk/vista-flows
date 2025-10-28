-- Script pour créer des données de test pour le système de sécurité forensique
-- À exécuter dans l'éditeur SQL Supabase

-- 1. Créer des incidents de test
INSERT INTO security_incidents (incident_type, severity, title, description, source_ip, status) VALUES 
('unauthorized_access', 'high', 'Tentative d''accès non autorisé', 'Détection de multiples tentatives de connexion échouées depuis une IP suspecte', '192.168.1.100', 'investigating'),
('malware', 'critical', 'Malware détecté', 'L''analyse antivirus a détecté un fichier malveillant dans le système', '10.0.0.50', 'contained'),
('data_breach', 'medium', 'Fuite de données potentielle', 'Export de données inhabituellement important détecté', '172.16.0.25', 'open'),
('brute_force', 'high', 'Attaque par force brute', 'Tentatives répétées de connexion avec différents mots de passe', '203.0.113.45', 'open'),
('ddos', 'critical', 'Attaque DDoS', 'Volume anormal de requêtes détecté', '198.51.100.10', 'investigating');

-- 2. Créer des alertes liées aux incidents
INSERT INTO security_alerts (alert_type, severity, incident_id, description, source, acknowledged) 
SELECT 
  'suspicious_activity',
  severity,
  id,
  'Alerte générée automatiquement pour: ' || title,
  'automated_detection',
  false
FROM security_incidents
LIMIT 3;

-- 3. Créer des logs d'audit
INSERT INTO security_audit_logs (action, actor_type, incident_id, ip_address, details)
SELECT 
  'incident_created',
  'system',
  id,
  source_ip,
  jsonb_build_object(
    'action', 'auto_detection',
    'timestamp', NOW(),
    'severity', severity
  )
FROM security_incidents;

-- 4. Créer quelques IPs bloquées
INSERT INTO blocked_ips (ip_address, reason, incident_id, is_active)
SELECT 
  source_ip,
  'Auto-blocked: ' || title,
  id,
  severity IN ('high', 'critical')
FROM security_incidents
WHERE source_ip IS NOT NULL
ON CONFLICT (ip_address) DO NOTHING;

-- 5. Créer un snapshot de test
INSERT INTO security_snapshots (snapshot_type, storage_path, metadata)
VALUES (
  'system_state',
  '/snapshots/test_' || extract(epoch from now()) || '.json',
  jsonb_build_object(
    'timestamp', NOW(),
    'incidents_count', (SELECT COUNT(*) FROM security_incidents),
    'alerts_count', (SELECT COUNT(*) FROM security_alerts),
    'blocked_ips_count', (SELECT COUNT(*) FROM blocked_ips WHERE is_active = true),
    'test_data', true
  )
);

-- Vérifier les données créées
SELECT 'Incidents créés' as type, COUNT(*) as count FROM security_incidents
UNION ALL
SELECT 'Alertes créées', COUNT(*) FROM security_alerts
UNION ALL
SELECT 'Logs d''audit', COUNT(*) FROM security_audit_logs
UNION ALL
SELECT 'IPs bloquées', COUNT(*) FROM blocked_ips
UNION ALL
SELECT 'Snapshots', COUNT(*) FROM security_snapshots;

-- Afficher un incident exemple avec son ID
SELECT id, title, severity, status, created_at 
FROM security_incidents 
ORDER BY created_at DESC 
LIMIT 1;
