# 🚀 DÉPLOIEMENT BACKEND STRIPE - GUIDE ÉTAPE PAR ÉTAPE

**Date:** 4 janvier 2026  
**Projet:** 224SOLUTIONS  
**Statut actuel:** Frontend ✅ | Backend ❌

---

## 📋 VUE D'ENSEMBLE

Vous avez actuellement:
- ✅ Frontend Stripe configuré (87%)
- ❌ Backend non déployé (0%)

Pour activer les paiements réels, vous devez:
1. ✅ Se connecter à Supabase
2. ✅ Appliquer la migration SQL
3. ✅ Configurer les secrets Stripe
4. ✅ Déployer les Edge Functions

**Durée estimée:** 15-20 minutes

---

## 🎯 ÉTAPE 1 : CONNEXION SUPABASE

### Option A : Via Supabase CLI (RECOMMANDÉ)

```powershell
# 1. Obtenir un token d'accès
# Allez sur: https://supabase.com/dashboard/account/tokens
# Cliquez sur "Generate new token"
# Copiez le token

# 2. Connectez-vous
supabase login --token sbp_VOTRE_TOKEN_ICI

# 3. Vérifiez la connexion
supabase projects list
```

### Option B : Via variable d'environnement

```powershell
# Définir le token dans PowerShell
$env:SUPABASE_ACCESS_TOKEN = "sbp_VOTRE_TOKEN_ICI"

# Vérifier
if ($env:SUPABASE_ACCESS_TOKEN) { Write-Host "Token configuré ✓" }
```

**✓ Checkpoint:** Vous devriez voir votre projet `uakkxaibujzxdiqzpnpr` dans la liste

---

## 🗄️ ÉTAPE 2 : APPLIQUER LA MIGRATION SQL

### Option A : Via Supabase CLI (RECOMMANDÉ)

```powershell
# Naviguer vers le projet
cd D:\224Solutions

# Lier le projet
supabase link --project-ref uakkxaibujzxdiqzpnpr

# Appliquer toutes les migrations
supabase db push

# Vérifier les tables
supabase db inspect tables
```

### Option B : Via script PowerShell

```powershell
# Utiliser le script automatisé
cd D:\224Solutions
.\apply-stripe-migration-direct.ps1
```

### Option C : Via Supabase Dashboard (MANUEL)

1. Allez sur: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/editor
2. Ouvrez l'éditeur SQL
3. Copiez le contenu de `supabase/migrations/20260104_stripe_payments.sql`
4. Exécutez le SQL
5. Vérifiez que les tables sont créées

**✓ Checkpoint:** Vous devriez voir ces tables:
- `stripe_config`
- `stripe_transactions`
- `wallets`
- `wallet_transactions`
- `withdrawals`

---

## 🔐 ÉTAPE 3 : CONFIGURER LES SECRETS STRIPE

### 3.1 Obtenir vos clés Stripe

