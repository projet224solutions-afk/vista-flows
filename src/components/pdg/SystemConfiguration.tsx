/**
 * SYSTEM CONFIGURATION - 224SOLUTIONS
 * Configuration centralisÃ©e de tous les services externes
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Settings,
  CreditCard,
  Video,
  Smartphone,
  Brain,
  Map,
  Key,
  Database,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface ServiceStatus {
  name: string;
  icon: any;
  status: 'configured' | 'not_configured' | 'testing' | 'error';
  required: boolean;
  description: string;
  secretName?: string;
  testEndpoint?: string;
  documentation?: string;
}

export default function SystemConfiguration() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Google Cloud APIs',
      icon: Map,
      status: 'testing',
      required: true,
      description: 'GÃ©olocalisation, Geocoding, Directions',
      secretName: 'GOOGLE_CLOUD_API_KEY',
      testEndpoint: 'test-google-cloud-api',
      documentation: 'https://console.cloud.google.com'
    },
    {
      name: 'Firebase Firestore',
      icon: Database,
      status: 'testing',
      required: true,
      description: 'Base de donnÃ©es pour synchronisation offline',
      secretName: 'FIREBASE_WEB_API_KEY',
      documentation: 'https://console.firebase.google.com'
    },
    {
      name: 'Assistant IA Gemini',
      icon: Sparkles,
      status: 'testing',
      required: true,
      description: 'IA Gemini pour assistant intelligent',
      secretName: 'LOVABLE_API_KEY',
      documentation: 'https://ai.google.dev/'
    },
    {
      name: 'OpenAI API',
      icon: Brain,
      status: 'testing',
      required: false,
      description: 'GÃ©nÃ©ration IA de descriptions produits',
      secretName: 'OPENAI_API_KEY',
      documentation: 'https://platform.openai.com'
    },
    {
      name: 'Stripe',
      icon: CreditCard,
      status: 'testing',
      required: true,
      description: 'Paiements par carte bancaire',
      secretName: 'STRIPE_SECRET_KEY',
      documentation: 'https://dashboard.stripe.com'
    },
    {
      name: 'Agora',
      icon: Video,
      status: 'testing',
      required: false,
      description: 'Appels vidÃ©o et audio',
      secretName: 'AGORA_APP_ID',
      documentation: 'https://console.agora.io'
    },
    {
      name: 'Orange Money',
      icon: Smartphone,
      status: 'testing',
      required: false,
      description: 'Paiements mobile money',
      secretName: 'ORANGE_MONEY_API_KEY',
      documentation: 'https://developer.orange.com'
    }
  ]);

  const [testing, setTesting] = useState(false);

  useEffect(() => {
    testAllServices();
  }, []);

  const testAllServices = async () => {
    setTesting(true);
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://uakkxaibujzxdiqzpnpr.supabase.co';
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/check-all-services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });
      
      const data = await response.json();
      
      if (data.status === 'success' && data.services) {
        // Mettre Ã  jour le statut de chaque service depuis l'API
        setServices(prev => prev.map(service => {
          const apiService = data.services.find((s: any) => s.name === service.name);
          if (apiService) {
            return {
              ...service,
              status: apiService.configured ? 'configured' : 'not_configured'
            };
          }
          return service;
        }));

        // Test Firestore cÃ´tÃ© client
        try {
          const { firestore } = await import('@/lib/firebaseClient');
          const { collection, getDocs, limit, query } = await import('firebase/firestore');
          
          if (firestore) {
            // Essayer d'accÃ©der Ã  Firestore
            const testQuery = query(collection(firestore, 'test'), limit(1));
            await getDocs(testQuery);
            
            // Mise Ã  jour du statut Firestore
            setServices(prev => prev.map(service =>
              service.name === 'Firebase Firestore'
                ? { ...service, status: 'configured' }
                : service
            ));
          }
        } catch (firestoreError: any) {
          console.error('Firestore test failed:', firestoreError);
          setServices(prev => prev.map(service =>
            service.name === 'Firebase Firestore'
              ? { ...service, status: 'error' }
              : service
          ));
        }

        // Afficher un message de rÃ©sumÃ©
        setTimeout(() => {
          const currentConfigured = services.filter(s => s.status === 'configured').length;
          const currentRequired = services.filter(s => s.required).length;
          const currentRequiredConfigured = services.filter(s => s.required && s.status === 'configured').length;
          
          if (currentRequiredConfigured === currentRequired) {
            toast.success('Tous les services requis sont configurÃ©s !', {
              description: `${currentConfigured}/${services.length} services configurÃ©s`
            });
          } else {
            toast.warning('Configuration incomplÃ¨te', {
              description: `${currentRequiredConfigured}/${currentRequired} services requis configurÃ©s`
            });
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Error testing services:', error);
      toast.error('Erreur lors du test des services', {
        description: error.message
      });
      
      // Marquer tous comme erreur
      setServices(prev => prev.map(service => ({
        ...service,
        status: 'error'
      })));
    }

    setTesting(false);
  };

  const updateServiceStatus = (serviceName: string, status: ServiceStatus['status']) => {
    setServices(prev => prev.map(service => 
      service.name === serviceName ? { ...service, status } : service
    ));
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="h-5 w-5 text-primary-orange-500" />;
      case 'not_configured':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'configured':
        return <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500/10 text-primary-orange-600 border-primary-orange-500/20">ConfigurÃ©</Badge>;
      case 'not_configured':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Non configurÃ©</Badge>;
      case 'testing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Test en cours</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Erreur</Badge>;
    }
  };

  const configuredCount = services.filter(s => s.status === 'configured').length;
  const requiredCount = services.filter(s => s.required).length;
  const requiredConfigured = services.filter(s => s.required && s.status === 'configured').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configuration SystÃ¨me</h2>
        <p className="text-muted-foreground">
          GÃ©rez la configuration de tous les services externes utilisÃ©s par l'application
        </p>
      </div>

      {/* RÃ©sumÃ© */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Totaux</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground">
              {configuredCount} configurÃ©s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Requis</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requiredConfigured}/{requiredCount}</div>
            <p className="text-xs text-muted-foreground">
              {requiredConfigured === requiredCount ? 'Tous configurÃ©s âœ“' : 'Configuration incomplÃ¨te'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut Global</CardTitle>
            {requiredConfigured === requiredCount ? (
              <CheckCircle className="h-4 w-4 text-primary-orange-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requiredConfigured === requiredCount ? 'OpÃ©rationnel' : 'Attention'}
            </div>
            <p className="text-xs text-muted-foreground">
              {requiredConfigured === requiredCount 
                ? 'Tous les services requis fonctionnent' 
                : 'Certains services requis ne sont pas configurÃ©s'}
            </p>
          </CardContent>
        </Card>
      </div>

      {requiredConfigured < requiredCount && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Certains services requis ne sont pas configurÃ©s. L'application peut ne pas fonctionner correctement.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions globales */}
      <div className="flex gap-2">
        <Button onClick={testAllServices} disabled={testing}>
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Test en cours...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Tester tous les services
            </>
          )}
        </Button>
      </div>

      {/* Liste des services */}
      <Card>
        <CardHeader>
          <CardTitle>Services Externes</CardTitle>
          <CardDescription>Configuration et statut de chaque service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.name} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{service.name}</p>
                        {service.required && (
                          <Badge variant="outline" className="text-xs">Requis</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      {service.secretName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Secret: <code className="bg-muted px-1 rounded">{service.secretName}</code>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    {getStatusBadge(service.status)}
                    {service.documentation && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(service.documentation, '_blank', 'noopener,noreferrer')}
                      >
                        Documentation
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Guide de configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Guide de Configuration</CardTitle>
          <CardDescription>Comment configurer chaque service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Google Cloud APIs</h4>
            <p className="text-sm text-muted-foreground">
              Activez Geocoding API, Directions API et Maps JavaScript API dans Google Cloud Console.
              CrÃ©ez une clÃ© API sans restrictions pour les tests.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Firebase Firestore</h4>
            <p className="text-sm text-muted-foreground">
              CrÃ©ez un projet Firebase, activez Firestore Database. Copiez les clÃ©s de configuration web (apiKey, projectId, etc.) depuis les paramÃ¨tres du projet.
              Essentiel pour la synchronisation offline et le stockage des donnÃ©es.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Assistant IA Gemini</h4>
            <p className="text-sm text-muted-foreground">
              Le service IA Gemini est automatiquement configurÃ© avec votre workspace. Il fournit l'accÃ¨s Ã  Google Gemini et d'autres modÃ¨les IA pour l'assistant intelligent.
              Configuration automatique via votre clÃ© API.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">4. Stripe</h4>
            <p className="text-sm text-muted-foreground">
              CrÃ©ez un compte sur stripe.com, rÃ©cupÃ©rez votre clÃ© secrÃ¨te (sk_test_... pour les tests).
              NÃ©cessaire pour accepter les paiements par carte.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">5. OpenAI (Optionnel)</h4>
            <p className="text-sm text-muted-foreground">
              CrÃ©ez une clÃ© API sur platform.openai.com pour activer la gÃ©nÃ©ration automatique de descriptions produits.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">6. Agora (Optionnel)</h4>
            <p className="text-sm text-muted-foreground">
              Pour les appels vidÃ©o/audio, crÃ©ez un projet sur console.agora.io et rÃ©cupÃ©rez l'App ID et le Certificate.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">7. Orange Money (Optionnel)</h4>
            <p className="text-sm text-muted-foreground">
              Pour les paiements mobile money, inscrivez-vous sur developer.orange.com et demandez un accÃ¨s API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
