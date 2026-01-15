/**
 * 🚀 HOOK: STATISTIQUES VENDEUR - OPTIMISÉ 100ms
 * Architecture "Stale-While-Revalidate" pour FCP instantané
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { getInstant, setInstant, CACHE_KEYS } from '@/lib/instantCache';

export interface VendorStats {
  vendorId: string | null;
  revenue: number;
  orders_count: number;
  customers_count: number;
  products_count: number;
  pending_orders: number;
  low_stock_products: number;
}

// Stats par défaut pour éviter null
const DEFAULT_STATS: VendorStats = {
  vendorId: null,
  revenue: 0,
  orders_count: 0,
  customers_count: 0,
  products_count: 0,
  pending_orders: 0,
  low_stock_products: 0
};

export function useVendorStats() {
  const { vendorId, loading: vendorLoading } = useCurrentVendor();
  
  // 🚀 INSTANT: Charger depuis cache IMMÉDIATEMENT (0ms)
  const cachedStats = useMemo(() => {
    if (!vendorId) return null;
    const cached = getInstant<VendorStats>(CACHE_KEYS.VENDOR_STATS);
    // Vérifier que le cache correspond au bon vendeur
    if (cached && cached.vendorId === vendorId) {
      return cached;
    }
    return null;
  }, [vendorId]);
  
  // État initial depuis cache (pas de loading si cache disponible!)
  const [stats, setStats] = useState<VendorStats | null>(cachedStats);
  const [loading, setLoading] = useState(!cachedStats); // ⚡ Pas de loading si cache!
  const [error, setError] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  
  // Ref pour éviter re-fetches
  const hasFetchedRef = useRef(false);
  const currentVendorRef = useRef<string | null>(null);

  const fetchStats = useCallback(async (isBackground = false) => {
    if (!vendorId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      if (!isBackground) setLoading(true);
      else setIsRevalidating(true);
      
      setError(null);

      // 🚀 PARALLEL: Toutes les requêtes en même temps (~100ms au lieu de ~600ms)
      const [
        revenueResult,
        ordersResult,
        customersResult,
        productsResult,
        pendingResult,
        lowStockResult
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid'),
        
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId),
        
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true }),
        
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('is_active', true),
        
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'pending'),
        
        supabase
          .from('products')
          .select('id, stock_quantity, low_stock_threshold')
          .eq('vendor_id', vendorId)
          .eq('is_active', true)
      ]);

      // Calculer les stats
      const revenue = revenueResult.data
        ? revenueResult.data.reduce((sum, order) => sum + (order.total_amount || 0), 0)
        : 0;

      const lowStockCount = lowStockResult.data
        ? lowStockResult.data.filter((p) => p.stock_quantity <= (p.low_stock_threshold || 0)).length
        : 0;

      const newStats: VendorStats = {
        vendorId,
        revenue,
        orders_count: ordersResult.count || 0,
        customers_count: customersResult.count || 0,
        products_count: productsResult.count || 0,
        pending_orders: pendingResult.count || 0,
        low_stock_products: lowStockCount
      };

      // 🚀 CACHE: Sauvegarder pour prochain chargement instantané
      setInstant(CACHE_KEYS.VENDOR_STATS, newStats);
      setStats(newStats);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur chargement stats:', err);
      setError(errorMessage);
      
      // Garder les données en cache si disponibles
      if (!stats && cachedStats) {
        setStats(cachedStats);
      } else if (!stats) {
        setStats({ ...DEFAULT_STATS, vendorId });
      }
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, [vendorId, stats, cachedStats]);

  // Effet principal avec protection contre les doublons
  useEffect(() => {
    if (vendorLoading) return;
    
    if (!vendorId) {
      setStats(null);
      setLoading(false);
      return;
    }

    // Éviter les re-fetches pour le même vendeur
    if (currentVendorRef.current === vendorId && hasFetchedRef.current) {
      return;
    }
    
    currentVendorRef.current = vendorId;
    hasFetchedRef.current = true;

    // 🚀 STALE-WHILE-REVALIDATE:
    // Si on a des données en cache, les utiliser ET revalider en arrière-plan
    if (cachedStats) {
      setStats(cachedStats);
      setLoading(false);
      // Revalidation en arrière-plan (non-bloquante)
      fetchStats(true);
    } else {
      // Pas de cache - fetch normal
      fetchStats(false);
    }

    // Actualiser toutes les 30 secondes
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [vendorId, vendorLoading, cachedStats, fetchStats]);

  return {
    stats,
    loading,
    error,
    isRevalidating,
    refresh: () => fetchStats(false)
  };
}

export default useVendorStats;
