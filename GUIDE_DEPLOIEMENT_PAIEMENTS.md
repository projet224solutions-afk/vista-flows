# 🚀 GUIDE DÉPLOIEMENT & TESTS - SYSTÈME PAIEMENT COMPLET

## 📦 Déploiement des Edge Functions

### 1. Déployer delivery-payment

```powershell
# Déployer l'edge function
supabase functions deploy delivery-payment --project-ref uakkxaibujzxdiqzpnpr

# Vérifier le déploiement
supabase functions list --project-ref uakkxaibujzxdiqzpnpr

# Tester la fonction
supabase functions invoke delivery-payment --project-ref uakkxaibujzxdiqzpnpr --body '{
  "delivery_id": "test-123",
  "customer_id": "uuid-customer",
  "driver_id": "uuid-driver",
  "amount": 5000,
  "payment_method": "wallet"
}'
```

### 2. Déployer freight-payment

```powershell
# Déployer l'edge function
supabase functions deploy freight-payment --project-ref uakkxaibujzxdiqzpnpr

# Vérifier le déploiement
supabase functions list --project-ref uakkxaibujzxdiqzpnpr

# Tester la fonction
supabase functions invoke freight-payment --project-ref uakkxaibujzxdiqzpnpr --body '{
  "freight_order_id": "test-456",
  "client_id": "uuid-client",
  "freight_agent_id": "uuid-agent",
  "amount": 500000,
  "payment_method": "wallet"
}'
```

### 3. Vérifier tous les edge functions

```powershell
supabase functions list --project-ref uakkxaibujzxdiqzpnpr
```

**Résultat attendu :**
```
✅ stripe-webhook (actif)
✅ wallet-operations (actif)
✅ djomy-init-payment (actif)
✅ delivery-payment (actif) ← NOUVEAU
✅ freight-payment (actif) ← NOUVEAU
```

---

## 🔧 Configuration Stripe Webhook

### 1. Accéder au Dashboard Stripe

1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Mode TEST activé
3. Cliquer "Add endpoint"

### 2. Configurer l'endpoint

**URL du webhook :**
```
https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/stripe-webhook
```

**Événements à écouter :**
- [x] `payment_intent.succeeded`
- [x] `payment_intent.payment_failed`
- [x] `payment_intent.canceled`
- [x] `charge.refunded`

### 3. Récupérer le Signing Secret

Après création, copier le **Signing Secret** (commence par `whsec_...`)

### 4. Ajouter le secret dans Supabase

```powershell
# Ajouter le webhook signing secret
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..." --project-ref uakkxaibujzxdiqzpnpr

# Vérifier que tous les secrets Stripe sont configurés
supabase secrets list --project-ref uakkxaibujzxdiqzpnpr
```

**Secrets requis :**
```
✅ STRIPE_SECRET_KEY
✅ STRIPE_PUBLISHABLE_KEY
✅ STRIPE_WEBHOOK_SECRET
```

### 5. Tester le webhook

Dans Stripe Dashboard → Webhooks → Votre endpoint → "Send test webhook"

**Test recommandé :** `payment_intent.succeeded`

---

## 🧪 Tests Complets par Service

### TEST 1 : Marketplace (Achat Produit)

#### Scénario complet
```
1. Client ajoute produit au panier
2. Client procède au checkout
3. Client paie (wallet/carte)
4. ✅ Escrow créé (1.5% commission)
5. Vendeur prépare commande
6. Vendeur expédie
7. Client reçoit
8. Client confirme réception
9. ✅ Escrow libéré → Wallet vendeur crédité (montant - 1.5%)
10. ✅ Commission 1.5% → Wallet plateforme
```

#### Commandes SQL pour tester

```sql
-- 1. Vérifier l'escrow créé
SELECT * FROM escrow_transactions
WHERE order_id = 'ORD-XXX'
  AND transaction_type = 'product'
  AND status = 'held';

-- 2. Confirmer la livraison (release escrow)
SELECT confirm_delivery_and_release_escrow(
  p_escrow_id := 'uuid-escrow',
  p_customer_id := 'uuid-customer',
  p_notes := 'Produit conforme, merci !'
);

-- 3. Vérifier que le vendeur a été crédité
SELECT * FROM wallet_transactions
WHERE receiver_wallet_id = (
  SELECT id FROM wallets WHERE user_id = 'uuid-vendeur'
)
ORDER BY created_at DESC
LIMIT 1;

-- 4. Vérifier la commission plateforme
SELECT * FROM commissions
WHERE order_id = 'ORD-XXX'
  AND service_name = 'marketplace';
```

