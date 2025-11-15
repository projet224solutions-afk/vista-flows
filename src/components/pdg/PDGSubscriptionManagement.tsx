import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DollarSign, CreditCard, RefreshCw, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  created_at: string;
  auto_renew: boolean;
  payment_method: string;
}

export default function PDGSubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    revenue: 0,
  });

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const subs = data || [];
      setSubscriptions(subs);

      // Calculer les stats
      setStats({
        total: subs.length,
        active: subs.filter(s => s.status === 'active').length,
        revenue: 0, // Les montants ne sont pas dans cette table
      });
    } catch (error: any) {
      console.error('Erreur chargement abonnements:', error);
      toast.error('Impossible de charger les abonnements');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/check-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();
      console.log('Statut abonnement:', result);
      toast.success('Statut vérifié');
    } catch (error) {
      console.error('Erreur vérification:', error);
      toast.error('Échec de la vérification');
    }
  };

  useEffect(() => {
    loadSubscriptions();
    const interval = setInterval(loadSubscriptions, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Actif</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expiré</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Chargement des abonnements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Gestion des Abonnements Stripe
          </h2>
          <p className="text-muted-foreground mt-1">
            {stats.total} abonnements • {stats.active} actifs
          </p>
        </div>
        <Button onClick={loadSubscriptions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Abonnements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Revenu Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {(stats.revenue / 1000).toFixed(0)}k GNF
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sub.plan_id}</CardTitle>
                  {getStatusBadge(sub.status)}
                </div>
                <CardDescription>
                  ID: {sub.id.slice(0, 8)}... • Auto-renew: {sub.auto_renew ? 'Oui' : 'Non'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créé le:</span>
                    <span>{new Date(sub.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin période:</span>
                    <span>{new Date(sub.current_period_end).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paiement:</span>
                    <span>{sub.payment_method}</span>
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={() => checkSubscriptionStatus(sub.user_id)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Vérifier le statut Stripe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {subscriptions.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Aucun abonnement trouvé
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
