/**
 * 🔧 HOOK: STATISTIQUES VENDEUR
 * Récupère les statistiques en temps réel du vendeur
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';

export interface VendorStats {
  vendorId: string | null;
  revenue: number;
  orders_count: number;
  customers_count: number;
  products_count: number;
  pending_orders: number;
  low_stock_products: number;
}

export function useVendorStats() {
  const { vendorId, loading: vendorLoading } = useCurrentVendor();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!vendorId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Statistiques parallèles avec gestion d'erreur individuelle
      const [
        revenueResult,
        ordersResult,
        customersResult,
        productsResult,
        pendingResult,
        lowStockResult
      ] = await Promise.allSettled([
        // Chiffre d'affaires total
        supabase
          .from('orders')
          .select('total_amount')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid'),
        
        // Nombre de commandes
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId),
        
        // Nombre de clients
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true }),
        
        // Nombre de produits
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('is_active', true),
        
        // Commandes en attente
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendorId)
          .eq('status', 'pending'),
        
        // Produits stock faible
        supabase
          .from('products')
          .select('id, stock_quantity, low_stock_threshold')
          .eq('vendor_id', vendorId)
          .eq('is_active', true)
      ]);

      // Calculer le chiffre d'affaires
      const revenue = revenueResult.status === 'fulfilled' && revenueResult.value.data
        ? revenueResult.value.data.reduce((sum, order) => sum + (order.total_amount || 0), 0)
        : 0;

      // Compter les produits en stock faible
      const lowStockCount = lowStockResult.status === 'fulfilled' && lowStockResult.value.data
        ? lowStockResult.value.data.filter((p) => p.stock_quantity <= (p.low_stock_threshold || 0)).length
        : 0;

      setStats({
        vendorId,
        revenue,
        orders_count: ordersResult.status === 'fulfilled' ? (ordersResult.value.count || 0) : 0,
        customers_count: customersResult.status === 'fulfilled' ? (customersResult.value.count || 0) : 0,
        products_count: productsResult.status === 'fulfilled' ? (productsResult.value.count || 0) : 0,
        pending_orders: pendingResult.status === 'fulfilled' ? (pendingResult.value.count || 0) : 0,
        low_stock_products: lowStockCount
      });

    } catch (err: any) {
      console.error('Erreur chargement stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
      // Définir des stats par défaut en cas d'erreur
      setStats({
        vendorId,
        revenue: 0,
        orders_count: 0,
        customers_count: 0,
        products_count: 0,
        pending_orders: 0,
        low_stock_products: 0
      });
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorLoading) return;
    if (!vendorId) {
      setLoading(false);
      return;
    }

    fetchStats();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [vendorId, vendorLoading, fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
}

export default useVendorStats;
