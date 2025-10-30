import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HomeStats {
  totalProducts: number;
  totalVendors: number;
  totalServices: number;
  totalClients: number;
}

export const useHomeStats = () => {
  const [stats, setStats] = useState<HomeStats>({
    totalProducts: 0,
    totalVendors: 0,
    totalServices: 0,
    totalClients: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Compter les produits actifs
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Compter les vendeurs
        const { count: vendorsCount } = await supabase
          .from('vendors')
          .select('*', { count: 'exact', head: true });

        // Compter les types de services actifs disponibles
        const { count: servicesCount } = await supabase
          .from('service_types')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Compter uniquement les clients (utilisateurs avec le rôle 'client')
        const { count: clientsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client');

        setStats({
          totalProducts: productsCount || 0,
          totalVendors: vendorsCount || 0,
          totalServices: servicesCount || 0,
          totalClients: clientsCount || 0,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};
