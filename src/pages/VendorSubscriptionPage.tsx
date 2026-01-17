import { ArrowLeft, Store, Package, TrendingUp, Shield, Zap, Star, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useVendorSubscription } from '@/hooks/useVendorSubscription';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Calendar } from 'lucide-react';

// Avantages spécifiques aux vendeurs
const VENDOR_BENEFITS = [
  { icon: Store, text: "Boutique en ligne personnalisée" },
  { icon: Package, text: "Gestion illimitée de produits" },
  { icon: TrendingUp, text: "Statistiques et analyses des ventes" },
  { icon: Shield, text: "Paiements sécurisés" },
  { icon: Zap, text: "Boost de visibilité des produits" },
  { icon: Star, text: "Support prioritaire 7j/7" },
];

export default function VendorSubscriptionPage() {
  const navigate = useNavigate();
  const { 
    subscription, 
    loading, 
    hasAccess, 
    isExpired, 
    daysRemaining, 
    expiryDate,
    priceFormatted 
  } = useVendorSubscription();

  const handleBack = () => {
    navigate('/vendeur/dashboard');
  };

  const handleManageSubscription = () => {
    navigate('/subscriptions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container max-w-2xl mx-auto p-4 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Abonnement 224Solutions</h1>
            <p className="text-muted-foreground">
              Gérez votre abonnement mensuel
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Mon Abonnement 224Solutions
                </CardTitle>
                <CardDescription>
                  Abonnement mensuel ou annuel pour accéder aux services de 224Solutions
                </CardDescription>
              </div>
              {hasAccess && !isExpired && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
              )}
              {isExpired && (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                  Expiré
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Information sur l'abonnement actuel */}
            {hasAccess && subscription && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Abonnement actuel</p>
                    <p className="text-2xl font-bold text-primary">
                      {priceFormatted} GNF
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valable 30 jours à compter de l'activation
                    </p>
                  </div>
                  <Calendar className="h-12 w-12 text-primary/30" />
                </div>

                {expiryDate && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                    <div>
                      <p className="text-xs text-muted-foreground">Date d'expiration</p>
                      <p className="font-medium">
                        {format(expiryDate, 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jours restants</p>
                      <p className="font-medium">{daysRemaining} jours</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Avantages de l'abonnement vendeur */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="font-semibold text-sm mb-3">
                Avec l'abonnement, vous accédez à :
              </p>
              <ul className="space-y-2">
                {VENDOR_BENEFITS.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <Icon className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">{benefit.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {(!hasAccess || isExpired) && (
                <Button onClick={handleManageSubscription} className="w-full" size="lg">
                  <Zap className="h-4 w-4 mr-2" />
                  S'abonner maintenant
                </Button>
              )}

              {hasAccess && !isExpired && (
                <Button onClick={handleManageSubscription} variant="outline" className="w-full">
                  Gérer mon abonnement
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
