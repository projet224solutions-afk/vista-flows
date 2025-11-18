import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

interface UseSupabaseQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export const useSupabaseQuery = <T,>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  dependencies: unknown[] = [],
  options: UseSupabaseQueryOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | null>(null);

  const { enabled = true, refetchInterval } = options;

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const executeQuery = async () => {
      try {
        setLoading(true);
        const result = await queryFn();

        if (!isMounted) return;

        if (result.error) {
          setError(result.error);
          setData(null);
        } else {
          setData(result.data);
          setError(null);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err as PostgrestError);
        setData(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    executeQuery();

    return () => {
      isMounted = false;
    };
  }, [enabled, ...dependencies]);

  // Set up refetch interval if specified
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(async () => {
      try {
        setLoading(true);
        const result = await queryFn();

        if (result.error) {
          setError(result.error);
          setData(null);
        } else {
          setData(result.data);
          setError(null);
        }
      } catch (err) {
        setError(err as PostgrestError);
        setData(null);
      } finally {
        setLoading(false);
      }
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled]);

  const refetch = async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const result = await queryFn();

      if (result.error) {
        setError(result.error);
        setData(null);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err) {
      setError(err as PostgrestError);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
};

// Specialized hooks for common queries
export const useProducts = (vendorId?: string) => {
  return useSupabaseQuery(
    async () => {
      // Joindre inventory (quantity) pour refléter la décrémentation côté backend
      // Fallback: products.stock_quantity
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock_quantity,
          barcode,
          ean,
          sku,
          images,
          category:categories(name),
          vendor:vendors(business_name),
          inventory:inventory(quantity)
        `)
        .eq('is_active', true);

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const result = await query;
      if (result?.data) {
        // Normaliser le stock pour la consommation UI
        // @ts-ignore - enrich data in place
        result.data = result.data.map((p: any) => ({
          ...p,
          stock_quantity: (p?.inventory?.quantity ?? p?.stock_quantity ?? 0)
        }));
      }
      return result;
    },
    [vendorId]
  );
};

export const useOrders = (userId?: string, role?: string) => {
  return useSupabaseQuery(
    async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, user_id, profiles:profiles(first_name, last_name)),
          vendor:vendors(business_name),
          order_items(
            *,
            product:products(name, images)
          )
        `);

      if (role === 'vendeur' && userId) {
        query = query.eq('vendor.user_id', userId);
      } else if (role === 'client' && userId) {
        query = query.eq('customer.user_id', userId);
      }

      return await query.order('created_at', { ascending: false });
    },
    [userId, role]
  );
};

export const useDeliveries = (driverId?: string) => {
  return useSupabaseQuery(
    async () => {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          order:orders(
            order_number,
            total_amount,
            customer:customers(profiles:profiles(first_name, last_name))
          )
        `);

      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      return await query.order('created_at', { ascending: false });
    },
    [driverId]
  );
};

export const useRides = (customerId?: string, driverId?: string) => {
  return useSupabaseQuery(
    async () => {
      let query = supabase
        .from('rides')
        .select(`
          *,
          customer:customers(profiles:profiles(first_name, last_name)),
          driver:drivers(profiles:profiles(first_name, last_name), vehicle_info)
        `);

      if (customerId) {
        query = query.eq('customer_id', customerId);
      } else if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      return await query.order('created_at', { ascending: false });
    },
    [customerId, driverId]
  );
};

export const useVendorStats = (vendorId: string) => {
  return useSupabaseQuery(
    async () => {
      const [ordersResult, productsResult, revenueResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, created_at')
          .eq('vendor_id', vendorId),

        supabase
          .from('products')
          .select('id, stock_quantity')
          .eq('vendor_id', vendorId)
          .eq('is_active', true),

        supabase
          .from('orders')
          .select('total_amount, created_at')
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')
      ]);

      if (ordersResult.error || productsResult.error || revenueResult.error) {
        return {
          data: null,
          error: ordersResult.error || productsResult.error || revenueResult.error
        };
      }

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const todayOrders = ordersResult.data?.filter(order =>
        new Date(order.created_at) >= startOfDay
      ).length || 0;

      const totalRevenue = revenueResult.data?.reduce((sum, order) =>
        sum + parseFloat(order.total_amount.toString()), 0
      ) || 0;

      const todayRevenue = revenueResult.data?.filter(order =>
        new Date(order.created_at) >= startOfDay
      ).reduce((sum, order) => sum + parseFloat(order.total_amount.toString()), 0) || 0;

      const totalProducts = productsResult.data?.length || 0;
      const lowStockProducts = productsResult.data?.filter(product =>
        product.stock_quantity <= 10
      ).length || 0;

      return {
        data: {
          todayOrders,
          totalRevenue,
          todayRevenue,
          totalProducts,
          lowStockProducts,
          totalOrders: ordersResult.data?.length || 0
        },
        error: null
      };
    },
    [vendorId]
  );
};