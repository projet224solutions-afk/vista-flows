import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crown, Loader2, Sparkles, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAffiliateModule } from '@/hooks/useAffiliateModule';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
  const {
    loading,
    hasActiveSubscription,
    hasEligibleActiveSubscription,
    requiresDedicatedAffiliatePlan,
    activeSubscriptionPlanName,
    isAffiliateEnabled,
    activateWithExistingSubscription,
    subscribeAndActivate,
    isDedicatedAffiliatePlan,
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
  const dedicatedPlans = useMemo(() => monthlyPlans.filter((p) => isDedicatedAffiliatePlan(p)), [isDedicatedAffiliatePlan, monthlyPlans]);
  const plansToDisplay = dedicatedPlans.length > 0 ? dedicatedPlans : monthlyPlans;

  const formatPrice = (amount: number) => `${amount.toLocaleString('fr-FR')} GNF`;

  const handleActivate = async () => {
    setActivating(true);
    try {
      await activateWithExistingSubscription();
      toast.success(t('affiliate.activation.successActivated'));
      navigate('/affiliate/dashboard');
    } catch (error: any) {
      toast.error(error.message || t('affiliate.activation.errorActivationImpossible'));
    } finally {
      setActivating(false);
    }
  };

  const handleSubscribePlan = async (plan: PlanLite) => {
    if (!user?.id) {
      toast.error(t('affiliate.activation.loginRequired'));
      return;
    }

    setSubscribingPlanId(plan.id);
    try {
      await subscribeAndActivate(plan.id, 'monthly');
      toast.success(t('affiliate.activation.successSubscribed'));
      navigate('/affiliate/dashboard');
    } catch (error: any) {
      toast.error(error.message || t('affiliate.activation.errorSubscriptionImpossible'));
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
            <h1 className="text-2xl font-bold">{t('affiliate.activation.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('affiliate.activation.subtitle')}</p>
          </div>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('affiliate.activation.programTitle')}
            </CardTitle>
            <CardDescription>
              {t('affiliate.activation.programDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> {t('affiliate.activation.benefit1')}</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> {t('affiliate.activation.benefit2')}</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> {t('affiliate.activation.benefit3')}</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" /> {t('affiliate.activation.benefit4')}</div>
          </CardContent>
        </Card>

        {requiresDedicatedAffiliatePlan && (
          <Card className="border-amber-300/40 bg-amber-50/50">
            <CardContent className="p-4 text-sm text-amber-800">
              {t('affiliate.activation.dedicatedOnlyNotice')}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : hasActiveSubscription && hasEligibleActiveSubscription ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {t('affiliate.activation.activeSubTitle')}
              </CardTitle>
              <CardDescription>
                {t('affiliate.activation.activeSubDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleActivate} disabled={activating} className="w-full sm:w-auto">
                {activating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('affiliate.activation.activating')}</>
                ) : (
                  t('affiliate.activation.activateNow')
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                {t('affiliate.activation.conditionTitle')}
              </CardTitle>
              <CardDescription>
                {t('affiliate.activation.conditionDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasActiveSubscription && !hasEligibleActiveSubscription && (
                <p className="text-sm text-amber-700">
                  {t('affiliate.activation.ineligibleActivePlan').replace('{plan}', activeSubscriptionPlanName || '-')}
                </p>
              )}
              {plansToDisplay.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('affiliate.activation.noPlans')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plansToDisplay.map((plan) => (
                    <Card key={plan.id} className="border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{plan.display_name}</h3>
                          <Badge variant="outline">{t('affiliate.activation.monthly')}</Badge>
                        </div>
                        <p className="text-xl font-bold text-primary">{formatPrice(plan.monthly_price_gnf)}</p>
                        <Button
                          className="w-full"
                          onClick={() => handleSubscribePlan(plan)}
                          disabled={subscribingPlanId === plan.id}
                        >
                          {subscribingPlanId === plan.id ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('affiliate.activation.processing')}</>
                          ) : (
                            t('affiliate.activation.subscribeAndActivate')
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
