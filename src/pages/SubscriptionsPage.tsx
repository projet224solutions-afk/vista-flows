import { useState } from 'react';
import { SubscriptionPlans } from '@/components/subscriptions/SubscriptionPlans';
import { Plan, SubscriptionService } from '@/services/subscriptionService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, ArrowLeft, Calendar, CalendarDays } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SubscriptionsPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSelectPlan = (plan: Plan) => {
    if (plan.name === 'free') return;
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  // Calculer le prix selon le cycle
  const calculatePrice = (plan: Plan, cycle: 'monthly' | 'yearly') => {
    if (cycle === 'yearly') {
      return plan.yearly_price_gnf || Math.round(plan.monthly_price_gnf * 12 * 0.85);
    }
    return plan.monthly_price_gnf;
  };

  // Calculer la date de fin
  const calculateEndDate = (cycle: 'monthly' | 'yearly') => {
    const now = new Date();
    if (cycle === 'yearly') {
      return addYears(now, 1);
    }
    return addMonths(now, 1);
  };

  // Calculer l'économie annuelle
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
        toast({
          title: 'Erreur',
          description: 'Vous devez être connecté pour souscrire',
          variant: 'destructive',
        });
        return;
      }

      // Vérifier le solde du wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const price = calculatePrice(selectedPlan, billingCycle);

      if (!walletData || walletData.balance < price) {
        toast({
          title: 'Solde insuffisant',
          description: `Votre wallet doit avoir au moins ${SubscriptionService.formatAmount(price)}`,
          variant: 'destructive',
        });
        return;
      }

      // Enregistrer l'abonnement via la fonction RPC sécurisée
      const subscriptionId = await SubscriptionService.recordSubscriptionPayment({
        userId: user.id,
        planId: selectedPlan.id,
        pricePaid: price,
        paymentMethod: 'wallet',
        billingCycle: billingCycle
      });

      if (subscriptionId) {
        const endDate = format(calculateEndDate(billingCycle), 'dd/MM/yyyy', { locale: fr });
        toast({
          title: 'Succès!',
          description: `Vous êtes maintenant abonné au plan ${selectedPlan.display_name} jusqu'au ${endDate}`,
        });
        setIsDialogOpen(false);
        navigate('/vendeur/dashboard');
      } else {
        throw new Error('Failed to create subscription');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de souscrire à ce plan',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const currentPrice = selectedPlan ? calculatePrice(selectedPlan, billingCycle) : 0;
  const endDate = calculateEndDate(billingCycle);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/vendeur')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <SubscriptionPlans onSelectPlan={handleSelectPlan} />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer votre abonnement</DialogTitle>
            <DialogDescription>
              Plan: <strong>{selectedPlan?.display_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Sélecteur de cycle de facturation */}
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

            {/* Résumé de la commande */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant à payer</span>
                <span className="font-bold text-lg">{SubscriptionService.formatAmount(currentPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Date de fin</span>
                <span className="font-medium">{format(endDate, 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Statut après paiement</span>
                <span className="font-medium text-green-600">Actif</span>
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
