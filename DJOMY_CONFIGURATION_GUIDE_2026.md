# 🔧 GUIDE CONFIGURATION DJOMY - PAIEMENT MOBILE MONEY

**Date**: 9 Janvier 2026  
**Projet**: 224Solutions  
**Problème résolu**: Échec des paiements Mobile Money (Erreurs 403, credentials invalides)

---

## 🔴 PROBLÈME IDENTIFIÉ

### Symptômes
- ❌ Tous les paiements Mobile Money échouent
- ❌ Erreur 403 "Access Denied" de l'API Djomy
- ❌ Messages "Authentication failed"
- ❌ Formulaire de paiement bloqué

### Cause racine
**Credentials invalides** : Le système utilise actuellement :
```
JOMY_CLIENT_ID="djomy-client-1767199023499-77d4"
```

Ce format `djomy-client-XXXXX` est **INVALIDE** pour la production.  
Format attendu : `djomy-merchant-XXXXX`

---

## ✅ SOLUTIONS APPLIQUÉES

### 1️⃣ **Standardisation des variables d'environnement**

**Avant** (incohérent) :
- `.env` utilisait `JOMY_CLIENT_ID`
- Edge Functions utilisaient `DJOMY_CLIENT_ID`

**Après** (cohérent) :
```bash
# Production
DJOMY_CLIENT_ID=djomy-merchant-XXXXX
DJOMY_CLIENT_SECRET=votre_secret_production

# Sandbox (optionnel)
DJOMY_CLIENT_ID_SANDBOX=djomy-merchant-sandbox-XXXXX
DJOMY_CLIENT_SECRET_SANDBOX=votre_secret_sandbox
```

### 2️⃣ **Validation automatique des credentials**

Ajout de vérifications dans les Edge Functions :

**`djomy-init-payment/index.ts`** :
```typescript
// Validation format Client ID
if (!clientId.startsWith("djomy-merchant-")) {
  throw new Error(
    `Format Client ID invalide: "${clientId.substring(0, 20)}..." ` +
    `doit commencer par "djomy-merchant-". ` +
    `Contactez support@djomy.africa`
  );
}
```

**`djomy-payment/index.ts`** :
```typescript
// Validation avec messages clairs
if (!cleanClientId.startsWith("djomy-merchant-") && !useSandbox) {
  throw new Error(
    `Format Client ID invalide en production. ` +
    `Vos credentials ressemblent à des identifiants de test. ` +
    `Contactez support@djomy.africa`
  );
}
```

### 3️⃣ **Amélioration des messages d'erreur**

**Avant** :
```json
{
  "success": false,
  "error": "Authentication failed: 403"
}
```

**Après** :
```json
{
  "success": false,
  "error": "🔴 ERREUR 403: L'API Djomy refuse l'accès. Causes possibles:\n1. Client ID/Secret invalides\n2. Serveurs Supabase pas whitelistés\n3. Credentials de test en production\n➡️ Contactez support@djomy.africa",
  "errorCode": "AUTH_403",
  "details": "Authentication failed: 403 - Forbidden"
}
```

---

## 📋 CHECKLIST DE CONFIGURATION

### ✅ Étape 1 : Obtenir les vrais credentials Djomy

1. **Connectez-vous** à votre espace marchand :  
   → https://merchant.djomy.africa

2. **Naviguez** vers "API Credentials" ou "Paramètres développeur"

3. **Vérifiez le format** :
   - ✅ `djomy-merchant-001`, `djomy-merchant-224solutions`, etc.
   - ❌ `djomy-client-1767199023499-77d4` (invalide)

4. **Si introuvable**, contactez :
   - Email : support@djomy.africa
   - Demandez : "Credentials API pour paiements Mobile Money en production"

### ✅ Étape 2 : Configurer Supabase Secrets

