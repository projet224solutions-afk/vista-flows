/**
 * 🎣 Hook unifié pour DataManager
 * Simplifie l'utilisation du DataManager dans les composants React
 */

import { useState, useEffect, useCallback } from 'react';
import { dataManager, DataQuery, DataMutation } from '@/services/DataManager';
import { toast } from 'sonner';

interface UseDataOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  realtime?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * 📊 Hook pour les requêtes de données
 */
export function useData<T>(
  queryConfig: DataQuery,
  options: UseDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    enabled = true,
    refetchOnMount = true,
    realtime = false,
    onSuccess,
    onError
  } = options;

  // Fonction de fetch
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const result = await dataManager.query<T>({
        ...queryConfig,
        realtime
      });

      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      console.error(`❌ useData error for ${queryConfig.table}:`, error);
    } finally {
      setLoading(false);
    }
  }, [queryConfig, enabled, realtime, onSuccess, onError]);

  // Effet initial
  useEffect(() => {
    if (refetchOnMount) {
      fetchData();
    }
  }, [fetchData, refetchOnMount]);

  // Subscription temps réel
  useEffect(() => {
    if (!realtime || !enabled) return;

    const unsubscribe = dataManager.subscribe(queryConfig.table, (newData) => {
      console.log(`🔄 Realtime update for ${queryConfig.table}`);
      // Refetch pour obtenir les données complètes
      fetchData();
    });

    return unsubscribe;
  }, [queryConfig.table, realtime, enabled, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * ✏️ Hook pour les mutations
 */
export function useMutation<T = any>(
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    showToast?: boolean;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError, showToast = true } = options;

  const mutate = useCallback(async (mutationConfig: DataMutation): Promise<T> => {
    try {
      setLoading(true);
      setError(null);

      const result = await dataManager.mutate(mutationConfig);

      if (showToast) {
        toast.success(`✅ ${mutationConfig.operation} réussie sur ${mutationConfig.table}`);
      }

      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      if (showToast) {
        toast.error(`❌ Erreur ${mutationConfig.operation}: ${error.message}`);
      }

      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError, showToast]);

  return {
    mutate,
    loading,
    error
  };
}

/**
 * 👥 Hook spécialisé pour les utilisateurs
 */
export function useUsers(filters?: Record<string, any>) {
  return useData({
    table: 'profiles',
    select: 'id, email, first_name, last_name, role, is_active, created_at',
    filters,
    orderBy: { column: 'created_at', ascending: false },
    realtime: true
  });
}

/**
 * 🛍️ Hook spécialisé pour les produits
 */
export function useProducts(vendorId?: string, categoryId?: string) {
  const filters: Record<string, any> = {};
  if (vendorId) filters.vendor_id = vendorId;
  if (categoryId) filters.category_id = categoryId;

  return useData({
    table: 'products',
    select: `
      id, name, description, price, images, is_active,
      vendor:vendors(business_name),
      category:categories(name)
    `,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    orderBy: { column: 'created_at', ascending: false },
    realtime: true
  });
}

/**
 * 💰 Hook spécialisé pour les transactions
 */
export function useTransactions(userId?: string) {
  return useData({
    table: 'enhanced_transactions',
    select: 'id, amount, status, method, currency, created_at, sender_id, receiver_id, custom_id, metadata',
    filters: userId ? {
      or: `sender_id.eq.${userId},receiver_id.eq.${userId}`
    } : undefined,
    orderBy: { column: 'created_at', ascending: false },
    limit: 50,
    realtime: true
  });
}

/**
 * 🏪 Hook spécialisé pour les vendeurs
 */
export function useVendors(isActive?: boolean) {
  return useData({
    table: 'vendors',
    select: `
      id, business_name, description, is_verified, is_active, rating,
      user:profiles(first_name, last_name, email)
    `,
    filters: isActive !== undefined ? { is_active: isActive } : undefined,
    orderBy: { column: 'created_at', ascending: false },
    realtime: true
  });
}

/**
 * 🚗 Hook spécialisé pour les courses Taxi-Moto
 */
export function useRides(userId?: string, status?: string) {
  const filters: Record<string, any> = {};
  if (userId) filters.user_id = userId;
  if (status) filters.status = status;

  return useData({
    table: 'rides',
    select: `
      id, pickup_location, destination, status, fare, created_at,
      driver:drivers(name, phone, vehicle_info)
    `,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    orderBy: { column: 'created_at', ascending: false },
    realtime: true
  });
}

/**
 * 🏛️ Hook spécialisé pour les syndicats
 */
export function useSyndicates(status?: string) {
  return useData({
    table: 'syndicates',
    select: 'id, syndicate_id_code, name, prefecture_commune, president_name, status, created_at',
    filters: status ? { status } : undefined,
    orderBy: { column: 'created_at', ascending: false },
    realtime: true
  });
}

/**
 * 📊 Hook pour les statistiques globales
 */
export function useGlobalStats() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    activeVendors: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Paralléliser les requêtes
        const [users, products, transactions, vendors] = await Promise.all([
          dataManager.query({ table: 'profiles', select: 'id' }),
          dataManager.query({ table: 'products', select: 'id' }),
          dataManager.query({ table: 'enhanced_transactions', select: 'amount' }),
          dataManager.query({ 
            table: 'vendors', 
            select: 'id', 
            filters: { is_active: true } 
          })
        ]);

        const totalRevenue = (transactions as any[])?.reduce(
          (sum, t) => sum + (t.amount || 0), 0
        ) || 0;

        setStats({
          totalUsers: (users as any[])?.length || 0,
          totalProducts: (products as any[])?.length || 0,
          totalTransactions: (transactions as any[])?.length || 0,
          totalRevenue,
          activeVendors: (vendors as any[])?.length || 0
        });
      } catch (error) {
        console.error('❌ Error fetching global stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
}
