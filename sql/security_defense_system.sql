-- 🛡️ SYSTÈME DE DÉFENSE ET RIPOSTE - 224SOLUTIONS
-- Tables pour gestion complète de la sécurité

-- Table des incidents de sécurité
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL, -- 'ddos', 'brute_force', 'data_exfil', 'key_compromise', 'anomaly'
  severity TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'contained', 'resolved', 'closed'
  title TEXT NOT NULL,
  description TEXT,
  source_ip TEXT,
  target_service TEXT,
  affected_users TEXT[], -- Array of user IDs
  indicators JSONB, -- IOCs (Indicators of Compromise)
  timeline JSONB, -- Array of events with timestamps
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  metadata JSONB
);

-- Table des alertes de sécurité en temps réel
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES security_incidents(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  auto_action_taken TEXT, -- Action automatique prise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Table des IPs bloquées
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  cidr_range TEXT,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_by_system BOOLEAN DEFAULT FALSE,
  incident_id UUID REFERENCES security_incidents(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB
);

-- Table de gestion des clés
CREATE TABLE IF NOT EXISTS security_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL UNIQUE,
  key_type TEXT NOT NULL, -- 'api', 'service_account', 'database', 'encryption'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'rotating', 'revoked', 'expired'
  last_rotated_at TIMESTAMPTZ,
  next_rotation_at TIMESTAMPTZ,
  rotation_frequency_days INT DEFAULT 90,
  is_compromised BOOLEAN DEFAULT FALSE,
  compromised_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Table des snapshots forensiques
CREATE TABLE IF NOT EXISTS security_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type TEXT NOT NULL, -- 'database', 'logs', 'system_state'
  incident_id UUID REFERENCES security_incidents(id),
  storage_path TEXT NOT NULL,
  file_hash TEXT, -- SHA-256 hash for integrity
  size_bytes BIGINT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Table des playbooks
CREATE TABLE IF NOT EXISTS security_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  severity_threshold TEXT,
  steps JSONB NOT NULL, -- Array of steps with actions
  auto_execute BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INT DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Table des logs d'audit de sécurité
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT, -- 'user', 'system', 'automation'
  target_type TEXT,
  target_id TEXT,
  incident_id UUID REFERENCES security_incidents(id),
  ip_address TEXT,
  user_agent TEXT,
  result TEXT, -- 'success', 'failure', 'blocked'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des règles de détection
CREATE TABLE IF NOT EXISTS security_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'rate_limit', 'geo_anomaly', 'behavior', 'signature'
  severity TEXT NOT NULL,
  conditions JSONB NOT NULL,
  threshold JSONB,
  action TEXT NOT NULL, -- 'alert', 'block', 'isolate'
  is_active BOOLEAN DEFAULT TRUE,
  false_positive_count INT DEFAULT 0,
  true_positive_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Table des métriques de sécurité
CREATE TABLE IF NOT EXISTS security_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  incidents_count INT DEFAULT 0,
  alerts_count INT DEFAULT 0,
  blocked_ips_count INT DEFAULT 0,
  mttr_minutes INT, -- Mean Time To Respond
  mttd_minutes INT, -- Mean Time To Detect
  false_positives INT DEFAULT 0,
  true_positives INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(metric_date)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON security_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_incident_id ON security_alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_is_active ON blocked_ips(is_active);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_actor_id ON security_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_keys_status ON security_keys(status);

-- Enable Row Level Security
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;

-- Policies pour admins uniquement
CREATE POLICY "Admins can view all security data" ON security_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pdg', 'security_officer')
    )
  );

CREATE POLICY "Admins can insert security incidents" ON security_incidents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pdg', 'security_officer')
    )
  );

CREATE POLICY "Admins can update security incidents" ON security_incidents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'pdg', 'security_officer')
    )
  );

-- Répliquer policies pour autres tables
CREATE POLICY "Admins security alerts" ON security_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

CREATE POLICY "Admins blocked ips" ON blocked_ips FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

