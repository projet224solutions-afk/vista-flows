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

  const handleGeolocate = async (): Promise<boolean> => {
    if (!vendorId || !clientId) {
      toast.error('Veuillez saisir le fournisseur et le client');
      return false;
    }

    setGeolocating(true);
    try {
      // Géolocaliser le vendeur
      console.log('[DeliveryRequest] Geolocating vendor:', vendorId);
      const vendorLoc = await UserGeolocService.getVendorInfo(vendorId);
      if (!vendorLoc) {
        toast.error('Fournisseur introuvable. Vérifiez le nom ou téléphone.');
        setGeolocating(false);
        return false;
      }
      console.log('[DeliveryRequest] Vendor found:', vendorLoc);
      setVendorLocation(vendorLoc);

      // Géolocaliser le client
      console.log('[DeliveryRequest] Geolocating client:', clientId);
      const clientLoc = await UserGeolocService.getUserLocation(clientId);
      if (!clientLoc) {
        toast.error('Client introuvable. Vérifiez le nom ou téléphone.');
        setGeolocating(false);
        return false;
      }
      console.log('[DeliveryRequest] Client found:', clientLoc);
      setClientLocation(clientLoc);

      // Calculer le prix estimé
      const estimate = await PricingService.estimateDeliveryPrice(
        vendorLoc.latitude,
        vendorLoc.longitude,
        clientLoc.latitude,
        clientLoc.longitude
      );
      console.log('[DeliveryRequest] Price estimate:', estimate);
      setEstimatedPrice(estimate.totalPrice);

      toast.success('Géolocalisation réussie !');
      return true;
    } catch (error) {
      console.error('[DeliveryRequest] Error geolocating:', error);
      toast.error('Erreur lors de la géolocalisation');
      return false;
    } finally {
      setGeolocating(false);
    }
  };

  const handleCreateDelivery = async () => {
    if (!vendorId || !clientId) {
      toast.error('Veuillez saisir le fournisseur et le client');
      return;
    }

    // Auto-géolocaliser si pas encore fait
    let vLoc = vendorLocation;
    let cLoc = clientLocation;
    let price = estimatedPrice;

    if (!vLoc || !cLoc || price === null) {
      toast.info('Géolocalisation en cours...');
      const success = await handleGeolocate();
      if (!success) return;
      
      // Récupérer les valeurs mises à jour après handleGeolocate
      // On doit refaire les appels car setState est async
      const vendorLoc = await UserGeolocService.getVendorInfo(vendorId);
      const clientLoc = await UserGeolocService.getUserLocation(clientId);
      if (!vendorLoc || !clientLoc) return;
      
      const estimate = await PricingService.estimateDeliveryPrice(
        vendorLoc.latitude,
        vendorLoc.longitude,
        clientLoc.latitude,
        clientLoc.longitude
      );
      
      vLoc = vendorLoc;
      cLoc = clientLoc;
      price = estimate.totalPrice;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Vous devez être connecté');
        return;
      }

      const distance = UserGeolocService.calculateDistance(
        vLoc.latitude,
        vLoc.longitude,
        cLoc.latitude,
        cLoc.longitude
      );

      console.log('[DeliveryRequest] Creating delivery:', {
        vendor: vLoc,
        client: cLoc,
        distance,
        price
      });

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          pickup_address: vLoc.address || `${vLoc.name} - ${vLoc.phone}`,
          delivery_address: cLoc.address || `${cLoc.name} - ${cLoc.phone}`,
          distance_km: distance,
          delivery_fee: price,
          customer_name: cLoc.name || 'Client',
          customer_phone: cLoc.phone || '',
          package_description: packageDescription,
          driver_notes: specialInstructions,
          status: 'pending',
          metadata: {
            vendor_id: vendorId,
            client_id: clientId,
            vendor_name: vLoc.name,
            client_name: cLoc.name
          }
        } as any)
        .select()
        .single();

      if (error) {
        console.error('[DeliveryRequest] Supabase error:', error);
        throw error;
      }

      toast.success('Livraison créée avec succès !');
      onDeliveryCreated(data.id);
    } catch (error) {
      console.error('[DeliveryRequest] Error creating delivery:', error);
      toast.error('Erreur lors de la création de la livraison');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Nouvelle livraison par ID
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fournisseur */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              Fournisseur (retrait du colis)
            </Label>
            <Input
              placeholder="Nom boutique, téléphone ou ID..."
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Saisir le nom de la boutique, numéro de téléphone ou l'ID
            </p>
            {vendorLocation && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{vendorLocation.name} {vendorLocation.phone && `(${vendorLocation.phone})`}</span>
              </div>
            )}
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-600" />
              Client (livraison)
            </Label>
            <Input
              placeholder="Nom, téléphone ou ID..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Saisir le nom du client, numéro de téléphone ou l'ID
            </p>
            {clientLocation && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{clientLocation.name} {clientLocation.phone && `(${clientLocation.phone})`}</span>
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
            disabled={!vendorId || !clientId || loading || geolocating}
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
