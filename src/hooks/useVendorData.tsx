import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const STATS_TIMEOUT_MS = 10000;

export interface VendorStats {
  vendorId: string;
  revenue: number;
  profit: number;
  orders_count: number;
  orders_pending: number;
  customers_count: number;
  products_count: number;
  low_stock_count: number;
  overdue_payments: number;
}

export interface Prospect {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  company?: string;
  status: string;
  estimated_value: number;
  success_probability: number;
  notes?: string;
  next_followup_date?: string;
  created_at: string;
}

export interface Interaction {
  id: string;
  prospect_id?: string;
  customer_id?: string;
  type: 'appel' | 'email' | 'meeting' | 'chat' | 'note';
  subject?: string;
  content?: string;
  scheduled_date?: string;
  completed_date?: string;
  created_at: string;
}

export interface CustomerCredit {
  id: string;
  customer_id: string;
  credit_limit: number;
  current_balance: number;
  payment_terms: number;
  is_blocked: boolean;
  customer?: {
    id: string;
    user_id: string;
  };
}

export interface PaymentSchedule {
  id: string;
  order_id: string;
  amount: number;
  due_date: string;
  status: string;
  payment_method?: string;
  paid_at?: string;
  order?: {
    order_number: string;
    customer?: {
      user_id: string;
    };
  };
}

export interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discount_type: string;
  discount_value: number;
  minimum_order_amount: number;
  usage_limit?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  requester_id: string;
  vendor_id?: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
}

export function useVendorStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const STATS_CACHE_KEY = `vendor_stats_cache_${user.id}`;

    const fetchStats = async () => {
      const startedAt = performance.now();
      console.info('[VENDOR STATS START]', { userId: user.id });

      const withTimeout = <T,>(promiseFactory: () => PromiseLike<T>, timeoutMs: number, label: string) =>
        Promise.race<T>([
          Promise.resolve().then(promiseFactory),
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label)), timeoutMs)),
        ]);

      // ✨ OFFLINE FALLBACK: si hors ligne, utiliser le cache
      if (!navigator.onLine) {
        console.info('[VENDOR STATS] Mode hors ligne - utilisation cache');
        try {
          const cached = localStorage.getItem(STATS_CACHE_KEY);
          if (cached) {
            const parsedStats = JSON.parse(cached) as VendorStats;
            setStats(parsedStats);
            console.info('[VENDOR STATS SUCCESS]', { source: 'offline_cache' });
          } else {
            setError('Données vendeur non disponibles hors ligne');
            console.warn('[VENDOR STATS FAIL]', { reason: 'no_offline_cache' });
          }
        } catch (e) {
          setError('Erreur lecture cache hors ligne');
        }
        setLoading(false);
        return;
      }

      try {
        // Get vendor ID first
        const { data: vendor } = await withTimeout(
          () =>
            supabase
              .from('vendors')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle(),
          STATS_TIMEOUT_MS,
          'vendor_lookup_timeout',
        );

        if (!vendor) {
          setError('Vendor profile not found');
          console.error('[VENDOR STATS FAIL]', { reason: 'vendor_profile_not_found', userId: user.id });
          setLoading(false);
          return;
        }

        // 🚀 PARALLEL: Fire all stats queries at once instead of sequential
        const [ordersResult, productsResult, lowStockResult, overdueResult, customerResult] = await Promise.allSettled([
          withTimeout(
            () => supabase.from('orders').select('total_amount, status, customer_id').eq('vendor_id', vendor.id),
            STATS_TIMEOUT_MS, 'orders_stats_timeout',
          ),
          withTimeout(
            () => supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', vendor.id).eq('is_active', true),
            STATS_TIMEOUT_MS, 'products_count_timeout',
          ),
          withTimeout(
            () => supabase.from('inventory').select('id, products!inner(id)', { count: 'exact', head: true }).eq('products.vendor_id', vendor.id).lt('quantity', 10),
            STATS_TIMEOUT_MS, 'low_stock_timeout',
          ),
          withTimeout(
            () => supabase.from('payment_schedules').select('id, orders!inner(vendor_id)', { count: 'exact', head: true }).eq('orders.vendor_id', vendor.id).eq('status', 'overdue'),
            STATS_TIMEOUT_MS, 'overdue_payments_timeout',
          ),
          Promise.resolve(null),
        ]);

        // Extract results safely
        const orders = ordersResult.status === 'fulfilled' ? ordersResult.value?.data : null;
        const revenue = orders?.reduce((acc: number, order: any) => acc + (order.total_amount || 0), 0) || 0;
        const orders_count = orders?.length || 0;
        const orders_pending = orders?.filter((o: any) => o.status === 'pending').length || 0;

        const uniqueCustomerIds = new Set(
          (orders || []).map((o: any) => o.customer_id).filter(Boolean)
        );
        const customers_count = uniqueCustomerIds.size;

        const products_count = productsResult.status === 'fulfilled' ? productsResult.value?.count || 0 : 0;
        const low_stock_count = lowStockResult.status === 'fulfilled' ? lowStockResult.value?.count || 0 : 0;
        const overdue_payments = overdueResult.status === 'fulfilled' ? overdueResult.value?.count || 0 : 0;

        const ESTIMATED_MARGIN_RATE = 0.2;

        const newStats: VendorStats = {
          vendorId: vendor.id,
          revenue,
          profit: revenue * ESTIMATED_MARGIN_RATE,
          orders_count,
          orders_pending,
          customers_count,
          products_count,
          low_stock_count,
          overdue_payments
        };

        setStats(newStats);

        // ✨ Persister pour le mode offline
        try {
          localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(newStats));
        } catch (e) {}

        console.info('[VENDOR STATS SUCCESS]', {
          vendorId: vendor.id,
          durationMs: Math.round(performance.now() - startedAt),
          orders_count,
          products_count,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        if (message.includes('timeout')) {
          console.error('[VENDOR STATS FAIL]', { userId: user.id, message, type: 'timeout' });
        } else {
          console.error('[VENDOR STATS FAIL]', { userId: user.id, message });
        }

        // ✨ Fallback sur cache en cas d'erreur réseau
        try {
          const cached = localStorage.getItem(STATS_CACHE_KEY);
          if (cached) {
            const parsedStats = JSON.parse(cached) as VendorStats;
            setStats(parsedStats);
            console.info('[VENDOR STATS SUCCESS]', { source: 'cache_after_error' });
            setLoading(false);
            return;
          }
        } catch (e) {}

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading, error };
}

