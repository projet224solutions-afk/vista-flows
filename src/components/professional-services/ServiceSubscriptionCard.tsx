/**
 * Carte d'abonnement pour les services professionnels
 * Affiche le plan actuel et permet la mise à niveau
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Zap, Check, Star, Calendar, AlertTriangle } from 'lucide-react';
import { useServiceSubscription } from '@/hooks/useServiceSubscription';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ServiceSubscriptionCardProps {
  serviceId: string;
  serviceTypeId?: string;
  compact?: boolean;
}

export function ServiceSubscriptionCard({ serviceId, serviceTypeId, compact = false }: ServiceSubscriptionCardProps) {
  const { user } = useAuth();
  const {
    subscription,
    plans,
    loading,
    isActive,
    isExpired,
    isExpiringSoon,
    daysRemaining,
    subscribe,
    canAccessFeature,
    formatAmount,
    refresh
  } = useServiceSubscription({ serviceId, serviceTypeId });

  const [showPlans, setShowPlans] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'yearly'>('monthly');

  const currentPlanName = subscription?.plan_display_name || 'Gratuit';
  const isFree = !subscription?.subscription_id;

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      setSubscribing(true);
      await subscribe(planId, selectedBilling);
      toast.success('Abonnement activé avec succès !');
      setShowPlans(false);
      await refresh();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la souscription');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-6 bg-muted rounded w-1/3 mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </CardContent>
      </Card>
    );
  }

  // Version compacte (barre horizontale)
  if (compact) {
    return (
      <>
        <div className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border",
          isFree ? "bg-muted/50 border-border" : "bg-primary/5 border-primary/20"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            {isFree ? (
              <Zap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Crown className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">
              Plan {currentPlanName}
            </span>
            {isExpiringSoon && (
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Expire bientôt
              </Badge>
            )}
            {isActive && !isFree && daysRemaining > 0 && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {daysRemaining}j restants
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant={isFree ? "default" : "outline"}
            className="text-xs flex-shrink-0"
            onClick={() => setShowPlans(true)}
          >
            {isFree ? (
              <>
                <Crown className="w-3 h-3 mr-1" />
                Upgrade
              </>
            ) : (
              'Gérer'
            )}
          </Button>
        </div>

        <PlansDialog
          open={showPlans}
          onOpenChange={setShowPlans}
          plans={plans}
          currentPlanName={subscription?.plan_name}
          selectedBilling={selectedBilling}
          onBillingChange={setSelectedBilling}
          onSubscribe={handleSubscribe}
          subscribing={subscribing}
          formatAmount={formatAmount}
        />
      </>
    );
  }

  // Version complète (carte)
  return (
    <>
      <Card className={cn(
        "overflow-hidden",
        isExpiringSoon && "border-destructive/50"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Abonnement Service
            </CardTitle>
            <Badge variant={isFree ? "secondary" : "default"} className={cn(
              !isFree && "bg-primary"
            )}>
              {currentPlanName}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Statut */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Statut</span>
            <span className={cn(
              "font-medium",
              isActive || isFree ? "text-emerald-600" : "text-destructive"
            )}>
              {isFree ? '✅ Actif (Gratuit)' : isActive ? '✅ Actif' : isExpired ? '❌ Expiré' : '⏳ En attente'}
            </span>
          </div>

          {/* Jours restants */}
          {!isFree && isActive && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Jours restants
              </span>
              <span className={cn(
                "font-medium",
                daysRemaining <= 7 ? "text-destructive" : "text-foreground"
              )}>
                {daysRemaining} jours
              </span>
            </div>
          )}

          {/* Limites du plan */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Limites du plan :</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Réservations: {subscription?.max_bookings ?? '10'}/mois</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Produits: {subscription?.max_products ?? '5'}</span>
              </div>
              <div className="flex items-center gap-1">
                {canAccessFeature('analytics') ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <span className="w-3 h-3 text-muted-foreground">✗</span>
                )}
                <span>Analytics</span>
              </div>
              <div className="flex items-center gap-1">
                {canAccessFeature('priority_listing') ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <span className="w-3 h-3 text-muted-foreground">✗</span>
                )}
                <span>Listing prioritaire</span>
              </div>
            </div>
          </div>

          {/* Alerte expiration */}
          {isExpiringSoon && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Votre abonnement expire dans {daysRemaining} jours. Renouvelez pour ne pas perdre vos avantages.</span>
            </div>
          )}

          {/* Bouton */}
          <Button
            className="w-full"
            variant={isFree ? "default" : "outline"}
            onClick={() => setShowPlans(true)}
          >
            {isFree ? (
              <>
                <Crown className="w-4 h-4 mr-2" />
                Mettre à niveau
              </>
            ) : (
              'Gérer mon abonnement'
            )}
          </Button>
        </CardContent>
      </Card>

      <PlansDialog
        open={showPlans}
        onOpenChange={setShowPlans}
        plans={plans}
        currentPlanName={subscription?.plan_name}
        selectedBilling={selectedBilling}
        onBillingChange={setSelectedBilling}
        onSubscribe={handleSubscribe}
        subscribing={subscribing}
        formatAmount={formatAmount}
      />
    </>
  );
}

