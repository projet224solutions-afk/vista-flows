import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAffiliateModule } from '@/hooks/useAffiliateModule';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';

export default function AffiliateActivationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    loading,
    isAffiliateEnabled,
    activateWithExistingSubscription,
  } = useAffiliateModule();

  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (isAffiliateEnabled) {
      navigate('/affiliate/dashboard', { replace: true });
    }
  }, [isAffiliateEnabled, navigate]);

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

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('affiliate.activation.title')}</CardTitle>
              <CardDescription>
                Activez gratuitement votre compte affilié pour commencer à parrainer.
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
        )}
      </div>
    </div>
  );
}
