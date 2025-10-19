import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface VendorBadges {
  pendingOrders: number;
  unreadExpenseAlerts: number;
  totalProducts: number;
  lowStockProducts: number;
}

export function useVendorBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<VendorBadges>({
    pendingOrders: 0,
    unreadExpenseAlerts: 0,
    totalProducts: 0,
    lowStockProducts: 0
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
        const { count: pendingOrdersCount, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('status', 'pending');

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
        }

        // Fetch unread expense alerts count
        const { count: unreadAlertsCount, error: alertsError } = await supabase
          .from('expense_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('is_read', false);

        if (alertsError) {
          console.error('Error fetching expense alerts:', alertsError);
        }

        // Fetch products count
        const { count: productsCount, error: productsError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
          .eq('is_active', true);

        if (productsError) {
          console.error('Error fetching products:', productsError);
        }

        // Fetch low stock products count
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select('id, quantity, minimum_stock, product_id, products!inner(vendor_id)')
          .eq('products.vendor_id', vendor.id);

        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
        }

        const lowStockCount = inventoryData?.filter(item => 
          item.quantity <= item.minimum_stock && item.quantity > 0
        ).length || 0;

        setBadges({
          pendingOrders: pendingOrdersCount || 0,
          unreadExpenseAlerts: unreadAlertsCount || 0,
          totalProducts: productsCount || 0,
          lowStockProducts: lowStockCount
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
        { event: '*', schema: 'public', table: 'expense_alerts' }, 
        () => fetchBadges()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inventory' }, 
        () => fetchBadges()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' }, 
        () => fetchBadges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { badges, loading };
}
