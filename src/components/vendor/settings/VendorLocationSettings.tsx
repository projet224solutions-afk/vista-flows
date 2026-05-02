import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Navigation, Save, Loader2, ChevronDown } from 'lucide-react';

interface VendorLocationSettingsProps {
  vendorId: string;
}

// Villes et quartiers de Guinée
const GUINEA_CITIES = [
  { name: 'Conakry', neighborhoods: ['Kaloum', 'Dixinn', 'Matam', 'Ratoma', 'Matoto'] },
  { name: 'Kindia', neighborhoods: ['Centre-ville', 'Madina', 'Wondy', 'Koliady'] },
  { name: 'Boké', neighborhoods: ['Centre-ville', 'Tanènè', 'Dabiss'] },
  { name: 'Labé', neighborhoods: ['Centre-ville', 'Tata', 'Daka', 'Pounthioun'] },
  { name: 'Kankan', neighborhoods: ['Centre-ville', 'Siguirini', 'Karifamoriah'] },
  { name: 'Nzérékoré', neighborhoods: ['Centre-ville', 'Gbalakpala', 'Gouécké'] },
  { name: 'Mamou', neighborhoods: ['Centre-ville', 'Timbo', 'Porédaka'] },
  { name: 'Faranah', neighborhoods: ['Centre-ville', 'Tiro', 'Songoya'] },
];

const BUSINESS_TYPES = [
  { value: 'physical', label: 'Boutique physique' },
  { value: 'digital', label: 'En ligne uniquement' },
  { value: 'hybrid', label: 'Physique + En ligne' },
];

const SERVICE_TYPES = [
  { value: 'retail', label: 'Vente au détail' },
  { value: 'wholesale', label: 'Vente en gros' },
  { value: 'mixed', label: 'Détail + Gros' },
  { value: 'services', label: 'Services' },
];

// Composant Select natif stylisé
function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  );
}

