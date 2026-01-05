# 🔧 GUIDE CONFIGURATION WEBHOOK STRIPE - 224SOLUTIONS

**Objectif:** Configurer le webhook Stripe pour créditer automatiquement les wallets vendeurs après paiement réussi.

---

## 📝 ÉTAPES DE CONFIGURATION

### Étape 1: Créer le Webhook dans Stripe Dashboard

1. **Aller sur Stripe Dashboard**
   - URL: https://dashboard.stripe.com/webhooks
   - Se connecter avec compte Stripe 224Solutions

2. **Cliquer sur "Add endpoint"**

3. **Configurer l'endpoint:**
   ```
   Endpoint URL: https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook
   ```

4. **Sélectionner les événements à recevoir:**
   - ✅ `payment_intent.succeeded` (CRITIQUE - crédit wallet)
   - ✅ `payment_intent.payment_failed` (gestion échecs)
   - ✅ `payment_intent.canceled` (annulations)
   - ✅ `payment_intent.requires_action` (3D Secure)
   - ✅ `charge.refunded` (remboursements)
   - ✅ `charge.dispute.created` (litiges)

5. **Cliquer "Add endpoint"**

6. **Copier le Signing Secret**
   - Format: `whsec_xxxxxxxxxxxxx`
   - ⚠️ **NE JAMAIS partager publiquement**

---

### Étape 2: Configurer le Secret dans Supabase

1. **Aller sur Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/uakkxaibujzxdiqzpnpr

2. **Navigation:**
   ```
   Project Settings > Edge Functions > Secrets
   ```

3. **Ajouter le secret:**
   ```
   Nom: STRIPE_WEBHOOK_SECRET
   Valeur: whsec_votre_secret_copié_depuis_stripe
   ```

4. **Cliquer "Save"**

5. **Redéployer les Edge Functions** (important!)
   ```bash
   supabase functions deploy stripe-webhook
   ```

---

### Étape 3: Tester le Webhook

#### Option A: Test via Stripe CLI (recommandé)

1. **Installer Stripe CLI**
   ```bash
   # Windows (Chocolatey)
   choco install stripe-cli
   
   # Mac (Homebrew)
   brew install stripe/stripe-cli/stripe
   ```

2. **Login Stripe CLI**
   ```bash
   stripe login
   ```

3. **Écouter les webhooks**
   ```bash
   stripe listen --forward-to https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook
   ```

4. **Déclencher un événement test**
   ```bash
   stripe trigger payment_intent.succeeded
   ```

5. **Vérifier les logs Supabase**
   - Aller sur: Supabase Dashboard > Edge Functions > Logs
   - Chercher: "Payment processed successfully"

#### Option B: Test via Dashboard Stripe

1. **Aller sur:**
   ```
   https://dashboard.stripe.com/webhooks
   ```

2. **Cliquer sur votre webhook**

3. **Onglet "Send test webhook"**

4. **Sélectionner:** `payment_intent.succeeded`

5. **Cliquer "Send test webhook"**

6. **Vérifier response:** HTTP 200 = ✅ Success

---

### Étape 4: Vérifier que ça Fonctionne

#### Test complet end-to-end:

1. **Faire un paiement test:**
   - Aller sur: http://localhost:8080/demos/custom-payment
   - Montant: 50000 GNF
   - Carte test: 4242 4242 4242 4242
   - Expiration: 12/34
   - CVC: 123

2. **Vérifier transaction dans DB:**
   ```sql
   SELECT * FROM stripe_transactions 
   WHERE buyer_id = 'your_user_id' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   - Status doit passer de `PENDING` → `SUCCEEDED`

3. **Vérifier wallet vendeur:**
   ```sql
   SELECT * FROM wallets 
   WHERE user_id = 'seller_id';
   
   -- Vérifier transaction wallet
   SELECT * FROM wallet_transactions 
   WHERE wallet_id = 'wallet_id' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   - `available_balance` doit avoir augmenté
   - `total_earned` doit avoir augmenté
   - `wallet_transactions` doit avoir nouvelle ligne type='PAYMENT'

