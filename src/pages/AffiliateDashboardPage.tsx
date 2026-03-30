import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Link2, Megaphone, UserCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAffiliateModule } from '@/hooks/useAffiliateModule';
import { AffiliateDashboard } from '@/components/travel/AffiliateDashboard';
import { useTranslation } from '@/hooks/useTranslation';

export default function AffiliateDashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAffiliateEnabled, affiliateCode } = useAffiliateModule();

  const affiliateLink = useMemo(() => {
    if (!affiliateCode) return null;
    return `${window.location.origin}/travel?ref=${affiliateCode}`;
  }, [affiliateCode]);

  if (!isAffiliateEnabled) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container max-w-3xl mx-auto p-4 space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/client')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour client
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>{t('affiliate.dashboard.notEnabledTitle')}</CardTitle>
              <CardDescription>
                {t('affiliate.dashboard.notEnabledDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/affiliate/activation')}>{t('affiliate.dashboard.activateNow')}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/client')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t('affiliate.dashboard.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('affiliate.dashboard.subtitle')}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/client')}>{t('affiliate.dashboard.backToClient')}</Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />{t('affiliate.dashboard.tabDashboard')}</TabsTrigger>
            <TabsTrigger value="products"><Megaphone className="h-4 w-4 mr-1" />{t('affiliate.dashboard.tabProducts')}</TabsTrigger>
            <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-1" />{t('affiliate.dashboard.tabLinks')}</TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" />{t('affiliate.dashboard.tabStats')}</TabsTrigger>
            <TabsTrigger value="payments"><Wallet className="h-4 w-4 mr-1" />{t('affiliate.dashboard.tabPayments')}</TabsTrigger>
            <TabsTrigger value="profile"><UserCircle className="h-4 w-4 mr-1" />{t('affiliate.dashboard.tabProfile')}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AffiliateDashboard onViewServices={() => navigate('/services-proximite')} />
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>{t('affiliate.dashboard.productsTitle')}</CardTitle>
                <CardDescription>
                  {t('affiliate.dashboard.productsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate('/marketplace?category=physique_affilie')}>{t('affiliate.dashboard.viewAffiliateProducts')}</Button>
                <Button variant="outline" onClick={() => navigate('/digital-products')}>{t('affiliate.dashboard.exploreDigitalModules')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle>{t('affiliate.dashboard.linksTitle')}</CardTitle>
                <CardDescription>
                  {t('affiliate.dashboard.linksDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border p-3 text-sm break-all">{affiliateLink || 'Lien en cours de génération...'}</div>
                {affiliateLink && (
                  <Button onClick={() => navigator.clipboard.writeText(affiliateLink)}>{t('affiliate.dashboard.copyLink')}</Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>{t('affiliate.dashboard.statsTitle')}</CardTitle>
                <CardDescription>
                  {t('affiliate.dashboard.statsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate('/affiliate/dashboard')}>{t('affiliate.dashboard.refreshStats')}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>{t('affiliate.dashboard.paymentsTitle')}</CardTitle>
                <CardDescription>
                  {t('affiliate.dashboard.paymentsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => navigate('/wallet')}>{t('affiliate.dashboard.viewWallet')}</Button>
                <p className="text-sm text-muted-foreground">{t('affiliate.dashboard.noDataLoss')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t('affiliate.dashboard.profileTitle')}</CardTitle>
                <CardDescription>
                  {t('affiliate.dashboard.profileDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{t('affiliate.dashboard.codeLabel')}: <span className="font-semibold">{affiliateCode || 'N/A'}</span></p>
                <Button variant="outline" onClick={() => navigate('/profil')}>{t('affiliate.dashboard.openMainProfile')}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
