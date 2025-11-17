import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupportTicketSystem } from '@/components/support/SupportTicketSystem';
import { CustomReportBuilder } from '@/components/reports/CustomReportBuilder';
import { ApiKeyManager } from '@/components/api/ApiKeyManager';
import { FeatureGate } from '@/components/features/FeatureGate';
import { useVendorSubscription } from '@/hooks/useVendorSubscription';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { 
  Shield, 
  FileText, 
  Key, 
  Sparkles,
  Lock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function FeaturesDemo() {
  const { subscription } = useVendorSubscription();
  const { restrictions, loading } = useFeatureAccess();
  const [activeTab, setActiveTab] = useState('overview');

  const features = [
    {
      key: 'priority_support',
      name: 'Support Prioritaire',
      icon: Shield,
      tab: 'support',
      description: 'Temps de réponse garanti et support dédié'
    },
    {
      key: 'custom_reports',
      name: 'Rapports Personnalisés',
      icon: FileText,
      tab: 'reports',
      description: 'Création de rapports sur mesure avec export'
    },
    {
      key: 'api_access',
      name: 'Accès API Premium',
      icon: Key,
      tab: 'api',
      description: 'Rate limits élevés et webhooks avancés'
    }
  ];

  const getFeatureStatus = (featureKey: string) => {
    const restriction = restrictions.find(r => r.feature_key === featureKey);
    if (!restriction) return { available: true, reason: '' };

    const planName = subscription?.plan_name?.toLowerCase();
    
    switch (planName) {
      case 'business':
      case 'premium':
        return { available: true, reason: '' };
      case 'pro':
        return { 
          available: restriction.pro_plan_access,
          reason: restriction.pro_plan_access ? '' : 'Nécessite Business ou Premium'
        };
      case 'basic':
        return { 
          available: restriction.basic_plan_access,
          reason: restriction.basic_plan_access ? '' : 'Nécessite Pro ou supérieur'
        };
      default:
        return { available: false, reason: 'Nécessite un abonnement payant' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">Fonctionnalités Premium</h1>
              <p className="text-muted-foreground mt-2">
                Découvrez toutes les fonctionnalités de votre plan {subscription?.plan_name || 'Free'}
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-primary to-primary-glow text-lg px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Plan {subscription?.plan_name || 'Free'}
            </Badge>
          </div>

          {/* Statut des fonctionnalités */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Accès aux Fonctionnalités</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  const status = getFeatureStatus(feature.key);
                  
                  return (
                    <Card 
                      key={feature.key}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        status.available ? 'border-green-500/50' : 'border-muted'
                      }`}
                      onClick={() => status.available && setActiveTab(feature.tab)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <Icon className={`w-8 h-8 ${status.available ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div className="space-y-1">
                              <h3 className="font-semibold text-sm">{feature.name}</h3>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                          </div>
                          {status.available ? (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        {!status.available && (
                          <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {status.reason}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bienvenue dans vos fonctionnalités premium</CardTitle>
                <CardDescription>
                  Explorez les outils avancés disponibles dans votre plan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Cette interface vous permet de découvrir et utiliser toutes les fonctionnalités premium de 224Solutions.
                  Sélectionnez un onglet ci-dessus pour commencer.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardHeader>
                      <Shield className="w-8 h-8 text-primary mb-2" />
                      <CardTitle className="text-lg">Support Prioritaire</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Créez des tickets et obtenez une assistance rapide de notre équipe
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                    <CardHeader>
                      <FileText className="w-8 h-8 text-blue-500 mb-2" />
                      <CardTitle className="text-lg">Rapports Avancés</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Générez des rapports personnalisés pour analyser votre activité
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                    <CardHeader>
                      <Key className="w-8 h-8 text-purple-500 mb-2" />
                      <CardTitle className="text-lg">API Premium</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Intégrez 224Solutions dans vos applications avec notre API
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                    <CardHeader>
                      <Sparkles className="w-8 h-8 text-orange-500 mb-2" />
                      <CardTitle className="text-lg">Plus à venir...</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Branding personnalisé, formation dédiée et plus encore
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="mt-6">
            <FeatureGate featureKey="priority_support">
              <SupportTicketSystem />
            </FeatureGate>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <FeatureGate featureKey="custom_reports">
              <CustomReportBuilder />
            </FeatureGate>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <FeatureGate featureKey="api_access">
              <ApiKeyManager />
            </FeatureGate>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