CREATE POLICY "Admins security keys" ON security_keys FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

CREATE POLICY "Admins snapshots" ON security_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

CREATE POLICY "Admins playbooks" ON security_playbooks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

CREATE POLICY "Admins audit logs" ON security_audit_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

CREATE POLICY "Admins detection rules" ON security_detection_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

CREATE POLICY "Admins metrics" ON security_metrics FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'pdg', 'security_officer'))
);

-- Fonction pour créer un incident avec alerte
CREATE OR REPLACE FUNCTION create_security_incident(
  p_incident_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT,
  p_source_ip TEXT DEFAULT NULL,
  p_target_service TEXT DEFAULT NULL,
  p_indicators JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_incident_id UUID;
  v_alert_id UUID;
BEGIN
  -- Créer l'incident
  INSERT INTO security_incidents (
    incident_type, severity, title, description, 
    source_ip, target_service, indicators
  )
  VALUES (
    p_incident_type, p_severity, p_title, p_description,
    p_source_ip, p_target_service, p_indicators
  )
  RETURNING id INTO v_incident_id;

  -- Créer l'alerte associée
  INSERT INTO security_alerts (
    incident_id, alert_type, severity, message, source
  )
  VALUES (
    v_incident_id, p_incident_type, p_severity, p_title, p_source_ip
  )
  RETURNING id INTO v_alert_id;

  -- Log audit
  INSERT INTO security_audit_logs (
    action, actor_type, target_type, target_id, incident_id, details
  )
  VALUES (
    'incident_created', 'system', 'incident', v_incident_id::TEXT, v_incident_id,
    jsonb_build_object('alert_id', v_alert_id, 'severity', p_severity)
  );

  RETURN v_incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour bloquer une IP
CREATE OR REPLACE FUNCTION block_ip_address(
  p_ip_address TEXT,
  p_reason TEXT,
  p_incident_id UUID DEFAULT NULL,
  p_expires_hours INT DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
  v_block_id UUID;
BEGIN
  INSERT INTO blocked_ips (
    ip_address, reason, incident_id, blocked_by_system, expires_at
  )
  VALUES (
    p_ip_address, p_reason, p_incident_id, TRUE, 
    NOW() + (p_expires_hours || ' hours')::INTERVAL
  )
  ON CONFLICT (ip_address) DO UPDATE
  SET is_active = TRUE, expires_at = NOW() + (p_expires_hours || ' hours')::INTERVAL
  RETURNING id INTO v_block_id;

  -- Log audit
  INSERT INTO security_audit_logs (
    action, actor_type, target_type, target_id, incident_id, ip_address, details
  )
  VALUES (
    'ip_blocked', 'system', 'blocked_ip', v_block_id::TEXT, p_incident_id, p_ip_address,
    jsonb_build_object('reason', p_reason, 'expires_hours', p_expires_hours)
  );

  RETURN v_block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vue pour statistiques de sécurité
CREATE OR REPLACE VIEW security_stats AS
SELECT
  (SELECT COUNT(*) FROM security_incidents WHERE status = 'open') AS open_incidents,
  (SELECT COUNT(*) FROM security_incidents WHERE created_at > NOW() - INTERVAL '24 hours') AS incidents_24h,
  (SELECT COUNT(*) FROM security_alerts WHERE NOT is_acknowledged) AS pending_alerts,
  (SELECT COUNT(*) FROM blocked_ips WHERE is_active = TRUE) AS active_blocks,
  (SELECT COUNT(*) FROM security_incidents WHERE severity = 'critical' AND status != 'closed') AS critical_incidents,
  (SELECT AVG(EXTRACT(EPOCH FROM (contained_at - detected_at))/60)::INT FROM security_incidents WHERE contained_at IS NOT NULL) AS avg_mttr_minutes,
  (SELECT COUNT(*) FROM security_keys WHERE status = 'active') AS active_keys,
  (SELECT COUNT(*) FROM security_keys WHERE next_rotation_at < NOW() + INTERVAL '7 days') AS keys_need_rotation;
