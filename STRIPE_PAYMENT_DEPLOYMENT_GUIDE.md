# 🚀 GUIDE DE DÉPLOIEMENT - SYSTÈME DE PAIEMENT STRIPE
## 224SOLUTIONS - Module Complet de Paiement

---

## 📋 TABLE DES MATIÈRES

1. [Prérequis](#prérequis)
2. [Configuration Stripe](#configuration-stripe)
3. [Variables d'Environnement](#variables-denvironnement)
4. [Déploiement Base de Données](#déploiement-base-de-données)
5. [Déploiement Edge Functions](#déploiement-edge-functions)
6. [Configuration Frontend](#configuration-frontend)
7. [Tests](#tests)
8. [Production](#production)
9. [Dépannage](#dépannage)

---

## 🔧 PRÉREQUIS

### Comptes Requis
- ✅ Compte Stripe (https://dashboard.stripe.com)
- ✅ Projet Supabase actif
- ✅ Supabase CLI installé
- ✅ Node.js 18+ et npm/pnpm

### Installations
```powershell
# Installer Supabase CLI
scoop install supabase

# Vérifier l'installation
supabase --version

# Se connecter à Supabase
supabase login
```

---

## 💳 CONFIGURATION STRIPE

### 1. Créer un compte Stripe
1. Allez sur https://dashboard.stripe.com/register
2. Créez votre compte avec vos informations d'entreprise
3. Activez votre compte (KYC requis pour les paiements réels)

### 2. Récupérer les clés API

#### **Mode Test** (pour développement)
```
Dashboard → Developers → API keys
```

Vous aurez besoin de :
- ✅ **Publishable key** (commence par `pk_test_...`)
- ✅ **Secret key** (commence par `sk_test_...`)

#### **Mode Production** (pour production)
```
Dashboard → Developers → API keys → Activer "View live mode"
```

Clés de production :
- ✅ **Publishable key** (commence par `pk_live_...`)
- ✅ **Secret key** (commence par `sk_live_...`)

### 3. Configurer les Webhooks

#### A. Créer un endpoint webhook
```
Dashboard → Developers → Webhooks → Add endpoint
```

**URL du webhook** (à remplacer par votre URL Supabase) :
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook
```

**Événements à écouter** :
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `payment_intent.canceled`
- ✅ `payment_intent.requires_action`
- ✅ `charge.refunded`
- ✅ `charge.dispute.created`

#### B. Récupérer le Webhook Secret
Après création, copiez le **Signing secret** (commence par `whsec_...`)

### 4. Activer 3D Secure (Recommandé)
```
Dashboard → Settings → Payment methods
→ Cocher "Use 3D Secure when required"
```

---

## 🔐 VARIABLES D'ENVIRONNEMENT

### 1. Supabase Secrets (Edge Functions)

```powershell
# Se positionner dans le projet
cd d:\224Solutions

# Lier le projet Supabase
supabase link --project-ref YOUR_PROJECT_ID

# Ajouter les secrets Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_test_XXXXX
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXX

# Vérifier les secrets
supabase secrets list
```

### 2. Variables Frontend (.env.local)

Créez le fichier `.env.local` à la racine :
```env
# Stripe Public Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXX

# Supabase (si pas déjà configuré)
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 3. Configuration Base de Données

La clé publique Stripe sera aussi stockée dans la table `stripe_config` :
```sql
UPDATE stripe_config 
SET stripe_publishable_key = 'pk_test_XXXXX'
WHERE id = 1;
```

---

## 🗄️ DÉPLOIEMENT BASE DE DONNÉES

### 1. Appliquer la migration SQL

#### Option A : Via Supabase Dashboard
```
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans "SQL Editor"
4. Copiez-collez le contenu de : supabase/migrations/20260104_stripe_payments.sql
5. Cliquez sur "Run"
```

#### Option B : Via Supabase CLI
```powershell
# Appliquer toutes les migrations
supabase db push

# Ou appliquer une migration spécifique
supabase db push --include-seed
```

### 2. Vérifier les tables créées

```sql
-- Lister les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'stripe_config',
  'stripe_transactions', 
  'wallets',
  'wallet_transactions',
  'withdrawals'
);

-- Vérifier la configuration par défaut
SELECT * FROM stripe_config LIMIT 1;
```

### 3. Configurer la commission plateforme

```sql
-- Modifier le taux de commission (exemple: 15%)
UPDATE stripe_config 
SET 
  commission_rate = 15.00,
  updated_at = NOW()
WHERE id = 1;
```

### 4. Tester les fonctions PostgreSQL

```sql
-- Test : Créer un wallet
SELECT get_or_create_wallet('USER_UUID_HERE');

-- Test : Vérifier le wallet créé
SELECT * FROM wallets WHERE user_id = 'USER_UUID_HERE';
```

---

## ⚡ DÉPLOIEMENT EDGE FUNCTIONS

### 1. Déployer create-payment-intent

```powershell
# Déployer la fonction
supabase functions deploy create-payment-intent --no-verify-jwt

# Avec vérification JWT (recommandé en production)
supabase functions deploy create-payment-intent
```

### 2. Déployer stripe-webhook

```powershell
# Déployer la fonction
supabase functions deploy stripe-webhook --no-verify-jwt
```

### 3. Vérifier les fonctions déployées

```powershell
# Lister les fonctions
supabase functions list

# Voir les logs en temps réel
supabase functions serve create-payment-intent
supabase functions serve stripe-webhook
```

### 4. Tester les Edge Functions

#### Test create-payment-intent
```powershell
# Via curl (Windows PowerShell)
$headers = @{
  "Authorization" = "Bearer YOUR_SUPABASE_ANON_KEY"
  "Content-Type" = "application/json"
}

$body = @{
  amount = 50000
  currency = "gnf"
  seller_id = "SELLER_UUID"
  order_id = "ORDER_123"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://YOUR_PROJECT_ID.supabase.co/functions/v1/create-payment-intent" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

#### Test stripe-webhook
```powershell
# Via Stripe CLI
stripe listen --forward-to https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook

# Déclencher un événement test
stripe trigger payment_intent.succeeded
```

---

## 🎨 CONFIGURATION FRONTEND

### 1. Installer les dépendances

```powershell
# Stripe React SDK
npm install @stripe/stripe-js @stripe/react-stripe-js

# Ou avec pnpm
pnpm add @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Vérifier les imports

Vérifiez que les fichiers suivants existent :
- ✅ `src/types/stripePayment.ts`
- ✅ `src/components/payment/StripePaymentForm.tsx`
- ✅ `src/components/payment/StripePaymentWrapper.tsx`
- ✅ `src/components/payment/WalletDisplay.tsx`
- ✅ `src/components/payment/WithdrawalForm.tsx`
- ✅ `src/hooks/useStripePayment.ts`
- ✅ `src/hooks/useWallet.ts` (existant)

### 3. Utiliser le système de paiement

#### Exemple : Page de paiement
```tsx
import { StripePaymentWrapper } from '@/components/payment/StripePaymentWrapper';

function CheckoutPage() {
  const handleSuccess = (paymentIntentId: string) => {
    console.log('✅ Paiement réussi:', paymentIntentId);
    // Rediriger vers la page de confirmation
    router.push(`/order/confirmation?payment=${paymentIntentId}`);
  };

  const handleError = (error: string) => {
    console.error('❌ Erreur paiement:', error);
    toast.error(error);
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Paiement</h1>
      
      <StripePaymentWrapper
        amount={50000} // Montant en centimes (500.00 GNF)
        currency="gnf"
        sellerId="SELLER_UUID"
        sellerName="Boutique Example"
        orderId="ORDER_123"
        orderDescription="Commande #123 - 3 articles"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

#### Exemple : Afficher le wallet
```tsx
import { WalletDisplay } from '@/components/payment/WalletDisplay';
import { WithdrawalForm } from '@/components/payment/WithdrawalForm';

function WalletPage() {
  const { user } = useAuth();
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <WalletDisplay
        userId={user.id}
        showActions={true}
        onWithdraw={() => setShowWithdrawal(true)}
      />

      {showWithdrawal && (
        <WithdrawalForm
          userId={user.id}
          onSuccess={(id) => {
            console.log('Retrait demandé:', id);
            setShowWithdrawal(false);
          }}
          onCancel={() => setShowWithdrawal(false)}
        />
      )}
    </div>
  );
}
```

---

## 🧪 TESTS

### 1. Cartes de test Stripe

#### Cartes valides
```
# Visa - Succès
4242 4242 4242 4242
CVC: n'importe quel 3 chiffres
Date: n'importe quelle date future

# Visa - 3D Secure requis
4000 0027 6000 3184

# Visa - Paiement refusé
4000 0000 0000 0002

# Mastercard - Succès
5555 5555 5555 4444
```

Documentation complète : https://stripe.com/docs/testing

### 2. Test du flow complet

#### Scénario 1 : Paiement réussi
```
1. Créer un order dans votre système
2. Appeler StripePaymentWrapper avec les détails
3. Entrer les informations carte test (4242 4242 4242 4242)
4. Valider le paiement
5. Vérifier :
   - ✅ Transaction créée dans stripe_transactions (status: SUCCEEDED)
   - ✅ Wallet vendeur mis à jour (seller_net_amount ajouté)
   - ✅ Wallet plateforme mis à jour (commission ajoutée)
   - ✅ Callback onSuccess() appelé
```

#### Scénario 2 : Paiement avec 3D Secure
```
1. Utiliser la carte 4000 0027 6000 3184
2. Une popup 3D Secure s'affiche
3. Cliquer sur "Complete authentication"
4. Le paiement est finalisé automatiquement
```

#### Scénario 3 : Paiement refusé
```
1. Utiliser la carte 4000 0000 0000 0002
2. Le paiement est rejeté
3. Vérifier :
   - ✅ Transaction status: FAILED
   - ✅ error_message rempli
   - ✅ Callback onError() appelé
```

### 3. Test des webhooks

#### Via Stripe CLI (recommandé)
```powershell
# Lancer l'écoute des webhooks
stripe listen --forward-to https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook

# Dans un autre terminal, déclencher des événements
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

#### Via Stripe Dashboard
```
Dashboard → Developers → Webhooks → [Votre endpoint]
→ Cliquer sur "Send test webhook"
```

### 4. Test des fonctions PostgreSQL

```sql
-- Test : Créer un wallet
SELECT get_or_create_wallet('00000000-0000-0000-0000-000000000001');

-- Test : Créer une transaction test
INSERT INTO stripe_transactions (
  buyer_id, seller_id, amount, currency, 
  commission_rate, commission_amount, seller_net_amount,
  status, payment_intent_id
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- buyer
  '00000000-0000-0000-0000-000000000002', -- seller
  100000, 'gnf', 10.00, 10000, 90000,
  'SUCCEEDED', 'pi_test_123456'
) RETURNING id;

-- Test : Traiter le paiement (mettre à jour les wallets)
SELECT process_successful_payment('TRANSACTION_ID_FROM_ABOVE');

-- Vérifier les wallets
SELECT * FROM wallets WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

-- Vérifier les transactions wallet
SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 10;
```

---

## 🚀 PRODUCTION

### 1. Checklist pré-production

#### Stripe
- [ ] Compte Stripe vérifié (KYC complet)
- [ ] Mode Live activé
- [ ] Clés de production configurées (`pk_live_`, `sk_live_`)
- [ ] Webhook production configuré
- [ ] 3D Secure activé
- [ ] Méthodes de paiement activées (Visa, Mastercard)

#### Supabase
- [ ] Base de données en production
- [ ] Migrations appliquées
- [ ] RLS policies activées
- [ ] Edge Functions déployées avec JWT vérification
- [ ] Secrets production configurés
- [ ] Backups automatiques activés

#### Application
- [ ] Variables d'environnement production (.env.production)
- [ ] Tests end-to-end passés
- [ ] Gestion d'erreurs complète
- [ ] Logs configurés
- [ ] Monitoring configuré

### 2. Variables d'environnement production

```powershell
# Secrets Supabase (production)
supabase secrets set STRIPE_SECRET_KEY=sk_live_XXXXX --project-ref YOUR_PROD_PROJECT
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXX --project-ref YOUR_PROD_PROJECT

# Frontend (.env.production)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX
VITE_SUPABASE_URL=https://YOUR_PROD_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PROD_ANON_KEY
```

### 3. Déploiement production

```powershell
# 1. Build frontend
npm run build

# 2. Déployer Edge Functions (avec JWT)
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook

# 3. Vérifier les fonctions
supabase functions list --project-ref YOUR_PROD_PROJECT
```

### 4. Monitoring

#### Stripe Dashboard
```
Dashboard → Developers → Logs
- Surveiller les paiements en temps réel
- Vérifier les webhooks reçus
- Détecter les erreurs
```

#### Supabase Logs
```powershell
# Voir les logs Edge Functions
supabase functions logs create-payment-intent --project-ref YOUR_PROD_PROJECT
supabase functions logs stripe-webhook --project-ref YOUR_PROD_PROJECT
```

#### Requêtes SQL de monitoring
```sql
-- Statistiques des paiements (dernières 24h)
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  SUM(commission_amount) as total_commission
FROM stripe_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Wallets avec solde élevé
SELECT 
  user_id,
  available_balance,
  pending_balance,
  frozen_balance
FROM wallets
WHERE available_balance > 1000000
ORDER BY available_balance DESC
LIMIT 10;

-- Demandes de retrait en attente
SELECT 
  id,
  wallet_id,
  amount,
  method,
  created_at
FROM withdrawals
WHERE status = 'PENDING'
ORDER BY created_at ASC;
```

---

## 🔧 DÉPANNAGE

### Problème 1 : "Stripe publishable key not configured"

**Solution :**
```powershell
# Vérifier .env.local
cat .env.local

# Ou configurer dans la base de données
# Supabase Dashboard → SQL Editor
UPDATE stripe_config 
SET stripe_publishable_key = 'pk_test_XXXXX'
WHERE id = 1;
```

### Problème 2 : "Failed to create payment intent"

**Causes possibles :**
- ✅ Secret key non configurée
- ✅ Vendeur n'existe pas ou n'a pas le role='VENDOR'
- ✅ Montant invalide

**Vérification :**
```sql
-- Vérifier le vendeur
SELECT id, email, role FROM auth.users WHERE id = 'SELLER_UUID';

-- Vérifier les secrets
# supabase secrets list
```

### Problème 3 : "Webhook signature verification failed"

**Solution :**
```powershell
# Re-configurer le webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXX

# Redéployer la fonction
supabase functions deploy stripe-webhook
```

### Problème 4 : Wallet non mis à jour après paiement

**Vérification :**
```sql
-- Vérifier la transaction
SELECT * FROM stripe_transactions WHERE payment_intent_id = 'pi_xxxxx';

-- Tester manuellement le traitement
SELECT process_successful_payment('TRANSACTION_ID');

-- Vérifier les logs webhook
# supabase functions logs stripe-webhook
```

### Problème 5 : "Insufficient balance" lors du retrait

**Vérification :**
```sql
-- Vérifier le wallet
SELECT * FROM wallets WHERE user_id = 'USER_UUID';

-- Vérifier les montants gelés
SELECT 
  SUM(amount) as total_frozen
FROM wallet_transactions
WHERE wallet_id = 'WALLET_UUID' 
AND type = 'FREEZE'
AND created_at > NOW() - INTERVAL '7 days';
```

---

## 📚 RESSOURCES COMPLÉMENTAIRES

### Documentation Stripe
- API Reference: https://stripe.com/docs/api
- Testing Guide: https://stripe.com/docs/testing
- Webhooks: https://stripe.com/docs/webhooks
- 3D Secure: https://stripe.com/docs/payments/3d-secure

### Documentation Supabase
- Edge Functions: https://supabase.com/docs/guides/functions
- Database Functions: https://supabase.com/docs/guides/database/functions
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security

### Support
- Stripe Support: https://support.stripe.com
- Supabase Discord: https://discord.supabase.com
- 224SOLUTIONS: [Votre support interne]

---

## ✅ CHECKLIST FINALE

### Configuration
- [ ] Compte Stripe créé et vérifié
- [ ] Clés API récupérées (test + production)
- [ ] Webhooks configurés (test + production)
- [ ] Variables d'environnement configurées
- [ ] Secrets Supabase configurés

### Base de Données
- [ ] Migration appliquée
- [ ] Tables créées (5 tables)
- [ ] Fonctions PostgreSQL testées
- [ ] RLS policies actives
- [ ] Configuration stripe_config remplie

### Edge Functions
- [ ] create-payment-intent déployée
- [ ] stripe-webhook déployée
- [ ] Fonctions testées avec curl/Postman
- [ ] Logs vérifiés

### Frontend
- [ ] Dépendances installées (@stripe/react-stripe-js)
- [ ] Composants importés correctement
- [ ] Tests manuels réussis
- [ ] Flow complet testé (paiement + wallet + retrait)

### Tests
- [ ] Paiement avec carte test réussi
- [ ] 3D Secure testé
- [ ] Paiement refusé géré correctement
- [ ] Webhooks reçus et traités
- [ ] Wallets mis à jour correctement

### Production
- [ ] Mode Live Stripe activé
- [ ] Clés production configurées
- [ ] Webhooks production configurés
- [ ] Build production testé
- [ ] Monitoring configuré

---

## 🎉 FÉLICITATIONS !

Votre système de paiement Stripe est maintenant opérationnel ! 🚀

Pour toute question ou problème, consultez la section [Dépannage](#dépannage) ou contactez le support.

**Prochaines étapes recommandées :**
1. Configurer les notifications email (confirmation de paiement, retrait)
2. Ajouter des analytics (tracking des conversions)
3. Implémenter les abonnements récurrents
4. Ajouter d'autres méthodes de paiement (Apple Pay, Google Pay)
5. Configurer des rapports financiers automatiques

---

*Document créé le : 2025-01-04*  
*Version : 1.0*  
*224SOLUTIONS - Système de Paiement Stripe*
