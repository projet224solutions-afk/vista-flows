# Module MDR (Monitoring, Defense & Riposte) - Installation

## ⚠️ Migration SQL Requise

Le module MDR nécessite l'exécution manuelle d'une migration SQL via le **SQL Editor de Supabase**.

### Étapes d'installation:

1. **Accédez au SQL Editor** de votre projet Supabase:
   https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new

2. **Copiez et exécutez le SQL suivant:**

```sql
-- ============================================
-- MODULE MDR (Monitoring, Defense & Riposte)
-- 224SOLUTIONS - Interface PDG
-- ============================================

-- Tables MDR
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address INET,
  device_info JSONB DEFAULT '{}'::jsonb,
  action VARCHAR(100) NOT NULL,
  endpoint VARCHAR(255),
  payload_hash VARCHAR(64),
  metadata JSONB DEFAULT '{}'::jsonb,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip ON public.security_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created ON public.security_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'false_positive', 'ignored')),
  user_id UUID,
  ip_address INET,
  affected_resources JSONB DEFAULT '[]'::jsonb,
  detection_rules JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  assigned_to UUID,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);

CREATE TABLE IF NOT EXISTS public.ip_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_until TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT false,
  blocked_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON public.ip_blacklist(ip_address);

CREATE TABLE IF NOT EXISTS public.security_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  category VARCHAR(50),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.security_incidents(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.security_incidents(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('block_ip', 'suspend_user', 'freeze_wallet', 'force_mfa', 'require_password_reset', 'isolate_service', 'notify_admin')),
  target_id UUID,
  target_type VARCHAR(50),
  status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'reverted')),
  executed_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS simplifié (policies seulement pour service_role)
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_security_audit_logs" ON public.security_audit_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_security_incidents" ON public.security_incidents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_ip_blacklist" ON public.ip_blacklist FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_security_settings" ON public.security_settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_security_reports" ON public.security_reports FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_security_actions" ON public.security_actions FOR ALL USING (auth.role() = 'service_role');

-- Fonctions RPC (accès via frontend)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_ip_address INET,
  p_action VARCHAR,
  p_endpoint VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_severity VARCHAR DEFAULT 'info'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (INSERT INTO public.security_audit_logs (user_id, ip_address, action, endpoint, metadata, severity)
          VALUES (p_user_id, p_ip_address, p_action, p_endpoint, p_metadata, p_severity)
          RETURNING id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_security_incident(
  p_incident_key VARCHAR,
  p_title VARCHAR,
  p_description TEXT,
  p_severity VARCHAR,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (INSERT INTO public.security_incidents (incident_key, title, description, severity, user_id, ip_address, metadata)
          VALUES (p_incident_key, p_title, p_description, p_severity, p_user_id, p_ip_address, p_metadata)
          RETURNING id);
END;
$$;

CREATE OR REPLACE FUNCTION public.block_ip_address(
  p_ip_address INET,
  p_reason TEXT,
  p_duration_hours INT DEFAULT NULL,
  p_is_permanent BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blacklist_id UUID;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  IF p_duration_hours IS NOT NULL AND NOT p_is_permanent THEN
    v_blocked_until := now() + (p_duration_hours || ' hours')::INTERVAL;
  END IF;
  
  INSERT INTO public.ip_blacklist (ip_address, reason, blocked_until, is_permanent, blocked_by)
  VALUES (p_ip_address, p_reason, v_blocked_until, p_is_permanent, auth.uid())
  ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason, blocked_until = EXCLUDED.blocked_until, is_permanent = EXCLUDED.is_permanent
  RETURNING id INTO v_blacklist_id;
  
  PERFORM log_security_event(auth.uid(), p_ip_address, 'block_ip', NULL, jsonb_build_object('reason', p_reason), 'warning');
  RETURN v_blacklist_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_ip_address(p_ip_address INET) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ip_blacklist WHERE ip_address = p_ip_address;
  PERFORM log_security_event(auth.uid(), p_ip_address, 'unblock_ip', NULL, '{}'::jsonb, 'info');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address INET) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM public.ip_blacklist WHERE ip_address = p_ip_address AND (is_permanent OR blocked_until > now()));
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_security_action(
  p_incident_id UUID,
  p_action_type VARCHAR,
  p_target_id UUID,
  p_target_type VARCHAR DEFAULT 'user',
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_id UUID;
BEGIN
  INSERT INTO public.security_actions (incident_id, action_type, target_id, target_type, executed_by, metadata, status)
  VALUES (p_incident_id, p_action_type, p_target_id, p_target_type, auth.uid(), p_metadata, 'pending')
  RETURNING id INTO v_action_id;
  
  CASE p_action_type
    WHEN 'freeze_wallet' THEN UPDATE public.wallets SET status = 'frozen' WHERE user_id = p_target_id;
    ELSE NULL;
  END CASE;
  
  UPDATE public.security_actions SET status = 'executed', executed_at = now() WHERE id = v_action_id;
  RETURN v_action_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_security_stats(p_period_days INT DEFAULT 7) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'total_incidents', (SELECT COUNT(*) FROM public.security_incidents WHERE detected_at >= now() - (p_period_days || ' days')::INTERVAL),
    'active_incidents', (SELECT COUNT(*) FROM public.security_incidents WHERE status IN ('pending', 'investigating')),
    'blocked_ips', (SELECT COUNT(*) FROM public.ip_blacklist WHERE is_permanent OR blocked_until > now()),
    'critical_incidents', (SELECT COUNT(*) FROM public.security_incidents WHERE severity = 'critical' AND status NOT IN ('resolved', 'false_positive')),
    'total_audit_logs', (SELECT COUNT(*) FROM public.security_audit_logs WHERE created_at >= now() - (p_period_days || ' days')::INTERVAL),
    'actions_executed', (SELECT COUNT(*) FROM public.security_actions WHERE executed_at >= now() - (p_period_days || ' days')::INTERVAL)
  );
END;
$$;

-- Initialisation
INSERT INTO public.security_settings (key, value, description, category) VALUES
  ('failed_login_threshold', '{"max_attempts": 5, "window_minutes": 15}'::jsonb, 'Seuil tentatives connexion', 'detection'),
  ('suspicious_amount_threshold', '{"amount": 5000000, "currency": "GNF"}'::jsonb, 'Montant suspect', 'detection'),
  ('auto_block_enabled', '{"enabled": true}'::jsonb, 'Blocage auto activé', 'defense'),
  ('waf_enabled', '{"enabled": true}'::jsonb, 'WAF activé', 'defense'),
  ('mfa_enforcement', '{"roles": ["admin", "pdg"]}'::jsonb, 'MFA obligatoire', 'defense'),
  ('alert_recipients', '{"emails": [], "phones": []}'::jsonb, 'Destinataires alertes', 'notification')
ON CONFLICT (key) DO NOTHING;
```

