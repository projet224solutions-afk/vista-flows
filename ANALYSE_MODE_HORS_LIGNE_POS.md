# 📴 MODE HORS LIGNE : POS & INVENTAIRE

**Date:** 1er janvier 2026  
**Système:** 224Solutions  
**Composants:** POSSystem, InventoryManagement

---

## ⚠️ ÉTAT ACTUEL

### **❌ PAS DE SUPPORT HORS LIGNE ACTUELLEMENT**

Le système POS et Inventaire **NE FONCTIONNE PAS** en mode hors ligne pour le moment.

**Raison:**
- ❌ Aucun cache local des produits
- ❌ Aucun système de queue pour les ventes
- ❌ Toutes les opérations nécessitent Supabase en ligne
- ❌ Pas de synchronisation différée

---

## 🔍 ANALYSE DU CODE ACTUEL

### **1. POSSystem.tsx**

**Dépendances en ligne obligatoires:**

```typescript
// ❌ Chargement produits - NÉCESSITE CONNEXION
const loadVendorProducts = async () => {
  const { data: productsData, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_active', true);
};

// ❌ Traitement paiement - NÉCESSITE CONNEXION
const processPayment = async () => {
  // Création commande
  const { data: order } = await supabase
    .from('orders')
    .insert({...});
    
  // Mise à jour stock
  await supabase
    .from('inventory')
    .update({ quantity: newQuantity });
};
```

**Problèmes identifiés:**
1. ❌ Pas de cache des produits dans localStorage
2. ❌ Pas de queue des ventes hors ligne
3. ❌ Pas de détection du statut réseau
4. ❌ Pas de synchronisation différée

### **2. InventoryManagement.tsx**

**Dépendances en ligne obligatoires:**

```typescript
// ❌ Chargement inventaire - NÉCESSITE CONNEXION
const fetchProducts = async () => {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId);
};

// ❌ Mise à jour stock - NÉCESSITE CONNEXION
const updateStock = async (productId, newQuantity) => {
  await supabase
    .from('inventory')
    .update({ quantity: newQuantity })
    .eq('product_id', productId);
};
```

**Problèmes identifiés:**
1. ❌ Pas de cache de l'inventaire
2. ❌ Pas de queue des modifications
3. ❌ Perte de données si hors ligne
4. ❌ Pas d'indicateur visuel du statut

---

## 💡 SOLUTION : IMPLÉMENTATION MODE HORS LIGNE

### **Architecture proposée**

```
┌─────────────────────────────────────────────┐
│           POSSystem / Inventaire             │
│              (Interface UI)                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│        offlinePOSManager (NOUVEAU)          │
│                                             │
│ • Cache produits (IndexedDB)                │
│ • Queue ventes hors ligne                   │
│ • Détection réseau                          │
│ • Synchronisation auto                      │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌─────────────┐      ┌─────────────┐
│  IndexedDB  │      │  Supabase   │
│   (Local)   │      │  (Online)   │
└─────────────┘      └─────────────┘
```

---

## 🚀 IMPLÉMENTATION

### **Étape 1: Créer le gestionnaire offline**

**Fichier:** `src/lib/offlinePOSManager.ts`

