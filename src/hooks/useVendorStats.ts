/**
 * 🔧 HOOK: STATISTIQUES VENDEUR
 * Récupère les statistiques en temps réel du vendeur
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface VendorStats {
  revenue: number;
  orders_count: number;
  customers_count: number;
  products_count: number;
  pending_orders: number;
  low_stock_products: number;
}

export function useVendorStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchStats();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer le vendor_id
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (vendorError) throw vendorError;
      if (!vendor) {
        setStats(null);
        return;
      }

      // Statistiques parallèles
      const [
        revenueResult,
        ordersResult,
        customersResult,
        productsResult,
        pendingResult,
        lowStockResult
      ] = await Promise.all([
        // Chiffre d'affaires total
        supabase
          .from('orders')
          .select('total_amount')
          .eq('vendor_id', vendor.id)
          .eq('payment_status', 'paid'),
        
        // Nombre de commandes
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id),
        
        // Nombre de clients
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true }),
        
        // Nombre de produits
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('is_active', true),
        
        // Commandes en attente
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('status', 'pending'),
        
        // Produits stock faible
        supabase
          .from('products')
          .select('id, stock_quantity, low_stock_threshold')
          .eq('vendor_id', vendor.id)
          .eq('is_active', true)
      ]);

      // Calculer le chiffre d'affaires
      const revenue = revenueResult.data?.reduce(
        (sum, order) => sum + (order.total_amount || 0), 
        0
      ) || 0;

      // Compter les produits en stock faible
      const lowStockCount = lowStockResult.data?.filter(
        (p) => p.stock_quantity <= (p.low_stock_threshold || 0)
      ).length || 0;

      setStats({
        revenue,
        orders_count: ordersResult.count || 0,
        customers_count: customersResult.count || 0,
        products_count: productsResult.count || 0,
        pending_orders: pendingResult.count || 0,
        low_stock_products: lowStockCount
      });

    } catch (err: any) {
      console.error('Erreur chargement stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
}

export default useVendorStats;
