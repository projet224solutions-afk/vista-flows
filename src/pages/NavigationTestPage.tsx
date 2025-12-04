/**
 * 🧪 PAGE DE DÉMONSTRATION NAVIGATION GPS - 224SOLUTIONS
 * Page de test complète du système de navigation intelligente
 */

import React from 'react';
import { TaxiMotoNavigationExample } from '@/components/taxi-moto/TaxiMotoNavigationExample';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Navigation, 
  MapPin, 
  Code, 
  CheckCircle,
  Info,
  Zap
} from 'lucide-react';

const NavigationTestPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-3">
              <Navigation className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Navigation GPS Intelligente</h1>
              <p className="text-muted-foreground">
                Système de navigation avec détection automatique et guidage étape par étape
              </p>
            </div>
          </div>
          <Badge variant="outline" className="h-fit">
            v1.0.0
          </Badge>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 rounded-full p-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Précision GPS</p>
                  <p className="text-xl font-bold">±5-10m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 rounded-full p-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lieux Guinée</p>
                  <p className="text-xl font-bold">30+</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 rounded-full p-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mise à jour</p>
                  <p className="text-xl font-bold">2-5s</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/10 rounded-full p-2">
                  <Navigation className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">API</p>
                  <p className="text-xl font-bold">Gratuite</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contenu principal */}
      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demo">
            <Navigation className="h-4 w-4 mr-2" />
            Démonstration
          </TabsTrigger>
          <TabsTrigger value="features">
            <Info className="h-4 w-4 mr-2" />
            Fonctionnalités
          </TabsTrigger>
          <TabsTrigger value="code">
            <Code className="h-4 w-4 mr-2" />
            Exemples Code
          </TabsTrigger>
        </TabsList>

        {/* Onglet Démo */}
        <TabsContent value="demo" className="space-y-6">
          <TaxiMotoNavigationExample />
        </TabsContent>

        {/* Onglet Fonctionnalités */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Détection GPS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Détection GPS ultra-précise
                </CardTitle>
                <CardDescription>
                  Géolocalisation haute précision avec gestion intelligente des erreurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Précision ±5-10 mètres</p>
                    <p className="text-muted-foreground">GPS haute précision activé</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Détection automatique</p>
                    <p className="text-muted-foreground">Latitude, longitude, altitude, vitesse</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Gestion permissions</p>
                    <p className="text-muted-foreground">Messages clairs si refusée/indisponible</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Géocodage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Géocodage intelligent Guinée
                </CardTitle>
                <CardDescription>
                  Conversion adresse → coordonnées GPS automatique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Base de données locale</p>
                    <p className="text-muted-foreground">30+ lieux Guinée pré-enregistrés</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">API OpenRouteService</p>
                    <p className="text-muted-foreground">Recherche gratuite illimitée</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Fallback automatique</p>
                    <p className="text-muted-foreground">BD locale si API indisponible</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Itinéraire */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-primary" />
                  Calcul itinéraire détaillé
                </CardTitle>
                <CardDescription>
                  Algorithme professionnel type Google Maps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Distance et durée précises</p>
                    <p className="text-muted-foreground">Calcul temps réel</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Instructions étape par étape</p>
                    <p className="text-muted-foreground">En français: "Tournez à droite"</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Géométrie complète</p>
                    <p className="text-muted-foreground">Trajet détaillé pour affichage carte</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation temps réel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Guidage temps réel
                </CardTitle>
                <CardDescription>
                  Navigation turn-by-turn avec recalcul automatique
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Suivi GPS continu</p>
                    <p className="text-muted-foreground">Mise à jour 2-5 secondes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Détection hors route</p>
                    <p className="text-muted-foreground">Recalcul auto si déviation &gt; 50m</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Synthèse vocale</p>
                    <p className="text-muted-foreground">Instructions audio en français</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lieux Guinée */}
          <Card>
            <CardHeader>
              <CardTitle>Lieux pré-enregistrés en Guinée</CardTitle>
              <CardDescription>
                Base de données locale pour géocodage ultra-rapide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Conakry</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• Kaloum</p>
                    <p>• Matoto</p>
                    <p>• Ratoma</p>
                    <p>• Dixinn</p>
                    <p>• Matam</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Quartiers</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• Kipé</p>
                    <p>• Manéah</p>
                    <p>• Taouyah</p>
                    <p>• Hamdallaye</p>
                    <p>• Bambeto</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Villes</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• Coyah</p>
                    <p>• Dubréka</p>
                    <p>• Kindia</p>
                    <p>• Mamou</p>
                    <p>• Labé</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Points d'intérêt</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• Aéroport</p>
                    <p>• Port Autonome</p>
                    <p>• Palais du Peuple</p>
                    <p>• Stade 28 Sept</p>
                    <p>• Université Gamal</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Code */}
        <TabsContent value="code" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exemple 1: Service Navigation</CardTitle>
              <CardDescription>
                Utilisation directe du NavigationService
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`import { navigationService } from '@/services/navigation/NavigationService';

async function navigateToManeah() {
  // 1. Détecter position actuelle
  const currentPos = await navigationService.getCurrentPosition();
  console.log('📍 Position:', currentPos.latitude, currentPos.longitude);
  
  // 2. Géocoder destination
  const destinations = await navigationService.geocodeAddress('Manéah', 'GN');
  const maneah = destinations[0];
  console.log('🎯 Manéah:', maneah.latitude, maneah.longitude);
  
  // 3. Calculer itinéraire
  const route = await navigationService.calculateRoute(currentPos, maneah);
  console.log('🛣️ Distance:', route.distance, 'km');
  console.log('⏱️ Durée:', route.duration, 'min');
  
  // 4. Démarrer navigation
  await navigationService.startNavigation(route);
  
  // 5. Écouter mises à jour
  navigationService.subscribe('my-listener', (state) => {
    console.log('➡️ Prochaine étape:', state.nextInstruction);
    console.log('📏 Distance restante:', state.distanceRemaining, 'm');
  });
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exemple 2: Hook React</CardTitle>
              <CardDescription>
                Utilisation simplifiée avec useNavigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`import { useNavigation } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/button';

function TaxiRide() {
  const {
    isNavigating,
    navigationState,
    startNavigation,
    stopNavigation
  } = useNavigation({
    enableVoice: true,
    onNavigationEnd: () => alert('🎉 Arrivé!'),
    onStepChange: (step) => console.log('Étape', step)
  });

  return (
    <div>
      {!isNavigating ? (
        <Button onClick={() => startNavigation(undefined, 'Kipé')}>
          🧭 Naviguer vers Kipé
        </Button>
      ) : (
        <div>
          <p>{navigationState?.nextInstruction}</p>
          <p>Distance: {navigationState?.distanceToNextStep}m</p>
          <Button onClick={stopNavigation}>🛑 Arrêter</Button>
        </div>
      )}
    </div>
  );
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exemple 3: Composant complet</CardTitle>
              <CardDescription>
                Interface utilisateur avec carte de navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
{`import { NavigationMap } from '@/components/navigation/NavigationMap';

function BookingPage() {
  const [destination, setDestination] = useState('');
  const [showNav, setShowNav] = useState(false);

  return (
    <div>
      <input 
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destination"
      />
      <button onClick={() => setShowNav(true)}>
        Démarrer navigation
      </button>

      {showNav && (
        <NavigationMap
          endAddress={destination}
          onNavigationEnd={() => setShowNav(false)}
        />
      )}
    </div>
  );
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NavigationTestPage;
