import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crown, Loader2, Sparkles, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAffiliateModule } from '@/hooks/useAffiliateModule';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PlanLite {
  id: string;
  name: string;
  display_name: string;
  monthly_price_gnf: number;
  yearly_price_gnf?: number | null;
}

export default function AffiliateActivationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    loading,
    hasActiveSubscription,
    isAffiliateEnabled,
    activateWithExistingSubscription,
    subscribeAndActivate,
  } = useAffiliateModule();

  const [plans, setPlans] = useState<PlanLite[]>([]);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (isAffiliateEnabled) {
      navigate('/affiliate/dashboard', { replace: true });
    }
  }, [isAffiliateEnabled, navigate]);

  useEffect(() => {
    const loadPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select('id,name,display_name,monthly_price_gnf,yearly_price_gnf')
        .eq('is_active', true)
        .order('display_order');

      const normalized = (data || []) as PlanLite[];
      setPlans(normalized);
    };

    void loadPlans();
  }, []);

  const monthlyPlans = useMemo(() => plans.filter((p) => p.name !== 'free'), [plans]);

  const formatPrice = (amount: number) => `${amount.toLocaleString('fr-FR')} GNF`;

  const handleActivate = async () => {
    setActivating(true);
    try {
      await activateWithExistingSubscription();
      toast.success('Module affilié activé avec succès');
      navigate('/affiliate/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Activation impossible');
    } finally {
      setActivating(false);
    }
  };

  const handleSubscribePlan = async (plan: PlanLite) => {
    if (!user?.id) {
      toast.error('Veuillez vous connecter');
      return;
    }

    setSubscribingPlanId(plan.id);
    try {
      await subscribeAndActivate(plan.id, 'monthly');
      toast.success('Abonnement confirmé et module affilié activé');
      navigate('/affiliate/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Souscription impossible');
    } finally {
      setSubscribingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/client')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Activer l'affiliation</h1>
            <p className="text-muted-foreground text-sm">Gardez votre compte client et ajoutez un module de revenus affiliés.</p>
          </div>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Programme d'affiliation
            </CardTitle>
            <CardDescription>
              Fonctionnement: partagez vos liens, générez des ventes, recevez des commissions dans votre wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Tableau de bord affilié dédié</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Produits à promouvoir et liens personnels</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Statistiques et suivi des commissions</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> Aucune perte de vos données client (wallet, commandes, profil, historique)</div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : hasActiveSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Vous avez déjà un abonnement actif
              </CardTitle>
              <CardDescription>
                Vous pouvez activer immédiatement le module affilié sans changer votre rôle client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleActivate} disabled={activating} className="w-full sm:w-auto">
                {activating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activation...</>
                ) : (
                  'Activer maintenant'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Condition d'activation: abonnement
              </CardTitle>
              <CardDescription>
                Choisissez un abonnement compatible pour débloquer l'espace affilié.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {monthlyPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun plan disponible pour le moment.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {monthlyPlans.map((plan) => (
                    <Card key={plan.id} className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{plan.display_name}</h3>
                          <Badge variant="outline">Mensuel</Badge>
                        </div>
                        <p className="text-xl font-bold text-primary">{formatPrice(plan.monthly_price_gnf)}</p>
                        <Button
                          className="w-full"
                          onClick={() => handleSubscribePlan(plan)}
                          disabled={subscribingPlanId === plan.id}
                        >
                          {subscribingPlanId === plan.id ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Traitement...</>
                          ) : (
                            'Souscrire et activer'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
