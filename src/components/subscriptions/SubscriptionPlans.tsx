import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, TrendingUp, Rocket } from 'lucide-react';
import { SubscriptionService, Plan, ActiveSubscription } from '@/services/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

const planIcons = {
  free: Zap,
  basic: Check,
  pro: TrendingUp,
  business: Crown,
  premium: Rocket,
};

interface SubscriptionPlansProps {
  onSelectPlan: (plan: Plan) => void;
}

export function SubscriptionPlans({ onSelectPlan }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const plansData = await SubscriptionService.getPlans();
      setPlans(plansData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subscription = await SubscriptionService.getActiveSubscription(user.id);
        setCurrentSubscription(subscription);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les plans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (planName: string) => {
    return currentSubscription?.plan_name === planName;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          Choisissez votre plan d'abonnement
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Développez votre activité avec les outils adaptés à vos besoins
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {plans.map((plan) => {
          const Icon = planIcons[plan.name as keyof typeof planIcons] || Check;
          const isCurrent = isCurrentPlan(plan.name);
          const isPremium = plan.name === 'premium';

          return (
            <Card
              key={plan.id}
              className={`relative transition-all hover:shadow-lg ${
                isPremium ? 'border-primary shadow-primary/20' : ''
              } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
            >
              {isPremium && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-primary-glow">
                    <Crown className="w-3 h-3 mr-1" />
                    Populaire
                  </Badge>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-4 right-4">
                  <Badge variant="secondary">Plan actuel</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
                <CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">
                      {SubscriptionService.formatAmount(plan.monthly_price_gnf)}
                    </span>
                    <span className="text-muted-foreground"> / mois</span>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Fonctionnalités :
                  </div>
                  <ul className="space-y-2">
                    {(plan.features as string[]).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => onSelectPlan(plan)}
                  disabled={isCurrent || plan.name === 'free'}
                  className="w-full"
                  variant={isPremium ? 'default' : 'outline'}
                >
                  {isCurrent
                    ? 'Plan actuel'
                    : plan.name === 'free'
                    ? 'Plan gratuit'
                    : 'Choisir ce plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {currentSubscription && currentSubscription.current_period_end && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Votre abonnement actuel</h3>
                <p className="text-sm text-muted-foreground">
                  Plan <strong>{currentSubscription.plan_display_name}</strong> -{' '}
                  {SubscriptionService.getDaysRemaining(currentSubscription.current_period_end)}{' '}
                  jours restants
                </p>
              </div>
              {currentSubscription.auto_renew && (
                <Badge variant="outline">Renouvellement automatique</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
