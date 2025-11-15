import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VendorStats {
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
  customer_id: string;
  order_id?: string;
  product_id?: string;
  subject: string;
  description?: string;
  priority: string;
  status: string;
  assigned_to?: string;
  resolution?: string;
  created_at: string;
  customer?: {
    user_id: string;
  };
  product?: {
    name: string;
  };
}

export function useVendorStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // Get vendor ID first
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!vendor) {
          setError('Vendor profile not found');
          return;
        }

        // Fetch revenue and orders stats
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, status')
          .eq('vendor_id', vendor.id);

        const revenue = orders?.reduce((acc, order) => acc + (order.total_amount || 0), 0) || 0;
        const orders_count = orders?.length || 0;
        const orders_pending = orders?.filter(o => o.status === 'pending').length || 0;

        // Fetch products count
        const { count: products_count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('is_active', true);

        // Fetch low stock count
        const { count: low_stock_count } = await supabase
          .from('inventory')
          .select('*, products!inner(*)', { count: 'exact', head: true })
          .eq('products.vendor_id', vendor.id)
          .lt('quantity', 10);

        // Fetch overdue payments
        const { count: overdue_payments } = await supabase
          .from('payment_schedules')
          .select('*, orders!inner(*)', { count: 'exact', head: true })
          .eq('orders.vendor_id', vendor.id)
          .eq('status', 'overdue');

        // Fetch customers count (approximate)
        const { count: customers_count } = await supabase
          .from('orders')
          .select('customer_id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id);

        setStats({
          revenue,
          profit: revenue * 0.2, // Example: 20% profit margin
          orders_count,
          orders_pending,
          customers_count: customers_count || 0,
          products_count: products_count || 0,
          low_stock_count: low_stock_count || 0,
          overdue_payments: overdue_payments || 0
        });
      } catch (err) {
        setError(err.message);
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
      } catch (err) {
        setError(err.message);
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
    } catch (err) {
      setError(err.message);
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
    } catch (err) {
      setError(err.message);
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
      } catch (err) {
        setError(err.message);
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
      } catch (err) {
        setError(err.message);
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
      } catch (err) {
        setError(err.message);
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
    } catch (err) {
      setError(err.message);
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
          .select(`
            *,
            customer:customers(
              user_id
            ),
            product:products(
              name
            )
          `)
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        const ticketsList = (data || []).map(ticket => {
          const productName = typeof ticket.product === 'object' && ticket.product && 'name' in ticket.product 
            ? (ticket.product as any).name 
            : 'N/A';
          
          return {
            ...ticket,
            customer_id: ticket.requester_id,
            customer: { user_id: ticket.requester_id },
            product: { name: productName }
          };
        });
        setTickets(ticketsList);
      } catch (err) {
        setError(err.message);
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
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { tickets, loading, error, updateTicketStatus };
}