```typescript
/**
 * GESTIONNAIRE OFFLINE POS
 * Cache local et synchronisation différée
 */

import localforage from 'localforage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Store pour produits (cache)
const productsCache = localforage.createInstance({
  name: '224Solutions',
  storeName: 'pos_products_cache'
});

// Store pour ventes hors ligne (queue)
const salesQueue = localforage.createInstance({
  name: '224Solutions',
  storeName: 'pos_sales_queue'
});

// Store pour inventaire (cache)
const inventoryCache = localforage.createInstance({
  name: '224Solutions',
  storeName: 'pos_inventory_cache'
});

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  images?: string[];
  category: string;
  barcode?: string;
}

interface OfflineSale {
  id: string;
  vendorId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  timestamp: number;
  synced: boolean;
}

/**
 * 1. CACHE DES PRODUITS
 */

// Charger et mettre en cache les produits
export async function cacheProducts(vendorId: string): Promise<Product[]> {
  try {
    // Essayer de charger depuis Supabase
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_active', true);

    if (!error && products) {
      // Sauvegarder dans le cache
      await productsCache.setItem(`vendor_${vendorId}`, {
        products,
        timestamp: Date.now(),
        vendorId
      });
      
      console.log('✅ Produits mis en cache:', products.length);
      return products;
    }
  } catch (onlineError) {
    console.warn('⚠️ Erreur chargement online, utilisation du cache');
  }

  // Fallback: charger depuis le cache
  const cached = await productsCache.getItem<{
    products: Product[];
    timestamp: number;
  }>(`vendor_${vendorId}`);

  if (cached) {
    console.log('📂 Produits chargés depuis le cache:', cached.products.length);
    toast.info('Mode hors ligne - Données en cache', {
      description: `${cached.products.length} produits disponibles`
    });
    return cached.products;
  }

  return [];
}

// Obtenir les produits (toujours depuis le cache)
export async function getCachedProducts(vendorId: string): Promise<Product[]> {
  const cached = await productsCache.getItem<{
    products: Product[];
  }>(`vendor_${vendorId}`);
  
  return cached?.products || [];
}

/**
 * 2. QUEUE DES VENTES HORS LIGNE
 */

// Enregistrer une vente hors ligne
export async function queueOfflineSale(sale: Omit<OfflineSale, 'synced' | 'timestamp'>): Promise<void> {
  const offlineSale: OfflineSale = {
    ...sale,
    timestamp: Date.now(),
    synced: false
  };

  await salesQueue.setItem(sale.id, offlineSale);
  console.log('📴 Vente enregistrée hors ligne:', sale.id);
  
  toast.success('Vente enregistrée', {
    description: 'Sera synchronisée lors de la reconnexion'
  });

  // Mettre à jour le stock local
  await updateLocalStock(sale.items);
}

// Synchroniser les ventes en attente
export async function syncOfflineSales(): Promise<{
  success: number;
  failed: number;
}> {
  const keys = await salesQueue.keys();
  let success = 0;
  let failed = 0;

  for (const key of keys) {
    const sale = await salesQueue.getItem<OfflineSale>(key);
    if (!sale || sale.synced) continue;

    try {
      // Créer la commande dans Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          vendor_id: sale.vendorId,
          customer_id: sale.customerId,
          total_amount: sale.total,
          payment_status: 'paid',
          status: 'confirmed',
          payment_method: sale.paymentMethod,
          notes: `Vente hors ligne - ${new Date(sale.timestamp).toLocaleString()}`,
          source: 'pos_offline'
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // Créer les items
      const orderItems = sale.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Mettre à jour le stock en ligne
      for (const item of sale.items) {
        await updateOnlineStock(item.productId, -item.quantity);
      }

      // Marquer comme synchronisé
      sale.synced = true;
      await salesQueue.setItem(key, sale);
      success++;
      
      console.log('✅ Vente synchronisée:', key);
    } catch (error) {
      console.error('❌ Erreur sync vente:', key, error);
      failed++;
    }
  }

  return { success, failed };
}

// Obtenir le nombre de ventes en attente
export async function getPendingSalesCount(): Promise<number> {
  const keys = await salesQueue.keys();
  let pending = 0;

  for (const key of keys) {
    const sale = await salesQueue.getItem<OfflineSale>(key);
    if (sale && !sale.synced) pending++;
  }

  return pending;
}

/**
 * 3. GESTION DU STOCK LOCAL
 */

// Mettre à jour le stock local
async function updateLocalStock(items: Array<{ productId: string; quantity: number }>) {
  for (const item of items) {
    const cached = await inventoryCache.getItem<{ quantity: number }>(item.productId);
    const currentQuantity = cached?.quantity || 0;
    const newQuantity = Math.max(0, currentQuantity - item.quantity);
    
    await inventoryCache.setItem(item.productId, {
      quantity: newQuantity,
      lastUpdate: Date.now()
    });
  }
}

// Mettre à jour le stock en ligne
async function updateOnlineStock(productId: string, quantityChange: number) {
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (product) {
    const newStock = Math.max(0, (product.stock_quantity || 0) + quantityChange);
    await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', productId);
  }
}

// Synchroniser l'inventaire
export async function syncInventory(vendorId: string): Promise<void> {
  try {
    const { data: inventory } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .eq('vendor_id', vendorId);

    if (inventory) {
      for (const item of inventory) {
        await inventoryCache.setItem(item.id, {
          quantity: item.stock_quantity || 0,
          lastUpdate: Date.now()
        });
      }
      console.log('✅ Inventaire synchronisé:', inventory.length, 'produits');
    }
  } catch (error) {
    console.error('❌ Erreur sync inventaire:', error);
  }
}

/**
 * 4. DÉTECTION DU STATUT RÉSEAU
 */

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onNetworkChange(callback: (online: boolean) => void) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * 5. SYNCHRONISATION AUTOMATIQUE
 */

export async function autoSync(vendorId: string): Promise<void> {
  if (!isOnline()) {
    console.log('📴 Hors ligne - Sync différée');
    return;
  }

  console.log('🔄 Synchronisation automatique...');

  // 1. Synchroniser les ventes
  const salesResult = await syncOfflineSales();
  if (salesResult.success > 0) {
    toast.success(`${salesResult.success} vente(s) synchronisée(s)`);
  }
  if (salesResult.failed > 0) {
    toast.error(`${salesResult.failed} vente(s) en échec`);
  }

  // 2. Rafraîchir le cache des produits
  await cacheProducts(vendorId);

  // 3. Synchroniser l'inventaire
  await syncInventory(vendorId);

  console.log('✅ Synchronisation terminée');
}

// Nettoyer les ventes synchronisées (> 7 jours)
export async function cleanupSyncedSales(): Promise<void> {
  const keys = await salesQueue.keys();
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const key of keys) {
    const sale = await salesQueue.getItem<OfflineSale>(key);
    if (sale && sale.synced && sale.timestamp < sevenDaysAgo) {
      await salesQueue.removeItem(key);
      console.log('🗑️ Vente nettoyée:', key);
    }
  }
}

export default {
  cacheProducts,
  getCachedProducts,
  queueOfflineSale,
  syncOfflineSales,
  getPendingSalesCount,
  syncInventory,
  isOnline,
  onNetworkChange,
  autoSync,
  cleanupSyncedSales
};
```

