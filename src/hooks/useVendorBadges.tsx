/**
 * HOOK VENDOR BADGES - Affiche les badges dynamiques dans la sidebar
 * Charge les statistiques réelles depuis Supabase
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VendorBadges {
  totalProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  unreadExpenseAlerts: number;
}

export function useVendorBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<VendorBadges>({
    totalProducts: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
    unreadExpenseAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadBadges = async () => {
      try {
        // Récupérer le vendor ID
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!vendor) {
          setLoading(false);
          return;
        }

        // Charger les statistiques en parallèle
        const [productsResult, lowStockResult, ordersResult, expensesResult] = await Promise.all([
          // Total produits
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id),
          
          // Produits en rupture de stock (stock < 5)
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id)
            .lt('stock_quantity', 5),
          
          // Commandes en attente
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id)
            .in('status', ['pending', 'processing']),
          
          // Alertes de dépenses non lues (approximation)
          supabase
            .from('expenses')
            .select('id', { count: 'exact', head: true })
            .eq('vendor_id', vendor.id)
            .gte('amount', 50000) // Dépenses importantes
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Dernière semaine
        ]);

        setBadges({
          totalProducts: productsResult.count || 0,
          lowStockProducts: lowStockResult.count || 0,
          pendingOrders: ordersResult.count || 0,
          unreadExpenseAlerts: expensesResult.count || 0,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des badges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();

    // Recharger les badges toutes les 30 secondes
    const interval = setInterval(loadBadges, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return { badges, loading };
}
