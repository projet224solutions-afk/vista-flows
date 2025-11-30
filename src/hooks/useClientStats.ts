/**
 * HOOK CLIENT STATS - 224SOLUTIONS
 * Statistiques optimisées avec requêtes SQL pour l'interface Client
 * 9 métriques: Orders, Spending, Cart, Favorites, Reviews, Refunds
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ClientStats {
  // Orders
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  
  // Financial
  total_spent: number;
  average_order_value: number;
  cart_value: number;
  pending_payments: number;
  
  // Engagement
  favorites_count: number;
  reviews_submitted: number;
  refunds_requested: number;
  loyalty_points: number;
  
  // Recent activity
  last_order_date: string | null;
  days_since_last_order: number;
}

export function useClientStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. ORDERS STATS - Total, actives, complétées, annulées
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at')
        .eq('customer_user_id', user.id);

      const totalOrders = ordersData?.length || 0;
      const activeOrders = ordersData?.filter(o => 
        ['pending', 'processing', 'shipped'].includes(o.status)
      ).length || 0;
      const completedOrders = ordersData?.filter(o => o.status === 'delivered').length || 0;
      const cancelledOrders = ordersData?.filter(o => o.status === 'cancelled').length || 0;

      // 2. FINANCIAL STATS - Total dépensé, moyenne commande
      const totalSpent = ordersData?.reduce((sum, o) => 
        o.status !== 'cancelled' ? sum + (o.total_amount || 0) : sum, 0
      ) || 0;
      const averageOrderValue = completedOrders > 0 ? totalSpent / completedOrders : 0;

      // 3. CART VALUE - Valeur du panier actuel
      const { data: cartData } = await supabase
        .from('cart_items')
        .select(`
          quantity,
          products!inner(price)
        `)
        .eq('user_id', user.id);

      const cartValue = cartData?.reduce((sum, item: any) => 
        sum + (item.quantity * (item.products?.price || 0)), 0
      ) || 0;

      // 4. PENDING PAYMENTS - Paiements en attente
      const { data: pendingPayments } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('customer_user_id', user.id)
        .eq('payment_status', 'pending');

      const pendingPaymentsTotal = pendingPayments?.reduce((sum, o) => 
        sum + (o.total_amount || 0), 0
      ) || 0;

      // 5. FAVORITES COUNT - Nombre de favoris
      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 6. REVIEWS SUBMITTED - Avis soumis
      const { count: reviewsCount } = await supabase
        .from('product_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 7. REFUNDS REQUESTED - Remboursements demandés
      const { count: refundsCount } = await supabase
        .from('refund_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 8. LOYALTY POINTS - Points de fidélité
      const { data: loyaltyData } = await supabase
        .from('loyalty_points')
        .select('points')
        .eq('user_id', user.id)
        .single();

      const loyaltyPoints = loyaltyData?.points || 0;

      // 9. LAST ORDER DATE - Date dernière commande
      const lastOrder = ordersData?.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      const lastOrderDate = lastOrder?.created_at || null;
      const daysSinceLastOrder = lastOrderDate 
        ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Assembler les stats
      const clientStats: ClientStats = {
        total_orders: totalOrders,
        active_orders: activeOrders,
        completed_orders: completedOrders,
        cancelled_orders: cancelledOrders,
        total_spent: totalSpent,
        average_order_value: averageOrderValue,
        cart_value: cartValue,
        pending_payments: pendingPaymentsTotal,
        favorites_count: favoritesCount || 0,
        reviews_submitted: reviewsCount || 0,
        refunds_requested: refundsCount || 0,
        loyalty_points: loyaltyPoints,
        last_order_date: lastOrderDate,
        days_since_last_order: daysSinceLastOrder
      };

      setStats(clientStats);
    } catch (err: any) {
      console.error('Erreur chargement stats client:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  };
}
