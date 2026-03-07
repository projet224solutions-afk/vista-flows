import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewPropertyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
  saving: boolean;
}

const AMENITIES_OPTIONS = [
  'Parking', 'Piscine', 'Jardin', 'Balcon', 'Terrasse', 'Ascenseur',
  'Climatisation', 'Meublé', 'Gardien', 'Caméras', 'Groupe électrogène', 'Eau courante'
];

export function NewPropertyDialog({ open, onClose, onSubmit, saving }: NewPropertyDialogProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    offer_type: '',
    property_type: '',
    price: '',
    surface: '',
    rooms: '',
    bathrooms: '',
    address: '',
    city: '',
    neighborhood: '',
    amenities: [] as string[],
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleAmenity = (amenity: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        toast.success('Position récupérée !');
      },
      () => {
        setGeoLoading(false);
        toast.error('Impossible de récupérer la position');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async () => {
    if (!form.title || !form.offer_type || !form.property_type || !form.price) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    const result = await onSubmit({
      ...form,
      price: parseFloat(form.price) || 0,
      surface: parseFloat(form.surface) || 0,
      rooms: parseInt(form.rooms) || 0,
      bathrooms: parseInt(form.bathrooms) || 0,
      latitude: coords?.lat,
      longitude: coords?.lng,
    });
    if (result) {
      setForm({
        title: '', description: '', offer_type: '', property_type: '',
        price: '', surface: '', rooms: '', bathrooms: '',
        address: '', city: '', neighborhood: '', amenities: [],
      });
      setCoords(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📝 Publier un bien immobilier</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Type d'offre & Type de bien */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type d'offre *</Label>
              <Select value={form.offer_type} onValueChange={v => updateField('offer_type', v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vente">🔑 Vente</SelectItem>
                  <SelectItem value="location">📋 Location</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type de bien *</Label>
              <Select value={form.property_type} onValueChange={v => updateField('property_type', v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="appartement">🏢 Appartement</SelectItem>
                  <SelectItem value="maison">🏠 Maison</SelectItem>
                  <SelectItem value="villa">🏡 Villa</SelectItem>
                  <SelectItem value="terrain">🌍 Terrain</SelectItem>
                  <SelectItem value="bureau">🏬 Bureau</SelectItem>
                  <SelectItem value="boutique">🏪 Boutique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <Label>Titre de l'annonce *</Label>
            <Input 
              placeholder="Ex: Appartement 3 pièces vue mer - Kaloum" 
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
            />
          </div>

          {/* Prix, Surface, Pièces, SdB */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Prix (GNF) *</Label>
              <Input type="number" placeholder="0" value={form.price} onChange={e => updateField('price', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Surface (m²)</Label>
              <Input type="number" placeholder="0" value={form.surface} onChange={e => updateField('surface', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Chambres</Label>
              <Input type="number" placeholder="0" value={form.rooms} onChange={e => updateField('rooms', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Salles de bain</Label>
              <Input type="number" placeholder="0" value={form.bathrooms} onChange={e => updateField('bathrooms', e.target.value)} />
            </div>
          </div>

          {/* Adresse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input placeholder="Conakry" value={form.city} onChange={e => updateField('city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Quartier</Label>
              <Input placeholder="Kaloum" value={form.neighborhood} onChange={e => updateField('neighborhood', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Adresse complète</Label>
              <Input placeholder="Rue, numéro..." value={form.address} onChange={e => updateField('address', e.target.value)} />
            </div>
          </div>

          {/* GPS */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">📍 Position GPS</p>
              <p className="text-xs text-muted-foreground">
                {coords ? `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}` : 'Pour afficher sur la carte'}
              </p>
            </div>
            <Button type="button" variant={coords ? 'outline' : 'default'} size="sm" onClick={handleGetLocation} disabled={geoLoading}>
              {geoLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : coords ? <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> : <MapPin className="h-4 w-4 mr-1" />}
              {coords ? 'Repositionner' : 'Localiser'}
            </Button>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              placeholder="Décrivez le bien en détail : état, proximité, avantages..."
              rows={4}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
            />
          </div>

          {/* Équipements */}
          <div className="space-y-2">
            <Label>Équipements & commodités</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES_OPTIONS.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    form.amenities.includes(amenity)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Publier l'annonce
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