---

### **Étape 2: Adapter POSSystem.tsx**

**Modifications nécessaires:**

```typescript
// En haut du fichier
import offlinePOSManager from '@/lib/offlinePOSManager';

export function POSSystem() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState(0);

  // Surveillance du statut réseau
  useEffect(() => {
    const cleanup = offlinePOSManager.onNetworkChange((online) => {
      setIsOnline(online);
      if (online) {
        toast.success('Connexion rétablie');
        handleSync();
      } else {
        toast.warning('Mode hors ligne activé');
      }
    });

    return cleanup;
  }, []);

  // Charger le compteur de ventes en attente
  useEffect(() => {
    offlinePOSManager.getPendingSalesCount().then(setPendingSales);
  }, []);

  // Fonction de chargement des produits (avec cache)
  const loadVendorProducts = async () => {
    if (!vendorId) return;

    setProductsLoading(true);
    try {
      // Utiliser le cache offline
      const products = await offlinePOSManager.cacheProducts(vendorId);
      setProducts(products);
    } catch (error) {
      toast.error('Erreur chargement produits');
    } finally {
      setProductsLoading(false);
    }
  };

  // Fonction de paiement (avec support hors ligne)
  const processPayment = async () => {
    if (!vendorId || !user?.id) {
      toast.error('Informations manquantes');
      return;
    }

    try {
      const customerId = await getOrCreateCustomerId();
      if (!customerId) return;

      if (isOnline) {
        // Mode en ligne : traitement normal
        await processOnlinePayment(customerId);
      } else {
        // Mode hors ligne : mise en queue
        await processOfflinePayment(customerId);
      }
    } catch (error) {
      toast.error('Erreur lors du paiement');
    }
  };

  const processOfflinePayment = async (customerId: string) => {
    await offlinePOSManager.queueOfflineSale({
      id: crypto.randomUUID(),
      vendorId: vendorId!,
      customerId,
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      total,
      paymentMethod
    });

    // Mettre à jour le compteur
    const count = await offlinePOSManager.getPendingSalesCount();
    setPendingSales(count);

    // Réinitialiser le panier
    clearCart();
    setShowOrderSummary(false);
  };

  // Synchronisation manuelle
  const handleSync = async () => {
    if (!isOnline) {
      toast.warning('Connexion requise pour synchroniser');
      return;
    }

    toast.info('Synchronisation en cours...');
    await offlinePOSManager.autoSync(vendorId!);
    
    // Rafraîchir le compteur
    const count = await offlinePOSManager.getPendingSalesCount();
    setPendingSales(count);
    
    // Recharger les produits
    await loadVendorProducts();
  };

  // Indicateur de statut dans l'UI
  return (
    <div>
      {/* Indicateur de statut */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant={isOnline ? 'success' : 'warning'}>
          {isOnline ? '🟢 En ligne' : '📴 Mode hors ligne'}
        </Badge>
        
        {pendingSales > 0 && (
          <Badge variant="outline">
            {pendingSales} vente(s) en attente
          </Badge>
        )}
        
        {!isOnline && pendingSales > 0 && (
          <Button onClick={handleSync} disabled={!isOnline}>
            Synchroniser
          </Button>
        )}
      </div>

      {/* Reste de l'interface... */}
    </div>
  );
}
```

