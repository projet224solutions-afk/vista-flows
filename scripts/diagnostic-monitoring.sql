-- =====================================================
-- REQUÊTES DE DIAGNOSTIC MONITORING - 224Solutions
-- Exécuter dans Supabase Dashboard > SQL Editor
-- =====================================================

-- 1️⃣ VÉRIFIER ÉTAT DES TABLES MONITORING
SELECT 
  'error_logs' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN level = 'critical' THEN 1 END) AS critical_count,
  COUNT(CASE WHEN resolved = false THEN 1 END) AS unresolved_count
FROM error_logs
UNION ALL
SELECT 
  'system_health_logs',
  COUNT(*),
  0,
  0
FROM system_health_logs
UNION ALL
SELECT 
  'alerts',
  COUNT(*),
  COUNT(CASE WHEN priority IN ('high', 'urgent') THEN 1 END),
  COUNT(CASE WHEN status = 'active' THEN 1 END)
FROM alerts;

-- 2️⃣ TOP 10 ERREURS LES PLUS FRÉQUENTES
SELECT 
  message,
  level,
  source,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurrence
FROM error_logs
WHERE resolved = false
GROUP BY message, level, source
ORDER BY occurrences DESC
LIMIT 10;

-- 3️⃣ ERREURS CRITIQUES NON RÉSOLUES
SELECT 
  id,
  level,
  message,
  source,
  context,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 AS minutes_ago
FROM error_logs
WHERE level = 'critical' 
  AND resolved = false
ORDER BY created_at DESC
LIMIT 20;

-- 4️⃣ MONITORING EN TEMPS RÉEL (5 dernières minutes)
SELECT 
  event_type,
  severity_level,
  source_module,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM security_monitoring
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND severity_level IN ('critical', 'emergency')
GROUP BY event_type, severity_level, source_module
ORDER BY latest DESC;

-- 5️⃣ DERNIER HEALTH CHECK
SELECT 
  timestamp,
  overall_status,
  error_count,
  warning_count,
  services_status
FROM system_health_logs
ORDER BY timestamp DESC
LIMIT 1;

-- 6️⃣ VÉRIFIER FONCTIONS RPC MONITORING
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%health%'
  OR routine_name LIKE '%monitoring%';

-- 7️⃣ ALERTES ACTIVES PAR PRIORITÉ
SELECT 
  priority,
  COUNT(*) as count,
  array_agg(title) as alert_titles
FROM alerts
WHERE status = 'active'
GROUP BY priority
ORDER BY 
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END;

-- 8️⃣ PERFORMANCE APIs EXTERNES (dernière heure)
SELECT 
  api_provider,
  COUNT(*) as total_calls,
  AVG(response_time_ms) as avg_response_ms,
  COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errors,
  ROUND(COUNT(CASE WHEN status_code >= 400 THEN 1 END)::numeric / COUNT(*) * 100, 2) as error_rate_pct
FROM api_monitoring
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY api_provider
ORDER BY error_rate_pct DESC;

-- 9️⃣ IPs BLOQUÉES
SELECT 
  ip_address,
  reason,
  threat_score,
  block_type,
  created_at,
  expires_at
FROM blocked_ips
WHERE expires_at IS NULL OR expires_at > NOW()
ORDER BY threat_score DESC, created_at DESC
LIMIT 20;

-- 🔟 INCIDENTS SÉCURITÉ OUVERTS
SELECT 
  incident_id,
  title,
  incident_type,
  severity,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours_open
FROM security_incidents
WHERE status IN ('open', 'investigating')
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  created_at DESC;

-- 🎯 BONUS: HEALTH CHECK COMPLET
SELECT 
  'Database' as component,
  'Operational' as status,
  NOW() as checked_at
UNION ALL
SELECT 
  'Error Logs',
  CASE 
    WHEN COUNT(*) FILTER (WHERE level='critical' AND resolved=false) > 0 THEN 'Degraded'
    ELSE 'Operational'
  END,
  NOW()
FROM error_logs
UNION ALL
SELECT 
  'Monitoring Tables',
  CASE 
    WHEN EXISTS (SELECT 1 FROM system_health_logs WHERE timestamp > NOW() - INTERVAL '10 minutes')
    THEN 'Operational'
    ELSE 'Degraded'
  END,
  NOW();
