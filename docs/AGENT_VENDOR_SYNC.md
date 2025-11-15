# Synchronisation Agent-Vendeur : Architecture

## Problème Résolu

Les agents du vendeur doivent accéder aux données du vendeur, pas à leurs propres données. Sans synchronisation appropriée, les composants affichaient les données de l'agent (vide) au lieu des données du vendeur.

## Solution : Hook `useCurrentVendor`

### Principe

Le hook `useCurrentVendor` détecte automatiquement le contexte et retourne toujours le bon `vendorId` :

- **Mode Vendeur Direct** : Retourne l'ID du vendeur connecté
- **Mode Agent** : Retourne l'ID du vendeur associé à l'agent

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   VendorAgentInterface                       │
│                   (AgentProvider wraps all)                  │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼──────┐         ┌───────▼──────┐
        │  useAgent()  │         │  useAuth()   │
        │ (if agent)   │         │ (if vendor)  │
        └───────┬──────┘         └───────┬──────┘
                │                         │
                └────────────┬────────────┘
                             │
                   ┌─────────▼─────────┐
                   │ useCurrentVendor  │
                   │ (unified hook)    │
                   └─────────┬─────────┘
                             │
                    ┌────────▼────────┐
                    │   vendorId      │
                    │   isAgent       │
                    │   hasPermission │
                    └─────────────────┘
```

### Utilisation dans les Composants

#### Avant (❌ Problème)
```typescript
import { useAuth } from '@/hooks/useAuth';

export default function VendorAnalytics() {
  const { user } = useAuth(); // ❌ Retourne l'agent, pas le vendeur
  
  const loadData = async () => {
    const { data } = await supabase
      .from('orders')
      .eq('vendor_id', user.id); // ❌ Filtre par agent_id
  };
}
```

#### Après (✅ Solution)
```typescript
import { useCurrentVendor } from '@/hooks/useCurrentVendor';

export default function VendorAnalytics() {
  const { vendorId, loading } = useCurrentVendor(); // ✅ Retourne toujours le vendorId correct
  
  const loadData = async () => {
    if (!vendorId || loading) return;
    
    const { data } = await supabase
      .from('orders')
      .eq('vendor_id', vendorId); // ✅ Filtre par vendor_id (agent ou direct)
  };
}
```

## Composants Migrés

Les composants suivants ont été mis à jour pour utiliser `useCurrentVendor` :

1. ✅ `VendorAnalytics.tsx`
2. ✅ `useVendorAnalytics.ts` (hook)
3. ✅ `VendorAnalyticsDashboard.tsx` (via useVendorAnalytics)

## Migration des Autres Composants

Pour migrer un composant existant :

1. Remplacer `import { useAuth } from '@/hooks/useAuth'`
   par `import { useCurrentVendor } from '@/hooks/useCurrentVendor'`

2. Remplacer `const { user } = useAuth()`
   par `const { vendorId, loading: vendorLoading } = useCurrentVendor()`

3. Mettre à jour les requêtes Supabase :
   ```typescript
   // Avant
   .eq('vendor_id', user.id)
   
   // Après
   .eq('vendor_id', vendorId)
   ```

4. Ajouter un guard au début des fonctions async :
   ```typescript
   if (!vendorId || vendorLoading) return;
   ```

## Composants à Migrer

Liste des composants utilisant encore `useAuth` :

- [ ] `ProductManagement.tsx`
- [ ] `OrderManagement.tsx`
- [ ] `POSSystem.tsx`
- [ ] `InventoryManagement.tsx`
- [ ] `WarehouseStockManagement.tsx`
- [ ] `ClientManagement.tsx`
- [ ] `SupplierManagement.tsx`
- [ ] `MarketingManagement.tsx`
- [ ] `WalletDashboard.tsx`
- [ ] `PaymentProcessor.tsx`
- [ ] `SupportTickets.tsx`
- [ ] `VendorCommunication.tsx`
- [ ] `VendorKYCForm.tsx`
- [ ] `VendorRatingsPanel.tsx`
- [ ] `AffiliateManagement.tsx`

## Permissions

Le hook `useCurrentVendor` expose également `hasPermission(permission: string)` :

- **Mode Vendeur** : Retourne toujours `true` (accès complet)
- **Mode Agent** : Vérifie les permissions dans `agent.permissions[]`

```typescript
const { vendorId, hasPermission } = useCurrentVendor();

if (hasPermission('manage_products')) {
  // Afficher le module produits
}
```

## Journalisation

Le système log automatiquement le mode de fonctionnement :

```
🔄 Mode Agent - Chargement données vendeur: vendor-uuid
✅ Données vendeur chargées (mode agent): { vendorId: "...", agentName: "..." }

🔄 Mode Vendeur Direct - Utilisation user actuel: user-uuid  
✅ Données vendeur chargées (mode direct): { vendorId: "..." }
```

## Avantages

1. **Code Unifié** : Un seul hook pour tous les cas d'usage
2. **Type-Safe** : TypeScript garantit la cohérence
3. **Maintainabilité** : Facile à étendre et débugger
4. **Performance** : Chargement optimisé avec guards
5. **Sécurité** : Gestion des permissions intégrée
