import { ArrowLeft, Store, Package, TrendingUp, Shield, Zap, Star, CheckCircle2, Loader2, Calendar, CreditCard, Wallet, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useVendorSubscription } from '@/hooks/useVendorSubscription';
import { Plan, SubscriptionService } from '@/services/subscriptionService';
import { format, addMonths, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Avantages spécifiques aux vendeurs
const VENDOR_BENEFITS = [
  { icon: Store, text: "Boutique en ligne personnalisée" },
  { icon: Package, text: "Gestion illimitée de produits" },
  { icon: TrendingUp, text: "Statistiques et analyses des ventes" },
  { icon: Shield, text: "Paiements sécurisés" },
  { icon: Zap, text: "Boost de visibilité des produits" },
  { icon: Star, text: "Support prioritaire 7j/7" },
];

export default function VendorSubscriptionPage() {
  const navigate = useNavigate();
  const { 
    subscription, 
    plans,
    loading, 
    hasAccess, 
    isExpired, 
    daysRemaining, 
    expiryDate,
    priceFormatted,
    refresh,
  } = useVendorSubscription();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [processing, setProcessing] = useState(false);

  const handleBack = () => {
    navigate('/vendeur/dashboard');
  };

  const handleSelectPlan = (plan: Plan) => {
    if (plan.name === 'free') return;
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const calculatePrice = (plan: Plan, cycle: 'monthly' | 'yearly') => {
    if (cycle === 'yearly') {
      return plan.yearly_price_gnf || Math.round(plan.monthly_price_gnf * 12 * 0.85);
    }
    return plan.monthly_price_gnf;
  };

  const calculateEndDate = (cycle: 'monthly' | 'yearly') => {
    return cycle === 'yearly' ? addYears(new Date(), 1) : addMonths(new Date(), 1);
  };

  const calculateYearlySavings = (plan: Plan) => {
    const monthlyTotal = plan.monthly_price_gnf * 12;
    const yearlyPrice = plan.yearly_price_gnf || Math.round(monthlyTotal * 0.85);
    return monthlyTotal - yearlyPrice;
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour souscrire');
        return;
      }

      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const price = calculatePrice(selectedPlan, billingCycle);

      if (!walletData || walletData.balance < price) {
        toast.error(`Solde insuffisant. Vous avez besoin de ${SubscriptionService.formatAmount(price)}`);
        return;
      }

      const subscriptionId = await SubscriptionService.recordSubscriptionPayment({
        userId: user.id,
        planId: selectedPlan.id,
        pricePaid: price,
        paymentMethod: 'wallet',
        billingCycle,
      });

      if (subscriptionId) {
        const endDate = format(calculateEndDate(billingCycle), 'dd/MM/yyyy', { locale: fr });
        toast.success(`Abonnement ${selectedPlan.display_name} activé jusqu'au ${endDate}`);
        setIsDialogOpen(false);
        refresh();
      } else {
        throw new Error('Échec de la création de l\'abonnement');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Impossible de souscrire à ce plan');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container max-w-2xl mx-auto p-4 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const currentPrice = selectedPlan ? calculatePrice(selectedPlan, billingCycle) : 0;
  const endDate = calculateEndDate(billingCycle);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Abonnement Vendeur</h1>
            <p className="text-muted-foreground">Gérez votre abonnement vendeur</p>
          </div>
        </div>

        {/* Abonnement actuel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Mon Abonnement Vendeur
                </CardTitle>
                <CardDescription>
                  Abonnement mensuel ou annuel pour votre boutique
                </CardDescription>
              </div>
              {hasAccess && !isExpired && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              )}
              {isExpired && (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                  Expiré
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {hasAccess && subscription && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan actuel</p>
                    <p className="text-lg font-bold text-primary">{subscription.plan_display_name}</p>
                    <p className="text-2xl font-bold text-primary">{priceFormatted} GNF</p>
                  </div>
                  <Calendar className="h-12 w-12 text-primary/30" />
                </div>

                {expiryDate && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                    <div>
                      <p className="text-xs text-muted-foreground">Date d'expiration</p>
                      <p className="font-medium">
                        {format(expiryDate, 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jours restants</p>
                      <p className="font-medium">{daysRemaining} jours</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Avantages */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl">
              <p className="font-semibold text-sm mb-3">Avec l'abonnement vendeur, vous accédez à :</p>
              <ul className="space-y-2">
                {VENDOR_BENEFITS.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Icon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">{benefit.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Plans disponibles */}
        {plans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plans Vendeur Disponibles</CardTitle>
              <CardDescription>Choisissez le plan adapté à votre boutique</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.map((plan) => {
                const isCurrentPlan = subscription?.plan_id === plan.id && hasAccess && !isExpired;
                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isCurrentPlan
                        ? 'border-primary bg-primary/5'
                        : plan.name === 'free'
                          ? 'border-border bg-muted/30'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                    }`}
                    onClick={() => !isCurrentPlan && plan.name !== 'free' && handleSelectPlan(plan)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{plan.display_name}</h3>
                          {isCurrentPlan && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                              Actuel
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {plan.name === 'free' ? 'Gratuit' : `${SubscriptionService.formatAmount(plan.monthly_price_gnf)}/mois`}
                        </p>
                        {plan.features && plan.features.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {plan.features.slice(0, 3).map((f, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {!isCurrentPlan && plan.name !== 'free' && (
                        <Button size="sm" variant="outline">
                          <Zap className="h-3 w-3 mr-1" />
                          Choisir
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de confirmation */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer votre abonnement vendeur</DialogTitle>
            <DialogDescription>
              Plan: <strong>{selectedPlan?.display_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Cycle de facturation :</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    billingCycle === 'monthly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Mensuel</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPlan && SubscriptionService.formatAmount(selectedPlan.monthly_price_gnf)}/mois
                  </p>
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`p-3 rounded-lg border-2 transition-all text-left relative ${
                    billingCycle === 'yearly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    -15%
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Annuel</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPlan && SubscriptionService.formatAmount(calculatePrice(selectedPlan, 'yearly'))}/an
                  </p>
                </button>
              </div>
              {billingCycle === 'yearly' && selectedPlan && (
                <p className="text-xs text-green-600 font-medium">
                  Économisez {SubscriptionService.formatAmount(calculateYearlySavings(selectedPlan))} par an !
                </p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant à payer</span>
                <span className="font-bold text-lg">{SubscriptionService.formatAmount(currentPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valable jusqu'au</span>
                <span className="font-medium">{format(endDate, 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-medium">Paiement par Wallet</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Le montant sera débité de votre wallet 224SOLUTIONS
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubscribe} disabled={processing}>
              <CreditCard className="w-4 h-4 mr-2" />
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
