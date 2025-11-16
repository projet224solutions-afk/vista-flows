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
import { CreditCard, Wallet } from 'lucide-react';

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

      // Calculer le prix selon le cycle de facturation
      const price = billingCycle === 'yearly'
        ? (selectedPlan.yearly_price_gnf || selectedPlan.monthly_price_gnf * 12 * 0.95)
        : selectedPlan.monthly_price_gnf;

      if (!walletData || walletData.balance < price) {
        toast({
          title: 'Solde insuffisant',
          description: `Votre wallet doit avoir au moins ${SubscriptionService.formatAmount(price)}`,
          variant: 'destructive',
        });
        return;
      }

      // Créer une transaction de débit wallet
      const { data: transactionData, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: crypto.randomUUID(),
          transaction_type: 'subscription_payment',
          amount: price,
          net_amount: price,
          description: `Abonnement ${selectedPlan.display_name} - ${billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'}`,
          status: 'completed',
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance: walletData.balance - price,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Enregistrer l'abonnement
      const subscriptionId = await SubscriptionService.recordSubscriptionPayment({
        userId: user.id,
        planId: selectedPlan.id,
        pricePaid: price,
        paymentMethod: 'wallet',
        paymentTransactionId: transactionData?.id,
        billingCycle: billingCycle
      });

      if (subscriptionId) {
        toast({
          title: 'Succès!',
          description: `Vous êtes maintenant abonné au plan ${selectedPlan.display_name}`,
        });
        setIsDialogOpen(false);
        navigate('/dashboard');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <SubscriptionPlans onSelectPlan={handleSelectPlan} />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer votre abonnement</DialogTitle>
            <DialogDescription>
              {selectedPlan && (
                <>
                  Plan: <strong>{selectedPlan.display_name}</strong>
                  <br />
                  Prix: <strong>{SubscriptionService.formatAmount(selectedPlan.monthly_price_gnf)}</strong> / mois
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-medium">Paiement par Wallet</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Le montant sera débité de votre wallet 224SOLUTIONS
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Ce que vous obtenez :</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {selectedPlan?.features.slice(0, 4).map((feature, idx) => (
                  <li key={idx}>• {feature}</li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubscribe} disabled={processing}>
              <CreditCard className="w-4 h-4 mr-2" />
              {processing ? 'Traitement...' : 'Confirmer l\'abonnement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