export default function VendorLocationSettings({ vendorId }: VendorLocationSettingsProps) {
  const location = useLocation();
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [businessType, setBusinessType] = useState('physical');
  const [serviceType, setServiceType] = useState('retail');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);

  const isDigitalVendorWorkspace = location.pathname.startsWith('/vendeur-digital');
  const businessTypeOptions = BUSINESS_TYPES.map((option) =>
    isDigitalVendorWorkspace && option.value === 'hybrid'
      ? { ...option, label: `${option.label} (verrouillé)`, disabled: true }
      : option
  );

  const normalizedCity = city.trim().toLowerCase();
  const selectedCity = GUINEA_CITIES.find((c) => c.name.toLowerCase() === normalizedCity);
  const neighborhoodOptions = selectedCity?.neighborhoods.map((n) => ({ value: n, label: n })) || [];

  useEffect(() => {
    loadVendorLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    if (isDigitalVendorWorkspace && businessType === 'hybrid') {
      setBusinessType('digital');
      toast.info('Le type "Physique + En ligne" est verrouillé pour le compte vendeur digital.');
    }
  }, [businessType, isDigitalVendorWorkspace]);

  const loadVendorLocation = async () => {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('city, neighborhood, address, latitude, longitude, business_type, service_type')
        .eq('id', vendorId)
        .single();

      if (error) throw error;

      if (data) {
        setCity(data.city || '');
        setNeighborhood(data.neighborhood || '');
        setAddress(data.address || '');
        setLatitude(data.latitude ? parseFloat(String(data.latitude)) : null);
        setLongitude(data.longitude ? parseFloat(String(data.longitude)) : null);
        setBusinessType(data.business_type || 'physical');
        setServiceType(data.service_type || 'retail');
      }
    } catch (error) {
      console.error('Erreur chargement localisation:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    setNeighborhood(''); // reset quartier quand la ville change
  };

  const fillAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { type: 'reverse', lat, lng },
      });

      if (error) throw error;

      const formatted = data?.results?.[0]?.formatted_address;
      if (formatted) {
        setAddress(formatted);
        toast.success('Adresse détectée automatiquement');
      }
    } catch (err) {
      console.error('Erreur reverse geocode:', err);
      toast.error("Impossible de récupérer l'adresse automatiquement");
    }
  };

  const [gpsProgress, setGpsProgress] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Fonction de récupération GPS avec retry et fallback
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    if (!window.isSecureContext) {
      toast.error("La géolocalisation nécessite une connexion sécurisée (HTTPS)");
      return;
    }

    setGettingLocation(true);
    setGpsProgress('Demande de permission...');
    setRetryCount(0);

    // Fonction pour tenter la géolocalisation
    const attemptGeolocation = (highAccuracy: boolean, timeout: number, attempt: number): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        setGpsProgress(
          highAccuracy
            ? `Recherche GPS haute précision... (essai ${attempt}/3)`
            : 'Utilisation position approximative...'
        );

        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: highAccuracy,
            timeout: timeout,
            maximumAge: highAccuracy ? 0 : 60000
          }
        );
      });
    };

    try {
      let position: GeolocationPosition | null = null;

      // Essai 1: Haute précision, 20 secondes
      try {
        setRetryCount(1);
        position = await attemptGeolocation(true, 20000, 1);
      } catch (_e1) {
        console.log('GPS essai 1 échoué, réessai...');

        // Essai 2: Haute précision, 15 secondes
        try {
          setRetryCount(2);
          position = await attemptGeolocation(true, 15000, 2);
        } catch (_e2) {
          console.log('GPS essai 2 échoué, tentative basse précision...');

          // Essai 3: Basse précision (fallback réseau/WiFi), 10 secondes
          try {
            setRetryCount(3);
            position = await attemptGeolocation(false, 10000, 3);
          } catch (e3) {
            throw e3; // Tous les essais ont échoué
          }
        }
      }

      if (position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setLatitude(lat);
        setLongitude(lng);

        setGpsProgress('');

        if (accuracy > 100) {
          toast.success(`Position récupérée (précision: ~${Math.round(accuracy)}m)`, {
            description: 'Position approximative - vous pouvez affiner manuellement'
          });
        } else {
          toast.success('Position GPS précise récupérée !', {
            description: `Précision: ~${Math.round(accuracy)}m`
          });
        }

        void fillAddressFromCoords(lat, lng);
      }
    } catch (error) {
      console.error('Erreur géolocalisation après tous les essais:', error);
      const code = (error as GeolocationPositionError)?.code;

      setGpsProgress('');

      if (code === 1) {
        toast.error("Permission refusée", {
          description: "Autorisez la localisation dans les paramètres du navigateur puis rechargez la page"
        });
      } else if (code === 2) {
        toast.error("Position indisponible", {
          description: "Activez le GPS/localisation de l'appareil et réessayez"
        });
      } else if (code === 3) {
        toast.error("Délai dépassé après 3 tentatives", {
          description: "Saisissez les coordonnées manuellement ou déplacez-vous vers un endroit avec meilleur signal"
        });
      } else {
        toast.error("Erreur de géolocalisation", {
          description: "Vérifiez les permissions et réessayez"
        });
      }
    } finally {
      setGettingLocation(false);
      setGpsProgress('');
      setRetryCount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!city) {
      toast.error('Veuillez sélectionner une ville');
      return;
    }

    setLoading(true);

    try {
      const finalBusinessType = isDigitalVendorWorkspace && businessType === 'hybrid'
        ? 'digital'
        : businessType;

      const { error } = await supabase
        .from('vendors')
        .update({
          city,
          neighborhood,
          address,
          latitude,
          longitude,
          business_type: finalBusinessType,
          service_type: serviceType
        })
        .eq('id', vendorId);

      if (error) throw error;

      toast.success('Localisation mise à jour avec succès');
    } catch (error) {
      console.error('Erreur mise à jour localisation:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Localisation & Type d'activité
        </CardTitle>
        <CardDescription>
          Configurez votre adresse pour apparaître dans les recherches à proximité
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ville */}
          <div className="space-y-2">
            <Label htmlFor="city">Ville *</Label>
            <Input
              id="city"
              list="guinea-cities"
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              placeholder="Tapez ou sélectionnez une ville"
              autoComplete="off"
            />
            <datalist id="guinea-cities">
              {GUINEA_CITIES.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </div>

          {/* Quartier */}
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Quartier</Label>
            <Input
              id="neighborhood"
              list="guinea-neighborhoods"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder={city ? "Tapez ou sélectionnez un quartier" : "Choisissez d'abord une ville (ou tapez un quartier)"}
              autoComplete="off"
            />
            <datalist id="guinea-neighborhoods">
              {neighborhoodOptions.map((n) => (
                <option key={n.value} value={n.value} />
              ))}
            </datalist>
            {city && neighborhoodOptions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {neighborhoodOptions.length} quartier(s) disponible(s) pour {city}
              </p>
            )}
          </div>

          {/* Adresse complète */}
          <div className="space-y-2">
            <Label htmlFor="address">Adresse complète (optionnel)</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Avenue de la République, en face du marché"
            />
          </div>

          {/* GPS */}
          <div className="space-y-2">
            <Label>Coordonnées GPS</Label>
            <Button
              type="button"
              variant="outline"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="w-full h-auto min-h-10 py-3"
            >
              {gettingLocation ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{gpsProgress || 'Récupération en cours...'}</span>
                  </div>
                  {retryCount > 0 && (
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i <= retryCount ? 'bg-primary' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Navigation className="w-4 h-4 mr-2" />
                  Utiliser ma position actuelle
                </>
              )}
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude (optionnel)</Label>
                <Input
                  id="latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={latitude ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLatitude(v === '' ? null : Number(v));
                  }}
                  placeholder="Ex: 9.641185"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude (optionnel)</Label>
                <Input
                  id="longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={longitude ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLongitude(v === '' ? null : Number(v));
                  }}
                  placeholder="Ex: -13.578401"
                />
              </div>
            </div>

            {latitude && longitude && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-foreground font-medium">📍 Position enregistrée</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                </p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Si la position ne se récupère pas, autorisez la localisation dans le navigateur (ou saisissez la latitude/longitude).
            </p>
          </div>

          {/* Type d'activité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">Type de commerce</Label>
              <NativeSelect
                value={businessType}
                onChange={setBusinessType}
                options={businessTypeOptions}
                placeholder="Sélectionnez un type"
              />
              {isDigitalVendorWorkspace && (
                <p className="text-xs text-muted-foreground">
                  L'option "Physique + En ligne" est verrouillée dans le compte vendeur digital.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Type de vente</Label>
              <NativeSelect
                value={serviceType}
                onChange={setServiceType}
                options={SERVICE_TYPES}
                placeholder="Sélectionnez un type"
              />
            </div>
          </div>

          {/* Bouton de sauvegarde */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer la localisation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
