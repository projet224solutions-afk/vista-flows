# Guide du Système d'Abonnement

## 📋 Vue d'ensemble

Le système d'abonnement est maintenant complètement intégré avec :
- ✅ Gestion des plans et limites de produits
- ✅ Webhooks de paiement
- ✅ Vérification automatique des expirations
- ✅ Contrôle des limites de produits

## 🚀 Edge Functions Créées

### 1. `subscription-webhook`
**URL**: `https://[project-id].supabase.co/functions/v1/subscription-webhook`

Gère les webhooks de paiement d'abonnement.

**Payload webhook attendu**:
```json
{
  "type": "subscription_payment_succeeded",
  "amount_gnf": 15000,
  "user_id": "uuid",
  "transaction_id": "tx_123",
  "plan_id": "plan-uuid",
  "subscription_id": "sub-uuid",
  "payment_method": "wallet"
}
```

**Actions automatiques**:
- Crée/met à jour l'abonnement via RPC `record_subscription_payment`
- Enregistre les revenus PDG via RPC `handle_pdg_revenue`
- Gère les échecs de paiement (statut `past_due`)

### 2. `subscription-expiry-check`
**URL**: `https://[project-id].supabase.co/functions/v1/subscription-expiry-check`

Vérifie quotidiennement les abonnements expirés.

**Configuration Cron** (via Supabase Dashboard):
```sql
select cron.schedule(
  'subscription-expiry-check',
  '0 0 * * *', -- Chaque jour à minuit
  $$
  select net.http_post(
    url:='https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/subscription-expiry-check',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### 3. `create-product`
**URL**: `https://[project-id].supabase.co/functions/v1/create-product`

Crée un produit avec vérification automatique de la limite.

**Exemple d'appel (frontend)**:
```typescript
import { supabase } from '@/lib/supabaseClient';

const createProduct = async (productData) => {
  const { data, error } = await supabase.functions.invoke('create-product', {
    body: {
      name: "Mon Produit",
      description: "Description du produit",
      price: 50000,
      sku: "PROD-001",
      category_id: "cat-uuid",
      images: ["url1", "url2"],
      stock_quantity: 100,
      is_active: true
    }
  });

  if (error?.error === 'PRODUCT_LIMIT_REACHED') {
    toast.error(`Limite atteinte: ${error.message}`);
    // Rediriger vers la page d'abonnement
    return;
  }

  if (error) throw error;
  toast.success('Produit créé avec succès!');
  return data.product;
};
```

## 🔧 Intégration Frontend

### Vérifier la limite avant création (Méthode 1 - Hook)
```typescript
import { useSubscription } from '@/hooks/useSubscription';

function ProductForm() {
  const { canAddProduct, productLimit } = useSubscription();

  const handleSubmit = async (data) => {
    if (!canAddProduct()) {
      toast.error(`Limite atteinte: ${productLimit?.current_count}/${productLimit?.max_allowed}`);
      // Rediriger vers /subscriptions
      return;
    }
    
    // Créer le produit...
  };
}
```

### Créer un produit via Edge Function (Méthode 2 - Recommandée)
```typescript
// L'Edge Function vérifie automatiquement la limite
const { data, error } = await supabase.functions.invoke('create-product', {
  body: productData
});

if (error?.error === 'PRODUCT_LIMIT_REACHED') {
  // Gérer l'erreur de limite
}
```

## 📊 Gestion PDG

Le panneau PDG (`/pdg`) permet déjà de :
- ✅ Modifier le prix des plans (avec historique)
- ✅ Modifier la limite de produits par plan
- ✅ Voir les statistiques d'abonnement
- ✅ Voir l'historique des changements de prix

## 🔐 Revenus PDG

Les revenus d'abonnement sont automatiquement enregistrés dans `revenus_pdg` avec :
- `source_type`: `'frais_abonnement'`
- `amount`: Montant de l'abonnement
- `user_id`: ID de l'utilisateur
- `transaction_id`: ID de la transaction

## 🧪 Tests

### Tester le webhook
```bash
curl -X POST https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/subscription-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscription_payment_succeeded",
    "amount_gnf": 15000,
    "user_id": "user-uuid",
    "plan_id": "plan-uuid"
  }'
```

### Tester la vérification d'expiration
```bash
curl -X POST https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/subscription-expiry-check
```

### Tester la création de produit
```bash
curl -X POST https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/create-product \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 50000,
    "stock_quantity": 10
  }'
```

## 🔄 Workflow Complet

1. **Utilisateur s'abonne** → Page `/subscriptions`
2. **Paiement via wallet** → Transaction créée
3. **Webhook notifie** → `subscription-webhook` traite le paiement
4. **Abonnement activé** → RPC `record_subscription_payment`
5. **Revenus enregistrés** → RPC `handle_pdg_revenue`
6. **Utilisateur crée produit** → `create-product` vérifie limite
7. **Expiration auto** → Cron `subscription-expiry-check` (quotidien)

## 📝 Prochaines Étapes

- [ ] Configurer le cron job dans Supabase Dashboard
- [ ] Configurer les webhooks de votre provider de paiement
- [ ] Tester le flux complet en staging
- [ ] Configurer les notifications (email/push) pour changements de prix
- [ ] Ajouter RLS policies strictes sur les tables

## 🛡️ Sécurité

- `subscription-webhook`: Public (vérifie signature webhook si nécessaire)
- `subscription-expiry-check`: Public (peut être appelé par cron)
- `create-product`: Authentifié (require JWT)
- Toutes les opérations sont loggées
- Les limites sont vérifiées côté backend
