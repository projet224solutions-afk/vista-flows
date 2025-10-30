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
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setWalletId(data.id);
        setBalance(data.balance || 0);
        setCurrency(data.currency || 'GNF');
      }
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
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
      <Card className={`${className} border-orange-200 bg-orange-50`}>
        <CardContent className={compact ? "py-2 px-3" : "py-3 px-4"}>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-orange-600 font-medium">Wallet non créé</span>
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
