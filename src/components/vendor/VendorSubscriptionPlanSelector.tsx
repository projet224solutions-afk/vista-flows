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
import { Check, Calendar, Wallet, Package, ImageIcon, Infinity } from "lucide-react";
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

function buildPlanDescription(plan: Plan): string {
  const parts: string[] = [];

  if (plan.max_products === null) {
    parts.push('produits illimites');
  } else {
    parts.push(`${plan.max_products} produits max`);
  }

  if (plan.max_images_per_product !== null) {
    parts.push(`${plan.max_images_per_product} images/produit`);
  }

  if (plan.analytics_access) parts.push('analytics');
  if (plan.priority_support) parts.push('support prioritaire');
  if (plan.featured_products) parts.push('mise en avant');
  if (plan.api_access) parts.push('acces API');
  if (plan.custom_branding) parts.push('branding personnalise');

  return parts.join(' · ');
}

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
      void loadPlans();
      void loadWalletBalance();
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

      const subscriptionId = await SubscriptionService.recordSubscriptionPayment({
        userId: user.id,
        planId: selectedPlan.id,
        pricePaid: price,
        paymentMethod: 'wallet',
        billingCycle: billingCycle
      });

      if (subscriptionId) {
        toast.success("Abonnement active avec succes", {
          description: `Plan ${selectedPlan.display_name} - ${BILLING_CYCLE_LABELS[billingCycle]}`
        });

        await loadWalletBalance();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Erreur lors de l'activation de l'abonnement");
      }
    } catch (error) {
      console.error("Erreur souscription:", error);
      toast.error("Erreur systeme lors de la souscription");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choisir un plan d'abonnement</DialogTitle>
          <DialogDescription>
            Selectionnez le plan et la duree qui vous conviennent
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium">Duree de l'abonnement</label>
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
                    Economisez jusqu'a 20%
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </div>

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
                const isUnlimited = plan.max_products === null;

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

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Package className="w-3.5 h-3.5" />
                            <span>
                              {isUnlimited ? (
                                <span className="inline-flex items-center gap-1"><Infinity className="w-3.5 h-3.5" /> produits</span>
                              ) : `${plan.max_products} produits max`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{plan.max_images_per_product} images/produit</span>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {buildPlanDescription(plan)}
                        </p>

                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {price.toLocaleString()} GNF
                          </span>
                          <span className="text-sm text-muted-foreground">
                            pour {BILLING_CYCLE_DURATION[billingCycle]} mois
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

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
