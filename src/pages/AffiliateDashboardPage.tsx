import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Link2, Megaphone, UserCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAffiliateModule } from '@/hooks/useAffiliateModule';
import { AffiliateDashboard } from '@/components/travel/AffiliateDashboard';

export default function AffiliateDashboardPage() {
  const navigate = useNavigate();
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
              <CardTitle>Espace affilié non activé</CardTitle>
              <CardDescription>
                Activez d'abord l'affiliation depuis la page d'activation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/affiliate/activation')}>Activer l'affiliation</Button>
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
              <h1 className="text-2xl font-bold">Espace Affilié</h1>
              <p className="text-sm text-muted-foreground">Module additionnel activé sur votre compte client</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/client')}>Retour au compte client</Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="products"><Megaphone className="h-4 w-4 mr-1" />Produits</TabsTrigger>
            <TabsTrigger value="links"><Link2 className="h-4 w-4 mr-1" />Liens</TabsTrigger>
            <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" />Stats</TabsTrigger>
            <TabsTrigger value="payments"><Wallet className="h-4 w-4 mr-1" />Paiements</TabsTrigger>
            <TabsTrigger value="profile"><UserCircle className="h-4 w-4 mr-1" />Profil</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AffiliateDashboard onViewServices={() => navigate('/services-proximite')} />
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Produits à promouvoir</CardTitle>
                <CardDescription>
                  Sélectionnez des produits affiliés et partagez-les avec vos audiences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigate('/marketplace?category=physique_affilie')}>Voir les produits affiliés</Button>
                <Button variant="outline" onClick={() => navigate('/digital-products')}>Explorer les modules digitaux</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle>Mes liens affiliés</CardTitle>
                <CardDescription>
                  Votre lien principal est prêt, vous pouvez le copier et le diffuser.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border p-3 text-sm break-all">{affiliateLink || 'Lien en cours de génération...'}</div>
                {affiliateLink && (
                  <Button onClick={() => navigator.clipboard.writeText(affiliateLink)}>Copier le lien</Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques affiliées</CardTitle>
                <CardDescription>
                  Retrouvez vos clics, conversions et performances dans le dashboard principal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate('/affiliate/dashboard')}>Actualiser mes statistiques</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Paiements & commissions</CardTitle>
                <CardDescription>
                  Vos commissions sont visibles ici et reçues sur votre wallet existant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => navigate('/wallet')}>Voir mon wallet</Button>
                <p className="text-sm text-muted-foreground">Aucune donnée client n'est supprimée: wallet et historique restent inchangés.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profil affilié</CardTitle>
                <CardDescription>
                  Gérez vos informations affiliées sans modifier votre rôle principal client.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">Code affilié: <span className="font-semibold">{affiliateCode || 'N/A'}</span></p>
                <Button variant="outline" onClick={() => navigate('/profil')}>Ouvrir mon profil principal</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
