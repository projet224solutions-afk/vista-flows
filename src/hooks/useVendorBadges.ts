import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VendorBadges {
  pendingOrders: number;
  activeProspects: number;
  unreadExpenseAlerts: number;
  openTickets: number;
}

export function useVendorBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<VendorBadges>({
    pendingOrders: 0,
    activeProspects: 0,
    unreadExpenseAlerts: 0,
    openTickets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBadges = async () => {
      try {
        // Get vendor ID
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!vendor) {
          setLoading(false);
          return;
        }

        // Fetch pending orders count
        const { count: pendingOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('status', 'pending');

        // Fetch active prospects count
        const { count: activeProspectsCount } = await supabase
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .in('status', ['new', 'contacted', 'qualified']);

        // Fetch unread expense alerts count
        const { count: unreadAlertsCount } = await supabase
          .from('expense_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('is_read', false);

        // Fetch open support tickets count
        const { count: openTicketsCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .in('status', ['open', 'in_progress']);

        setBadges({
          pendingOrders: pendingOrdersCount || 0,
          activeProspects: activeProspectsCount || 0,
          unreadExpenseAlerts: unreadAlertsCount || 0,
          openTickets: openTicketsCount || 0
        });
      } catch (error) {
        console.error('Error fetching vendor badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();

    // Set up realtime subscription for updates
    const channel = supabase
      .channel('vendor-badges-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        () => fetchBadges()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'prospects' }, 
        () => fetchBadges()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'expense_alerts' }, 
        () => fetchBadges()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'support_tickets' }, 
        () => fetchBadges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { badges, loading };
}
