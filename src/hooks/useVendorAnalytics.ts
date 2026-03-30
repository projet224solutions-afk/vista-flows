import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVendor } from './useCurrentVendor';

export interface VendorAnalytics {
  date: string;
  totalSales: number;
  totalOrders: number;
  posOrders: number;
  onlineOrders: number;
  conversionRate: number;
}

export interface DailySales {
  date: string;
  total_sales: number;
  total_orders: number;
}

export interface AnalyticsSummary {
  today: VendorAnalytics;
  week: DailySales[];
  month: DailySales[];
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
  }>;
  activeProductsCount: number;
}

export const useVendorAnalytics = () => {
  const { vendorId, loading: vendorLoading } = useCurrentVendor();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    if (!vendorId || vendorLoading) return;

    try {
      setLoading(true);
      console.log('📊 useVendorAnalytics - Loading for vendorId:', vendorId);

      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Récupérer les ventes d'aujourd'hui directement depuis orders
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('id, total_amount, payment_status, source')
        .eq('vendor_id', vendorId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (todayError) console.error('Error loading today orders:', todayError);

      const todaySales = todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const paidOrders = todayOrders?.filter(o => o.payment_status === 'paid').length || 0;
      const todayOrdersCount = todayOrders?.length || 0;
      const posOrders = todayOrders?.filter(o => o.source === 'pos').length || 0;
      const onlineOrders = todayOrders?.filter(o => o.source !== 'pos').length || 0;
      // Taux de conversion = commandes payées / commandes totales
      const conversionRate = todayOrdersCount > 0 
        ? (paidOrders / todayOrdersCount) * 100 
        : 0;
      // Récupérer les ventes des 7 derniers jours groupées par jour
      const { data: weekOrders, error: weekError } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('vendor_id', vendorId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (weekError) console.error('Error loading week orders:', weekError);

      // Grouper par jour pour les 7 derniers jours
      const weekDataMap = new Map<string, { total_sales: number; total_orders: number }>();
      
      // Initialiser tous les jours de la semaine
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        weekDataMap.set(dateStr, { total_sales: 0, total_orders: 0 });
      }
      
      // Agréger les ventes par jour
      weekOrders?.forEach(order => {
        const dateStr = new Date(order.created_at).toISOString().split('T')[0];
        const existing = weekDataMap.get(dateStr) || { total_sales: 0, total_orders: 0 };
        weekDataMap.set(dateStr, {
          total_sales: existing.total_sales + (order.total_amount || 0),
          total_orders: existing.total_orders + 1
        });
      });

      const weekData: DailySales[] = Array.from(weekDataMap.entries()).map(([date, data]) => ({
        date,
        total_sales: data.total_sales,
        total_orders: data.total_orders
      }));

      // Récupérer les ventes des 30 derniers jours
      const { data: monthOrders } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .eq('vendor_id', vendorId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      const monthDataMap = new Map<string, { total_sales: number; total_orders: number }>();
      monthOrders?.forEach(order => {
        const dateStr = new Date(order.created_at).toISOString().split('T')[0];
        const existing = monthDataMap.get(dateStr) || { total_sales: 0, total_orders: 0 };
        monthDataMap.set(dateStr, {
          total_sales: existing.total_sales + (order.total_amount || 0),
          total_orders: existing.total_orders + 1
        });
      });

      const monthData: DailySales[] = Array.from(monthDataMap.entries()).map(([date, data]) => ({
        date,
        total_sales: data.total_sales,
        total_orders: data.total_orders
      }));

      // Récupérer les top produits vendus
      const { data: topProductsData, error: topError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          products!inner(id, name, vendor_id)
        `)
        .eq('products.vendor_id', vendorId);

      if (topError) console.error('Error loading top products:', topError);

      // Agréger les ventes par produit
      const productSalesMap = new Map<string, { id: string; name: string; sales: number }>();
      topProductsData?.forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.products?.name || 'Produit inconnu';
        const existing = productSalesMap.get(productId);
        if (existing) {
          existing.sales += item.quantity || 1;
        } else {
          productSalesMap.set(productId, {
            id: productId,
            name: productName,
            sales: item.quantity || 1
          });
        }
      });

      const topProducts = Array.from(productSalesMap.values())
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      // Récupérer le nombre de produits actifs (physiques + numériques)
      const { count: activePhysicalCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('is_active', true);

      const { count: activeDigitalCount } = await supabase
        .from('digital_products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', vendorId)
        .eq('status', 'published');

      const activeProductsCount = (activePhysicalCount || 0) + (activeDigitalCount || 0);

      const todayAnalytics: VendorAnalytics = {
        date: today,
        totalSales: todaySales,
        totalOrders: todayOrdersCount,
        posOrders,
        onlineOrders,
        conversionRate: conversionRate
      };

      console.log('📊 Analytics loaded:', {
        todaySales,
        todayOrdersCount,
        weekDataLength: weekData.length,
        topProductsLength: topProducts.length
      });

      setAnalytics({
        today: todayAnalytics,
        week: weekData,
        month: monthData,
        topProducts,
        activeProductsCount: activeProductsCount
      });
    } catch (error) {
      console.error('Erreur chargement analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId && !vendorLoading) {
      loadAnalytics();
    }
  }, [vendorId, vendorLoading]);

  return {
    analytics,
    loading,
    reload: loadAnalytics
  };
};
