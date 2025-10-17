// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type LoadState<T> = { data: T | null; loading: boolean; error?: string | null };

export interface AdminUnifiedData {
  profiles: LoadState<unknown[]>;
  products: LoadState<unknown[]>;
  orders: LoadState<unknown[]>;
  transactions: LoadState<unknown[]>;
  pdgManagement: LoadState<unknown[]>;
  agentsManagement: LoadState<unknown[]>;
  refresh: () => Promise<void>;
}

export function useAdminUnifiedData(enabled: boolean): AdminUnifiedData {
  const [profiles, setProfiles] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [products, setProducts] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [orders, setOrders] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [transactions, setTransactions] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [pdgManagement, setPdgManagement] = useState<LoadState<unknown[]>>({ data: null, loading: true });
  const [agentsManagement, setAgentsManagement] = useState<LoadState<unknown[]>>({ data: null, loading: true });

  const load = async () => {
    if (!enabled) return;
    setProfiles((p) => ({ ...p, loading: true }));
    setProducts((p) => ({ ...p, loading: true }));
    setOrders((p) => ({ ...p, loading: true }));
    setTransactions((p) => ({ ...p, loading: true }));
    setPdgManagement((p) => ({ ...p, loading: true }));
    setAgentsManagement((p) => ({ ...p, loading: true }));

    try {
      const [profRes, prodRes, ordRes, txnRes, pdgRes, agRes] = await Promise.all([
        supabase.from('profiles').select('*').limit(1000),
        supabase.from('products').select('*').limit(1000),
        supabase.from('orders').select('*').limit(1000),
        supabase.from('transactions').select('*').limit(1000),
        supabase.from('pdg_management').select('*').limit(1000),
        supabase.from('agents_management').select('*').limit(1000),
      ]);

      setProfiles({ data: profRes.data || [], loading: false, error: profRes.error?.message });
      setProducts({ data: prodRes.data || [], loading: false, error: prodRes.error?.message });
      setOrders({ data: ordRes.data || [], loading: false, error: ordRes.error?.message });
      setTransactions({ data: txnRes.data || [], loading: false, error: txnRes.error?.message });
      setPdgManagement({ data: pdgRes.data || [], loading: false, error: pdgRes.error?.message });
      setAgentsManagement({ data: agRes.data || [], loading: false, error: agRes.error?.message });
    } catch (e: unknown) {
      const msg = e?.message || String(e);
      setProfiles({ data: [], loading: false, error: msg });
      setProducts({ data: [], loading: false, error: msg });
      setOrders({ data: [], loading: false, error: msg });
      setTransactions({ data: [], loading: false, error: msg });
      setPdgManagement({ data: [], loading: false, error: msg });
      setAgentsManagement({ data: [], loading: false, error: msg });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { profiles, products, orders, transactions, pdgManagement, agentsManagement, refresh: load };
}


