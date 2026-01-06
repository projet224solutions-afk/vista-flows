# 🚀 GUIDE DE DÉPLOIEMENT COMPLET - 224SOLUTIONS
## Corrections Sécurité + Smart Funds Release

**Date:** 6 janvier 2026  
**Durée totale:** 30-45 minutes  
**Criticité:** 🔴 HAUTE

---

## 📋 ORDRE D'EXÉCUTION

### PHASE 1: Sécurité Djomy (10-15 min) 🔴 CRITIQUE

**Impact:** Secret exposé → Risque de détournement de fonds

**Script:** `URGENT-regenerate-djomy-secret.ps1`

```powershell
.\URGENT-regenerate-djomy-secret.ps1
```

**Étapes:**
1. ✅ Vérification connexion Supabase
2. 🌐 Ouverture dashboard Djomy
3. 🔄 Régénération du secret (manuel)
4. 💾 Mise à jour dans Supabase (automatique)
5. 🧪 Vérification (transaction test)

**Validation:**
- ✅ Transaction wallet réussie
- ✅ Logs sans erreur "Client secret invalid"

---

### PHASE 2: Edge Functions Sécurisées (15-20 min) 🟠 HAUTE

**Impact:** CORS non restrictif + Validations manquantes en production

**Script:** `URGENT-deploy-security-fixes.ps1`

**Option A - Automatisé (recommandé):**
```powershell
.\URGENT-deploy-security-fixes.ps1 -Token "sbp_xxxxxxxxxx"
```

**Option B - Manuel:**
```powershell
.\URGENT-deploy-security-fixes.ps1
# Suivre les instructions affichées
```

**Fonctions déployées:**
- ✅ `create-pdg-agent` - CORS + validation commission
- ✅ `create-sub-agent` - CORS restrictif
- ✅ `wallet-operations` - Secrets HMAC sécurisés
- ✅ `wallet-transfer` - Secrets HMAC sécurisés
- ✅ `stripe-webhook` - Validation signature

**Validation:**
- ✅ CORS restrictif (DevTools → Network)
- ✅ Commission >50% refusée (erreur 400)
- ✅ Logs sans erreur

---

### PHASE 3: Smart Funds Release (5-10 min) 🟢 IMPORTANT

**Impact:** Protection fraude + Meilleure UX vendeur

**Script:** `URGENT-deploy-smart-funds.ps1`

```powershell
.\URGENT-deploy-smart-funds.ps1
```

**Étapes:**
1. ✅ Vérification connexion Supabase
2. ✅ Confirmation migration
3. 🚀 Déploiement (auto ou manuel)
4. 🧪 Vérification tables/fonctions

**Tables créées:**
- `payment_risk_assessments` - Évaluation Trust Score
- `funds_release_schedule` - Planification libération
- `payment_fraud_signals` - Détection fraude
- `chargeback_history` - Historique litiges

**Fonctions créées:**
- `calculate_payment_trust_score()` - Calcul score 0-100
- `schedule_funds_release()` - Planifier libération
- `release_scheduled_funds()` - Libérer fonds
- `admin_approve_payment()` - Approuver manuellement
- `admin_reject_payment()` - Rejeter paiement

**Validation:**
- ✅ Tables créées (4)
- ✅ Fonctions créées (5)
- ✅ Vue admin créée
- ✅ RLS activé

---

## 🧪 TESTS DE VÉRIFICATION GLOBALE

### 1. Test Sécurité Djomy
```powershell
# Dans l'application, faire une transaction wallet
# Vérifier logs: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs
# ✅ Transaction réussie sans erreur 403
```

### 2. Test Edge Functions
```javascript
// DevTools Console
fetch('https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/create-pdg-agent', {
  method: 'OPTIONS',
  headers: { 'Origin': 'https://evil.com' }
})
// ✅ Doit retourner 403 ou CORS error
```

### 3. Test Smart Funds
```sql
-- Dans SQL Editor Supabase
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'payment%';

-- ✅ Doit afficher:
-- - payment_risk_assessments
-- - payment_fraud_signals
```

### 4. Test Trust Score (nécessite transaction)
```sql
SELECT calculate_payment_trust_score(
  'transaction-uuid'::uuid,
  'buyer-uuid'::uuid,
  'seller-uuid'::uuid,
  10000, -- montant en centimes
  '4242' -- last4
);

-- ✅ Doit retourner JSON avec trust_score, risk_level, decision
```

---

## 📊 CHECKLIST COMPLÈTE

### Avant de commencer
- [ ] Supabase CLI installé (`npm install -g supabase`)
- [ ] Connexion Supabase active (`supabase login`)
- [ ] Projet lié (`supabase link --project-ref uakkxaibujzxdiqzpnpr`)
- [ ] Accès dashboard Djomy
- [ ] Token Supabase (si déploiement auto)

