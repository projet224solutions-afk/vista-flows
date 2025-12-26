import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Navigation, Save, Loader2 } from 'lucide-react';

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

export default function VendorLocationSettings({ vendorId }: VendorLocationSettingsProps) {
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [businessType, setBusinessType] = useState('physical');
  const [serviceType, setServiceType] = useState('retail');
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const selectedCity = GUINEA_CITIES.find(c => c.name === city);

  useEffect(() => {
    loadVendorLocation();
  }, [vendorId]);

  const loadVendorLocation = async () => {
    try {
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
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        toast.success('Position GPS récupérée avec succès');
        setGettingLocation(false);
      },
      (error) => {
        console.error('Erreur géolocalisation:', error);
        toast.error('Impossible de récupérer votre position. Vérifiez les permissions.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            <Label htmlFor="city">Ville</Label>
            <Select value={city} onValueChange={(value) => { setCity(value); setNeighborhood(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une ville" />
              </SelectTrigger>
              <SelectContent>
                {GUINEA_CITIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quartier */}
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Quartier</Label>
            <Select value={neighborhood} onValueChange={setNeighborhood} disabled={!city}>
              <SelectTrigger>
                <SelectValue placeholder={city ? "Sélectionnez un quartier" : "Choisissez d'abord une ville"} />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999]">
                {selectedCity?.neighborhoods.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex-1"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Récupération...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Utiliser ma position actuelle
                  </>
                )}
              </Button>
            </div>
            {latitude && longitude && (
              <p className="text-sm text-muted-foreground mt-2">
                📍 Position: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            )}
          </div>

          {/* Type d'activité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessType">Type de commerce</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Type de vente</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
