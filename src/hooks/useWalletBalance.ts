import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useWalletBalance(userId: string | undefined) {
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('GNF');
  const [loading, setLoading] = useState(true);

  const loadBalance = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Si le wallet n'existe pas, ne pas essayer de le créer
        // (les wallets doivent être créés via les fonctions backend appropriées)
        if (error.code === 'PGRST116') {
          console.log('Wallet not found for user:', userId);
          setBalance(0);
          setCurrency('GNF');
        } else {
          console.error('Error loading wallet:', error);
        }
      } else if (data) {
        setBalance(data.balance || 0);
        setCurrency(data.currency || 'GNF');
      }
    } catch (error) {
      console.error('Error loading wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();

    // Listen for wallet updates
    const handleWalletUpdate = () => {
      loadBalance();
    };

    window.addEventListener('wallet-updated', handleWalletUpdate);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log('💰 Wallet updated via realtime');
          loadBalance();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('wallet-updated', handleWalletUpdate);
      channel.unsubscribe();
    };
  }, [userId]);

  return { balance, currency, loading, reload: loadBalance };
}
