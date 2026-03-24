/**
 * Hook useOfflineInitialization - Initialisation automatique du mode offline
 * 224SOLUTIONS - Mode Offline Avancé
 *
 * Ce hook gère l'initialisation complète du système offline au démarrage
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Profile } from './useAuth';
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
  const { user, profile } = useAuth();
  const { isOnline, checkConnection } = useOnlineStatus();

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
  const initialize = useCallback(async (userId: string) => {
    console.log('[OfflineInit] Démarrage initialisation pour utilisateur:', userId);

    setStatus(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // 1. Enregistrer le Service Worker
      console.log('[OfflineInit] Enregistrement Service Worker...');
      registerServiceWorker({ force: false });

      // 1b. Récupérer l'ID vendeur
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const vendorId = vendor?.id || userId;

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

        startScheduledSync({
          enabled: true,
          syncOnReconnect: true,
          syncOnVisibilityChange: true,
          respectBattery: true
        });

        return;
      }

      // 3. Première initialisation - vérifier la connectivité réelle
      const healthOk = isOnline || await checkConnection();
      console.log(healthOk ? '[HEALTH CHECK OK]' : '[HEALTH CHECK FAIL]', {
        scope: 'useOfflineInitialization',
        isOnline,
      });

      if (!healthOk) {
        const error = 'Connexion internet requise pour la première initialisation';
        console.warn('[OfflineInit]', error);
        setStatus(prev => ({ ...prev, isInitializing: false, error }));
        toast.warning(error, {
          description: 'Reconnectez-vous pour télécharger le catalogue'
        });
        return;
      }

      // 4. Charger les données
      console.log('[OfflineInit] Chargement des données...');
      const products = await fetchVendorProducts(vendorId);
      const categories = await fetchCategories();

      // 5. Mettre en cache
      console.log('[OfflineInit] Mise en cache du catalogue...');
      await cacheVendorProducts(vendorId, products, true);
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
  }, [checkConnection, isOnline]);

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
    if (!user?.id || !profile?.role) return;

    // Vérifier si c'est un vendeur
    const isVendor = profile.role === 'vendeur';

    if (isVendor && !status.isInitialized && !status.isInitializing) {
      initialize(user.id);
    }
  }, [user?.id, profile?.role, status.isInitialized, status.isInitializing, initialize]);

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
