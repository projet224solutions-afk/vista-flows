import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer les analytics d'aujourd'hui
      const { data: todayData } = await supabase
        .from('vendor_analytics')
        .select('*')
        .eq('vendor_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      // Récupérer les 7 derniers jours
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: weekData } = await supabase
        .from('vendor_analytics')
        .select('*')
        .eq('vendor_id', user.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Récupérer les 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: monthData } = await supabase
        .from('vendor_analytics')
        .select('*')
        .eq('vendor_id', user.id)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Récupérer les produits les plus vendus
      const { data: topProducts } = await supabase
        .from('payment_links')
        .select('product_name, id')
        .eq('vendor_id', user.id)
        .eq('status', 'completed')
        .limit(5);

      setAnalytics({
        today: todayData || {
          date: new Date().toISOString().split('T')[0],
          totalSales: 0,
          totalOrders: 0,
          conversionRate: 0
        },
        week: weekData || [],
        month: monthData || [],
        topProducts: topProducts?.map(p => ({
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
    loadAnalytics();
  }, [user]);

  return {
    analytics,
    loading,
    reload: loadAnalytics
  };
};
