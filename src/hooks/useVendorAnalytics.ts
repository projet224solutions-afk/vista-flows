import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVendor } from './useCurrentVendor';

export interface VendorAnalytics {
  date: string;
  totalSales: number;
  totalOrders: number;
  conversionRate: number;
}

export interface AnalyticsSummary {
  today: VendorAnalytics;
  week: VendorAnalytics[];
  month: VendorAnalytics[];
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
  }>;
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

      // Récupérer les analytics d'aujourd'hui
      const { data: todayData, error: todayError } = await supabase
        .from('vendor_analytics' as any)
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();
      
      if (todayError) console.error('Error loading today analytics:', todayError);

      // Récupérer les 7 derniers jours
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weekData } = await supabase
        .from('vendor_analytics' as any)
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Récupérer les 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: monthData } = await supabase
        .from('vendor_analytics' as any)
        .select('*')
        .eq('vendor_id', vendorId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Récupérer les produits les plus vendus
      const { data: topProducts } = await supabase
        .from('payment_links' as any)
        .select('product_name, id')
        .eq('vendor_id', vendorId)
        .eq('status', 'completed')
        .limit(5);

      const todayAnalytics: VendorAnalytics = {
        date: (todayData as any)?.date || new Date().toISOString().split('T')[0],
        totalSales: (todayData as any)?.total_sales || 0,
        totalOrders: (todayData as any)?.total_orders || 0,
        conversionRate: (todayData as any)?.conversion_rate || 0
      };

      setAnalytics({
        today: todayAnalytics,
        week: (weekData as any) || [],
        month: (monthData as any) || [],
        topProducts: topProducts?.map((p: any) => ({
          id: p.id,
          name: p.product_name,
          sales: 0
        })) || []
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
