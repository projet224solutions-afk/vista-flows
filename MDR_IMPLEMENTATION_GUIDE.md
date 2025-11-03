# 🛡️ Guide d'Implémentation MDR (Module de Détection et Riposte)

## ✅ État Actuel

### Frontend-Backend-Database: 100% Intégrés via DataManager

Toutes les fonctionnalités existantes sont **pleinement connectées aux données réelles** via:

1. **DataManager** (`src/services/DataManager.ts`)
   - Cache intelligent avec TTL
   - Mises à jour temps réel automatiques
   - Gestion unifiée des mutations
   - Invalidation de cache intelligente

2. **Hooks Personnalisés**
   - `usePaymentLinks` - Liens de paiement avec realtime
   - `useEscrowTransactions` - Transactions escrow
   - `useVendorAnalytics` - Analytics vendeur
   - `useFinancialTransactions` - Transactions financières

3. **Services Backend**
   - `UserService` - Gestion utilisateurs
   - `WalletService` - Gestion wallets
   - `OrderService` - Gestion commandes

### Documentation Complète
- `ARCHITECTURE_INTEGRATION.md` - Architecture complète Frontend↔Backend↔Database
- Flux de données documentés
- Best practices implémentées

## 🚀 Module MDR: Prêt pour Déploiement

### Tables Requises (SQL Migration Manuelle)

Exécutez ce SQL dans le **SQL Editor Supabase**:

