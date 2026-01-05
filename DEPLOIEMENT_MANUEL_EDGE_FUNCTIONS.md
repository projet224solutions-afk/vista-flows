# 🚀 GUIDE DE DÉPLOIEMENT MANUEL DES EDGE FUNCTIONS STRIPE

**Projet Supabase**: `uakkxaibujzxdiqzpnpr`  
**Date**: 2026-01-04

---

## ⚠️ POURQUOI CE GUIDE ?

La commande `supabase functions deploy` nécessite une authentification qui ne fonctionne pas en PowerShell automatisé. 

**Solution**: Déployer manuellement via le Dashboard Supabase (5 minutes).

---

## 📋 ÉTAPES DE DÉPLOIEMENT

### FONCTION 1: create-payment-intent

#### 1. Accéder au Dashboard
Ouvrir: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/functions

#### 2. Créer la fonction
- Cliquer sur **"Create a new function"** (ou **"+ New Edge Function"**)
- **Name**: `create-payment-intent`
- **Runtime**: Deno (par défaut)

#### 3. Copier le code
Ouvrir le fichier: `d:\224Solutions\supabase\functions\create-payment-intent\index.ts`

**Ou copier directement ci-dessous** ⬇️

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.4.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const { amount, currency = 'gnf', seller_id, order_id, service_id, product_id, metadata } = await req.json()

    // Validation
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount')
    }
    if (!seller_id) {
      throw new Error('seller_id is required')
    }

    // Récupérer la config de commission depuis Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const configResponse = await fetch(`${supabaseUrl}/rest/v1/stripe_config?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    })

    const configs = await configResponse.json()
    const config = configs[0] || { platform_commission_rate: 2.5 }

    // Calculer la commission
    const commissionRate = config.platform_commission_rate
    const commissionAmount = Math.round((amount * commissionRate) / 100)
    const sellerNetAmount = amount - commissionAmount

    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        seller_id,
        order_id: order_id || '',
        service_id: service_id || '',
        product_id: product_id || '',
        commission_rate: commissionRate.toString(),
        commission_amount: commissionAmount.toString(),
        seller_net_amount: sellerNetAmount.toString(),
        ...metadata,
      },
    })

    // Récupérer le buyer_id depuis l'authentification
    const authHeader = req.headers.get('Authorization')
    let buyer_id = 'anonymous'
    
    if (authHeader) {
      try {
        const jwt = authHeader.replace('Bearer ', '')
        const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${jwt}`,
          },
        })
        const user = await tokenResponse.json()
        if (user.id) {
          buyer_id = user.id
        }
      } catch (err) {
        console.error('Error getting user:', err)
      }
    }

    // Enregistrer la transaction dans Supabase
    const { data: transaction, error: transactionError } = await fetch(
      `${supabaseUrl}/rest/v1/stripe_transactions`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          stripe_payment_intent_id: paymentIntent.id,
          buyer_id: buyer_id,
          seller_id: seller_id,
          amount: amount,
          currency: currency,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          seller_net_amount: sellerNetAmount,
          status: 'PENDING',
          order_id: order_id || null,
          service_id: service_id || null,
          product_id: product_id || null,
          metadata: metadata || {},
        }),
      }
    ).then(res => res.json())

    if (transactionError) {
      console.error('❌ Error creating transaction:', transactionError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        transaction_id: transaction?.id,
        amount: amount,
        currency: currency,
        commission_amount: commissionAmount,
        seller_net_amount: sellerNetAmount,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

#### 4. Déployer
- Cliquer sur **"Deploy"** ou **"Save"**
- Attendre la confirmation de déploiement

---

### FONCTION 2: stripe-webhook

#### 1. Créer la fonction
- Cliquer sur **"+ New Edge Function"**
- **Name**: `stripe-webhook`

#### 2. Copier le code
Ouvrir le fichier: `d:\224Solutions\supabase\functions\stripe-webhook\index.ts`

**Ou copier directement ci-dessous** ⬇️

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.4.0?target=deno'

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const signature = req.headers.get('stripe-signature')
    const body = await req.text()

    if (!signature) {
      throw new Error('No signature')
    }

    // Vérifier la signature du webhook
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured')
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Gérer les différents types d'événements
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Mettre à jour la transaction
        await fetch(
          `${supabaseUrl}/rest/v1/stripe_transactions?stripe_payment_intent_id=eq.${paymentIntent.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'SUCCEEDED',
              stripe_charge_id: paymentIntent.latest_charge,
              paid_at: new Date().toISOString(),
            }),
          }
        )

        // Récupérer la transaction pour mettre à jour le wallet
        const transactionResponse = await fetch(
          `${supabaseUrl}/rest/v1/stripe_transactions?stripe_payment_intent_id=eq.${paymentIntent.id}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        )

        const transactions = await transactionResponse.json()
        const transaction = transactions[0]

        if (transaction) {
          // Mettre à jour le wallet du vendeur
          await fetch(`${supabaseUrl}/rest/v1/rpc/update_stripe_wallet`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              p_user_id: transaction.seller_id,
              p_amount: transaction.seller_net_amount,
            }),
          })
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        await fetch(
          `${supabaseUrl}/rest/v1/stripe_transactions?stripe_payment_intent_id=eq.${paymentIntent.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'FAILED',
              error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
            }),
          }
        )
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge

        await fetch(
          `${supabaseUrl}/rest/v1/stripe_transactions?stripe_charge_id=eq.${charge.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: 'REFUNDED',
              refunded_at: new Date().toISOString(),
            }),
          }
        )
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 3. Déployer
- Cliquer sur **"Deploy"**

---

## 🔐 CONFIGURER LES SECRETS

### Étape 1: Obtenir les clés Stripe

1. **Secret Key**:
   - Ouvrir: https://dashboard.stripe.com/test/apikeys
   - Copier la clé qui commence par `sk_test_...`

2. **Webhook Secret**:
   - Ouvrir: https://dashboard.stripe.com/test/webhooks
   - Cliquer **"Add endpoint"**
   - **Endpoint URL**: `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook`
   - **Events to send**: 
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - Cliquer **"Add endpoint"**
   - Copier le **Signing secret** qui commence par `whsec_...`

### Étape 2: Ajouter les secrets dans Supabase

1. Ouvrir: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/settings/functions

2. Cliquer sur **"Manage secrets"** ou l'onglet **"Secrets"**

3. Ajouter les 2 secrets:
   - **Nom**: `STRIPE_SECRET_KEY`  
     **Valeur**: `sk_test_...` (votre clé secrète)
   
   - **Nom**: `STRIPE_WEBHOOK_SECRET`  
     **Valeur**: `whsec_...` (votre signing secret)

4. Cliquer **"Save"**

---

## 💾 INITIALISER LA CONFIGURATION

### SQL à exécuter dans le SQL Editor

1. Ouvrir: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr/sql/new

2. Coller et exécuter:

```sql
-- Insérer la configuration Stripe par défaut
INSERT INTO stripe_config (
  id,
  platform_commission_rate,
  stripe_publishable_key,
  default_currency,
  supported_currencies,
  require_3d_secure,
  enable_subscriptions
) VALUES (
  gen_random_uuid(),
  2.5,  -- 2.5% de commission
  'pk_test_51QbIb3HqwVwCW2XF8l3RuOiILSO7w7Jx4Zxz3RuOiIL...',  -- REMPLACER PAR VOTRE CLÉ PUBLIQUE
  'GNF',
  ARRAY['GNF', 'USD', 'EUR'],
  true,
  false
)
ON CONFLICT DO NOTHING;
```

**⚠️ IMPORTANT**: Remplacer `pk_test_...` par votre vraie clé publique Stripe !

---

## ✅ VÉRIFICATION

### Tester que tout fonctionne:

1. **Démarrer le serveur**:
   ```powershell
   cd d:\224Solutions
   npm run dev
   ```

2. **Ouvrir la page de test**:
   http://localhost:8080/test-stripe-payment

3. **Tester avec la carte de test Stripe**:
   - Numéro: `4242 4242 4242 4242`
   - Date: `12/34`
   - CVC: `123`
   - Montant: `50 000 GNF`

4. **Vérifications attendues**:
   - ✅ PaymentIntent créé
   - ✅ Transaction enregistrée dans `stripe_transactions`
   - ✅ Wallet créé/mis à jour dans `stripe_wallets`
   - ✅ Commission calculée (2.5%)
   - ✅ Message de succès

---

## 📊 VÉRIFIER LES DONNÉES

### Dans le Table Editor de Supabase:

1. **Table `stripe_transactions`**:
   - Devrait contenir la transaction avec status = 'SUCCEEDED'
   - `commission_amount` = 2.5% du montant
   - `seller_net_amount` = montant - commission

2. **Table `stripe_wallets`**:
   - Wallet créé pour le vendeur
   - `available_balance` = `seller_net_amount`
   - `total_earned` incrémenté

3. **Table `stripe_wallet_transactions`**:
   - Transaction de crédit enregistrée
   - Type = 'PAYMENT'

---

## 🐛 TROUBLESHOOTING

### Erreur "STRIPE_SECRET_KEY not configured"
- Les secrets ne sont pas configurés dans Supabase
- Suivre la section "Configurer les secrets" ci-dessus

### Erreur "Invalid API Key"
- La clé secrète Stripe est incorrecte
- Vérifier dans: https://dashboard.stripe.com/test/apikeys

### Paiement bloqué en "PENDING"
- Le webhook n'a pas été reçu
- Vérifier que l'endpoint webhook est configuré dans Stripe
- Vérifier les logs de la fonction `stripe-webhook`

### Transaction non enregistrée en base
- Vérifier les permissions RLS sur `stripe_transactions`
- Vérifier les logs de `create-payment-intent`

---

## 📝 RÉCAPITULATIF

### ✅ Checklist complète:

- [ ] Fonction `create-payment-intent` déployée
- [ ] Fonction `stripe-webhook` déployée
- [ ] Secret `STRIPE_SECRET_KEY` configuré
- [ ] Secret `STRIPE_WEBHOOK_SECRET` configuré
- [ ] Webhook endpoint créé dans Stripe Dashboard
- [ ] Configuration initialisée dans `stripe_config`
- [ ] Test de paiement réussi
- [ ] Transaction visible dans `stripe_transactions`
- [ ] Wallet mis à jour dans `stripe_wallets`

---

**Temps estimé**: 10-15 minutes  
**Difficulté**: Facile (copier-coller)

Bonne chance ! 🚀