---

### TEST 2 : Taxi-Moto (Course)

#### Scénario complet
```
1. Client réserve course
2. Client paie (wallet/orange money/cash)
3. ✅ Escrow créé (2.5% commission)
4. Conducteur accepte
5. Conducteur effectue course
6. Course terminée
7. ✅ Auto-release après 24h OU confirmation client
8. ✅ Wallet conducteur crédité (montant - 2.5%)
9. ✅ Commission 2.5% → Wallet plateforme
```

#### Commandes SQL pour tester

```sql
-- 1. Vérifier l'escrow créé
SELECT * FROM escrow_transactions
WHERE order_id = 'RIDE-XXX'
  AND transaction_type = 'taxi'
  AND status = 'held';

-- 2. Simuler auto-release (24h passées)
UPDATE escrow_transactions
SET created_at = NOW() - INTERVAL '25 hours'
WHERE order_id = 'RIDE-XXX';

-- 3. Exécuter le job d'auto-release
SELECT auto_release_expired_escrows();

-- 4. Vérifier que le conducteur a été crédité
SELECT * FROM wallet_transactions
WHERE receiver_wallet_id = (
  SELECT id FROM wallets WHERE user_id = 'uuid-conducteur'
)
ORDER BY created_at DESC
LIMIT 1;
```

---

### TEST 3 : Livraison (Livreur)

#### Scénario complet
```
1. Client demande livraison
2. Client paie (wallet/cash)
3. ✅ Escrow créé (3% commission)
4. Livreur accepte
5. Livreur récupère colis
6. Livreur livre (photo proof)
7. Client confirme OU auto-release après 24h
8. ✅ Wallet livreur crédité (montant - 3%)
9. ✅ Commission 3% → Wallet plateforme
```

#### Commandes SQL pour tester

```sql
-- 1. Vérifier l'escrow créé
SELECT * FROM escrow_transactions
WHERE order_id = 'uuid-delivery'
  AND transaction_type = 'delivery'
  AND status = 'held';

-- 2. Confirmer la livraison
SELECT confirm_delivery_and_release_escrow(
  p_escrow_id := 'uuid-escrow',
  p_customer_id := 'uuid-customer',
  p_notes := 'Colis bien reçu'
);

-- 3. Vérifier le wallet livreur
SELECT * FROM wallets
WHERE user_id = 'uuid-livreur';

-- 4. Vérifier la transaction
SELECT * FROM wallet_transactions
WHERE metadata->>'delivery_id' = 'uuid-delivery'
ORDER BY created_at DESC;
```

---

### TEST 4 : Transitaire (Import/Export)

#### Scénario complet
```
1. Client demande service transitaire
2. Client paie (wallet/carte/virement)
3. ✅ Escrow créé (2% commission, 30 jours)
4. Transitaire gère formalités
5. Marchandise arrive
6. Dédouanement effectué
7. Client confirme réception
8. ✅ Wallet transitaire crédité (montant - 2%)
9. ✅ Commission 2% → Wallet plateforme
```

#### Commandes SQL pour tester

```sql
-- 1. Vérifier l'escrow créé (30 jours)
SELECT * FROM escrow_transactions
WHERE order_id = 'uuid-freight-order'
  AND transaction_type = 'freight'
  AND status = 'held';

-- 2. Vérifier le délai d'auto-release
SELECT 
  id,
  created_at,
  created_at + INTERVAL '30 days' AS auto_release_date,
  EXTRACT(DAY FROM (created_at + INTERVAL '30 days') - NOW()) AS days_remaining
FROM escrow_transactions
WHERE order_id = 'uuid-freight-order';

-- 3. Confirmer réception marchandise
SELECT confirm_delivery_and_release_escrow(
  p_escrow_id := 'uuid-escrow',
  p_customer_id := 'uuid-client',
  p_notes := 'Marchandise bien dédouanée et reçue'
);

-- 4. Vérifier wallet transitaire
SELECT * FROM wallets
WHERE user_id = 'uuid-transitaire';
```

