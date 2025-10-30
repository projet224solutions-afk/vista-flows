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
        // Si le wallet n'existe pas, le créer
        if (error.code === 'PGRST116') {
          console.log('Creating wallet for user:', userId);
          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert({
              user_id: userId,
              balance: 10000, // Solde initial de bienvenue
              currency: 'GNF'
            })
            .select('balance, currency')
            .single();

          if (createError) {
            console.error('Error creating wallet:', createError);
            throw createError;
          }

          if (newWallet) {
            setBalance(newWallet.balance || 0);
            setCurrency(newWallet.currency || 'GNF');
            
            // Créer une transaction de crédit initial
            await supabase.from('wallet_transactions').insert({
              transaction_id: `INIT-${userId.slice(0, 8)}`,
              transaction_type: 'credit',
              amount: 10000,
              net_amount: 10000,
              receiver_wallet_id: userId,
              description: 'Crédit de bienvenue',
              status: 'completed'
            });
          }
        } else {
          throw error;
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