4. **Vérifier wallet plateforme (PDG):**
   ```sql
   SELECT * FROM wallets 
   WHERE user_id IN (SELECT id FROM profiles WHERE role = 'CEO');
   
   -- Vérifier commission
   SELECT * FROM wallet_transactions 
   WHERE type = 'COMMISSION' 
   ORDER BY created_at DESC LIMIT 1;
   ```

---

## 🚨 SOLUTION TEMPORAIRE (Si webhook pas configuré)

En attendant la configuration du webhook, utiliser la fonction de crédit manuel:

### Crédit Manuel via Edge Function

```bash
# 1. Récupérer Payment Intent ID depuis Stripe Dashboard ou logs
PAYMENT_INTENT_ID="pi_xxxxxxxxxxxx"

# 2. Appeler fonction de crédit manuel
curl -X POST https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/manual-credit-seller \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"payment_intent_id\": \"$PAYMENT_INTENT_ID\"
  }"
```

### Crédit Manuel via Interface Admin

1. **Créer bouton dans interface PDG:**
   ```tsx
   const creditManually = async (paymentIntentId: string) => {
     const { data, error } = await supabase.functions.invoke('manual-credit-seller', {
       body: { payment_intent_id: paymentIntentId }
     });
     
     if (error) {
       toast.error('Erreur crédit wallet');
     } else {
       toast.success('Wallet crédité avec succès!');
     }
   };
   ```

2. **Ajouter dans page transactions:**
   - Afficher bouton "Créditer manuellement" si status = PENDING
   - Vérifier statut Stripe
   - Créditer wallet si succeeded

---

## 📊 MONITORING

### Logs à surveiller:

**Supabase Edge Functions Logs:**
```
✅ Webhook signature verified: payment_intent.succeeded
✅ Payment succeeded: pi_xxxxx
✅ Transaction found: xxx-xxx-xxx
✅ Payment processed successfully, wallets updated
```

**Erreurs possibles:**
```
❌ Webhook signature verification failed → Secret incorrect
❌ Transaction not found → DB sync issue
❌ Error processing payment → Bug fonction process_successful_payment
```

### Dashboard Webhook Stripe:

- **Succès:** Code HTTP 200
- **Échec:** Code HTTP 400/500
- **Retry:** Stripe réessaie automatiquement pendant 72h

---

## 🎯 CHECKLIST FINALE

Avant de dire "C'est configuré":

- [ ] Webhook endpoint créé sur Stripe Dashboard
- [ ] URL correcte: `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook`
- [ ] 6 événements sélectionnés
- [ ] Signing secret copié
- [ ] Secret ajouté dans Supabase (`STRIPE_WEBHOOK_SECRET`)
- [ ] Edge Function redéployée
- [ ] Test webhook envoyé depuis Stripe Dashboard
- [ ] Response HTTP 200 reçue
- [ ] Logs Supabase montrent "Payment processed successfully"
- [ ] Transaction test status = SUCCEEDED
- [ ] Wallet vendeur crédité (+montant net)
- [ ] Wallet plateforme crédité (+commission)
- [ ] wallet_transactions créées (2 lignes: PAYMENT + COMMISSION)

---

## 🛟 SUPPORT

**Si webhook ne fonctionne pas:**

1. **Vérifier signing secret:**
   ```bash
   # Dans Supabase Dashboard > Edge Functions > Secrets
   # Doit commencer par: whsec_
   ```

2. **Vérifier endpoint URL:**
   ```
   ✅ Correct: https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook
   ❌ Incorrect: http://... (pas HTTPS)
   ❌ Incorrect: /v1/functions/... (ordre inversé)
   ```

3. **Vérifier logs Edge Function:**
   ```
   Supabase Dashboard > Edge Functions > stripe-webhook > Logs
   ```

4. **Vérifier retry Stripe:**
   ```
   Stripe Dashboard > Webhooks > [Votre webhook] > Events
   ```

5. **Tester avec Stripe CLI:**
   ```bash
   stripe listen --forward-to https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook
   stripe trigger payment_intent.succeeded
   ```

**Besoin d'aide?**
- Stripe Support: https://support.stripe.com
- Supabase Support: https://supabase.com/support
- Documentation: https://stripe.com/docs/webhooks

---

**Guide créé le 5 janvier 2026**  
**Dernière mise à jour: 5 janvier 2026**
