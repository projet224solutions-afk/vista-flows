/**
 * Hook: Statistiques E-commerce par SERVICE PROFESSIONNEL
 * Utilise professional_service_id pour les requêtes
 * Alternative à useEcommerceStats qui utilise vendor_id
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
}

interface SalesStats {
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  averageOrderValue: number;
}

export interface ServiceEcommerceStats {
  orders: OrderStats;
  ordersPos: OrderStats;
  ordersOnline: OrderStats;
  products: {
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
  };
  clients: {
    total: number;
    newThisMonth: number;
  };
  sales: SalesStats;
  salesPos: SalesStats;
  salesOnline: SalesStats;
}

export interface RecentServiceOrder {
  id: string;
  booking_number?: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer_name?: string;
  source?: string;
}

export interface TopServiceProduct {
  id: string;
  name: string;
  total_sold: number;
  revenue: number;
  image?: string;
}

function calculateOrderStats(orders: any[]): OrderStats {
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => ['confirmed', 'processing', 'preparing', 'ready', 'in_transit'].includes(o.status)).length,
    delivered: orders.filter(o => ['delivered', 'completed'].includes(o.status)).length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };
}

function calculateSalesStats(orders: any[], startOfDay: Date, startOfWeek: Date, startOfMonth: Date): SalesStats {
  const paidOrders = orders.filter(o => o.payment_status === 'paid' || o.status === 'completed');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const todayOrders = paidOrders.filter(o => new Date(o.created_at) >= startOfDay);
  const weekOrders = paidOrders.filter(o => new Date(o.created_at) >= startOfWeek);
  const monthOrders = paidOrders.filter(o => new Date(o.created_at) >= startOfMonth);

  return {
    totalRevenue,
    todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    weekRevenue: weekOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    monthRevenue: monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
    averageOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
  };
}

const defaultStats: ServiceEcommerceStats = {
  orders: { total: 0, pending: 0, confirmed: 0, delivered: 0, cancelled: 0 },
  ordersPos: { total: 0, pending: 0, confirmed: 0, delivered: 0, cancelled: 0 },
  ordersOnline: { total: 0, pending: 0, confirmed: 0, delivered: 0, cancelled: 0 },
  products: { total: 0, active: 0, inactive: 0, lowStock: 0 },
  clients: { total: 0, newThisMonth: 0 },
  sales: { totalRevenue: 0, todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, averageOrderValue: 0 },
  salesPos: { totalRevenue: 0, todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, averageOrderValue: 0 },
  salesOnline: { totalRevenue: 0, todayRevenue: 0, weekRevenue: 0, monthRevenue: 0, averageOrderValue: 0 },
};

export function useServiceEcommerceStats(serviceId?: string) {
  const [stats, setStats] = useState<ServiceEcommerceStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentServiceOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopServiceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!serviceId) {
      console.log('⚠️ useServiceEcommerceStats - Pas de serviceId fourni');
      setStats(defaultStats);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📊 Chargement stats e-commerce pour serviceId:', serviceId);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 1. Charger les réservations/commandes du service professionnel
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('service_bookings')
        .select('id, status, total_amount, created_at, payment_status, source, customer_id')
        .eq('professional_service_id', serviceId)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('❌ Erreur chargement bookings:', bookingsError);
      }

      const bookings = bookingsData || [];
      console.log('📦 Bookings trouvés:', bookings.length);

      const posBookings = bookings.filter(b => b.source === 'pos');
      const onlineBookings = bookings.filter(b => b.source === 'online' || !b.source);

      // Calculate stats for all, POS, and Online
      const orderStats = calculateOrderStats(bookings);
      const orderStatsPos = calculateOrderStats(posBookings);
      const orderStatsOnline = calculateOrderStats(onlineBookings);

      const salesStats = calculateSalesStats(bookings, startOfDay, startOfWeek, startOfMonth);
      const salesStatsPos = calculateSalesStats(posBookings, startOfDay, startOfWeek, startOfMonth);
      const salesStatsOnline = calculateSalesStats(onlineBookings, startOfDay, startOfWeek, startOfMonth);

      // 2. Charger les produits du service professionnel
      const { data: productsData, error: productsError } = await supabase
        .from('service_products')
        .select('id, is_available, stock_quantity')
        .eq('professional_service_id', serviceId);

      if (productsError) {
        console.error('❌ Erreur chargement produits:', productsError);
      }

      const products = productsData || [];
      console.log('📦 Produits trouvés:', products.length);

      const productStats = {
        total: products.length,
        active: products.filter(p => p.is_available !== false).length,
        inactive: products.filter(p => p.is_available === false).length,
        lowStock: products.filter(p => (p.stock_quantity || 0) <= 5 && p.is_available !== false).length,
      };

      // 3. Compter les clients uniques
      const uniqueCustomerIds = new Set(bookings.filter(b => b.customer_id).map(b => b.customer_id));
      const recentCustomers = bookings
        .filter(b => b.customer_id && new Date(b.created_at) >= startOfMonth)
        .map(b => b.customer_id);
      const newUniqueThisMonth = new Set(recentCustomers);

      const clientStats = {
        total: uniqueCustomerIds.size,
        newThisMonth: newUniqueThisMonth.size,
      };

      setStats({
        orders: orderStats,
        ordersPos: orderStatsPos,
        ordersOnline: orderStatsOnline,
        products: productStats,
        clients: clientStats,
        sales: salesStats,
        salesPos: salesStatsPos,
        salesOnline: salesStatsOnline,
      });

      // 4. Récentes réservations pour l'affichage
      setRecentOrders(
        bookings.slice(0, 10).map(b => ({
          id: b.id,
          booking_number: `SRV-${b.id.slice(0, 8).toUpperCase()}`,
          status: b.status,
          total_amount: b.total_amount || 0,
          created_at: b.created_at,
          source: b.source || 'online',
        }))
      );

      // 5. Top produits (pour l'instant placeholder)
      // TODO: Implémenter avec les lignes de commande quand disponibles
      setTopProducts([]);

    } catch (err) {
      console.error('❌ Erreur inattendue:', err);
      setError('Erreur de chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    recentOrders,
    topProducts,
    loading,
    error,
    refresh: loadStats,
  };
}