---

### TEST 5 : Wallet (Dépôt & Transfert)

#### A. Dépôt Stripe

```typescript
// Test depuis le frontend
const { data } = await supabase.functions.invoke('stripe-deposit', {
  body: {
    amount: 50000, // 50,000 GNF
    currency: 'GNF',
    user_id: 'uuid-user',
    payment_method_id: 'pm_xxx' // ID Stripe
  }
});
```

```sql
-- Vérifier le dépôt
SELECT * FROM wallet_transactions
WHERE user_id = 'uuid-user'
  AND transaction_type = 'deposit'
ORDER BY created_at DESC
LIMIT 1;

-- Vérifier le solde wallet
SELECT balance FROM wallets
WHERE user_id = 'uuid-user';
```

#### B. Transfert entre wallets (>= 10,000 GNF)

```typescript
// Transfert avec escrow (libération immédiate)
const escrowResult = await UniversalEscrowService.createEscrow({
  buyer_id: senderId,
  seller_id: receiverId,
  amount: 15000,
  currency: 'GNF',
  transaction_type: 'wallet_transfer',
  payment_provider: 'wallet',
  escrow_options: {
    auto_release_days: 0, // Libération immédiate
    commission_percent: 0 // Pas de commission
  }
});
```

```sql
-- Vérifier le transfert
SELECT * FROM escrow_transactions
WHERE transaction_type = 'wallet_transfer'
  AND buyer_id = 'uuid-sender'
  AND seller_id = 'uuid-receiver';

-- Vérifier les wallets
SELECT user_id, balance FROM wallets
WHERE user_id IN ('uuid-sender', 'uuid-receiver');
```

---

## 📊 Monitoring & Vérifications

### Dashboard Commissions PDG

```sql
-- Total des commissions par service (dernier mois)
SELECT 
  service_name,
  COUNT(*) AS nb_transactions,
  SUM(commission_amount) AS total_commissions,
  AVG(commission_amount) AS avg_commission
FROM commissions
WHERE created_at >= NOW() - INTERVAL '1 month'
GROUP BY service_name
ORDER BY total_commissions DESC;
```

**Résultat attendu :**
```
service_name    | nb_transactions | total_commissions | avg_commission
----------------|-----------------|-------------------|---------------
marketplace     | 1250            | 1,875,000 GNF     | 1,500 GNF
taxi            | 890             | 1,112,500 GNF     | 1,250 GNF
delivery        | 450             | 135,000 GNF       | 300 GNF
freight         | 12              | 600,000 GNF       | 50,000 GNF
```

### Vérifier les escrows en attente

```sql
-- Tous les escrows non libérés
SELECT 
  id,
  transaction_type,
  amount,
  commission_percent,
  status,
  created_at,
  created_at + (auto_release_days || ' days')::INTERVAL AS auto_release_date
FROM escrow_transactions
WHERE status = 'held'
ORDER BY created_at DESC;
```

### Vérifier les paiements Stripe orphelins

```sql
-- Paiements Stripe sans commande
SELECT 
  st.stripe_payment_intent_id,
  st.amount,
  st.seller_id,
  st.status,
  st.paid_at
FROM stripe_transactions st
LEFT JOIN orders o ON o.metadata->>'stripe_payment_intent_id' = st.stripe_payment_intent_id
WHERE o.id IS NULL
  AND st.status = 'PENDING'
ORDER BY st.paid_at DESC;
```

---

## 🛠️ Scripts PowerShell pour Déploiement

### deploy-all-payment-functions.ps1

```powershell
# Déployer toutes les edge functions de paiement

Write-Host "🚀 Déploiement des edge functions paiement..." -ForegroundColor Cyan

# 1. Delivery Payment
Write-Host "`n📦 Déploiement delivery-payment..." -ForegroundColor Yellow
supabase functions deploy delivery-payment --project-ref uakkxaibujzxdiqzpnpr
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ delivery-payment déployé" -ForegroundColor Green
} else {
    Write-Host "❌ Échec delivery-payment" -ForegroundColor Red
    exit 1
}