1. Allez sur: https://dashboard.stripe.com/test/apikeys
2. Copiez votre **Secret key** (commence par `sk_test_`)
3. Allez dans: https://dashboard.stripe.com/test/webhooks
4. Créez un webhook endpoint (URL sera fournie à l'étape 4)
5. Copiez le **Signing secret** (commence par `whsec_`)

### 3.2 Configurer les secrets dans Supabase

```powershell
# Configurer la clé secrète Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE

# Configurer le secret webhook
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_VOTRE_WEBHOOK_SECRET

# Vérifier les secrets
supabase secrets list
```

**✓ Checkpoint:** Vous devriez voir les 2 secrets configurés

---

## 🚀 ÉTAPE 4 : DÉPLOYER LES EDGE FUNCTIONS

### 4.1 Déployer create-payment-intent

```powershell
cd D:\224Solutions

# Déployer la fonction
supabase functions deploy create-payment-intent

# Vérifier le déploiement
supabase functions list
```

**URL de la fonction:**  
`https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/create-payment-intent`

### 4.2 Déployer stripe-webhook

```powershell
# Déployer la fonction webhook
supabase functions deploy stripe-webhook

# Vérifier
supabase functions list
```

**URL du webhook:**  
`https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook`

### 4.3 Configurer le webhook dans Stripe

1. Allez sur: https://dashboard.stripe.com/test/webhooks
2. Cliquez sur "Add endpoint"
3. URL: `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook`
4. Événements à écouter:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
5. Copiez le **Signing secret**
6. Mettez à jour le secret: `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_NOUVEAU_SECRET`

**✓ Checkpoint:** Webhook configuré et actif dans Stripe Dashboard

---

## ✅ ÉTAPE 5 : VÉRIFICATION FINALE

### 5.1 Tester la configuration

```powershell
# Exécuter le script de test
cd D:\224Solutions
.\test-stripe-connectivity.ps1
```

**Résultat attendu:** 15/15 tests réussis (100%)

### 5.2 Test dans l'application

1. Démarrez l'application:
   ```powershell
   npm run dev
   ```

2. Ouvrez: http://localhost:8080/stripe-diagnostic

3. Vérifiez tous les indicateurs:
   - ✅ Configuration Frontend
   - ✅ Configuration Backend
   - ✅ Tables PostgreSQL
   - ✅ Edge Functions
   - ✅ Secrets Stripe

### 5.3 Test de paiement réel

1. Allez sur: http://localhost:8080/test-stripe-payment

2. Utilisez une carte de test:
   - Numéro: `4242 4242 4242 4242`
   - Date: n'importe quelle date future
   - CVC: n'importe quel 3 chiffres

3. Montant: 1000 (10€ ou équivalent)

4. Cliquez sur "Payer"

5. Vérifiez:
   - ✅ Paiement réussi
   - ✅ Transaction dans Stripe Dashboard
   - ✅ Enregistrement dans `stripe_transactions`
   - ✅ Mise à jour du wallet vendeur

**✓ Checkpoint:** Paiement test réussi

---

## 📊 ÉTAT DU DÉPLOIEMENT

### Checklist complète

- [ ] **Étape 1:** Connexion Supabase établie
- [ ] **Étape 2:** Migration SQL appliquée (5 tables créées)
- [ ] **Étape 3:** Secrets Stripe configurés (2 secrets)
- [ ] **Étape 4:** Edge Functions déployées (2 functions)
- [ ] **Étape 5:** Tests de vérification réussis (15/15)

### État actuel

```
Frontend:  ████████████████████ 100% (13/13)
Backend:   ░░░░░░░░░░░░░░░░░░░░   0% (0/15)
Global:    ██████████░░░░░░░░░░  46% (13/28)
```

---

## 🔧 RÉSOLUTION DE PROBLÈMES

### Problème: "Access token not provided"

**Solution:**
```powershell
supabase login --token sbp_VOTRE_TOKEN
```

### Problème: "Migration failed"

**Solution:**
1. Vérifiez que vous êtes connecté: `supabase projects list`
2. Vérifiez que le projet est lié: `supabase status`
3. Réessayez: `supabase db push --include-all`

### Problème: "Function deployment failed"

**Solution:**
1. Vérifiez les secrets: `supabase secrets list`
2. Vérifiez la syntaxe: `deno check supabase/functions/create-payment-intent/index.ts`
3. Redéployez: `supabase functions deploy create-payment-intent --no-verify-jwt`

### Problème: "Webhook not receiving events"

**Solution:**
1. Vérifiez l'URL dans Stripe Dashboard
2. Vérifiez le secret: `supabase secrets get STRIPE_WEBHOOK_SECRET`
3. Testez manuellement depuis Stripe Dashboard (Send test webhook)

---

## 📞 SUPPORT

### Documentation

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe API](https://stripe.com/docs/api)
- [Edge Functions](https://supabase.com/docs/guides/functions)

### Fichiers importants

- Migration SQL: `supabase/migrations/20260104_stripe_payments.sql`
- Create Payment: `supabase/functions/create-payment-intent/index.ts`
- Webhook: `supabase/functions/stripe-webhook/index.ts`
- Types: `src/types/stripePayment.ts`

### Logs

```powershell
# Logs Edge Functions
supabase functions logs create-payment-intent
supabase functions logs stripe-webhook

# Logs temps réel
supabase functions logs create-payment-intent --follow
```

---

## 🎉 APRÈS LE DÉPLOIEMENT

Une fois tout déployé, vous pourrez:

1. ✅ Accepter des paiements par carte bancaire
2. ✅ Gérer les wallets utilisateurs
3. ✅ Traiter les commissions automatiquement
4. ✅ Gérer les remboursements
5. ✅ Traiter les retraits
6. ✅ Suivre toutes les transactions

### Prochaines étapes

1. Migrer `/payment` vers Stripe
2. Migrer `/payment-core` vers Stripe
3. Intégrer Stripe dans les modals de paiement
4. Tester en mode production avec clés live
5. Activer les webhooks production

---

**🚀 Prêt à commencer ? Suivez l'Étape 1 ci-dessus !**