### Phase 1: Djomy
- [ ] Script exécuté
- [ ] Secret régénéré sur Djomy
- [ ] Secret mis à jour dans Supabase
- [ ] Transaction test réussie
- [ ] Logs vérifiés

### Phase 2: Edge Functions
- [ ] Script exécuté
- [ ] 5 fonctions déployées
- [ ] CORS vérifié
- [ ] Validation commission testée
- [ ] Logs vérifiés

### Phase 3: Smart Funds
- [ ] Script exécuté
- [ ] Migration déployée
- [ ] 4 tables créées
- [ ] 5 fonctions créées
- [ ] Vue admin créée
- [ ] RLS activé
- [ ] Tests SQL passés

---

## ⚠️ EN CAS DE PROBLÈME

### Problème: Supabase CLI non connecté
```powershell
supabase login
supabase link --project-ref uakkxaibujzxdiqzpnpr
```

### Problème: Token Supabase invalide
1. Aller sur: https://supabase.com/dashboard/account/tokens
2. Créer nouveau token (nom: Deploy 2026)
3. Copier le token (sbp_xxx...)
4. Relancer avec: `-Token "sbp_xxx..."`

### Problème: Migration SQL échoue
1. Vérifier que les tables n'existent pas déjà:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name LIKE 'payment%';
   ```
2. Si tables existent, vérifier si migration déjà appliquée
3. Utiliser déploiement manuel si nécessaire

### Problème: Edge Function en erreur
1. Vérifier logs: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs/edge-functions
2. Vérifier syntaxe du fichier `index.ts`
3. Redéployer manuellement via Dashboard

---

## 📚 DOCUMENTATION COMPLÉMENTAIRE

### Sécurité
- `ACTIONS_IMMEDIATES.md` - Actions urgentes détaillées
- `SECURITY_GUIDE.md` - Guide complet sécurité

### Smart Funds Release
- `STRIPE_SMART_RELEASE_SYSTEM.md` - Architecture complète
- `STRIPE_SMART_RELEASE_RECAP.md` - Résumé système
- `STRIPE_SMART_RELEASE_TESTS.md` - Guide de tests
- `STRIPE_SMART_RELEASE_VISUAL.md` - Diagrammes

### Edge Functions
- `supabase/functions/*/index.ts` - Code source
- `DEPLOIEMENT_MANUEL_EDGE_FUNCTIONS.md` - Guide détaillé

---

## 🎯 PROCHAINES ÉTAPES (POST-DÉPLOIEMENT)

### Court terme (aujourd'hui)
1. **Intégrer Trust Score au webhook Stripe**
   - Modifier `supabase/functions/stripe-webhook/index.ts`
   - Appeler `calculate_payment_trust_score()` après `payment.succeeded`
   - Appeler `schedule_funds_release()` si AUTO_APPROVED

2. **Créer CRON job libération fonds**
   - Supabase → Database → Cron Jobs
   - Nom: `release-scheduled-funds`
   - Interval: `*/5 * * * *` (toutes les 5 minutes)
   - SQL: `SELECT release_scheduled_funds(id) FROM funds_release_schedule WHERE status='SCHEDULED' AND scheduled_release_at <= NOW();`

### Moyen terme (cette semaine)
3. **Interface admin révision paiements**
   - Créer `src/components/admin/PaymentReviewQueue.tsx`
   - Utiliser vue `admin_payment_review_queue`
   - Boutons Approuver/Rejeter

4. **Interface vendeur statut fonds**
   - Composant existe: `FundsReleaseStatus.tsx`
   - Intégrer dans dashboard vendeur
   - Afficher countdown + progress bar

5. **Tests en production**
   - Faire paiements test Stripe
   - Vérifier calcul Trust Score
   - Vérifier libération automatique
   - Vérifier file attente admin

---

## ✅ VALIDATION FINALE

Une fois toutes les phases terminées:

```powershell
# Test complet
cd d:\224Solutions

# 1. Vérifier secret Djomy
supabase secrets list | Select-String "JOMY"

# 2. Vérifier Edge Functions
# Dashboard → Edge Functions → Vérifier dates "Last deployed"

# 3. Vérifier migration
supabase db diff

# 4. Test transaction complète
# Application → Faire achat → Vérifier Trust Score → Vérifier libération
```

**Critères de succès:**
- ✅ Secret Djomy régénéré et fonctionnel
- ✅ 5 Edge Functions déployées (date = aujourd'hui)
- ✅ Migration Smart Funds appliquée (4 tables + 5 fonctions)
- ✅ Transaction test réussie de bout en bout
- ✅ Aucune erreur dans les logs

---

## 📞 SUPPORT

En cas de blocage:
1. Vérifier logs Supabase
2. Consulter documentation technique
3. Vérifier variables d'environnement
4. Tester en mode manuel

**Logs Supabase:**
- Edge Functions: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs/edge-functions
- Database: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs/postgres-logs

---

*Dernière mise à jour: 6 janvier 2026*
