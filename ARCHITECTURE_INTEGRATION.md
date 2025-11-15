# 🏗️ Architecture d'Intégration - 224Solutions

## Vue d'ensemble

L'architecture de 224Solutions est conçue pour optimiser la communication entre le Frontend (React), le Backend (Supabase) et la Base de données (PostgreSQL) via une couche d'abstraction intelligente.

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Components │  │   Pages    │  │    Hooks   │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │                │                │                    │
│        └────────────────┴────────────────┘                    │
│                         │                                     │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              COUCHE D'ABSTRACTION                            │
│  ┌──────────────────────────────────────────────────┐       │
│  │             DataManager (Singleton)               │       │
│  │  • Cache intelligent (TTL configurable)          │       │
│  │  • Mises à jour temps réel (Realtime)           │       │
│  │  • Optimisation des requêtes                     │       │
│  │  • Gestion des mutations                         │       │
│  └──────────────┬───────────────────────────────────┘       │
└─────────────────┼─────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Supabase)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │ Realtime │  │ Storage  │  │   RPC    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼────────────┼─────────────┼─────────────┼───────────┘
        │            │             │             │
        └────────────┴─────────────┴─────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BASE DE DONNÉES (PostgreSQL)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Tables  │  │ Policies │  │ Triggers │  │ Functions│   │
│  │   RLS    │  │  Index   │  │   Views  │  │   Logs   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Composants Principaux

### 1. DataManager (`src/services/DataManager.ts`)

**Rôle** : Couche d'abstraction unifiée pour toutes les opérations de données.

**Fonctionnalités** :
- ✅ Cache intelligent avec TTL
- ✅ Souscriptions temps réel automatiques
- ✅ Gestion unifiée des mutations (INSERT/UPDATE/DELETE)
- ✅ Invalidation de cache intelligente
- ✅ Gestion des filtres et tri
- ✅ Pattern Singleton

**Exemple d'utilisation** :
```typescript
import { dataManager } from '@/services/DataManager';

// Query avec cache et realtime
const data = await dataManager.query({
  table: 'payment_links',
  select: '*',
  filters: { vendeur_id: 'xxx' },
  orderBy: { column: 'created_at', ascending: false },
  realtime: true
});

// Mutation avec invalidation automatique du cache
await dataManager.mutate({
  table: 'payment_links',
  operation: 'insert',
  data: { ... }
});
```

### 2. Hooks Personnalisés

#### usePaymentLinks (`src/hooks/usePaymentLinks.ts`)
**Gère** : Payment links du vendeur connecté
**Utilise** : DataManager pour cache & realtime
**Fonctions** :
- `loadPaymentLinks()` - Charge les liens avec filtres
- `createPaymentLink()` - Crée un nouveau lien
- `updatePaymentLinkStatus()` - Met à jour le statut
- `deletePaymentLink()` - Supprime un lien

#### useEscrowTransactions (`src/hooks/useEscrowTransactions.ts`)
**Gère** : Transactions escrow
**Fonctions** :
- `initiateEscrow()` - Initie un escrow
- `releaseEscrow()` - Libère les fonds
- `refundEscrow()` - Rembourse
- `disputeEscrow()` - Ouvre un litige

#### useVendorAnalytics (`src/hooks/useVendorAnalytics.ts`)
**Gère** : Analytics vendeur
**Données** :
- Ventes quotidiennes
- Tendances hebdomadaires/mensuelles
- Top produits
- Taux de conversion

#### useFinancialTransactions (`src/hooks/useFinancialTransactions.ts`)
**Gère** : Transactions financières
**Fonctions** :
- `transferCardToOrangeMoney()` - Transfert carte → Orange Money
- `rechargeCardFromWallet()` - Recharge carte depuis wallet
- `rechargeWalletFromCard()` - Recharge wallet depuis carte
- `calculateFees()` - Calcul des frais

### 3. Services Backend

#### UserService (`services/UserService.ts`)
```typescript
// Créer un utilisateur complet
await UserService.createUser({
  email: 'user@example.com',
  full_name: 'John Doe',
  phone: '+224622000000',
  role: 'vendeur'
});

// Obtenir un utilisateur complet
const user = await UserService.getUserComplete(userId);

// Mettre à jour un utilisateur
await UserService.updateUser(userId, { full_name: 'New Name' });
```

#### WalletService (`services/WalletService.ts`)
```typescript
// Obtenir le solde
const balance = await WalletService.getWalletBalance(userId);

// Traiter une transaction
await WalletService.processTransaction({
  from_user_id: 'xxx',
  to_user_id: 'yyy',
  amount: 10000,
  transaction_type: 'transfer'
});

// Créditer un wallet
await WalletService.creditWallet(userId, 50000, 'Bonus');
```

#### OrderService (`services/OrderService.ts`)
```typescript
// Créer une commande
await OrderService.createOrder({
  customer_id: 'xxx',
  vendor_id: 'yyy',
  items: [...],
  delivery_address: 'Conakry, Guinée'
});

// Mettre à jour le statut
await OrderService.updateOrderStatus(orderId, 'delivered');

// Obtenir les commandes
const orders = await OrderService.getCustomerOrders(customerId);
```

