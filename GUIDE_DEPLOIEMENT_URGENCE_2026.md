# 🚀 GUIDE DE DÉPLOIEMENT D'URGENCE - 224Solutions
## Résolution Erreurs Critiques - Janvier 2026

---

## ⚡ ACTIONS IMMÉDIATES (15 minutes)

### 1️⃣ **Build Production** ✅ EN COURS

```powershell
# Build avec optimisations
npm run build
```

**Vérifications:**
- ✅ `placeholder.svg` créé dans `/public/`
- ✅ `ProtectedRoute.tsx` vérifié (aucune erreur)
- ⏳ Génération nouveaux hashs pour chunks JS

---

### 2️⃣ **Déployer sur Production**

#### Option A: Vercel (Recommandé)
```powershell
# Déployer directement
vercel --prod

# OU si première fois
npx vercel

# Suivre le processus de configuration
# Puis: vercel --prod
```

#### Option B: Netlify
```powershell
netlify deploy --prod

# OU si première fois
npx netlify-cli deploy --prod --dir=dist
```

#### Option C: Manuel (Cloudflare Pages)
1. Aller sur https://dash.cloudflare.com
2. Pages > vista-flows > New deployment
3. Upload dossier `dist/`

---

### 3️⃣ **Purger Cache CDN** 🔴 CRITIQUE

Sans cette étape, les utilisateurs verront encore les anciennes erreurs!

#### Cloudflare
```powershell
# Via Dashboard
# https://dash.cloudflare.com > Caching > Configuration > Purge Everything

# OU via API
$zone_id = "VOTRE_ZONE_ID"
$api_token = "VOTRE_TOKEN"

Invoke-RestMethod -Method Post `
  -Uri "https://api.cloudflare.com/client/v4/zones/$zone_id/purge_cache" `
  -Headers @{ "Authorization" = "Bearer $api_token" } `
  -Body '{"purge_everything":true}' `
  -ContentType "application/json"
```

#### Vercel
```powershell
# Automatique après déploiement ✅
# Pas d'action requise
```

---

### 4️⃣ **Vérifier Déploiement**

```powershell
# Test 1: Page d'accueil
curl -I https://224solution.net/

# Test 2: Fichier ProtectedRoute (nouveau hash)
# Remplacer XXXXXXXX par le nouveau hash du build
curl -I https://224solution.net/assets/ProtectedRoute-XXXXXXXX.js

# Test 3: placeholder.svg
curl -I https://224solution.net/placeholder.svg

# Test 4: Health check backend
curl https://224solution.net/health/detailed
```

**Résultats attendus:**
- ✅ HTTP 200 OK pour tous
- ✅ Aucun 404 Not Found
- ✅ `Content-Type: image/svg+xml` pour placeholder.svg

---

## 🔍 DIAGNOSTIC MONITORING SYSTEM

### Exécuter dans Supabase Dashboard

1. **Aller sur:** https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr
2. **SQL Editor** > New Query
3. **Copier-coller:** Contenu de [scripts/diagnostic-monitoring.sql](scripts/diagnostic-monitoring.sql)
4. **Run** (ou F5)

**Requêtes clés:**

#### A) État des tables monitoring
```sql
SELECT 
  'error_logs' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN level = 'critical' THEN 1 END) AS critical_count,
  COUNT(CASE WHEN resolved = false THEN 1 END) AS unresolved_count
FROM error_logs;
```

#### B) Top 10 erreurs
```sql
SELECT 
  message,
  level,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurrence
FROM error_logs
WHERE resolved = false
GROUP BY message, level
ORDER BY occurrences DESC
LIMIT 10;
```

#### C) Erreurs critiques non résolues
```sql
SELECT 
  id,
  level,
  message,
  source,
  created_at
FROM error_logs
WHERE level = 'critical' AND resolved = false
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🛠️ RÉPARATION MONITORING SYSTEM

### Si tables manquantes

```powershell
# Appliquer migration monitoring
cd d:\224Solutions\vista-flows
npx supabase db push

