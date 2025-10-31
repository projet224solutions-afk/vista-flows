import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { CreditCard, Wallet, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Plan {
  name: string;
  price_gnf: number;
  duration_days: number;
  description: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  auto_renew: boolean;
  plans: Plan;
}

export function SubscriptionRenewalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'external'>('wallet');
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('id, status, current_period_end, auto_renew, plans(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError) throw subError;
      
      // Transform data to match interface
      if (subData && subData.plans) {
        const plan = Array.isArray(subData.plans) ? subData.plans[0] : subData.plans;
        setSubscription({
          id: subData.id,
          status: subData.status,
          current_period_end: subData.current_period_end,
          auto_renew: subData.auto_renew,
          plans: {
            name: plan.name || plan.display_name,
            price_gnf: plan.price_monthly_gnf || 0,
            duration_days: 30,
            description: plan.description || ''
          }
        });
      }

      // Load wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;
      setWalletBalance(walletData?.balance || 0);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRenewal = async () => {
    if (!subscription || !user) return;

    // Verify wallet balance if paying with wallet
    if (paymentMethod === 'wallet' && walletBalance < subscription.plans.price_gnf) {
      toast({
        title: "Solde insuffisant",
        description: "Votre solde wallet est insuffisant pour ce renouvellement",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('renew-subscription', {
        body: {
          subscription_id: subscription.id,
          payment_method: paymentMethod,
          amount_gnf: subscription.plans.price_gnf,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Succès !",
          description: "Votre abonnement a été renouvelé avec succès",
        });

        // Reload data
        await loadData();

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/vendeur/dashboard');
        }, 2000);
      } else {
        throw new Error(data.error || 'Renewal failed');
      }

    } catch (error) {
      console.error('Renewal error:', error);
      toast({
        title: "Erreur de renouvellement",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Aucun abonnement trouvé</p>
        </CardContent>
      </Card>
    );
  }

  const isExpired = subscription.status === 'expired' || subscription.status === 'past_due';
  const daysRemaining = Math.ceil(
    (new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Renouvellement d'abonnement</h1>
        <p className="text-muted-foreground mt-2">
          Renouvelez votre abonnement pour continuer à profiter de toutes les fonctionnalités
        </p>
      </div>

      {/* Current subscription status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Statut actuel
            <Badge variant={isExpired ? "destructive" : "default"}>
              {isExpired ? "Expiré" : "Actif"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-semibold">{subscription.plans.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prix</p>
              <p className="font-semibold">{subscription.plans.price_gnf.toLocaleString()} GNF</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Durée</p>
              <p className="font-semibold">{subscription.plans.duration_days} jours</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {isExpired ? "Expiré le" : "Expire le"}
              </p>
              <p className="font-semibold flex items-center gap-2">
                {isExpired && <AlertTriangle className="w-4 h-4 text-destructive" />}
                {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {!isExpired && daysRemaining <= 7 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">
                  Votre abonnement expire bientôt
                </p>
                <p className="text-sm text-yellow-700">
                  Plus que {daysRemaining} jour(s) avant l'expiration
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment method selection */}
      <Card>
        <CardHeader>
          <CardTitle>Méthode de paiement</CardTitle>
          <CardDescription>
            Choisissez comment vous souhaitez renouveler votre abonnement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'wallet' | 'external')}>
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="wallet" id="wallet" />
              <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Wallet 224SOLUTIONS</p>
                      <p className="text-sm text-muted-foreground">
                        Solde disponible : {walletBalance.toLocaleString()} GNF
                      </p>
                    </div>
                  </div>
                  {walletBalance >= subscription.plans.price_gnf && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer opacity-50">
              <RadioGroupItem value="external" id="external" disabled />
              <Label htmlFor="external" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Paiement externe</p>
                    <p className="text-sm text-muted-foreground">
                      Prochainement disponible
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Montant à payer :</strong> {subscription.plans.price_gnf.toLocaleString()} GNF
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Votre abonnement sera renouvelé pour {subscription.plans.duration_days} jours supplémentaires
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleRenewal}
          disabled={processing || (paymentMethod === 'wallet' && walletBalance < subscription.plans.price_gnf)}
          size="lg"
          className="flex-1"
        >
          {processing ? 'Traitement...' : 'Confirmer le renouvellement'}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/vendeur/dashboard')}
          disabled={processing}
          size="lg"
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
