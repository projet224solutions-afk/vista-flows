import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, Calendar, Wallet } from "lucide-react";
import { SubscriptionService, Plan } from "@/services/subscriptionService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import walletService from "@/services/walletService";

interface VendorSubscriptionPlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

const BILLING_CYCLE_LABELS = {
  monthly: 'Mensuel (1 mois)',
  quarterly: 'Trimestriel (3 mois)',
  yearly: 'Annuel (12 mois)'
};

const BILLING_CYCLE_DURATION = {
  monthly: 1,
  quarterly: 3,
  yearly: 12
};

export function VendorSubscriptionPlanSelector({ 
  open, 
  onOpenChange,
  onSuccess 
}: VendorSubscriptionPlanSelectorProps) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (open) {
      loadPlans();
      loadWalletBalance();
    }
  }, [open]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await SubscriptionService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error("Erreur chargement plans:", error);
      toast.error("Erreur de chargement des plans");
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalance = async () => {
    if (!user?.id) return;
    try {
      const wallet = await walletService.getUserWallet(user.id);
      setWalletBalance(wallet?.balance || 0);
    } catch (error) {
      console.error("Erreur chargement wallet:", error);
    }
  };

  const calculatePrice = (plan: Plan): number => {
    const monthlyPrice = plan.monthly_price_gnf;
    const duration = BILLING_CYCLE_DURATION[billingCycle];
    
    if (billingCycle === 'yearly' && plan.yearly_price_gnf) {
      return plan.yearly_price_gnf;
    }
    
    return monthlyPrice * duration;
  };

  const calculateDiscount = (plan: Plan): number | null => {
    if (billingCycle === 'yearly' && plan.yearly_price_gnf && plan.yearly_discount_percentage) {
      return plan.yearly_discount_percentage;
    }
    return null;
  };

  const getPlanDescription = (planName: string): string => {
    const descriptions: Record<string, string> = {
      'free': 'Idéal pour découvrir les fonctionnalités essentielles de la plateforme.',
      'basic': 'Conçu pour gérer vos produits, ventes et livraisons avec des outils professionnels.',
      'pro': 'Pensé pour développer votre activité avec marketing, analytics et automatisations.',
      'business': 'Adapté aux entreprises nécessitant gestion financière complète et outils avancés.',
      'premium': 'Solution intégrale avec intelligence artificielle, automatisation et support dédié.'
    };
    return descriptions[planName] || '';
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user?.id) return;

    const price = calculatePrice(selectedPlan);
    
    if (walletBalance < price) {
      toast.error("Solde insuffisant", {
        description: `Votre solde : ${walletBalance.toLocaleString()} GNF. Prix : ${price.toLocaleString()} GNF`
      });
      return;
    }

    try {
      setSubscribing(true);
      
      console.log('🔄 Tentative d\'achat d\'abonnement:', {
        userId: user.id,
        planId: selectedPlan.id,
        price,
        billingCycle,
        walletBalance
      });
      
      const subscriptionId = await SubscriptionService.recordSubscriptionPayment({
        userId: user.id,
        planId: selectedPlan.id,
        pricePaid: price,
        paymentMethod: 'wallet',
        billingCycle: billingCycle
      });

      console.log('📥 Résultat achat:', subscriptionId);

      if (subscriptionId) {
        toast.success("✅ Abonnement activé avec succès !", {
          description: `Plan ${selectedPlan.display_name} - ${BILLING_CYCLE_LABELS[billingCycle]}`
        });
        
        // Recharger le solde wallet
        await loadWalletBalance();
        
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Erreur lors de l'activation de l'abonnement", {
          description: "Vérifiez votre solde et réessayez"
        });
      }
    } catch (error: any) {
      console.error("❌ Erreur souscription:", error);
      
      // Messages d'erreur spécifiques
      let errorMessage = "Erreur système lors de la souscription";
      let errorDescription = "Veuillez réessayer dans quelques instants";
      
      if (error.message?.includes('Solde insuffisant')) {
        errorMessage = "Solde insuffisant";
        errorDescription = "Votre solde wallet est trop faible pour cet abonnement";
      } else if (error.message?.includes('Wallet non trouvé')) {
        errorMessage = "Wallet non disponible";
        errorDescription = "Veuillez contacter le support";
      } else if (error.message?.includes('Plan non trouvé')) {
        errorMessage = "Plan non disponible";
        errorDescription = "Ce plan n'est plus disponible";
      }
      
      toast.error(errorMessage, {
        description: errorDescription
      });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🟩 Choisir un plan d'abonnement</DialogTitle>
          <DialogDescription>
            Sélectionnez le plan et la durée qui vous conviennent
          </DialogDescription>
        </DialogHeader>

        {/* Sélection de la durée */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Durée de l'abonnement</label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[]).map((cycle) => (
              <Card
                key={cycle}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${
                  billingCycle === cycle ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => setBillingCycle(cycle)}
              >
                <div className="flex items-center gap-2">
                  {billingCycle === cycle && <Check className="w-4 h-4 text-primary" />}
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="font-medium mt-2">{BILLING_CYCLE_LABELS[cycle]}</p>
                {cycle === 'yearly' && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Économisez jusqu'à 20%
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Liste des plans */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Choisissez votre plan</label>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-3">
              {plans.map((plan) => {
                const price = calculatePrice(plan);
                const discount = calculateDiscount(plan);
                
                return (
                  <Card
                    key={plan.id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary ${
                      selectedPlan?.id === plan.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {selectedPlan?.id === plan.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                          <h3 className="font-bold text-lg">{plan.display_name}</h3>
                          {discount && (
                            <Badge variant="secondary" className="text-xs">
                              -{discount}%
                            </Badge>
                          )}
                        </div>
                        {/* Description courte du plan */}
                        <p className="text-sm text-muted-foreground mb-2">
                          {getPlanDescription(plan.name)}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {price.toLocaleString()} GNF
                          </span>
                          <span className="text-sm text-muted-foreground">
                            pour {BILLING_CYCLE_DURATION[billingCycle]} mois
                          </span>
                        </div>
                        {plan.features && plan.features.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {plan.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-600" />
                                {feature}
                              </li>
                            ))}
                            {plan.features.length > 3 && (
                              <li className="text-sm text-muted-foreground">
                                + {plan.features.length - 3} autres fonctionnalités
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Solde wallet */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">Solde wallet</span>
          </div>
          <span className="font-bold">{walletBalance.toLocaleString()} GNF</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={subscribing}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubscribe} 
            disabled={!selectedPlan || subscribing}
          >
            {subscribing ? "Traitement..." : "Confirmer l'abonnement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