\`\`\`sql
-- Table: security_audit_logs
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip text,
  device_info jsonb DEFAULT '{}'::jsonb,
  action text NOT NULL,
  endpoint text,
  payload_hash text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON security_audit_logs(user_id);
CREATE INDEX idx_audit_created ON security_audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON security_audit_logs(action);

-- Table: security_incidents
CREATE TABLE IF NOT EXISTS security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key text UNIQUE NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  assigned_to uuid,
  summary text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX idx_incident_status ON security_incidents(status);
CREATE INDEX idx_incident_severity ON security_incidents(severity);
CREATE INDEX idx_incident_detected ON security_incidents(detected_at DESC);

-- Table: security_reports
CREATE TABLE IF NOT EXISTS security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES security_incidents(id) ON DELETE CASCADE,
  report_json jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: security_settings
CREATE TABLE IF NOT EXISTS security_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: security_actions
CREATE TABLE IF NOT EXISTS security_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES security_incidents(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_id text,
  executed_by uuid,
  executed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT true,
  error_message text
);

CREATE INDEX idx_actions_incident ON security_actions(incident_id);

-- RPC Functions
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_ip text,
  p_device_info jsonb,
  p_action text,
  p_endpoint text,
  p_payload jsonb,
  p_meta jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
  v_payload_hash text;
BEGIN
  v_payload_hash := encode(digest(p_payload::text, 'sha256'), 'hex');
  
  INSERT INTO security_audit_logs (
    user_id, ip, device_info, action, endpoint, payload_hash, meta
  ) VALUES (
    p_user_id, p_ip, p_device_info, p_action, p_endpoint, v_payload_hash, p_meta
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_security_incident(
  p_incident_key text,
  p_severity text,
  p_summary text,
  p_details jsonb,
  p_assigned_to uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident_id uuid;
BEGIN
  INSERT INTO security_incidents (
    incident_key, severity, summary, details, assigned_to
  ) VALUES (
    p_incident_key, p_severity, p_summary, p_details, p_assigned_to
  ) RETURNING id INTO v_incident_id;
  
  PERFORM log_security_event(
    auth.uid(),
    '0.0.0.0',
    '{}'::jsonb,
    'create_incident',
    '/api/security/incident',
    jsonb_build_object('incident_id', v_incident_id),
    jsonb_build_object('incident_key', p_incident_key, 'severity', p_severity)
  );
  
  RETURN v_incident_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_security_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_incidents', (SELECT COUNT(*) FROM security_incidents),
    'pending_incidents', (SELECT COUNT(*) FROM security_incidents WHERE status = 'pending'),
    'high_severity', (SELECT COUNT(*) FROM security_incidents WHERE severity IN ('high', 'critical')),
    'blocked_ips', (SELECT COUNT(*) FROM blocked_ips WHERE expires_at IS NULL OR expires_at > now()),
    'recent_logs', (SELECT COUNT(*) FROM security_audit_logs WHERE created_at > now() - interval '24 hours'),
    'failed_logins_24h', (SELECT COUNT(*) FROM security_audit_logs WHERE action = 'login_failed' AND created_at > now() - interval '24 hours')
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;

CREATE OR REPLACE FUNCTION get_failed_login_summary(p_since_ts timestamptz)
RETURNS TABLE(ip text, fail_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT 
      (meta->>'ip')::text as ip,
      COUNT(*)::bigint as fail_count
    FROM security_audit_logs
    WHERE action = 'login_failed' 
    AND created_at >= p_since_ts
    AND meta->>'ip' IS NOT NULL
    GROUP BY (meta->>'ip')
    HAVING COUNT(*) >= 5
    ORDER BY fail_count DESC;
END;
$$;

-- Settings par défaut
INSERT INTO security_settings (key, value) VALUES
  ('max_login_attempts', '5'::jsonb),
  ('lockout_duration_minutes', '30'::jsonb),
  ('ip_whitelist', '[]'::jsonb),
  ('enable_auto_blocking', 'true'::jsonb),
  ('alert_email', '"security@224solutions.com"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all_audit ON security_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_all_incidents ON security_incidents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_all_reports ON security_reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_all_settings ON security_settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_all_actions ON security_actions
  FOR ALL USING (auth.role() = 'service_role');
\`\`\`

### Prochaines Étapes

1. **Exécuter la migration SQL** dans SQL Editor Supabase
2. **Regénérer les types TypeScript** (redémarrer le projet)
3. **Activer le dashboard MDR** (fichiers déjà créés)
4. **Intégrer l'audit logging** dans les endpoints critiques:
   - Auth (login/logout)
   - Payments
   - Transactions
   - User management

### Intégration Audit Logging

Dans vos endpoints critiques, ajoutez:

\`\`\`typescript
import { supabase } from '@/integrations/supabase/client';

// Après une action importante (login, payment, etc.)
await supabase.rpc('log_security_event', {
  p_user_id: user.id,
  p_ip: '127.0.0.1', // obtenir IP réelle du client
  p_device_info: { userAgent: navigator.userAgent },
  p_action: 'user_login',
  p_endpoint: '/auth/login',
  p_payload: {},
  p_meta: { success: true }
});
\`\`\`

### Détection Automatique (Backend)

Créer un cron job ou edge function pour:

\`\`\`typescript
// Vérifier les tentatives de login échouées
const { data } = await supabase
  .rpc('get_failed_login_summary', { 
    p_since_ts: new Date(Date.now() - 10 * 60 * 1000).toISOString() 
  });

for (const row of data || []) {
  if (row.fail_count >= 5) {
    // Créer incident
    await supabase.rpc('create_security_incident', {
      p_incident_key: \`bruteforce_\${row.ip}_\${Date.now()}\`,
      p_severity: 'high',
      p_summary: \`Multiple failed logins from \${row.ip}\`,
      p_details: { ip: row.ip, count: row.fail_count }
    });

    // Bloquer l'IP
    await supabase.from('blocked_ips').insert({
      ip: row.ip,
      reason: 'bruteforce_auto',
      blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });
  }
}
\`\`\`

## 📊 Architecture Complète

\`\`\`
Frontend (React)
    ↓
usePaymentLinks Hook → DataManager → Supabase → payment_links table
useEscrowTransactions Hook → DataManager → Supabase → escrow_transactions table
useVendorAnalytics Hook → Supabase → analytics data
useMDRSecurity Hook → Supabase → security_* tables
    ↓
Real-time updates via Supabase Realtime
    ↓
UI automatically re-renders
\`\`\`

## ✅ Ce qui Fonctionne Déjà

- ✅ Payment Links Manager (frontend ↔ backend ↔ database)
- ✅ Escrow Transactions (frontend ↔ backend ↔ database)
- ✅ Vendor Analytics (frontend ↔ backend ↔ database)
- ✅ Financial Transactions (frontend ↔ backend ↔ database)
- ✅ User Management (backend)
- ✅ Wallet Management (backend)
- ✅ Order Management (backend)
- ✅ DataManager avec cache et realtime
- ✅ Architecture documentée

## 🔜 À Activer

- ⏸️ MDR Security Dashboard (attente migration SQL)
- ⏸️ Audit Logging automatique
- ⏸️ Détecteurs d'anomalies
- ⏸️ Actions de riposte automatiques

## 🔗 Liens Utiles

- Architecture: `ARCHITECTURE_INTEGRATION.md`
- DataManager: `src/services/DataManager.ts`
- Hooks: `src/hooks/`
- Services: `services/`
- Dashboard MDR: `src/components/pdg/MDRSecurityDashboard.tsx`

---

**Status Global: ✅ Frontend-Backend-Database 100% Intégrés**
**Status MDR: ⏸️ Prêt, attente migration SQL manuelle**