## 🔄 Flux de Données

### Exemple : Création d'un Payment Link

```
1. User clique sur "Créer un lien"
   └─> Component: PaymentLinksManager
   
2. Formulaire rempli et soumis
   └─> Hook: usePaymentLinks.createPaymentLink()
   
3. Hook appelle DataManager
   └─> DataManager.mutate({ operation: 'insert', ... })
   
4. DataManager → Supabase Client
   └─> supabase.from('payment_links').insert(...)
   
5. Supabase → PostgreSQL
   └─> INSERT INTO payment_links ...
   
6. Réponse remonte
   └─> PostgreSQL → Supabase → DataManager → Hook → Component
   
7. Cache invalidé automatiquement
   └─> DataManager.invalidateCache('payment_links')
   
8. Notification temps réel envoyée
   └─> Tous les clients abonnés reçoivent la mise à jour
   
9. UI mise à jour automatiquement
   └─> Component re-render avec nouvelles données
```

### Exemple : Chargement de Payment Links avec Realtime

```
1. Component monte
   └─> useEffect() déclenché
   
2. Hook charge les données
   └─> usePaymentLinks.loadPaymentLinks()
   
3. DataManager vérifie le cache
   └─> Cache hit ? → Retourne immédiatement
   └─> Cache miss ? → Fetch depuis Supabase
   
4. Si realtime activé
   └─> DataManager.setupRealtime()
   └─> Souscription à la table 'payment_links'
   
5. Données retournées et mise en cache
   └─> Cache TTL: 5 minutes
   
6. Nouvel événement (INSERT/UPDATE/DELETE)
   └─> Supabase Realtime envoie notification
   └─> DataManager invalide le cache
   └─> Notifie tous les listeners
   └─> Component re-fetch automatiquement
```

## 🎯 Avantages de cette Architecture

### Performance
- ✅ **Cache intelligent** : Réduit les requêtes répétitives
- ✅ **TTL configurable** : Balance entre fraîcheur et performance
- ✅ **Invalidation automatique** : Cache toujours cohérent

### Maintenabilité
- ✅ **DRY** : Logique centralisée dans DataManager
- ✅ **Hooks réutilisables** : Business logic séparée des components
- ✅ **Type-safe** : TypeScript partout

### Scalabilité
- ✅ **Temps réel** : Updates automatiques sans polling
- ✅ **Optimistic updates** : UI réactive
- ✅ **Pagination** : Support natif des limit/offset

### Sécurité
- ✅ **RLS Supabase** : Row Level Security au niveau DB
- ✅ **Validation** : Côté client et serveur
- ✅ **JWT Auth** : Authentification sécurisée

## 📝 Best Practices

### Pour les Components
```typescript
// ❌ Mauvais - Appel direct à Supabase
const { data } = await supabase.from('table').select('*');

// ✅ Bon - Utiliser un hook
const { data, loading } = useCustomHook();
```

### Pour les Hooks
```typescript
// ❌ Mauvais - Appel direct à Supabase
const { data } = await supabase.from('table').select('*');

// ✅ Bon - Utiliser DataManager
const data = await dataManager.query({ table: 'table' });
```

### Pour les Services
```typescript
// ✅ Bon - Services pour logique métier complexe
export class ComplexService {
  static async complexOperation() {
    // Logique métier
    const result = await supabase.rpc('complex_function');
    return result;
  }
}
```

## 🚀 Prochaines Étapes

1. **Migration progressive** : Convertir tous les composants pour utiliser les hooks
2. **Optimisation** : Ajuster les TTL de cache selon les besoins
3. **Monitoring** : Ajouter des métriques de performance
4. **Tests** : Unit tests pour DataManager et hooks
5. **Documentation** : JSDoc sur tous les hooks et services

## 📚 Fichiers Importants

- `src/services/DataManager.ts` - Couche d'abstraction principale
- `src/hooks/usePaymentLinks.ts` - Hook payment links
- `src/hooks/useEscrowTransactions.ts` - Hook escrow
- `src/hooks/useVendorAnalytics.ts` - Hook analytics
- `src/hooks/useFinancialTransactions.ts` - Hook transactions
- `services/UserService.ts` - Service utilisateurs
- `services/WalletService.ts` - Service wallets
- `services/OrderService.ts` - Service commandes
- `src/integrations/supabase/client.ts` - Client Supabase
- `src/lib/supabaseClient.ts` - Export du client

## 🔧 Configuration

### Variables d'environnement requises
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Configuration DataManager
```typescript
// Ajuster le TTL par défaut (actuellement 5 minutes)
this.setCache(cacheKey, data, 5 * 60 * 1000);

// Activer/désactiver realtime par query
realtime: true // ou false
```

---

**Status** : ✅ Frontend, Backend et Database pleinement intégrés et opérationnels
**Dernière mise à jour** : 2025-01-03