// Dialog pour afficher les plans
function PlansDialog({
  open,
  onOpenChange,
  plans,
  currentPlanName,
  selectedBilling,
  onBillingChange,
  onSubscribe,
  subscribing,
  formatAmount
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: any[];
  currentPlanName?: string;
  selectedBilling: 'monthly' | 'yearly';
  onBillingChange: (billing: 'monthly' | 'yearly') => void;
  onSubscribe: (planId: string) => void;
  subscribing: boolean;
  formatAmount: (amount: number) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Choisir un plan
          </DialogTitle>
        </DialogHeader>

        {/* Toggle facturation */}
        <div className="flex items-center justify-center gap-2 py-2">
          <Button
            size="sm"
            variant={selectedBilling === 'monthly' ? 'default' : 'outline'}
            onClick={() => onBillingChange('monthly')}
          >
            Mensuel
          </Button>
          <Button
            size="sm"
            variant={selectedBilling === 'yearly' ? 'default' : 'outline'}
            onClick={() => onBillingChange('yearly')}
          >
            Annuel
            <Badge variant="secondary" className="ml-1 text-[10px]">-15%</Badge>
          </Button>
        </div>

        {/* Grille des plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlanName;
            const price = selectedBilling === 'yearly'
              ? (plan.yearly_price_gnf || plan.monthly_price_gnf * 12)
              : plan.monthly_price_gnf;

            return (
              <Card key={plan.id} className={cn(
                "relative overflow-hidden transition-all",
                isCurrent && "border-primary ring-1 ring-primary",
                plan.name === 'pro' && !isCurrent && "border-primary/50"
              )}>
                {plan.name === 'pro' && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-bl-lg font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Populaire
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-br-lg font-medium">
                    Actuel
                  </div>
                )}

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg">{plan.display_name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black">
                      {plan.monthly_price_gnf === 0 ? 'Gratuit' : formatAmount(price)}
                    </span>
                    {plan.monthly_price_gnf > 0 && (
                      <span className="text-xs text-muted-foreground">
                        /{selectedBilling === 'yearly' ? 'an' : 'mois'}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1">
                    {(plan.features || []).slice(0, 5).map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <div>📅 Réservations: {plan.max_bookings_per_month ?? '∞'}/mois</div>
                    <div>📦 Produits: {plan.max_products ?? '∞'}</div>
                    <div>👥 Staff: {plan.max_staff ?? '∞'}</div>
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : plan.name === 'pro' ? 'default' : 'secondary'}
                    disabled={isCurrent || subscribing || plan.monthly_price_gnf === 0}
                    onClick={() => onSubscribe(plan.id)}
                  >
                    {subscribing ? (
                      <span className="animate-pulse">Traitement...</span>
                    ) : isCurrent ? (
                      'Plan actuel'
                    ) : plan.monthly_price_gnf === 0 ? (
                      'Plan gratuit'
                    ) : (
                      <>
                        <Zap className="w-3 h-3 mr-1" />
                        Choisir
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