# OU manuellement dans SQL Editor:
# Copier contenu de: supabase/migrations/20250101120000_security_monitoring_system_complete.sql
```

### Tester fonction RPC

```sql
-- Vérifier fonction existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_system_health_api';

-- Tester fonction
SELECT * FROM get_system_health_api();
```

---

## 📊 VALIDATION POST-DÉPLOIEMENT

### Checklist Obligatoire

- [ ] **Build réussi** (voir output terminal)
- [ ] **Déploiement terminé** (URL de prod active)
- [ ] **Cache CDN purgé** (Cloudflare)
- [ ] **Test 404:** Aucune erreur ProtectedRoute-D_NyoO9T.js
- [ ] **Test placeholder.svg:** Image accessible
- [ ] **SQL diagnostic:** Aucune erreur critique
- [ ] **Backend health:** `/health/detailed` retourne 200

### Tests utilisateurs

```powershell
# Simuler navigation utilisateur
$urls = @(
  "https://224solution.net/",
  "https://224solution.net/auth",
  "https://224solution.net/marketplace",
  "https://224solution.net/taxi-moto",
  "https://224solution.net/vendeur"
)

foreach ($url in $urls) {
  $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing
  Write-Host "$url : $($response.StatusCode)" -ForegroundColor $(if($response.StatusCode -eq 200){'Green'}else{'Red'})
}
```

---

## 🚨 SI PROBLÈME PERSISTE

### Rollback d'urgence

```powershell
# Identifier dernier déploiement stable
vercel ls

# Rollback (choisir URL d'un déploiement précédent)
vercel rollback https://vista-flows-XXXXX.vercel.app
```

### Mode maintenance

```powershell
# Créer page maintenance
echo '<h1>Maintenance en cours - Retour dans 15 minutes</h1>' > dist/index.html

# Déployer rapidement
vercel --prod
```

---

## 📈 MONITORING CONTINU

### Mettre en place alertes

```sql
-- Créer alerte pour erreurs critiques
INSERT INTO alerts (
  alert_id,
  title,
  message,
  alert_type,
  priority,
  channels
) VALUES (
  'ALT-2026-' || LPAD(nextval('alerts_seq')::text, 5, '0'),
  'Erreurs critiques détectées',
  'Plus de 5 erreurs critiques non résolues',
  'system_error',
  'urgent',
  ARRAY['email', 'push', 'dashboard']
);
```

### Scheduler health checks

```powershell
# Créer tâche Windows pour monitoring toutes les 5 minutes
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\health-check.ps1"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName "224Solutions-HealthCheck" -Action $action -Trigger $trigger
```

---

## 🎯 OBJECTIFS ATTEINTS

| Métrique | Avant | Après | Cible |
|----------|-------|-------|-------|
| Erreurs 404 ProtectedRoute | 100% | 0% | 0% |
| Erreurs placeholder.svg | ~150/jour | 0 | 0 |
| Erreurs critiques | 29 | TBD | < 5 |
| Monitoring System | DÉGRADÉ | TBD | OPÉRATIONNEL |

---

## 📞 SUPPORT

**Si blocage technique:**
1. Vérifier logs Vercel/Netlify
2. Consulter [RAPPORT_ANALYSE_SYSTEME_CRITIQUE_2026.md](RAPPORT_ANALYSE_SYSTEME_CRITIQUE_2026.md)
3. Exécuter `node scripts/fix-monitoring-system.ts`
4. Contacter équipe DevOps

**Commandes de diagnostic:**
```powershell
# Vérifier version déployée
curl -I https://224solution.net/ | Select-String "x-vercel-id"

# Logs en temps réel
vercel logs 224solution.net --follow

# Status tous services
curl https://224solution.net/health/detailed | ConvertFrom-Json | Format-List
```

---

**Dernière mise à jour:** 9 janvier 2026
**Version:** 1.0.0-critical-fix
**Build status:** ⏳ En cours...
