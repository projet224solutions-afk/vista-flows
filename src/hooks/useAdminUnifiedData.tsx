import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export function useAdminUnifiedData(enabled: boolean = true) {
  const [data, setData] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    userGrowth: 0,
    totalRevenue: '0 GNF',
    revenueThisMonth: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    ordersThisMonth: 0,
    ordersGrowth: 0,
    pendingOrders: 0,
    pendingValidations: 0,
    conversionRate: 0,
    conversionGrowth: 0,
    totalProducts: 0,
    activeProducts: 0,
    totalVendors: 0,
    activeVendors: 0,
    totalDrivers: 0,
    onlineDrivers: 0,
    criticalAlerts: 0,
    totalAgents: 0,
    activeAgents: 0,
    totalBureaus: 0,
    validatedBureaus: 0,
    totalServices: 15,
    activeServices: 15,
  });
  
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer toutes les statistiques en parallèle
      const [
        usersResult,
        ordersResult,
        productsResult,
        vendorsResult,
        driversResult,
        alertsResult,
        agentsResult,
        bureausResult,
        walletsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at, status', { count: 'exact' }),
        supabase.from('orders').select('id, total_amount, status, created_at', { count: 'exact' }),
        supabase.from('products').select('id, is_active', { count: 'exact' }),
        supabase.from('vendors').select('id, is_verified', { count: 'exact' }),
        supabase.from('drivers').select('id, is_online, is_verified', { count: 'exact' }),
        supabase.from('api_alerts').select('id, severity', { count: 'exact' }).eq('severity', 'critical').eq('is_resolved', false),
        supabase.from('agents_management').select('id, is_active', { count: 'exact' }),
        supabase.from('bureaus').select('id, validated_at', { count: 'exact' }),
        supabase.from('wallets').select('balance'),
      ]);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Utilisateurs
      const totalUsers = usersResult.count || 0;
      const activeUsers = usersResult.data?.filter(u => u.status === 'active').length || 0;
      const newUsersThisMonth = usersResult.data?.filter(u => 
        new Date(u.created_at) >= firstDayOfMonth
      ).length || 0;
      const newUsersLastMonth = usersResult.data?.filter(u => {
        const createdAt = new Date(u.created_at);
        return createdAt >= firstDayOfLastMonth && createdAt < firstDayOfMonth;
      }).length || 0;
      const userGrowth = newUsersLastMonth > 0 
        ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100)
        : 0;

      // Commandes
      const totalOrders = ordersResult.count || 0;
      const ordersThisMonth = ordersResult.data?.filter(o => 
        new Date(o.created_at) >= firstDayOfMonth
      ).length || 0;
      const ordersLastMonth = ordersResult.data?.filter(o => {
        const createdAt = new Date(o.created_at);
        return createdAt >= firstDayOfLastMonth && createdAt < firstDayOfMonth;
      }).length || 0;
      const ordersGrowth = ordersLastMonth > 0
        ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100)
        : 0;
      const pendingOrders = ordersResult.data?.filter(o => o.status === 'pending').length || 0;

      // Revenus
      const revenueThisMonth = ordersResult.data
        ?.filter(o => new Date(o.created_at) >= firstDayOfMonth)
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
      const revenueLastMonth = ordersResult.data
        ?.filter(o => {
          const createdAt = new Date(o.created_at);
          return createdAt >= firstDayOfLastMonth && createdAt < firstDayOfMonth;
        })
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
      
      const totalRevenue = walletsResult.data?.reduce((sum, w) => sum + (Number(w.balance) || 0), 0) || 0;
      const revenueGrowth = revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
        : 0;

      // Produits
      const totalProducts = productsResult.count || 0;
      const activeProducts = productsResult.data?.filter(p => p.is_active).length || 0;

      // Vendeurs
      const totalVendors = vendorsResult.count || 0;
      const activeVendors = vendorsResult.data?.filter(v => v.is_verified).length || 0;

      // Livreurs
      const totalDrivers = driversResult.count || 0;
      const onlineDrivers = driversResult.data?.filter(d => d.is_online && d.is_verified).length || 0;

      // Alertes
      const criticalAlerts = alertsResult.count || 0;

      // Agents
      const totalAgents = agentsResult.count || 0;
      const activeAgents = agentsResult.data?.filter(a => a.is_active).length || 0;

      // Bureaux
      const totalBureaus = bureausResult.count || 0;
      const validatedBureaus = bureausResult.data?.filter(b => b.validated_at).length || 0;

      // Services professionnels (15 types disponibles)
      const totalServices = 15;
      const activeServices = 15;

      // Taux de conversion
      const conversionRate = totalUsers > 0 ? Number(((totalOrders / totalUsers) * 100).toFixed(1)) : 0;
      
      setData({
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        userGrowth,
        totalRevenue: `${totalRevenue.toLocaleString('fr-GN')} GNF`,
        revenueThisMonth,
        revenueGrowth,
        totalOrders,
        ordersThisMonth,
        ordersGrowth,
        pendingOrders,
        pendingValidations: pendingOrders,
        conversionRate,
        conversionGrowth: 0,
        totalProducts,
        activeProducts,
        totalVendors,
        activeVendors,
        totalDrivers,
        onlineDrivers,
        criticalAlerts,
        totalAgents,
        activeAgents,
        totalBureaus,
        validatedBureaus,
        totalServices,
        activeServices,
      });
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les données');
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [enabled]);

  return {
    ...data,
    loading,
    error,
    refresh: fetchData,
  };
}
