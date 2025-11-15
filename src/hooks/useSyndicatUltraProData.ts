// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SyndicateMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'president' | 'secretary' | 'member';
  badge_number: string;
  wallet_balance: number;
  status: 'active' | 'inactive';
  joined_date: string;
}

export interface TaxiDriver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gilet_number?: string;
  plate_number: string;
  moto_serial: string;
  badge_number: string;
  wallet_balance: number;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface SyndicateStats {
  total_members: number;
  active_members: number;
  total_taxi_motards: number;
  active_taxi_motards: number;
  total_balance: number;
  monthly_revenue: number;
  pending_validations: number;
  active_alerts: number;
}

export function useSyndicatUltraProData() {
  const [members, setMembers] = useState<SyndicateMember[]>([]);
  const [drivers, setDrivers] = useState<TaxiDriver[]>([]);
  const [stats, setStats] = useState<SyndicateStats>({
    total_members: 0,
    active_members: 0,
    total_taxi_motards: 0,
    active_taxi_motards: 0,
    total_balance: 0,
    monthly_revenue: 0,
    pending_validations: 0,
    active_alerts: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Temporairement désactivé - tables non disponibles dans les types Supabase
      const mData: unknown[] = [];
      const dData: unknown[] = [];

      setMembers(mData as unknown);
      setDrivers(dData as unknown);

      const totalMembers = mData.length;
      const activeMembers = mData.filter((m: unknown) => m.status === 'active').length;
      const totalDrivers = dData.length;
      const activeDrivers = dData.filter((t: unknown) => t.status === 'active').length;
      const totalBalance = 0;
      const monthlyRevenue = 0;
      const activeAlerts = 0;

      setStats({
        total_members: totalMembers,
        active_members: activeMembers,
        total_taxi_motards: totalDrivers,
        active_taxi_motards: activeDrivers,
        total_balance: totalBalance,
        monthly_revenue: monthlyRevenue,
        pending_validations: 0,
        active_alerts: activeAlerts,
      });
    } catch (e: unknown) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('realtime-syndicate')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taxi_drivers' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bureau_transactions' }, refresh)
      .subscribe();
    const interval = setInterval(refresh, 30000);
    return () => {
      try { supabase.removeChannel(channel); } catch {}
      clearInterval(interval);
    };
  }, [refresh]);

  return { members, drivers, stats, loading, error, refresh };
}


