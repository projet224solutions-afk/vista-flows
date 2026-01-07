# 💰 CONFIGURATION COMPLÈTE - SYSTÈME DE PAIEMENT 224SOLUTIONS

## 📋 Vue d'ensemble

Ce document centralise toute la logique de paiement pour les 5 types de transactions :
1. **Marketplace** - Achat/vente de produits
2. **Taxi-Moto** - Courses de transport
3. **Livreur** - Livraison de colis
4. **Transitaire** - Import/export
5. **Wallet** - Dépôts et transferts

---

## 🎯 Architecture Globale

```
Client/Utilisateur
       ↓
┌──────────────────────────────────────────────┐
│   Méthodes de paiement disponibles          │
│   • Wallet 224Solutions                      │
│   • Carte bancaire (Stripe)                 │
│   • Orange Money / Free Money                │
│   • Cash (à la livraison)                    │
└──────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────┐
│   Système ESCROW (protection acheteur)       │
│   • Fonds bloqués jusqu'à confirmation       │
│   • Auto-release après délai                 │
│   • Gestion des litiges                      │
└──────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────┐
│   Commissions (prélevées lors du release)    │
│   • Marketplace: 1.5%                        │
│   • Taxi-Moto: 2.5%                          │
│   • Livreur: 3%                              │
│   • Transitaire: 2%                          │
└──────────────────────────────────────────────┘
       ↓
Wallet du vendeur/prestataire
```

---

## 1️⃣ MARKETPLACE (Achat/Vente Produits)

### Flux de paiement

```typescript
// Fichier: src/components/ecommerce/ProductPaymentModal.tsx

// 1. Client achète un produit
const result = await UniversalEscrowService.createEscrow({
  buyer_id: userId,
  seller_id: vendorId,
  order_id: orderId,
  amount: productTotal + commission,  // Total avec commission
  currency: 'GNF',
  transaction_type: 'product',
  payment_provider: 'wallet' | 'stripe' | 'orange_money' | 'cash',
  metadata: {
    product_ids: [...],
    order_number: 'ORD-XXX',
    description: 'Achat produits',
    product_total: productTotal,
    commission_fee: commission,
    commission_percent: 1.5
  },
  escrow_options: {
    commission_percent: 1.5,
    auto_release_days: 7  // 7 jours pour confirmer réception
  }
});

// 2. Fonds bloqués en escrow
// 3. Vendeur prépare et expédie la commande
// 4. Client reçoit et confirme
await confirmDeliveryAndReleaseEscrow(escrowId, customerId);

// 5. Fonds libérés vers wallet vendeur (moins commission 1.5%)
```

### Configuration

