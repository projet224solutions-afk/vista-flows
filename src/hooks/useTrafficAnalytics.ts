import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';

export interface TrafficStats {
  totalProductViews: number;
  uniqueProductViewers: number;
  totalShopVisits: number;
  uniqueShopVisitors: number;
  todayProductViews: number;
  todayShopVisits: number;
  weeklyTrend: Array<{
    date: string;
    productViews: number;
    shopVisits: number;
  }>;
  topProducts: Array<{
    product_id: string;
    views: number;
  }>;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  cityBreakdown: Record<string, number>;
}

/**
 * Hook pour récupérer les analytics de trafic (vues produits, visites boutique)
 */
export function useTrafficAnalytics() {
  const { vendorId, loading: vendorLoading } = useCurrentVendor();
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Charger les statistiques agrégées depuis analytics_daily_stats
      const { data: dailyStats, error: dailyError } = await supabase
        .from('analytics_daily_stats')
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('stat_date', thirtyDaysAgoStr)
        .order('stat_date', { ascending: false });

      if (dailyError) {
        console.error('Erreur chargement analytics_daily_stats:', dailyError);
      }

      // Calculer les totaux
      const statsData = dailyStats || [];
      
      // Stats aujourd'hui
      const todayStats = statsData.find(s => s.stat_date === today);
      
      // Stats 7 derniers jours pour le trend
      const weeklyData = statsData
        .filter(s => s.stat_date >= sevenDaysAgoStr)
        .sort((a, b) => a.stat_date.localeCompare(b.stat_date))
        .map(s => ({
          date: s.stat_date,
          productViews: s.total_product_views || 0,
          shopVisits: s.total_shop_visits || 0
        }));

      // Totaux sur 30 jours
      const totalProductViews = statsData.reduce((sum, s) => sum + (s.total_product_views || 0), 0);
      const uniqueProductViewers = statsData.reduce((sum, s) => sum + (s.unique_product_viewers || 0), 0);
      const totalShopVisits = statsData.reduce((sum, s) => sum + (s.total_shop_visits || 0), 0);
      const uniqueShopVisitors = statsData.reduce((sum, s) => sum + (s.unique_shop_visitors || 0), 0);

      // Agrégation device, country et city
      const deviceBreakdown: Record<string, number> = {};
      const countryBreakdown: Record<string, number> = {};
      const cityBreakdown: Record<string, number> = {};
      const topProductsMap: Record<string, number> = {};

      statsData.forEach(s => {
        // Device breakdown
        if (s.device_breakdown && typeof s.device_breakdown === 'object') {
          Object.entries(s.device_breakdown as Record<string, number>).forEach(([device, count]) => {
            deviceBreakdown[device] = (deviceBreakdown[device] || 0) + count;
          });
        }
        
        // Country breakdown
        if (s.country_breakdown && typeof s.country_breakdown === 'object') {
          Object.entries(s.country_breakdown as Record<string, number>).forEach(([country, count]) => {
            countryBreakdown[country] = (countryBreakdown[country] || 0) + count;
          });
        }

        // City breakdown
        if (s.city_breakdown && typeof s.city_breakdown === 'object') {
          Object.entries(s.city_breakdown as Record<string, number>).forEach(([city, count]) => {
            cityBreakdown[city] = (cityBreakdown[city] || 0) + count;
          });
        }
        
        // Top products
        if (s.top_products && Array.isArray(s.top_products)) {
          (s.top_products as Array<{ product_id: string; views: number }>).forEach(p => {
            topProductsMap[p.product_id] = (topProductsMap[p.product_id] || 0) + p.views;
          });
        }
      });

      const topProducts = Object.entries(topProductsMap)
        .map(([product_id, views]) => ({ product_id, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      setStats({
        totalProductViews,
        uniqueProductViewers,
        totalShopVisits,
        uniqueShopVisitors,
        todayProductViews: todayStats?.total_product_views || 0,
        todayShopVisits: todayStats?.total_shop_visits || 0,
        weeklyTrend: weeklyData,
        topProducts,
        deviceBreakdown,
        countryBreakdown,
        cityBreakdown
      });

    } catch (err) {
      console.error('Erreur chargement traffic analytics:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (vendorLoading) return;
    loadStats();
  }, [vendorId, vendorLoading, loadStats]);

  return {
    stats,
    loading: loading || vendorLoading,
    error,
    refresh: loadStats
  };
}
