/**
 * FORMULAIRE DE DEMANDE DE LIVRAISON PAR ID
 * Le livreur saisit l'ID du fournisseur et du client pour géolocalisation automatique
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Package, Loader2, User, CheckCircle2 } from 'lucide-react';
import { UserGeolocService, type UserLocation } from '@/services/delivery/UserGeolocService';
import { PricingService } from '@/services/pricing/PricingService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeliveryRequestByIdProps {
  onDeliveryCreated: (deliveryId: string) => void;
}

export function DeliveryRequestById({ onDeliveryCreated }: DeliveryRequestByIdProps) {
  const [vendorId, setVendorId] = useState('');
  const [clientId, setClientId] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  
  const [vendorLocation, setVendorLocation] = useState<UserLocation | null>(null);
  const [clientLocation, setClientLocation] = useState<UserLocation | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);

  const handleGeolocate = async () => {
    if (!vendorId || !clientId) {
      toast.error('Veuillez saisir les deux IDs');
      return;
    }

    setGeolocating(true);
    try {
      // Géolocaliser le vendeur
      const vendorLoc = await UserGeolocService.getVendorInfo(vendorId);
      if (!vendorLoc) {
        toast.error('Vendeur introuvable');
        setGeolocating(false);
        return;
      }
      setVendorLocation(vendorLoc);

      // Géolocaliser le client
      const clientLoc = await UserGeolocService.getUserLocation(clientId);
      if (!clientLoc) {
        toast.error('Client introuvable');
        setGeolocating(false);
        return;
      }
      setClientLocation(clientLoc);

      // Calculer le prix estimé
      const estimate = await PricingService.estimateDeliveryPrice(
        vendorLoc.latitude,
        vendorLoc.longitude,
        clientLoc.latitude,
        clientLoc.longitude
      );
      setEstimatedPrice(estimate.totalPrice);

      toast.success('✅ Géolocalisation réussie !');
    } catch (error) {
      console.error('Error geolocating:', error);
      toast.error('Erreur lors de la géolocalisation');
    } finally {
      setGeolocating(false);
    }
  };

  const handleCreateDelivery = async () => {
    if (!vendorLocation || !clientLocation || !estimatedPrice) {
      toast.error('Veuillez d\'abord géolocaliser');
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          pickup_address: vendorLocation.address || `${vendorLocation.name} - ${vendorLocation.phone}`,
          delivery_address: clientLocation.address || `${clientLocation.name} - ${clientLocation.phone}`,
          distance_km: UserGeolocService.calculateDistance(
            vendorLocation.latitude,
            vendorLocation.longitude,
            clientLocation.latitude,
            clientLocation.longitude
          ),
          delivery_fee: estimatedPrice,
          customer_name: clientLocation.name || 'Client',
          customer_phone: clientLocation.phone || '',
          package_description: packageDescription,
          driver_notes: specialInstructions,
          status: 'pending',
          metadata: {
            vendor_id: vendorId,
            client_id: clientId
          }
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Livraison créée avec succès !');
      onDeliveryCreated(data.id);
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Nouvelle livraison par ID
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ID du fournisseur */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              ID du fournisseur (retrait du colis)
            </Label>
            <Input
              placeholder="Ex: vendor_abc123..."
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            />
            {vendorLocation && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{vendorLocation.name} - {vendorLocation.address || 'Position GPS trouvée'}</span>
              </div>
            )}
          </div>

          {/* ID du client */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              ID du client (livraison)
            </Label>
            <Input
              placeholder="Ex: user_xyz789..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            {clientLocation && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{clientLocation.name} - {clientLocation.address || 'Position GPS trouvée'}</span>
              </div>
            )}
          </div>

          {/* Bouton de géolocalisation */}
          <Button
            className="w-full"
            onClick={handleGeolocate}
            disabled={!vendorId || !clientId || geolocating}
            variant="outline"
          >
            {geolocating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Géolocalisation...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Géolocaliser les deux parties
              </>
            )}
          </Button>

          {/* Prix estimé */}
          {estimatedPrice && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 font-medium">
                Prix estimé: <span className="text-xl">{estimatedPrice.toLocaleString()} GNF</span>
              </p>
            </div>
          )}

          {/* Description du colis */}
          <div className="space-y-2">
            <Label>Description du colis</Label>
            <Input
              placeholder="Ex: Documents, vêtements..."
              value={packageDescription}
              onChange={(e) => setPackageDescription(e.target.value)}
            />
          </div>

          {/* Instructions spéciales */}
          <div className="space-y-2">
            <Label>Instructions spéciales (optionnel)</Label>
            <Textarea
              placeholder="Instructions pour la livraison..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Bouton de création */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateDelivery}
            disabled={!vendorLocation || !clientLocation || loading}
            style={{ 
              background: 'linear-gradient(135deg, hsl(25 98% 55%), hsl(145 65% 35%))',
              color: 'white'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Package className="h-5 w-5 mr-2" />
                Créer la livraison
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
