/**
 * Hook pour récupérer les statistiques réelles du PDG depuis Supabase
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PDGStats {
  // Utilisateurs
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowth: number;

  // Finances
  totalRevenue: string;
  revenueThisMonth: number;
  revenueGrowth: number;

  // Commandes
  totalOrders: number;
  ordersThisMonth: number;
  ordersGrowth: number;
  pendingOrders: number;

  // Conversions
  conversionRate: number;
  conversionGrowth: number;

  // Produits
  totalProducts: number;
  activeProducts: number;

  // Vendeurs
  totalVendors: number;
  activeVendors: number;

  // Livreurs
  totalDrivers: number;
  onlineDrivers: number;

  // Alertes
  criticalAlerts: number;
  pendingValidations: number;

  loading: boolean;
  error: string | null;
}

export function usePDGStats() {
  const [stats, setStats] = useState<PDGStats>({
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
    conversionRate: 0,
    conversionGrowth: 0,
    totalProducts: 0,
    activeProducts: 0,
    totalVendors: 0,
    activeVendors: 0,
    totalDrivers: 0,
    onlineDrivers: 0,
    criticalAlerts: 0,
    pendingValidations: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true, error: null }));

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Requêtes parallèles pour performance
      const [
        profilesRes,
        ordersRes,
        ordersThisMonthRes,
        ordersLastMonthRes,
        transactionsRes,
        productsRes,
        vendorsRes,
        driversRes,
        apiAlertsRes
      ] = await Promise.all([
        // Utilisateurs
        supabase.from('profiles').select('id, created_at', { count: 'exact' }),
        
        // Commandes totales
        supabase.from('orders').select('id, status', { count: 'exact' }),
        
        // Commandes ce mois
        supabase.from('orders').select('id', { count: 'exact' })
          .gte('created_at', firstDayOfMonth.toISOString()),
        
        // Commandes mois dernier
        supabase.from('orders').select('id', { count: 'exact' })
          .gte('created_at', firstDayOfLastMonth.toISOString())
          .lte('created_at', lastDayOfLastMonth.toISOString()),
        
        // Transactions pour revenue
        supabase.from('enhanced_transactions')
          .select('amount, created_at, status')
          .eq('status', 'completed'),
        
        // Produits
        supabase.from('products').select('id, is_active', { count: 'exact' }),
        
        // Vendeurs
        supabase.from('vendors').select('id, is_active', { count: 'exact' }),
        
        // Livreurs
        supabase.from('drivers').select('id, is_online', { count: 'exact' }),
        
        // Alertes API
        supabase.from('api_alerts')
          .select('id', { count: 'exact' })
          .eq('is_resolved', false)
          .in('severity', ['critical', 'high'])
      ]);

      // Calculer les statistiques
      const totalUsers = profilesRes.count || 0;
      const newUsersThisMonth = profilesRes.data?.filter(p => 
        new Date(p.created_at) >= firstDayOfMonth
      ).length || 0;
      const newUsersLastMonth = profilesRes.data?.filter(p => {
        const date = new Date(p.created_at);
        return date >= firstDayOfLastMonth && date <= lastDayOfLastMonth;
      }).length || 0;
      const userGrowth = newUsersLastMonth > 0 
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100)
        : 0;

      // Commandes
      const totalOrders = ordersRes.count || 0;
      const pendingOrders = ordersRes.data?.filter(o => o.status === 'pending').length || 0;
      const ordersThisMonth = ordersThisMonthRes.count || 0;
      const ordersLastMonth = ordersLastMonthRes.count || 0;
      const ordersGrowth = ordersLastMonth > 0
        ? ((ordersThisMonth - ordersLastMonth) / ordersLastMonth * 100)
        : 0;

      // Revenue
      const completedTransactions = transactionsRes.data || [];
      const totalRevenueAmount = completedTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const revenueThisMonth = completedTransactions
        .filter(t => new Date(t.created_at) >= firstDayOfMonth)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const revenueLastMonth = completedTransactions
        .filter(t => {
          const date = new Date(t.created_at);
          return date >= firstDayOfLastMonth && date <= lastDayOfLastMonth;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const revenueGrowth = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100)
        : 0;

      // Produits
      const totalProducts = productsRes.count || 0;
      const activeProducts = productsRes.data?.filter(p => p.is_active).length || 0;

      // Vendeurs
      const totalVendors = vendorsRes.count || 0;
      const activeVendors = vendorsRes.data?.filter(v => v.is_active).length || 0;

      // Livreurs
      const totalDrivers = driversRes.count || 0;
      const onlineDrivers = driversRes.data?.filter(d => d.is_online).length || 0;

      // Taux de conversion (commandes / utilisateurs)
      const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers * 100) : 0;

      setStats({
        totalUsers,
        activeUsers: totalUsers, // Pour l'instant tous actifs
        newUsersThisMonth,
        userGrowth: Math.round(userGrowth * 10) / 10,
        totalRevenue: `${(totalRevenueAmount / 1000000).toFixed(1)}M GNF`,
        revenueThisMonth,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        totalOrders,
        ordersThisMonth,
        ordersGrowth: Math.round(ordersGrowth * 10) / 10,
        pendingOrders,
        conversionRate: Math.round(conversionRate * 10) / 10,
        conversionGrowth: 0.5, // À calculer avec historique
        totalProducts,
        activeProducts,
        totalVendors,
        activeVendors,
        totalDrivers,
        onlineDrivers,
        criticalAlerts: apiAlertsRes.count || 0,
        pendingValidations: pendingOrders,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Erreur chargement stats PDG:', error);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  return { ...stats, refresh: loadStats };
}
