import { useState, useEffect } from 'react';
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
  options: { value: string; label: string }[]; 
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
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  );
}

export default function VendorLocationSettings({ vendorId }: VendorLocationSettingsProps) {
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

  const normalizedCity = city.trim().toLowerCase();
  const selectedCity = GUINEA_CITIES.find((c) => c.name.toLowerCase() === normalizedCity);
  const neighborhoodOptions = selectedCity?.neighborhoods.map((n) => ({ value: n, label: n })) || [];

  useEffect(() => {
    loadVendorLocation();
  }, [vendorId]);

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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    // Dans certains environnements (iframe / paramètres navigateur), la géoloc est bloquée
    if (!window.isSecureContext) {
      toast.error("La géolocalisation nécessite une connexion sécurisée (HTTPS)");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat);
        setLongitude(lng);
        toast.success('Position GPS récupérée avec succès');
        void fillAddressFromCoords(lat, lng);
        setGettingLocation(false);
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        const code = (error as GeolocationPositionError).code;
        if (code === 1) {
          toast.error("Permission refusée : autorisez la localisation puis rechargez la page");
        } else if (code === 2) {
          toast.error("Position indisponible : activez le GPS / localisation de l'appareil");
        } else if (code === 3) {
          toast.error("Délai dépassé : réessayez (ou saisissez les coordonnées manuellement)");
        } else {
          toast.error("Impossible de récupérer votre position. Vérifiez les permissions.");
        }
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!city) {
      toast.error('Veuillez sélectionner une ville');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          city,
          neighborhood,
          address,
          latitude,
          longitude,
          business_type: businessType,
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
              className="w-full"
            >
              {gettingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Récupération en cours...
                </>
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
                options={BUSINESS_TYPES}
                placeholder="Sélectionnez un type"
              />
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
