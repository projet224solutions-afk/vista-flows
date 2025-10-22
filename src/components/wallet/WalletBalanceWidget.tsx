import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { QuickTransferButton } from "./QuickTransferButton";

interface WalletBalanceWidgetProps {
  className?: string;
  showTransferButton?: boolean;
}

export function WalletBalanceWidget({ 
  className = "",
  showTransferButton = true 
}: WalletBalanceWidgetProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('GNF');
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  const loadBalance = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
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
    loadBalance();

    // Écouter les mises à jour du wallet
    const handleWalletUpdate = () => {
      loadBalance();
    };

    window.addEventListener('wallet-updated', handleWalletUpdate);

    return () => {
      window.removeEventListener('wallet-updated', handleWalletUpdate);
    };
  }, [user?.id]);

  const formatBalance = () => {
    if (hidden) return '••••••';
    return `${balance.toLocaleString('fr-FR')} ${currency}`;
  };

  return (
    <Card className={`bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs opacity-90 font-medium">Solde wallet</p>
              <p className="text-xl font-bold">
                {loading ? 'Chargement...' : formatBalance()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={loadBalance}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {showTransferButton && (
              <QuickTransferButton
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                showText={false}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
