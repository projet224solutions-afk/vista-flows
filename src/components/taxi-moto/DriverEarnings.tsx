import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, Calendar, Clock, MapPin, Wallet, ArrowUpCircle, ArrowDownCircle, Send, History } from 'lucide-react';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { WalletBalanceWidget } from '@/components/wallet/WalletBalanceWidget';
import { QuickTransferButton } from '@/components/wallet/QuickTransferButton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DriverEarningsProps {
  driverId: string;
}

interface Ride {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number;
  duration_minutes: number;
  fare: number;
  status: string;
  requested_at: string;
  completed_at: string | null;
  customer_name?: string;
}

interface EarningsStats {
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  yearEarnings: number;
  todayRides: number;
  weekRides: number;
  monthRides: number;
  yearRides: number;
}

interface WalletTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export function DriverEarnings({ driverId }: DriverEarningsProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    yearEarnings: 0,
    todayRides: 0,
    weekRides: 0,
    monthRides: 0,
    yearRides: 0,
  });
  const [showTransactions, setShowTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const { balance, currency } = useWalletBalance(driverId);

  const loadEarningsData = async () => {
    try {
      setLoading(true);

      // Charger les courses terminées du chauffeur
      const { data: ridesData, error: ridesError } = await supabase
        .from('taxi_trips')
        .select(`
          id,
          pickup_address,
          dropoff_address,
          distance_km,
          duration_minutes,
          fare,
          status,
          requested_at,
          completed_at,
          customers:customer_id (
            full_name
          )
        `)
        .eq('driver_id', driverId)
        .in('status', ['completed', 'paid'])
        .order('completed_at', { ascending: false })
        .limit(50);

      if (ridesError) throw ridesError;

      const formattedRides: Ride[] = (ridesData || []).map((ride: any) => ({
        id: ride.id,
        pickup_address: ride.pickup_address,
        dropoff_address: ride.dropoff_address,
        distance_km: ride.distance_km,
        duration_minutes: ride.duration_minutes,
        fare: ride.fare,
        status: ride.status,
        requested_at: ride.requested_at,
        completed_at: ride.completed_at,
        customer_name: ride.customers?.full_name || 'Client',
      }));

      setRides(formattedRides);

      // Calculer les statistiques
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const todayRides = formattedRides.filter(
        (r) => new Date(r.completed_at || r.requested_at) >= today
      );
      const weekRides = formattedRides.filter(
        (r) => new Date(r.completed_at || r.requested_at) >= weekAgo
      );
      const monthRides = formattedRides.filter(
        (r) => new Date(r.completed_at || r.requested_at) >= monthAgo
      );
      const yearRides = formattedRides.filter(
        (r) => new Date(r.completed_at || r.requested_at) >= yearStart
      );

      setStats({
        todayEarnings: todayRides.reduce((sum, r) => sum + (r.fare || 0), 0),
        weekEarnings: weekRides.reduce((sum, r) => sum + (r.fare || 0), 0),
        monthEarnings: monthRides.reduce((sum, r) => sum + (r.fare || 0), 0),
        yearEarnings: yearRides.reduce((sum, r) => sum + (r.fare || 0), 0),
        todayRides: todayRides.length,
        weekRides: weekRides.length,
        monthRides: monthRides.length,
        yearRides: yearRides.length,
      });

      // Charger les transactions du wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', driverId)
        .single();

      if (walletData) {
        const { data: transactionsData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .or(`from_wallet_id.eq.${walletData.id},to_wallet_id.eq.${walletData.id}`)
          .order('created_at', { ascending: false })
          .limit(20);

        setTransactions(transactionsData || []);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      loadEarningsData();

      // S'abonner aux changements en temps réel
      const channel = supabase
        .channel('driver-earnings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'taxi_trips',
            filter: `driver_id=eq.${driverId}`,
          },
          () => {
            console.log('💰 Earnings updated');
            loadEarningsData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [driverId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Wallet 224Solutions */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet 224Solutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm opacity-90">Solde disponible</p>
              <p className="text-4xl font-bold mt-1">
                {balance.toLocaleString()} {currency}
              </p>
            </div>
            
            {/* Actions rapides du wallet */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="secondary" 
                className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => window.location.href = '/wallet'}
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Recharger
              </Button>
              <Button 
                variant="secondary" 
                className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
                onClick={() => setShowTransactions(!showTransactions)}
              >
                <History className="w-4 h-4 mr-2" />
                Historique
              </Button>
            </div>

            {/* Transfert rapide */}
            <div className="pt-2 border-t border-white/20">
              <QuickTransferButton 
                variant="ghost" 
                className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20"
                showText={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique des transactions wallet */}
      {showTransactions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transactions récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune transaction</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {tx.transaction_type === 'credit' ? (
                        <ArrowDownCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-orange-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{tx.description || tx.transaction_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.transaction_type === 'credit' ? 'text-green-600' : 'text-orange-600'}`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()} {currency}
                      </p>
                      <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques de gains */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              <p className="text-lg font-bold">{stats.todayEarnings.toLocaleString()} {currency}</p>
              <p className="text-xs text-muted-foreground">{stats.todayRides} courses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">7 jours</p>
              <p className="text-lg font-bold">{stats.weekEarnings.toLocaleString()} {currency}</p>
              <p className="text-xs text-muted-foreground">{stats.weekRides} courses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">30 jours</p>
              <p className="text-lg font-bold">{stats.monthEarnings.toLocaleString()} {currency}</p>
              <p className="text-xs text-muted-foreground">{stats.monthRides} courses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Année {new Date().getFullYear()}</p>
              <p className="text-lg font-bold">{stats.yearEarnings.toLocaleString()} {currency}</p>
              <p className="text-xs text-muted-foreground">{stats.yearRides} courses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique des courses */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des courses</CardTitle>
        </CardHeader>
        <CardContent>
          {rides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucune course terminée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{ride.customer_name}</p>
                      <div className="flex items-start gap-2 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <div className="space-y-0.5">
                          <p>{ride.pickup_address}</p>
                          <p>→ {ride.dropoff_address}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {ride.fare.toLocaleString()} {currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ride.status === 'completed' ? 'Terminée' : 'Payée'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ride.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {ride.distance_km.toFixed(1)} km
                    </span>
                    <span className="ml-auto">
                      {format(new Date(ride.completed_at || ride.requested_at), 'dd MMM HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
