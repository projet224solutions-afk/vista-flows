// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type LoadState<T> = { data: T | null; loading: boolean; error?: string | null };

export interface AdminUnifiedData {
  profiles: LoadState<unknown[]>;
  products: LoadState<unknown[]>;
  orders: LoadState<unknown[]>;
  transactions: LoadState<unknown[]>;
  pdgManagement: LoadState<unknown[]>;
  agentsManagement: LoadState<unknown[]>;
  refresh: () => Promise<void>;
  
  // Statistiques calculées
  loading: boolean;
  error: string | null;
  totalUsers: number;
  totalRevenue: string;
  revenueGrowth: number;
  userGrowth: number;
  newUsersThisMonth: number;
  totalUsersCreatedByAgents: number;
  agentCreatedUsersGrowth: number;
  agentCreatedUsersThisMonth: number;
  totalOrders: number;
  ordersGrowth: number;
  ordersThisMonth: number;
  conversionRate: number;
  conversionGrowth: number;
  criticalAlerts: number;
  totalVendors: number;
  activeVendors: number;
  pendingKYC: number;
  totalPaymentLinks: number;
  successfulPayments: number;
}

export function useAdminUnifiedData(enabled: boolean): AdminUnifiedData {
  const [profiles, setProfiles] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [products, setProducts] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [orders, setOrders] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [transactions, setTransactions] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [pdgManagement, setPdgManagement] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [agentsManagement, setAgentsManagement] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [vendors, setVendors] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [paymentLinks, setPaymentLinks] = useState<LoadState<unknown[]>>({ data: null, loading: true });

  const load = async () => {
    if (!enabled) return;
    setProfiles((p) => ({ ...p, loading: true }));
    setProducts((p) => ({ ...p, loading: true }));
    setOrders((p) => ({ ...p, loading: true }));
    setTransactions((p) => ({ ...p, loading: true }));
    setPdgManagement((p) => ({ ...p, loading: true }));
    setAgentsManagement((p) => ({ ...p, loading: true }));
    setVendors((p) => ({ ...p, loading: true }));
    setPaymentLinks((p) => ({ ...p, loading: true }));

    try {
      const [profRes, prodRes, ordRes, txnRes, pdgRes, agRes, vendRes, payRes] = await Promise.all([
        supabase.from('profiles').select('*').limit(1000),
        supabase.from('products').select('*').limit(1000),
        supabase.from('orders').select('*').limit(1000),
        supabase.from('transactions').select('*').limit(1000),
        supabase.from('pdg_management').select('*').limit(1000),
        supabase.from('agents_management').select('*').limit(1000),
        supabase.from('vendors').select('*').limit(1000),
        supabase.from('payment_links').select('*').limit(1000),
      ]);

      setProfiles({ data: profRes.data || [], loading: false, error: profRes.error?.message });
      setProducts({ data: prodRes.data || [], loading: false, error: prodRes.error?.message });
      setOrders({ data: ordRes.data || [], loading: false, error: ordRes.error?.message });
      setTransactions({ data: txnRes.data || [], loading: false, error: txnRes.error?.message });
      setPdgManagement({ data: pdgRes.data || [], loading: false, error: pdgRes.error?.message });
      setAgentsManagement({ data: agRes.data || [], loading: false, error: agRes.error?.message });
      setVendors({ data: vendRes.data || [], loading: false, error: vendRes.error?.message });
      setPaymentLinks({ data: payRes.data || [], loading: false, error: payRes.error?.message });
    } catch (e: unknown) {
      const msg = e?.message || String(e);
      setProfiles({ data: [], loading: false, error: msg });
      setProducts({ data: [], loading: false, error: msg });
      setOrders({ data: [], loading: false, error: msg });
      setTransactions({ data: [], loading: false, error: msg });
      setPdgManagement({ data: [], loading: false, error: msg });
      setAgentsManagement({ data: [], loading: false, error: msg });
      setVendors({ data: [], loading: false, error: msg });
      setPaymentLinks({ data: [], loading: false, error: msg });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Utilisateurs
    const totalUsers = profiles.data?.length || 0;
    const usersThisMonth = profiles.data?.filter((p: any) => 
      new Date(p.created_at) >= thisMonth
    ).length || 0;
    const usersLastMonth = profiles.data?.filter((p: any) => {
      const date = new Date(p.created_at);
      return date >= lastMonth && date < thisMonth;
    }).length || 0;
    const userGrowth = usersLastMonth > 0 
      ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : 0;

    // Utilisateurs créés par les agents
    const totalUsersCreatedByAgents = profiles.data?.filter((p: any) => p.created_by_agent).length || 0;
    const agentCreatedUsersThisMonth = profiles.data?.filter((p: any) => 
      p.created_by_agent && new Date(p.created_at) >= thisMonth
    ).length || 0;
    const agentCreatedUsersLastMonth = profiles.data?.filter((p: any) => {
      const date = new Date(p.created_at);
      return p.created_by_agent && date >= lastMonth && date < thisMonth;
    }).length || 0;
    const agentCreatedUsersGrowth = agentCreatedUsersLastMonth > 0
      ? Math.round(((agentCreatedUsersThisMonth - agentCreatedUsersLastMonth) / agentCreatedUsersLastMonth) * 100)
      : 0;

    // Commandes
    const totalOrders = orders.data?.length || 0;
    const ordersThisMonth = orders.data?.filter((o: any) => 
      new Date(o.created_at) >= thisMonth
    ).length || 0;
    const ordersLastMonth = orders.data?.filter((o: any) => {
      const date = new Date(o.created_at);
      return date >= lastMonth && date < thisMonth;
    }).length || 0;
    const ordersGrowth = ordersLastMonth > 0
      ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100)
      : 0;

    // Revenus
    const totalRevenueAmount = orders.data?.reduce((sum: number, o: any) => 
      sum + (o.total_amount || 0), 0
    ) || 0;
    const revenueThisMonth = orders.data?.filter((o: any) => 
      new Date(o.created_at) >= thisMonth
    ).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
    const revenueLastMonth = orders.data?.filter((o: any) => {
      const date = new Date(o.created_at);
      return date >= lastMonth && date < thisMonth;
    }).reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
    const revenueGrowth = revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : 0;

    // Vendeurs
    const totalVendors = vendors.data?.length || 0;
    const activeVendors = vendors.data?.filter((v: any) => v.is_active).length || 0;
    const pendingKYC = vendors.data?.filter((v: any) => !v.kyc_verified).length || 0;

    // Payment Links
    const totalPaymentLinks = paymentLinks.data?.length || 0;
    const successfulPayments = paymentLinks.data?.filter((p: any) => p.status === 'success').length || 0;

    // Taux de conversion
    const conversionRate = totalUsers > 0 
      ? Math.round((totalOrders / totalUsers) * 100)
      : 0;

    // Alertes critiques (basé sur les utilisateurs non vérifiés KYC)
    const criticalAlerts = pendingKYC;

    return {
      loading: profiles.loading || orders.loading || vendors.loading || paymentLinks.loading,
      error: profiles.error || orders.error || vendors.error || paymentLinks.error,
      totalUsers,
      totalRevenue: `${totalRevenueAmount.toLocaleString()} GNF`,
      revenueGrowth,
      userGrowth,
      newUsersThisMonth: usersThisMonth,
      totalUsersCreatedByAgents,
      agentCreatedUsersGrowth,
      agentCreatedUsersThisMonth,
      totalOrders,
      ordersGrowth,
      ordersThisMonth,
      conversionRate,
      conversionGrowth: 0, // Calculé si besoin
      criticalAlerts,
      totalVendors,
      activeVendors,
      pendingKYC,
      totalPaymentLinks,
      successfulPayments
    };
  }, [profiles, orders, vendors, paymentLinks]);

  return { 
    profiles, 
    products, 
    orders, 
    transactions, 
    pdgManagement, 
    agentsManagement, 
    refresh: load,
    ...stats
  };
}