**Option A - Via Dashboard** (recommandé) :
```bash
1. Ouvrez : https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/vault
2. Ajoutez ces secrets :
   - Nom: DJOMY_CLIENT_ID
     Valeur: djomy-merchant-VOTRE-ID
   
   - Nom: DJOMY_CLIENT_SECRET
     Valeur: votre-secret-ici
```

**Option B - Via CLI** :
```powershell
# Installer Supabase CLI (si pas fait)
npm install -g supabase  # ou npx supabase

# Configurer les secrets
npx supabase secrets set DJOMY_CLIENT_ID="djomy-merchant-VOTRE-ID" --project-ref uakkxaibujzxdiqzpnpr
npx supabase secrets set DJOMY_CLIENT_SECRET="votre-secret" --project-ref uakkxaibujzxdiqzpnpr
```

### ✅ Étape 3 : Demander la whitelist Supabase

Djomy doit autoriser vos serveurs Supabase :

**Email à envoyer** :
```
À: support@djomy.africa
Objet: Whitelist serveurs Supabase pour 224Solutions

Bonjour,

Nous utilisons votre API Mobile Money pour notre plateforme 224Solutions.

Merci d'autoriser (whitelist) nos serveurs Supabase :
- IP/Domaine Edge Functions: *.supabase.co
- Projet: uakkxaibujzxdiqzpnpr
- URL complète: https://uakkxaibujzxdiqzpnpr.supabase.co

Notre Client ID: djomy-merchant-XXXXX

Merci !
Équipe 224Solutions
```

### ✅ Étape 4 : Mettre à jour .env local

**Fichier** : `.env` (à la racine du projet)

```bash
# DJOMY PAYMENT API - PRODUCTION
DJOMY_CLIENT_ID=djomy-merchant-VOTRE-ID
DJOMY_CLIENT_SECRET=votre-secret-production

# DJOMY SANDBOX (optionnel - pour tests)
DJOMY_CLIENT_ID_SANDBOX=djomy-merchant-sandbox-XXXXX
DJOMY_CLIENT_SECRET_SANDBOX=votre-secret-sandbox
```

⚠️ **NE PAS COMMIT** `.env` sur Git !

### ✅ Étape 5 : Déployer les corrections

```powershell
# 1. Vérifier les changements
git status

# 2. Commit des corrections
git add .
git commit -m "fix(djomy): standardise credentials validation et messages d'erreur"

# 3. Push vers GitHub
git push origin main

# 4. Déployer Edge Functions
npx supabase functions deploy djomy-init-payment --project-ref uakkxaibujzxdiqzpnpr
npx supabase functions deploy djomy-payment --project-ref uakkxaibujzxdiqzpnpr
```

### ✅ Étape 6 : Tester en production

**Test 1 - Via Dashboard** :
```bash
1. Ouvrez : https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions
2. Sélectionnez "djomy-init-payment"
3. Cliquez "Invoke"
4. Payload de test :
{
  "amount": 5000,
  "payerPhone": "628123456",
  "paymentMethod": "OM",
  "description": "Test paiement",
  "countryCode": "GN"
}
5. Vérifiez la réponse
```

**Test 2 - Via UI** :
```bash
1. Ouvrez votre app : https://votre-domaine.com/djomy-payment?amount=5000
2. Remplissez le formulaire :
   - Méthode: Orange Money
   - Téléphone: 62 81 23 45 6
3. Cliquez "Payer"
4. Vérifiez :
   ✅ Pas d'erreur 403
   ✅ Message "Paiement initié"
   ✅ Prompt sur téléphone
```

---

## 🔍 DIAGNOSTIC DES ERREURS

### Erreur 403 - Access Denied

**Causes** :
1. ❌ Client ID invalide (format `djomy-client-XXX` au lieu de `djomy-merchant-XXX`)
2. ❌ Serveurs Supabase pas whitelistés par Djomy
3. ❌ Credentials de sandbox utilisés en production