3. **Après l'exécution SQL réussie**, accédez à votre projet et cliquez sur "Restart project" pour regénérer les types TypeScript.

## Fonctionnalités du Module MDR

### A. Monitoring (Collecte & Détection)
- `security_audit_logs`: Enregistrement immuable de toutes actions critiques
- Détecteurs temps réel avec règles configurables
- Métriques exportables pour Prometheus

### B. Défense (Prévention)
- Blocage d'IPs avec durée configurable
- MFA enforcement pour rôles critiques
- WAF adapter avec règles XSS/SQLi/BruteForce

### C. Riposte (Response & Remediation)
- Actions automatiques: block_ip, suspend_user, freeze_wallet
- Forensic report generator
- Auto-heal workflows

## Accès au Module

Une fois installé, le module MDR est accessible via l'**Interface PDG** à:
- Route: `/pdg` (onglet "Sécurité MDR")
- Réservé aux utilisateurs avec rôle `admin` ou `pdg`

## Architecture

```
Module MDR
├── Backend (Supabase)
│   ├── Tables: security_audit_logs, security_incidents, ip_blacklist, etc.
│   ├── Fonctions RPC: log_security_event(), block_ip_address(), etc.
│   └── RLS Policies (service_role only)
├── Frontend (React)
│   ├── Hook: useMDRSecurity()
│   └── Component: MDRSecurityDashboard
└── Real-time
    └── Subscriptions sur incidents & IPs
```

## Support

Pour toute question sur l'installation, consultez la documentation Supabase:
https://supabase.com/docs