export function useProspects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProspects = async () => {
      try {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!vendor) return;

        const { data, error: fetchError } = await supabase
          .from('prospects')
          .select('*')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setProspects(data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchProspects();
  }, [user]);

  const createProspect = async (prospectData: Omit<Prospect, 'id' | 'created_at'>) => {
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) throw new Error('Vendor not found');

      const { data, error } = await supabase
        .from('prospects')
        .insert([{ ...prospectData, vendor_id: vendor.id }])
        .select()
        .single();

      if (error) throw error;
      setProspects(prev => [data, ...prev]);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    }
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    try {
      const { data, error } = await supabase
        .from('prospects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setProspects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    }
  };

  return { prospects, loading, error, createProspect, updateProspect };
}

export function useCustomerCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchCredits = async () => {
      try {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!vendor) return;

        const { data, error: fetchError } = await supabase
          .from('customer_credits')
          .select(`
            *,
            customer:customers(
              id,
              user_id
            )
          `)
          .eq('vendor_id', vendor.id);

        if (fetchError) throw fetchError;
        setCredits(data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [user]);

  return { credits, loading, error };
}

export function usePaymentSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchSchedules = async () => {
      try {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!vendor) return;

        const { data, error: fetchError } = await supabase
          .from('payment_schedules')
          .select(`
            *,
            order:orders(
              order_number,
              customer:customers(
                user_id
              )
            )
          `)
          .eq('order.vendor_id', vendor.id)
          .order('due_date', { ascending: true });

        if (fetchError) throw fetchError;
        setSchedules(data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [user]);

  return { schedules, loading, error };
}

export function usePromoCodes() {
  const { user } = useAuth();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchPromoCodes = async () => {
      try {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!vendor) return;

        const { data, error: fetchError } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setPromoCodes(data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchPromoCodes();
  }, [user]);

  const createPromoCode = async (codeData: Omit<PromoCode, 'id' | 'used_count' | 'created_at'>) => {
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) throw new Error('Vendor not found');

      const { data, error } = await supabase
        .from('promo_codes')
        .insert([{ ...codeData, vendor_id: vendor.id }])
        .select()
        .single();

      if (error) throw error;
      setPromoCodes(prev => [data, ...prev]);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    }
  };

  return { promoCodes, loading, error, createPromoCode };
}

export function useSupportTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchTickets = async () => {
      try {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!vendor) return;

        const { data, error: fetchError } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false});

        if (fetchError) throw fetchError;
        setTickets(data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user]);

  const updateTicketStatus = async (id: string, status: string) => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      throw err;
    }
  };

  return { tickets, loading, error, updateTicketStatus };
}