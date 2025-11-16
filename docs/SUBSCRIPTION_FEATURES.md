# Système de Gestion des Fonctionnalités par Abonnement

## Vue d'ensemble

Ce document décrit le système de gestion des fonctionnalités basées sur l'abonnement dans l'application 224SOLUTIONS.

## Architecture

### 1. Hook `useVendorSubscription`

Récupère l'abonnement actif de l'utilisateur connecté.

```typescript
import { useVendorSubscription } from '@/hooks/useVendorSubscription';

function MyComponent() {
  const { subscription, loading, error } = useVendorSubscription();
  
  // subscription contient toutes les données de l'abonnement actif
  // loading indique si les données sont en cours de chargement
  // error contient un message d'erreur éventuel
}
```

### 2. Hook `useSubscriptionFeatures`

Vérifie l'accès aux fonctionnalités selon l'abonnement.

```typescript
import { useSubscriptionFeatures } from '@/hooks/useSubscriptionFeatures';

function MyComponent() {
  const { 
    canAccessFeature, 
    hasAnyFeature, 
    hasAllFeatures,
    getAvailableFeatures,
    getPlanName,
    isActive
  } = useSubscriptionFeatures();

  // Vérifier l'accès à une fonctionnalité
  if (canAccessFeature('analytics_advanced')) {
    // Afficher les analytics avancés
  }

  // Vérifier l'accès à plusieurs fonctionnalités
  if (hasAllFeatures(['api_access', 'data_export'])) {
    // Activer l'export via API
  }
}
```

### 3. Composant `FeatureGuard`

Protège l'affichage de fonctionnalités selon l'abonnement.

```typescript
import { FeatureGuard } from '@/components/subscription/FeatureGuard';

function MyDashboard() {
  return (
    <FeatureGuard 
      feature="analytics_advanced"
      showUpgradePrompt={true}
    >
      <AdvancedAnalytics />
    </FeatureGuard>
  );
}
```

### 4. Composant `FeatureButton`

Bouton qui affiche automatiquement une invite de mise à niveau si la fonctionnalité n'est pas accessible.

```typescript
import { FeatureButton } from '@/components/subscription/FeatureGuard';

function MyComponent() {
  return (
    <FeatureButton
      feature="api_access"
      onClick={() => console.log('API activated')}
    >
      Activer l'API
    </FeatureButton>
  );
}
```

## Fonctionnalités par Plan

### Plan Gratuit (Free)
- `products_basic`: Gestion produits basique
- `orders_simple`: Commandes et ventes simples

### Plan Basic
- Toutes les fonctionnalités du plan gratuit +
- `products_advanced`: Gestion produits avancée
- `orders_detailed`: Suivi commandes détaillé
- `crm_basic`: CRM basique
- `analytics_basic`: Analytics de base
- `notifications_push`: Notifications push
- `delivery_tracking`: Suivi livraisons
- `email_support`: Support email
- `auto_billing`: Facturation automatique

### Plan Pro
- Toutes les fonctionnalités du plan Basic +
- `inventory_management`: Gestion stocks & inventaire
- `analytics_advanced`: Analytics avancés
- `marketing_promotions`: Marketing & promotions
- `affiliate_program`: Programme d'affiliation
- `sales_agents`: Gestion agents de vente
- `payment_links`: Liens de paiement
- `stock_alerts`: Alertes stock
- `complete_history`: Historique complet
- `priority_support`: Support prioritaire
- `featured_products`: Produits en vedette

### Plan Business
- Toutes les fonctionnalités du plan Pro +
- `pos_system`: POS (Point de vente)
- `debt_management`: Gestion dettes clients
- `supplier_management`: Gestion fournisseurs
- `multi_warehouse`: Entrepôts multiples
- `expense_management`: Gestion dépenses
- `data_export`: Exports de données (CSV/Excel)
- `api_access`: API Access
- `prospect_management`: Gestion prospects
- `support_tickets`: Support tickets
- `advanced_integrations`: Intégrations avancées
- `multi_user`: Multi-utilisateurs

### Plan Premium
- Toutes les fonctionnalités du plan Business +
- `gemini_ai`: Assistant IA Gemini
- `communication_hub`: Hub communication complet
- `analytics_realtime`: Analytics temps réel
- `advanced_security`: Sécurité avancée
- `dedicated_manager`: Account manager dédié
- `custom_branding`: Branding personnalisé
- `training`: Formation dédiée
- `api_premium`: API Premium
- `offline_mode`: Mode hors ligne avancé
- `cloud_sync`: Synchronisation cloud
- `unlimited_modules`: Tous les modules débloqués
- `custom_commissions`: Commissions personnalisées
- `unlimited_integrations`: Intégrations illimitées
- `custom_reports`: Rapports personnalisés

## Exemples d'utilisation

### Protéger une page entière

```typescript
import { useSubscriptionFeatures } from '@/hooks/useSubscriptionFeatures';
import { useNavigate } from 'react-router-dom';

function AdvancedAnalyticsPage() {
  const { canAccessFeature } = useSubscriptionFeatures();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canAccessFeature('analytics_advanced')) {
      navigate('/subscriptions');
    }
  }, [canAccessFeature, navigate]);

  return <div>Analytics avancés...</div>;
}
```

### Afficher un badge "Premium"

```typescript
function MyFeature() {
  const { canAccessFeature } = useSubscriptionFeatures();
  const isPremium = canAccessFeature('gemini_ai');

  return (
    <div>
      <h2>Ma fonctionnalité</h2>
      {isPremium && <Badge>Premium</Badge>}
    </div>
  );
}
```

### Désactiver un bouton conditionnel

```typescript
function ExportButton() {
  const { canAccessFeature } = useSubscriptionFeatures();
  const canExport = canAccessFeature('data_export');

  return (
    <Button disabled={!canExport}>
      {canExport ? 'Exporter' : 'Exporter (Premium)'}
    </Button>
  );
}
```

## Ajouter une nouvelle fonctionnalité

1. Ajouter le type dans `SubscriptionFeature` dans `src/hooks/useSubscriptionFeatures.ts`
2. Ajouter la fonctionnalité aux plans appropriés dans `PLAN_FEATURES`
3. Utiliser `FeatureGuard` ou `canAccessFeature` pour protéger la fonctionnalité

## Base de données

Les données d'abonnement sont stockées dans:
- Table `plans`: Liste des plans disponibles
- Table `subscriptions`: Abonnements actifs des utilisateurs
- Fonction RPC `get_active_subscription`: Récupère l'abonnement actif avec les détails du plan

## Sécurité

- Les vérifications d'accès sont effectuées côté client ET côté serveur
- Les fonctions RPC Supabase vérifient les permissions
- Les politiques RLS protègent l'accès aux données sensibles
