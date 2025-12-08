/**
 * CONFIGURATION DES TARIFS DE LIVRAISON - VENDEUR
 * Permet au vendeur de configurer son prix de base et par km
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Truck, 
  Loader2, 
  Save,
  TrendingUp,
  MapPin,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VendorDeliveryPricingProps {
  vendorId: string;
  onSave?: () => void;
}

interface DeliveryConfig {
  basePrice: number;
  pricePerKm: number;
  rushBonus: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: DeliveryConfig = {
  basePrice: 5000,
  pricePerKm: 1000,
  rushBonus: 2000,
  enabled: true
};

export default function VendorDeliveryPricing({ vendorId, onSave }: VendorDeliveryPricingProps) {
  const [config, setConfig] = useState<DeliveryConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Charger la configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('delivery_base_price, delivery_price_per_km, delivery_rush_bonus, delivery_enabled')
          .eq('id', vendorId)
          .single();

        if (data) {
          setConfig({
            basePrice: data.delivery_base_price || DEFAULT_CONFIG.basePrice,
            pricePerKm: data.delivery_price_per_km || DEFAULT_CONFIG.pricePerKm,
            rushBonus: data.delivery_rush_bonus || DEFAULT_CONFIG.rushBonus,
            enabled: data.delivery_enabled ?? DEFAULT_CONFIG.enabled
          });
        }
      } catch (error) {
        console.error('Error loading delivery config:', error);
      } finally {
        setLoading(false);
      }
    };

    if (vendorId) {
      loadConfig();
    }
  }, [vendorId]);

  // Sauvegarder la configuration
  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          delivery_base_price: config.basePrice,
          delivery_price_per_km: config.pricePerKm,
          delivery_rush_bonus: config.rushBonus,
          delivery_enabled: config.enabled
        })
        .eq('id', vendorId);

      if (error) throw error;

      toast.success('✅ Tarification de livraison mise à jour');
      onSave?.();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Calculer exemple de prix
  const calculateExample = (distance: number) => {
    return config.basePrice + (distance * config.pricePerKm);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN').format(amount) + ' GNF';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-600" />
            Tarification des livraisons
          </CardTitle>
          <CardDescription>
            Configurez vos tarifs de livraison. Le prix sera calculé automatiquement en fonction de la distance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activer/Désactiver livraison */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Livraison activée</p>
                <p className="text-sm text-muted-foreground">
                  Permettre aux clients de commander des livraisons
                </p>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          {config.enabled && (
            <>
              {/* Prix de base */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Prix de base (minimum par livraison)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.basePrice}
                    onChange={(e) => setConfig({ ...config, basePrice: Number(e.target.value) })}
                    className="w-40"
                    min={0}
                    step={500}
                  />
                  <span className="text-muted-foreground">GNF</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Montant minimum garanti par livraison (frais fixes)
                </p>
              </div>

              {/* Prix par km avec slider */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  Prix par kilomètre: {formatCurrency(config.pricePerKm)}
                </Label>
                <Slider
                  value={[config.pricePerKm]}
                  onValueChange={([value]) => setConfig({ ...config, pricePerKm: value })}
                  min={500}
                  max={5000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>500 GNF/km</span>
                  <span>5 000 GNF/km</span>
                </div>
              </div>

              {/* Bonus heure de pointe */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Bonus heure de pointe (optionnel)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={config.rushBonus}
                    onChange={(e) => setConfig({ ...config, rushBonus: Number(e.target.value) })}
                    className="w-40"
                    min={0}
                    step={500}
                  />
                  <span className="text-muted-foreground">GNF</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supplément appliqué aux heures de pointe (7h-9h, 17h-20h)
                </p>
              </div>
            </>
          )}

          <Button onClick={saveConfig} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer les tarifs
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Exemples de prix */}
      {config.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Exemples de prix de livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground">2 km</p>
                <p className="font-bold text-green-600">{formatCurrency(calculateExample(2))}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground">5 km</p>
                <p className="font-bold text-green-600">{formatCurrency(calculateExample(5))}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground">10 km</p>
                <p className="font-bold text-green-600">{formatCurrency(calculateExample(10))}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground">20 km</p>
                <p className="font-bold text-green-600">{formatCurrency(calculateExample(20))}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Formule: Prix de base + (Distance × Prix/km)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
