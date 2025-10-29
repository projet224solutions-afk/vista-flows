/**
 * Hook pour les rapports et analytics PDG - DONNÉES RÉELLES
 * Récupère les statistiques depuis enhanced_transactions, profiles, orders, products
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalyticsDataPoint {
  period: string;
  revenue: number;
  transactions: number;
  users: number;
}

interface Stats {
  totalRevenue: number;
  revenueGrowth: number;
  totalTransactions: number;
  transactionsGrowth: number;
  totalUsers: number;
  usersGrowth: number;
  totalOrders: number;
  averageTransactionValue: number;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

interface TopVendor {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

export function usePDGReportsData(timeRange: '7d' | '30d' | '90d') {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDataPoint[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalTransactions: 0,
    transactionsGrowth: 0,
    totalUsers: 0,
    usersGrowth: 0,
    totalOrders: 0,
    averageTransactionValue: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📊 Chargement des données de rapports pour:', timeRange);

      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);

      // Récupérer les transactions
      const { data: transactions, error: transError } = await supabase
        .from('enhanced_transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      if (transError) throw transError;

      // Récupérer les transactions de la période précédente
      const { data: prevTransactions } = await supabase
        .from('enhanced_transactions')
        .select('*')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
        .eq('status', 'completed');

      // Calculer les stats
      const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const prevRevenue = prevTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;

      const totalTransactions = transactions?.length || 0;
      const prevTotalTransactions = prevTransactions?.length || 0;
      const transactionsGrowth = prevTotalTransactions > 0 
        ? ((totalTransactions - prevTotalTransactions) / prevTotalTransactions * 100) 
        : 0;

      // Récupérer les utilisateurs
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      const { data: prevUsersData } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const totalUsers = usersData?.length || 0;
      const prevTotalUsers = prevUsersData?.length || 0;
      const usersGrowth = prevTotalUsers > 0 
        ? ((totalUsers - prevTotalUsers) / prevTotalUsers * 100) 
        : 0;

      // Récupérer les commandes
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total_amount')
        .gte('created_at', startDate.toISOString());

      const totalOrders = ordersData?.length || 0;
      const averageTransactionValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalRevenue,
        revenueGrowth,
        totalTransactions,
        transactionsGrowth,
        totalUsers,
        usersGrowth,
        totalOrders,
        averageTransactionValue,
      });

      // Préparer les données pour les graphiques
      const dailyData: { [key: string]: AnalyticsDataPoint } = {};
      
      transactions?.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'short' 
        });
        if (!dailyData[date]) {
          dailyData[date] = { period: date, revenue: 0, transactions: 0, users: 0 };
        }
        dailyData[date].revenue += Number(t.amount);
        dailyData[date].transactions += 1;
      });

      usersData?.forEach(u => {
        const date = new Date(u.created_at).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'short' 
        });
        if (!dailyData[date]) {
          dailyData[date] = { period: date, revenue: 0, transactions: 0, users: 0 };
        }
        dailyData[date].users += 1;
      });

      setAnalyticsData(Object.values(dailyData).slice(-10));

      // Top produits
      const { data: topProductsData } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          products!inner(id, name, price)
        `)
        .gte('created_at', startDate.toISOString());

      const productStats: { [key: string]: { name: string; sales: number; revenue: number } } = {};
      
      topProductsData?.forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.products?.name || 'Produit inconnu';
        const price = Number(item.products?.price || 0);
        
        if (!productStats[productId]) {
          productStats[productId] = { name: productName, sales: 0, revenue: 0 };
        }
        productStats[productId].sales += item.quantity;
        productStats[productId].revenue += item.quantity * price;
      });

      const sortedProducts = Object.entries(productStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTopProducts(sortedProducts);

      // Top vendeurs
      const { data: topVendorsData } = await supabase
        .from('orders')
        .select(`
          vendor_id,
          total_amount,
          vendors!inner(id, business_name)
        `)
        .gte('created_at', startDate.toISOString());

      const vendorStats: { [key: string]: { name: string; sales: number; revenue: number } } = {};
      
      topVendorsData?.forEach((order: any) => {
        const vendorId = order.vendor_id;
        const vendorName = order.vendors?.business_name || 'Vendeur inconnu';
        
        if (!vendorStats[vendorId]) {
          vendorStats[vendorId] = { name: vendorName, sales: 0, revenue: 0 };
        }
        vendorStats[vendorId].sales += 1;
        vendorStats[vendorId].revenue += Number(order.total_amount || 0);
      });

      const sortedVendors = Object.entries(vendorStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTopVendors(sortedVendors);

      console.log('✅ Données de rapports chargées:', {
        totalRevenue,
        totalTransactions,
        totalUsers,
        topProducts: sortedProducts.length,
        topVendors: sortedVendors.length
      });

    } catch (error: any) {
      console.error('❌ Erreur chargement données rapports:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      const csvData = [
        ['Période', 'Revenu (GNF)', 'Transactions', 'Nouveaux Utilisateurs'],
        ...analyticsData.map(d => [d.period, d.revenue, d.transactions, d.users])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Rapport exporté avec succès');
    } catch (error) {
      console.error('❌ Erreur export CSV:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  return {
    analyticsData,
    stats,
    topProducts,
    topVendors,
    loading,
    exportToCSV,
    refetch: loadData,
  };
}
