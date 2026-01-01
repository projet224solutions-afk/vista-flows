# 🔍 DIAGNOSTIC MONITORING SYSTEM - 224Solutions

## État Actuel: DÉGRADÉ 🟡

---

## 🎯 Diagnostic Complet

### Problème Identifié

Le **Monitoring System** est marqué comme "dégradé" car il ne peut pas accéder aux tables nécessaires pour effectuer les health checks. Les services de monitoring tentent d'interroger des tables qui n'ont pas encore été créées.

### Tables Manquantes

Les tables suivantes sont requises mais n'existent probablement pas encore:

1. ✅ `error_logs` - Logs d'erreurs avec résolution tracking
2. ✅ `secure_logs` - Logs centralisés sécurisés
3. ✅ `system_health_logs` - Health checks système
4. ✅ `performance_metrics` - Métriques performance API
5. ✅ `alerts` - Alertes email/push/SMS
6. ✅ `health_check_reports` - Rapports health checks
7. ✅ `csp_violations` - Violations CSP

**Status:** Migration créée mais **PAS APPLIQUÉE**

---

## ✅ Solution Immédiate (5 minutes)

### Étape 1: Vérifier Tables Supabase

```sql
-- Dans Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'error_logs',
  'secure_logs', 
  'system_health_logs',
  'performance_metrics',
  'alerts',
  'health_check_reports',
  'csp_violations'
);
```

**Résultat attendu:** 7 tables listées

**Si 0 tables → Appliquer migration (Étape 2)**

### Étape 2: Appliquer Migration SQL

#### Option A: Via Supabase CLI (Recommandé)

```bash
# Terminal PowerShell
cd D:\224Solutions

# Vérifier connexion Supabase
supabase status

# Appliquer migration
supabase db push

# Vérifier succès
supabase db diff
```

#### Option B: Via Dashboard Supabase

1. Ouvrir https://app.supabase.com
2. Sélectionner projet **224Solutions**
3. Aller dans **SQL Editor**
4. Ouvrir fichier local: `supabase/migrations/20240130_security_services_infrastructure.sql`
5. Copier-coller contenu complet
6. Cliquer **Run**
7. Vérifier message "Success"

#### Option C: Via psql Direct

```bash
# Si psql installé
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f supabase/migrations/20240130_security_services_infrastructure.sql
```

### Étape 3: Vérifier Services Actifs

```typescript
// Dans console navigateur (F12)
import { monitoringService } from './src/services/MonitoringService';
import { healthCheckService } from './src/services/HealthCheckService';

// Test monitoring
const health = await monitoringService.getCurrentHealth();
console.log('Santé système:', health.overall);

// Test health check
const report = await healthCheckService.checkNow();
console.log('Health checks:', report.checksPerformed, 'effectués');
```

