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
      const [mRes, dRes, wSumRes, monthRevRes, alertsRes] = await Promise.all([
        supabase.from('members').select('id, name, email, phone, role, badge_number, wallet_balance, status, joined_date').limit(1000),
        supabase.from('taxi_drivers').select('id, name, phone, email, gilet_number, plate_number, moto_serial, badge_number, wallet_balance, status, created_at').limit(1000),
        supabase.rpc('sum_bureau_balances'),
        supabase.rpc('sum_bureau_month_revenue'),
        supabase.from('sos_alerts').select('id', { head: true, count: 'exact' }),
      ]);

      const mData = mRes.data || [];
      const dData = dRes.data || [];

      setMembers(mData as any);
      setDrivers(dData as any);

      const totalMembers = mData.length;
      const activeMembers = mData.filter((m: any) => m.status === 'active').length;
      const totalDrivers = dData.length;
      const activeDrivers = dData.filter((t: any) => t.status === 'active').length;
      const totalBalance = (wSumRes.data as any)?.total || 0;
      const monthlyRevenue = (monthRevRes.data as any)?.total || 0;
      const activeAlerts = alertsRes.count || 0;

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
    } catch (e: any) {
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


