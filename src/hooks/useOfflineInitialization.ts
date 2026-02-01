/**
 * Hook useOfflineInitialization - Initialisation automatique du mode offline
 * 224SOLUTIONS - Mode Offline Avancé
 *
 * Ce hook gère l'initialisation complète du système offline au démarrage
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { cacheVendorProducts, cacheCategories, getCacheStats } from '@/lib/offline/catalogCache';
import { loadInitialStock, getStockStats } from '@/lib/offline/localStockManager';
import { startScheduledSync, stopScheduledSync } from '@/lib/offline/sync/syncScheduler';
import { registerServiceWorker } from '@/lib/serviceWorkerRegistration';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OfflineInitStatus {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  catalogCached: boolean;
  stockLoaded: boolean;
  syncStarted: boolean;
}

/**
 * Hook pour initialiser le mode offline automatiquement
 */
export function useOfflineInitialization() {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  const [status, setStatus] = useState<OfflineInitStatus>({
    isInitialized: false,
    isInitializing: false,
    error: null,
    catalogCached: false,
    stockLoaded: false,
    syncStarted: false
  });

  /**
   * Initialiser le mode offline
   */
  const initialize = useCallback(async (vendorId: string) => {
    console.log('[OfflineInit] Démarrage initialisation pour vendeur:', vendorId);

    setStatus(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // 1. Enregistrer le Service Worker
      console.log('[OfflineInit] Enregistrement Service Worker...');
      registerServiceWorker({ force: false });

      // 2. Vérifier si déjà initialisé (cache existe)
      const cacheStats = await getCacheStats(vendorId);
      const stockStats = await getStockStats(vendorId);

      const alreadyInitialized = cacheStats.totalProducts > 0 && stockStats.totalProducts > 0;

      if (alreadyInitialized) {
        console.log('[OfflineInit] Déjà initialisé (cache existant)');
        setStatus({
          isInitialized: true,
          isInitializing: false,
          error: null,
          catalogCached: true,
          stockLoaded: true,
          syncStarted: true
        });

        // Juste démarrer le sync scheduler
        startScheduledSync({
          enabled: true,
          syncOnReconnect: true,
          syncOnVisibilityChange: true,
          respectBattery: true
        });

        return;
      }

      // 3. Première initialisation - nécessite une connexion
      if (!isOnline) {
        const error = 'Connexion internet requise pour la première initialisation';
        console.warn('[OfflineInit]', error);
        setStatus(prev => ({ ...prev, isInitializing: false, error }));
        toast.warning(error, {
          description: 'Reconnectez-vous pour télécharger le catalogue'
        });
        return;
      }

      // 4. Charger les données (en ligne uniquement lors de la première fois)
      console.log('[OfflineInit] Chargement des données...');

      // Charger produits et catégories (remplacer par vos vraies fonctions de fetch)
      const products = await fetchVendorProducts(vendorId);
      const categories = await fetchCategories();

      // 5. Mettre en cache
      console.log('[OfflineInit] Mise en cache du catalogue...');
      await cacheVendorProducts(vendorId, products, true); // true = cache images
      await cacheCategories(categories);

      setStatus(prev => ({ ...prev, catalogCached: true }));

      // 6. Charger le stock initial
      console.log('[OfflineInit] Chargement du stock initial...');
      await loadInitialStock(vendorId, products);

      setStatus(prev => ({ ...prev, stockLoaded: true }));

      // 7. Démarrer la synchronisation automatique
      console.log('[OfflineInit] Démarrage du sync scheduler...');
      startScheduledSync({
        enabled: true,
        syncOnReconnect: true,
        syncOnVisibilityChange: true,
        respectBattery: true
      });

      setStatus(prev => ({ ...prev, syncStarted: true }));

      // 8. Terminé
      setStatus({
        isInitialized: true,
        isInitializing: false,
        error: null,
        catalogCached: true,
        stockLoaded: true,
        syncStarted: true
      });

      console.log('[OfflineInit] ✅ Initialisation terminée avec succès');

      toast.success('Mode offline activé!', {
        description: `${products.length} produits disponibles hors ligne`
      });

    } catch (error: any) {
      console.error('[OfflineInit] Erreur initialisation:', error);
      setStatus({
        isInitialized: false,
        isInitializing: false,
        error: error.message || 'Erreur lors de l\'initialisation',
        catalogCached: false,
        stockLoaded: false,
        syncStarted: false
      });

      toast.error('Erreur initialisation mode offline', {
        description: error.message
      });
    }
  }, [isOnline]);

  /**
   * Nettoyer au démontage
   */
  useEffect(() => {
    return () => {
      // Arrêter le sync scheduler au démontage
      stopScheduledSync();
    };
  }, []);

  /**
   * Auto-initialisation pour les vendeurs
   */
  useEffect(() => {
    if (!user?.id) return;

    // Vérifier si c'est un vendeur
    const isVendor = user.role === 'vendor' || user.role === 'vendeur';

    if (isVendor && !status.isInitialized && !status.isInitializing) {
      initialize(user.id);
    }
  }, [user?.id, user?.role, status.isInitialized, status.isInitializing, initialize]);

  /**
   * Forcer une réinitialisation (utile pour les mises à jour)
   */
  const reinitialize = useCallback(() => {
    if (user?.id) {
      initialize(user.id);
    }
  }, [user?.id, initialize]);

  return {
    ...status,
    reinitialize
  };
}

/**
 * Récupérer les produits du vendeur depuis Supabase
 */
async function fetchVendorProducts(vendorId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        stock_quantity,
        barcode,
        barcode_value,
        barcode_format,
        sku,
        images,
        category_id,
        section,
        categories(id, name),
        sell_by_carton,
        units_per_carton,
        price_carton,
        description
      `)
      .eq('vendor_id', vendorId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    console.log(`[OfflineInit] ${data?.length || 0} produits récupérés pour le vendeur ${vendorId}`);
    return data || [];
  } catch (error) {
    console.error('[OfflineInit] Erreur fetch produits:', error);
    throw error;
  }
}

/**
 * Récupérer toutes les catégories depuis Supabase
 */
async function fetchCategories(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    console.log(`[OfflineInit] ${data?.length || 0} catégories récupérées`);
    return data || [];
  } catch (error) {
    console.error('[OfflineInit] Erreur fetch catégories:', error);
    throw error;
  }
}

export default useOfflineInitialization;