**Résultat attendu:**
- `health.overall`: "healthy" ou "degraded" (mais pas d'erreurs)
- `report.checksPerformed`: 7
- Aucune erreur console

### Étape 4: Vérifier Tables Peuplées

```sql
-- Vérifier données dans tables
SELECT COUNT(*) FROM system_health_logs;
SELECT COUNT(*) FROM health_check_reports;

-- Doit retourner au moins 1 entrée pour system_health_logs (créée par migration)
```

---

## 🔧 Corrections Supplémentaires

### Problème: Tables existent mais status toujours "degraded"

**Causes possibles:**

1. **RPC Function manquante** (`get_system_health_api`)
2. **Permissions RLS** bloquent accès
3. **Erreurs critiques** dans `error_logs` table

#### Correction 1: Créer RPC Function Manquante

```sql
-- Dans Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_system_health_api()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'status', 'healthy',
    'timestamp', NOW(),
    'services', jsonb_build_object(
      'database', 'healthy',
      'auth', 'healthy',
      'storage', 'healthy'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_system_health_api() TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health_api() TO anon;
```

#### Correction 2: Vérifier Permissions RLS

```sql
-- Vérifier RLS activé sur tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('error_logs', 'system_health_logs', 'health_check_reports');

-- Si rowsecurity = false, activer:
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_reports ENABLE ROW LEVEL SECURITY;

-- Vérifier policies existent
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('error_logs', 'system_health_logs', 'health_check_reports');
```

#### Correction 3: Nettoyer Erreurs Critiques

```sql
-- Vérifier erreurs critiques existantes
SELECT * FROM error_logs 
WHERE level = 'critical' 
AND resolved = false 
ORDER BY created_at DESC 
LIMIT 10;

-- Si erreurs anciennes, marquer comme résolues
UPDATE error_logs 
SET resolved = true, 
    resolved_at = NOW() 
WHERE level = 'critical' 
AND created_at < NOW() - INTERVAL '1 hour';
```

---

## 📊 Monitoring Dashboard

Une fois les tables créées, accéder au dashboard monitoring:

### Option 1: Ajouter Route dans App.tsx

```typescript
// src/App.tsx
import SecurityMonitoring from '@/pages/SecurityMonitoring';

// Dans Routes
<Route path="/security-monitoring" element={<SecurityMonitoring />} />
```

### Option 2: Accès Direct

Naviguer vers: `http://localhost:5173/security-monitoring`

**Dashboard affiche:**
- ✅ Statut global système (healthy/degraded/critical)
- ✅ 4 métriques clés (erreurs critiques, attente, temps réponse, users actifs)
- ✅ Health checks détaillés (7 checks)
- ✅ Violations CSP récentes
- ✅ Diagnostics système complets
- ✅ Auto-refresh 10 secondes

---

## 🎯 Checklist Résolution Complète

### Phase 1: Installation (5 min)
- [ ] Vérifier tables Supabase (SELECT table_name...)
- [ ] Appliquer migration si manquante (supabase db push)
- [ ] Vérifier 7 tables créées
- [ ] Vérifier entrée initiale system_health_logs

### Phase 2: Validation (3 min)
- [ ] Test monitoringService.getCurrentHealth()
- [ ] Test healthCheckService.checkNow()
- [ ] Vérifier aucune erreur console
- [ ] Vérifier status !== 'unknown'

### Phase 3: Dashboard (2 min)
- [ ] Ajouter route SecurityMonitoring
- [ ] Naviguer vers /security-monitoring
- [ ] Vérifier dashboard affiche données
- [ ] Tester auto-refresh

### Phase 4: Corrections (si nécessaire)
- [ ] Créer RPC get_system_health_api
- [ ] Vérifier permissions RLS
- [ ] Nettoyer erreurs critiques anciennes
- [ ] Re-tester health checks

---

## 📈 Résultats Attendus

### Avant Corrections
```
Monitoring System: DÉGRADÉ 🟡
- Tables manquantes
- Health checks échouent
- Status: "unknown" ou "degraded"
- Erreurs console
```

### Après Corrections
```
Monitoring System: OPÉRATIONNEL 🟢
- 7 tables créées et accessibles
- Health checks: 7/7 réussis
- Status: "healthy"
- Dashboard fonctionnel
- Auto-monitoring actif (30s)
```

---

## 🚨 Actions Immédiates

### 1. Appliquer Migration (PRIORITÉ P0)

```bash
# Option la plus simple
cd D:\224Solutions
supabase db push
```

**OU**

```sql
-- Via Supabase Dashboard > SQL Editor
-- Copier-coller contenu de:
-- supabase/migrations/20240130_security_services_infrastructure.sql
-- Puis RUN
```

### 2. Vérifier Status

```typescript
// Console navigateur
const health = await monitoringService.getCurrentHealth();
console.log('Status:', health.overall); // Devrait être "healthy"
```

### 3. Accéder Dashboard

```
http://localhost:5173/security-monitoring
```

---

## 📞 Support

**Si problème persiste:**

1. Vérifier logs console navigateur (F12)
2. Vérifier logs Supabase SQL Editor
3. Exporter résultat diagnostic:

```sql
-- Exporter état complet
SELECT 
  'error_logs' as table_name,
  COUNT(*) as row_count,
  COUNT(CASE WHEN level = 'critical' THEN 1 END) as critical_count
FROM error_logs

UNION ALL

SELECT 
  'system_health_logs',
  COUNT(*),
  COUNT(CASE WHEN overall_status != 'healthy' THEN 1 END)
FROM system_health_logs

UNION ALL

SELECT 
  'health_check_reports',
  COUNT(*),
  COUNT(CASE WHEN overall_status != 'healthy' THEN 1 END)
FROM health_check_reports;
```

**Contact:**
- Technique: tech@224solution.net
- Sécurité: security@224solution.net

---

## ✅ Validation Finale

Après avoir suivi les étapes, vérifier:

- [ ] **Tables:** 7 tables existent dans Supabase
- [ ] **Health Check:** `healthCheckService.checkNow()` retourne "healthy"
- [ ] **Monitoring:** `monitoringService.getCurrentHealth()` sans erreurs
- [ ] **Dashboard:** `/security-monitoring` affiche métriques
- [ ] **Auto-refresh:** Dashboard se met à jour toutes les 10s
- [ ] **Status:** Badge global "HEALTHY" 🟢

**Si toutes cases cochées → Monitoring System OPÉRATIONNEL** ✅

---

*Dernière mise à jour: 1 décembre 2025*
*Version: 1.0.0*
*224Solutions Security Team*