# 2. Freight Payment
Write-Host "`n📦 Déploiement freight-payment..." -ForegroundColor Yellow
supabase functions deploy freight-payment --project-ref uakkxaibujzxdiqzpnpr
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ freight-payment déployé" -ForegroundColor Green
} else {
    Write-Host "❌ Échec freight-payment" -ForegroundColor Red
    exit 1
}

# 3. Vérifier tous les edge functions
Write-Host "`n📋 Liste de toutes les edge functions:" -ForegroundColor Cyan
supabase functions list --project-ref uakkxaibujzxdiqzpnpr

Write-Host "`n✨ Déploiement terminé!" -ForegroundColor Green
```

### test-payment-flows.ps1

```powershell
# Tester tous les flux de paiement

Write-Host "🧪 Test des flux de paiement..." -ForegroundColor Cyan

# Variables de test
$SUPABASE_URL = "https://uakkxaibujzxdiqzpnpr.supabase.co"
$ANON_KEY = "votre-anon-key"

# Test 1: Delivery Payment
Write-Host "`n📦 Test 1: Delivery Payment (Wallet)" -ForegroundColor Yellow
$deliveryPayload = @{
    delivery_id = "test-delivery-001"
    customer_id = "uuid-customer"
    driver_id = "uuid-driver"
    amount = 5000
    payment_method = "wallet"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/delivery-payment" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $deliveryPayload

Write-Host "Response:" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 3

# Test 2: Freight Payment
Write-Host "`n🚢 Test 2: Freight Payment (Wallet)" -ForegroundColor Yellow
$freightPayload = @{
    freight_order_id = "test-freight-001"
    client_id = "uuid-client"
    freight_agent_id = "uuid-agent"
    amount = 500000
    payment_method = "wallet"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/freight-payment" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $ANON_KEY"
        "Content-Type" = "application/json"
    } `
    -Body $freightPayload

Write-Host "Response:" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 3

Write-Host "`n✅ Tests terminés" -ForegroundColor Green
```

---

## 🔒 Sécurité & Row Level Security (RLS)

### Vérifier les policies RLS

```sql
-- Vérifier que RLS est activé sur toutes les tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'escrow_transactions',
    'wallet_transactions',
    'commissions',
    'stripe_transactions',
    'orders'
  );
```

**Résultat attendu :** `rowsecurity = true` pour toutes

### Tester les accès utilisateur

```sql
-- En tant qu'utilisateur normal, essayer d'accéder aux escrows d'autres users
SET ROLE authenticated;
SET request.jwt.claims.sub = 'uuid-user-1';

-- Doit retourner SEULEMENT les escrows de l'utilisateur connecté
SELECT * FROM escrow_transactions;

-- Reset
RESET ROLE;
```

---

## ✅ Checklist Finale

Avant la mise en production :

- [ ] **Edge Functions**
  - [ ] delivery-payment déployé
  - [ ] freight-payment déployé
  - [ ] Tous les edge functions testés

- [ ] **Stripe**
  - [ ] Webhook endpoint configuré
  - [ ] Signing secret ajouté
  - [ ] Événements testés

- [ ] **Escrow**
  - [ ] Commission marketplace: 1.5%
  - [ ] Commission taxi: 2.5%
  - [ ] Commission delivery: 3%
  - [ ] Commission freight: 2%
  - [ ] Auto-release configuré

- [ ] **Tests**
  - [ ] Test marketplace complet
  - [ ] Test taxi-moto complet
  - [ ] Test livraison complet
  - [ ] Test transitaire complet
  - [ ] Test wallet dépôt/transfert

- [ ] **Sécurité**
  - [ ] RLS activé partout
  - [ ] Policies testées
  - [ ] Idempotence vérifiée

- [ ] **Monitoring**
  - [ ] Dashboard commissions fonctionnel
  - [ ] Notifications configurées
  - [ ] Logs activés

---

**Prêt à déployer ? Exécutez :**

```powershell
.\deploy-all-payment-functions.ps1
```