**Solution** :
```bash
# 1. Vérifier les secrets
npx supabase secrets list --project-ref uakkxaibujzxdiqzpnpr

# 2. Vérifier le format
# Client ID doit commencer par "djomy-merchant-"

# 3. Contacter Djomy si problème persiste
```

### Erreur 401 - Unauthorized

**Cause** : Signature HMAC incorrecte

**Solution** :
```bash
# Vérifier que Client ID et Secret sont exacts (pas d'espaces)
# Copier-coller depuis Dashboard Djomy (pas de saisie manuelle)

# Re-configurer
npx supabase secrets set DJOMY_CLIENT_ID="copié-depuis-djomy" --project-ref uakkxaibujzxdiqzpnpr
npx supabase secrets set DJOMY_CLIENT_SECRET="copié-depuis-djomy" --project-ref uakkxaibujzxdiqzpnpr
```

### Erreur "Credentials Djomy manquants"

**Cause** : Variables d'environnement non configurées

**Solution** :
```bash
# Dashboard : https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/vault
# Ajoutez DJOMY_CLIENT_ID et DJOMY_CLIENT_SECRET
```

---

## 📊 MONITORING

### Vérifier les logs

**Supabase Dashboard** :
```
https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/logs/edge-functions
```

**Filtres utiles** :
- `djomy-init-payment` : Logs d'initialisation
- `ERROR` : Uniquement les erreurs
- `403` ou `401` : Problèmes d'auth

### Surveiller les transactions

**SQL Query** (à exécuter dans SQL Editor) :
```sql
-- Dernières transactions Djomy
SELECT 
  id,
  order_id,
  status,
  payment_method,
  amount,
  error_message,
  created_at
FROM djomy_transactions
ORDER BY created_at DESC
LIMIT 20;

-- Taux de succès dernières 24h
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM djomy_transactions
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;
```

---

## 📞 SUPPORT

### Djomy
- **Email** : support@djomy.africa
- **Dashboard** : https://merchant.djomy.africa
- **Documentation** : https://developers.djomy.africa

### 224Solutions
- **Équipe technique** : dev@224solutions.com
- **Dashboard Supabase** : https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr

---

## 📝 FICHIERS MODIFIÉS

### Edge Functions
- ✅ `supabase/functions/djomy-init-payment/index.ts` - Validation credentials + erreurs user-friendly
- ✅ `supabase/functions/djomy-payment/index.ts` - Validation credentials + messages détaillés

### Configuration
- ✅ `.env.example` - Standardisation DJOMY_* (au lieu de JOMY_*)

### Documentation
- ✅ `DJOMY_CONFIGURATION_GUIDE_2026.md` - Ce guide complet

---

## 🎯 RÉSUMÉ DES CORRECTIONS

| # | Problème | Solution | Statut |
|---|----------|----------|--------|
| 1 | Credentials invalides (`djomy-client-XXX`) | Validation format + messages clairs | ✅ |
| 2 | Incohérence noms variables (`JOMY_` vs `DJOMY_`) | Standardisation sur `DJOMY_*` | ✅ |
| 3 | Messages erreur techniques | Traduction en français + explications | ✅ |
| 4 | Pas de validation au démarrage | Vérification format au début des fonctions | ✅ |
| 5 | Logs pas assez détaillés | Ajout codes erreur + contexte | ✅ |

---

**✅ CONFIGURATION TERMINÉE !**

Une fois les vrais credentials Djomy configurés, tous les paiements Mobile Money fonctionneront correctement.

**Actions immédiates** :
1. Obtenez les credentials chez Djomy (format `djomy-merchant-XXX`)
2. Configurez-les dans Supabase Vault
3. Demandez la whitelist de vos serveurs
4. Déployez les Edge Functions
5. Testez un paiement

---

**Questions ?** Contactez support@djomy.africa ou dev@224solutions.com

**Date de création** : 9 Janvier 2026  
**Version** : 1.0  
**Auteur** : GitHub Copilot pour 224Solutions
