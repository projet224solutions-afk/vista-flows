import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Navigation, CheckCircle2, MapPin } from 'lucide-react';
import { mapService } from '@/services/mapService';

interface ServiceSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    business_name: string;
    description: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  onUpdated?: () => void;
}

export function ServiceSettingsPanel({ open, onOpenChange, service, onUpdated }: ServiceSettingsPanelProps) {
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [form, setForm] = useState({
    business_name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  });

  useEffect(() => {
    if (service) {
      setForm({
        business_name: service.business_name || '',
        description: service.description || '',
        address: service.address || '',
        phone: service.phone || '',
        email: service.email || '',
        website: service.website || '',
      });
      setGpsSuccess(false);
      setDetectedCoords(null);
    }
  }, [service]);

  const handleDetectPosition = useCallback(async () => {
    setGpsLoading(true);
    setGpsSuccess(false);
    try {
      const position = await mapService.getCurrentPosition();
      const fullAddress = await mapService.reverseGeocode(position.latitude, position.longitude);

      if (fullAddress && fullAddress !== 'Adresse inconnue') {
        setForm(prev => ({ ...prev, address: fullAddress }));
      }

      setDetectedCoords({ lat: position.latitude, lng: position.longitude });
      setGpsSuccess(true);
      toast.success('Position détectée avec succès !');

      // Save coordinates to DB
      await supabase
        .from('professional_services')
        .update({ latitude: position.latitude, longitude: position.longitude })
        .eq('id', service.id);

      setTimeout(() => setGpsSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erreur GPS:', err);
      toast.error('Impossible de détecter votre position. Vérifiez vos paramètres de localisation.');
    } finally {
      setGpsLoading(false);
    }
  }, [service.id]);

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      toast.error('Le nom du service est requis');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('professional_services')
        .update({
          business_name: form.business_name.trim(),
          description: form.description.trim() || null,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          website: form.website.trim() || null,
        })
        .eq('id', service.id);

      if (error) throw error;

      toast.success('Paramètres mis à jour');
      onOpenChange(false);
      onUpdated?.();
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Paramètres du service</SheetTitle>
          <SheetDescription>Modifiez les informations de votre service professionnel</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="business_name">Nom du service *</Label>
            <Input
              id="business_name"
              value={form.business_name}
              onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
              placeholder="Nom de votre entreprise"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Décrivez votre service..."
              rows={4}
            />
          </div>

          {/* GPS Location Detection */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  Localisation
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {detectedCoords
                    ? `${detectedCoords.lat.toFixed(5)}, ${detectedCoords.lng.toFixed(5)}`
                    : 'Détectez votre adresse via GPS'
                  }
                </p>
              </div>
              <Button
                type="button"
                variant={gpsSuccess ? 'default' : 'outline'}
                size="sm"
                onClick={handleDetectPosition}
                disabled={gpsLoading}
                className={`gap-2 flex-shrink-0 transition-all duration-300 ${
                  gpsSuccess
                    ? 'bg-primary-blue-600 hover:bg-primary-blue-700 text-white border-primary-orange-600'
                    : 'border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground'
                }`}
              >
                {gpsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Détection...</span>
                  </>
                ) : gpsSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Localisé !
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Position
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Adresse du service"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+224 XXX XXX XXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="contact@exemple.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site Web</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 mt-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
