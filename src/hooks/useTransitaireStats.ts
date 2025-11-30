/**
 * TRANSITAIRE STATS HOOK - 224SOLUTIONS
 * Hook pour charger les statistiques réelles de l'interface transitaire
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';

interface TransitaireStats {
  total_shipments: number;
  active_shipments: number;
  in_transit: number;
  at_customs: number;
  delivered_this_month: number;
  monthly_revenue: number;
  average_delivery_days: number;
  customs_pending: number;
  customs_cleared: number;
  total_weight_shipped: number;
}

export const useTransitaireStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<TransitaireStats>({
    total_shipments: 0,
    active_shipments: 0,
    in_transit: 0,
    at_customs: 0,
    delivered_this_month: 0,
    monthly_revenue: 0,
    average_delivery_days: 0,
    customs_pending: 0,
    customs_cleared: 0,
    total_weight_shipped: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculer le début du mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Query 1: Total shipments
      const { count: totalShipments, error: totalError } = await supabase
        .from('international_shipments')
        .select('*', { count: 'exact', head: true })
        .eq('transitaire_id', user.id);

      if (totalError) throw totalError;

      // Query 2: Active shipments (not delivered/cancelled)
      const { count: activeShipments, error: activeError } = await supabase
        .from('international_shipments')
        .select('*', { count: 'exact', head: true })
        .eq('transitaire_id', user.id)
        .not('status', 'in', '(delivered,cancelled)');

      if (activeError) throw activeError;

      // Query 3: In transit
      const { count: inTransit, error: transitError } = await supabase
        .from('international_shipments')
        .select('*', { count: 'exact', head: true })
        .eq('transitaire_id', user.id)
        .eq('status', 'in_transit');

      if (transitError) throw transitError;

      // Query 4: At customs
      const { count: atCustoms, error: customsError } = await supabase
        .from('international_shipments')
        .select('*', { count: 'exact', head: true })
        .eq('transitaire_id', user.id)
        .eq('status', 'at_customs');

      if (customsError) throw customsError;

      // Query 5: Delivered this month
      const { count: deliveredMonth, error: deliveredError } = await supabase
        .from('international_shipments')
        .select('*', { count: 'exact', head: true })
        .eq('transitaire_id', user.id)
        .eq('status', 'delivered')
        .gte('updated_at', startOfMonth.toISOString());

      if (deliveredError) throw deliveredError;

      // Query 6: Monthly revenue (from transitaire_transactions table)
      const { data: transactions, error: revenueError } = await supabase
        .from('transitaire_transactions')
        .select('amount')
        .eq('transitaire_id', user.id)
        .eq('type', 'shipment_payment')
        .gte('created_at', startOfMonth.toISOString());

      if (revenueError) console.warn('Erreur revenue:', revenueError);

      const monthlyRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Query 7: Average delivery days (delivered shipments)
      const { data: deliveredShipments, error: avgError } = await supabase
        .from('international_shipments')
        .select('created_at, updated_at')
        .eq('transitaire_id', user.id)
        .eq('status', 'delivered')
        .limit(50) // Dernières 50 livraisons
        .order('updated_at', { ascending: false });

      if (avgError) console.warn('Erreur avg delivery:', avgError);

      let averageDeliveryDays = 0;
      if (deliveredShipments && deliveredShipments.length > 0) {
        const totalDays = deliveredShipments.reduce((sum, s) => {
          const created = new Date(s.created_at);
          const delivered = new Date(s.updated_at);
          const days = Math.floor((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        averageDeliveryDays = Math.round(totalDays / deliveredShipments.length);
      }

      // Query 8: Customs stats
      const { count: customsPending, error: pendingError } = await supabase
        .from('customs_declarations')
        .select('shipment_id', { count: 'exact', head: true })
        .in('status', ['pending', 'processing']);

      if (pendingError) console.warn('Erreur customs pending:', pendingError);

      const { count: customsCleared, error: clearedError } = await supabase
        .from('customs_declarations')
        .select('shipment_id', { count: 'exact', head: true })
        .eq('status', 'cleared');

      if (clearedError) console.warn('Erreur customs cleared:', clearedError);

      // Query 9: Total weight shipped (all time)
      const { data: weightData, error: weightError } = await supabase
        .from('international_shipments')
        .select('weight, weight_unit')
        .eq('transitaire_id', user.id);

      if (weightError) console.warn('Erreur weight:', weightError);

      let totalWeightKg = 0;
      if (weightData && weightData.length > 0) {
        totalWeightKg = weightData.reduce((sum, s) => {
          const weight = s.weight || 0;
          const multiplier = s.weight_unit === 'tonnes' ? 1000 : 1;
          return sum + (weight * multiplier);
        }, 0);
      }

      // Mettre à jour les stats
      setStats({
        total_shipments: totalShipments || 0,
        active_shipments: activeShipments || 0,
        in_transit: inTransit || 0,
        at_customs: atCustoms || 0,
        delivered_this_month: deliveredMonth || 0,
        monthly_revenue: monthlyRevenue,
        average_delivery_days: averageDeliveryDays,
        customs_pending: customsPending || 0,
        customs_cleared: customsCleared || 0,
        total_weight_shipped: totalWeightKg
      });

    } catch (err: any) {
      console.error('Erreur chargement stats transitaire:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  };
};