- **Commission plateforme** : 1.5%
- **Délai auto-release** : 7 jours
- **Méthodes acceptées** : Wallet, Carte, Orange Money, Cash
- **Protection acheteur** : ✅ Oui (fonds bloqués jusqu'à confirmation)
- **Remboursement** : Possible si non livré

### Tables concernées

- `orders` - Commandes
- `order_items` - Articles commandés
- `escrow_transactions` - Fonds en attente
- `wallet_transactions` - Historique wallet
- `stripe_transactions` - Paiements carte

---

## 2️⃣ TAXI-MOTO (Transport)

### Flux de paiement

```typescript
// Fichier: src/components/taxi-moto/TaxiMotoPaymentModal.tsx

// 1. Client réserve une course
const escrowResult = await UniversalEscrowService.createEscrow({
  buyer_id: customerId,
  seller_id: driverId,
  order_id: rideId,
  amount: rideAmount,
  currency: 'GNF',
  transaction_type: 'taxi',
  payment_provider: 'wallet' | 'orange_money' | 'cash',
  metadata: {
    ride_id: rideId,
    pickup_location: '...',
    dropoff_location: '...',
    distance: distanceKm,
    description: 'Course taxi-moto'
  },
  escrow_options: {
    auto_release_days: 1,  // 1 jour après la course
    commission_percent: 2.5
  }
});

// 2. Course effectuée
// 3. Auto-release après 24h OU confirmation client immédiate
```

### Configuration

- **Commission plateforme** : 2.5%
- **Délai auto-release** : 1 jour
- **Méthodes acceptées** : Wallet, Orange Money, Cash
- **Protection acheteur** : ✅ Oui (remboursement si course annulée)
- **Tarification** : 500 GNF/km (minimum 2000 GNF)

### Tables concernées

- `taxi_trips` - Courses
- `taxi_drivers` - Conducteurs
- `escrow_transactions` - Fonds en attente
- `wallet_transactions` - Historique wallet

---

## 3️⃣ LIVREUR (Livraison Colis)

### Flux de paiement

```typescript
// Fichier: src/components/delivery/DeliveryPaymentModal.tsx

// 1. Client demande une livraison
const escrowResult = await UniversalEscrowService.createEscrow({
  buyer_id: senderId,
  seller_id: deliveryPersonId,
  order_id: deliveryId,
  amount: deliveryFee,
  currency: 'GNF',
  transaction_type: 'delivery',
  payment_provider: 'wallet' | 'cash',
  metadata: {
    delivery_id: deliveryId,
    pickup_address: '...',
    delivery_address: '...',
    package_description: '...',
    distance: distanceKm,
    description: 'Livraison colis'
  },
  escrow_options: {
    auto_release_days: 1,  // 1 jour après livraison
    commission_percent: 3
  }
});

// 2. Livreur récupère le colis
// 3. Livreur livre (avec photo proof-of-delivery)
// 4. Auto-release ou confirmation destinataire
```

### Configuration

- **Commission plateforme** : 3%
- **Délai auto-release** : 1 jour
- **Méthodes acceptées** : Wallet, Cash
- **Protection acheteur** : ✅ Oui (remboursement si non livré)
- **Tarification** : 
  - 0-5 km : 3000 GNF
  - 5-10 km : 5000 GNF
  - 10-20 km : 8000 GNF
  - 20+ km : Tarif custom

### Tables concernées

- `deliveries` - Livraisons
- `delivery_persons` - Livreurs
- `escrow_transactions` - Fonds en attente
- `wallet_transactions` - Historique wallet

---

## 4️⃣ TRANSITAIRE (Import/Export)

### Flux de paiement

```typescript
// Fichier: src/components/freight/FreightPaymentModal.tsx

// 1. Client demande un service de transitaire
const escrowResult = await UniversalEscrowService.createEscrow({
  buyer_id: clientId,
  seller_id: freightAgentId,
  order_id: freightOrderId,
  amount: totalFees,
  currency: 'GNF',
  transaction_type: 'freight',
  payment_provider: 'wallet' | 'bank_transfer',
  metadata: {
    freight_order_id: freightOrderId,
    origin_country: 'China',
    destination: 'Guinea',
    cargo_description: '...',
    weight_kg: 1000,
    service_type: 'maritime' | 'aerien',
    description: 'Services transitaire'
  },
  escrow_options: {
    auto_release_days: 30,  // 30 jours pour dédouanement
    commission_percent: 2
  }
});

// 2. Transitaire gère les formalités
// 3. Marchandise arrivée et dédouanée
// 4. Client confirme réception
```

### Configuration

- **Commission plateforme** : 2%
- **Délai auto-release** : 30 jours
- **Méthodes acceptées** : Wallet, Virement bancaire
- **Protection acheteur** : ✅ Oui (remboursement si service non effectué)
- **Tarification** : Variable selon poids/destination

### Tables concernées

- `freight_orders` - Commandes transitaire
- `freight_agents` - Transitaires
- `escrow_transactions` - Fonds en attente
- `wallet_transactions` - Historique wallet

---

## 5️⃣ WALLET (Dépôts & Transferts)

### A. Dépôt dans le wallet

```typescript
// Fichier: src/components/wallet/WalletDeposit.tsx

// Via Stripe (carte bancaire)
const { data } = await supabase.functions.invoke('stripe-deposit', {
  body: {
    amount: depositAmount,
    currency: 'GNF',
    user_id: userId,
    payment_method_id: stripePaymentMethodId
  }
});

// Via Orange Money
const { data } = await supabase.functions.invoke('djomy-init-payment', {
  body: {
    amount: depositAmount,
    currency: 'GNF',
    phone_number: phoneNumber
  }
});
```

### B. Transfert entre wallets

```typescript
// Fichier: src/pages/Payment.tsx

// Pour montants >= 10,000 GNF : Escrow avec libération immédiate
if (amount >= 10000) {
  const escrowResult = await UniversalEscrowService.createEscrow({
    buyer_id: senderId,
    seller_id: receiverId,
    amount: amount,
    currency: 'GNF',
    transaction_type: 'wallet_transfer',
    payment_provider: 'wallet',
    escrow_options: {
      auto_release_days: 0,  // Libération immédiate
      commission_percent: 0  // Pas de commission
    }
  });
}

// Pour montants < 10,000 GNF : Transfert direct
const { data } = await supabase.functions.invoke('wallet-operations', {
  body: {
    operation: 'transfer',
    from_user_id: senderId,
    to_user_id: receiverId,
    amount: amount,
    currency: 'GNF'
  }
});
```

### Configuration

- **Commission plateforme** : 0% (transferts gratuits)
- **Montant minimum dépôt** : 1000 GNF
- **Montant maximum transfert** : 10,000,000 GNF
- **Délai traitement** : Instantané

---

## 🔧 CONFIGURATION DES COMMISSIONS

### Table `commission_config`

```sql
-- Configuration actuelle
INSERT INTO commission_config (
  service_name,
  commission_type,
  commission_value,
  is_active
) VALUES
  ('marketplace', 'percentage', 1.5, true),
  ('taxi', 'percentage', 2.5, true),
  ('delivery', 'percentage', 3.0, true),
  ('freight', 'percentage', 2.0, true);
```

### Modification des taux

```sql
-- Changer le taux pour le marketplace
UPDATE commission_config
SET commission_value = 2.0,  -- Nouveau taux: 2%
    updated_at = NOW()
WHERE service_name = 'marketplace'
  AND is_active = true;
```

---

## 📊 FONCTIONS SQL PRINCIPALES

### 1. Créer un escrow

```sql
SELECT create_universal_escrow(
  p_buyer_id := '...',
  p_seller_id := '...',
  p_order_id := '...',
  p_amount := 50000,
  p_currency := 'GNF',
  p_transaction_type := 'product',
  p_commission_percent := 1.5,
  p_auto_release_days := 7
);
```

### 2. Libérer un escrow (confirmation client)

```sql
SELECT confirm_delivery_and_release_escrow(
  p_escrow_id := '...',
  p_customer_id := '...',
  p_notes := 'Produit conforme, merci !'
);
```

### 3. Remboursement

```sql
SELECT refund_escrow(
  p_escrow_id := '...',
  p_reason := 'Produit non conforme'
);
```

---

## 🔐 SÉCURITÉ & VALIDATIONS

### 1. Vérifications avant paiement

```typescript
// Solde wallet suffisant
if (paymentMethod === 'wallet') {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();
    
  if (wallet.balance < totalAmount) {
    throw new Error('Solde insuffisant');
  }
}

// Vendeur/prestataire existe et est actif
const { data: seller } = await supabase
  .from('profiles')
  .select('id, role, is_active')
  .eq('id', sellerId)
  .single();
    
if (!seller || !seller.is_active) {
  throw new Error('Vendeur introuvable ou inactif');
}
```

### 2. Idempotence

Tous les paiements utilisent une clé d'idempotence pour éviter les doublons :

```typescript
const idempotencyKey = `${transactionType}_${orderId}_${Date.now()}`;

const { data } = await supabase.functions.invoke('wallet-operations', {
  body: {
    operation: 'payment',
    idempotency_key: idempotencyKey,
    ...paymentData
  }
});
```

---

## 🎯 PROCHAINES ÉTAPES

### ✅ Déjà configuré
- [x] Système escrow universel
- [x] Paiements marketplace avec commissions
- [x] Paiements taxi-moto
- [x] Wallet deposits (Stripe + Orange Money)
- [x] Webhooks Stripe

### ⚠️ À compléter
- [ ] Paiements livreur (créer edge function)
- [ ] Paiements transitaire (créer edge function)
- [ ] Système de litiges (disputes)
- [ ] Notifications temps réel (tous les acteurs)
- [ ] Dashboard commissions pour le PDG
- [ ] Auto-release scheduler (libération automatique après délai)

---

## 📝 TESTS

### Test Marketplace
```bash
# 1. Créer produit
# 2. Ajouter au panier
# 3. Payer (wallet/carte)
# 4. Vérifier escrow créé
# 5. Confirmer livraison
# 6. Vérifier wallet vendeur crédité
```

### Test Taxi-Moto
```bash
# 1. Réserver course
# 2. Payer (wallet/orange/cash)
# 3. Course effectuée
# 4. Vérifier auto-release après 24h
# 5. Vérifier wallet conducteur crédité
```

---

**Voulez-vous que je crée maintenant les fonctions manquantes pour Livreur et Transitaire ?**