---

### **Étape 3: Adapter InventoryManagement.tsx**

**Modifications similaires:**

```typescript
import offlinePOSManager from '@/lib/offlinePOSManager';

export default function InventoryManagement() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Surveillance réseau
  useEffect(() => {
    return offlinePOSManager.onNetworkChange(setIsOnline);
  }, []);

  // Charger inventaire (avec cache)
  const fetchProducts = async () => {
    if (isOnline) {
      // Mode en ligne: chargement normal
      const { data } = await supabase
        .from('products')
        .select('*');
      setProducts(data || []);
    } else {
      // Mode hors ligne: depuis le cache
      const cached = await offlinePOSManager.getCachedProducts(vendorId);
      setProducts(cached);
      toast.info('Mode hors ligne - Consultation uniquement');
    }
  };

  // Mise à jour stock
  const updateStock = async (productId: string, newQuantity: number) => {
    if (!isOnline) {
      toast.warning('Modification impossible en mode hors ligne');
      return;
    }

    // Mise à jour en ligne
    await supabase
      .from('inventory')
      .update({ quantity: newQuantity });
  };

  return (
    <div>
      <Badge variant={isOnline ? 'success' : 'warning'}>
        {isOnline ? '🟢 En ligne' : '📴 Consultation seule'}
      </Badge>
      {/* ... */}
    </div>
  );
}
```

---

## 🎯 FONCTIONNALITÉS MODE HORS LIGNE

### **✅ Ce qui fonctionnera:**

| Fonctionnalité | Mode en ligne | Mode hors ligne |
|----------------|---------------|-----------------|
| **Consulter produits** | ✅ | ✅ (cache) |
| **Ajouter au panier** | ✅ | ✅ (local) |
| **Valider vente** | ✅ | ✅ (queue) |
| **Voir inventaire** | ✅ | ✅ (cache) |
| **Modifier stock** | ✅ | ❌ |
| **Ajouter produit** | ✅ | ❌ |
| **Imprimer ticket** | ✅ | ✅ |

### **⚠️ Limitations hors ligne:**

1. **Lecture seule pour inventaire**
   - Consultation uniquement
   - Pas de modifications

2. **Ventes en queue**
   - Enregistrées localement
   - Synchronisation à la reconnexion

3. **Stock local**
   - Mis à jour localement
   - Peut diverger du serveur
   - Recalibré à la sync

4. **Pas de paiements online**
   - Mobile Money indisponible
   - Cash/Carte OK (enregistrement local)

---

## 📊 AVANTAGES

### **Pour le vendeur:**
- ✅ Continue à vendre même sans Internet
- ✅ Aucune perte de données
- ✅ Synchronisation automatique
- ✅ Indicateur visuel du statut

### **Pour le système:**
- ✅ Résilience accrue
- ✅ Meilleure UX
- ✅ Moins de frustration
- ✅ Plus de ventes

---

## 🚀 PLAN DE DÉPLOIEMENT

### **Phase 1: Développement (1-2 jours)**
1. Créer `offlinePOSManager.ts`
2. Ajouter tests unitaires
3. Modifier POSSystem
4. Modifier InventoryManagement

### **Phase 2: Tests (1 jour)**
1. Test mode online
2. Test mode offline
3. Test basculement
4. Test synchronisation

### **Phase 3: Déploiement (1 jour)**
1. Merge sur main
2. Déploiement production
3. Monitoring
4. Documentation

---

## ✅ CONCLUSION

### **Réponse à votre question:**

**"Est-ce que le POS et les inventaires pourront marcher en mode hors ligne ?"**

**Actuellement:** ❌ NON

**Après implémentation:** ✅ OUI (avec limitations)

### **Délai d'implémentation:** 3-4 jours

### **Ce qui sera possible hors ligne:**
- ✅ Consultation produits/inventaire
- ✅ Enregistrement ventes
- ✅ Mise à jour stock local
- ✅ Impression tickets

### **Ce qui nécessitera Internet:**
- ❌ Modification inventaire
- ❌ Ajout produits
- ❌ Paiements Mobile Money
- ❌ Synchronisation

**Le système sera UTILISABLE hors ligne mais avec fonctionnalités limitées !** 📴✅
