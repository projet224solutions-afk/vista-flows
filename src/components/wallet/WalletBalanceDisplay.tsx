import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WalletBalanceDisplayProps {
  userId?: string;
  className?: string;
  compact?: boolean;
}

export function WalletBalanceDisplay({ userId, className = '', compact = false }: WalletBalanceDisplayProps) {
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('GNF');
  const [loading, setLoading] = useState(true);
  const [walletId, setWalletId] = useState<string | null>(null);

  const loadWallet = async () => {
    if (!userId) {
      console.log('❌ WalletBalanceDisplay: userId manquant');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Chargement wallet pour userId:', userId);
      
      const { data, error } = await supabase
        .from('wallets')
        .select('id, balance, currency, wallet_status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erreur Supabase wallet:', error);
        throw error;
      }

      if (!data) {
        console.log('⚠️ Wallet non trouvé, initialisation...');
        // Tenter d'initialiser le wallet
        try {
          const { data: initResult, error: rpcError } = await supabase
            .rpc('initialize_user_wallet', { p_user_id: userId });
          
          if (rpcError) {
            console.error('❌ Erreur RPC initialize_user_wallet:', rpcError);
            throw rpcError;
          }
          
          console.log('✅ Wallet initialisé:', initResult);
          
          // Recharger le wallet
          const { data: reloadedWallet, error: reloadError } = await supabase
            .from('wallets')
            .select('id, balance, currency, wallet_status')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (reloadError || !reloadedWallet) {
            throw new Error('Échec du rechargement du wallet après initialisation');
          }
          
          setWalletId(reloadedWallet.id);
          setBalance(reloadedWallet.balance || 0);
          setCurrency(reloadedWallet.currency || 'GNF');
          console.log('✅ Wallet rechargé avec succès:', reloadedWallet);
          return;
        } catch (initError) {
          console.error('❌ Échec initialisation wallet:', initError);
          toast.error('Impossible d\'initialiser le wallet');
          throw initError;
        }
      }

      setWalletId(data.id);
      setBalance(data.balance || 0);
      setCurrency(data.currency || 'GNF');
      console.log('✅ Wallet chargé:', { id: data.id, balance: data.balance, currency: data.currency });
    } catch (error: any) {
      console.error('❌ Erreur critique chargement wallet:', error);
      toast.error(`Erreur wallet: ${error?.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();

    // Subscribe to wallet changes
    if (userId) {
      const channel = supabase
        .channel(`wallet-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            loadWallet();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [userId]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className={compact ? "py-2 px-3" : "py-3 px-4"}>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-xs text-muted-foreground">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!walletId) {
    return (
      <Card className={`${className} border-orange-200 bg-orange-50/50`}>
        <CardContent className={compact ? "py-2 px-3" : "py-3 px-4"}>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-orange-600" />
            <div>
              <span className="text-xs text-orange-600 font-medium">Wallet en cours d'initialisation</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadWallet}
                className="h-6 text-xs ml-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Réessayer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="py-2 px-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Solde</p>
                <p className="text-sm font-bold text-primary">{formatAmount(balance)} {currency}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadWallet}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solde du Wallet</p>
              <p className="text-lg font-bold text-primary">{formatAmount(balance)} {currency}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadWallet}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
