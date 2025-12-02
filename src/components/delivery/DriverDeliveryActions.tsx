/**
 * ACTIONS DE LIVRAISON POUR LE LIVREUR
 * Boutons de mise à jour du statut avec navigation GPS intégrée
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Navigation, 
  Phone, 
  Package, 
  CheckCircle2, 
  Camera, 
  QrCode,
  MapPin,
  Store,
  User,
  Loader2,
  AlertTriangle,
  MessageCircle,
  Banknote
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActiveDelivery {
  id: string;
  status: string;
  vendor_name: string;
  vendor_address: string;
  vendor_phone?: string;
  vendor_location: { lat: number; lng: number };
  customer_name: string;
  customer_phone?: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  payment_method: string;
  delivery_fee: number;
  package_description?: string;
  metadata?: any;
}

interface DriverDeliveryActionsProps {
  delivery: ActiveDelivery;
  onStatusUpdate: () => void;
  onComplete: () => void;
}

const statusFlow = [
  { from: 'assigned', to: 'driver_on_way_to_vendor', label: 'En route vers vendeur', icon: Navigation },
  { from: 'driver_on_way_to_vendor', to: 'driver_arrived_vendor', label: 'Arrivé chez vendeur', icon: Store },
  { from: 'driver_arrived_vendor', to: 'picked_up', label: 'Colis récupéré', icon: Package },
  { from: 'picked_up', to: 'in_transit', label: 'En route vers client', icon: Navigation },
  { from: 'in_transit', to: 'driver_5min_away', label: 'À 5 minutes', icon: MapPin },
  { from: 'driver_5min_away', to: 'driver_arrived', label: 'Arrivé', icon: MapPin },
  { from: 'driver_arrived', to: 'delivered', label: 'Livraison terminée', icon: CheckCircle2 }
];

export function DriverDeliveryActions({ delivery, onStatusUpdate, onComplete }: DriverDeliveryActionsProps) {
  const [updating, setUpdating] = useState(false);
  const [pickupCode, setPickupCode] = useState('');
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);

  // Obtenir la prochaine action
  const getNextAction = () => {
    return statusFlow.find(s => s.from === delivery.status);
  };

  // Mettre à jour le statut
  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('deliveries')
        .update({
          status: newStatus as any,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', delivery.id);

      if (error) throw error;

      toast.success('Statut mis à jour');
      onStatusUpdate();

      // Si livré, déclencher le callback
      if (newStatus === 'delivered') {
        onComplete();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  // Vérifier le code de retrait
  const verifyPickupCode = () => {
    const expectedCode = delivery.metadata?.pickup_code;
    if (pickupCode.toUpperCase() === expectedCode) {
      setShowCodeDialog(false);
      updateStatus('picked_up');
    } else {
      toast.error('Code incorrect');
    }
  };

  // Ouvrir la navigation GPS
  const openNavigation = (lat: number, lng: number, label: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // Compléter la livraison avec preuve
  const completeDelivery = async () => {
    // TODO: Ajouter capture photo/signature
    setShowProofDialog(false);
    updateStatus('delivered');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN').format(amount) + ' GNF';
  };

  const nextAction = getNextAction();
  const isAtVendor = ['driver_arrived_vendor'].includes(delivery.status);
  const isAtClient = ['driver_arrived'].includes(delivery.status);
  const isEnRouteToVendor = ['assigned', 'driver_on_way_to_vendor'].includes(delivery.status);
  const isEnRouteToClient = ['picked_up', 'in_transit', 'driver_5min_away'].includes(delivery.status);

  return (
    <div className="space-y-4">
      {/* Destination actuelle */}
      <Card className="border-2 border-orange-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {isEnRouteToVendor || isAtVendor ? (
              <>
                <Store className="h-5 w-5 text-orange-600" />
                Point de retrait
              </>
            ) : (
              <>
                <User className="h-5 w-5 text-green-600" />
                Destination client
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isEnRouteToVendor || isAtVendor ? (
            <>
              <div>
                <p className="font-semibold">{delivery.vendor_name}</p>
                <p className="text-sm text-muted-foreground">{delivery.vendor_address}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => openNavigation(
                    delivery.vendor_location.lat,
                    delivery.vendor_location.lng,
                    delivery.vendor_name
                  )}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Naviguer
                </Button>
                {delivery.vendor_phone && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${delivery.vendor_phone}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold">{delivery.customer_name}</p>
                <p className="text-sm text-muted-foreground">{delivery.delivery_address}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => openNavigation(
                    delivery.delivery_latitude,
                    delivery.delivery_longitude,
                    delivery.customer_name
                  )}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Naviguer
                </Button>
                {delivery.customer_phone && (
                  <>
                    <Button variant="outline" asChild>
                      <a href={`tel:${delivery.customer_phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="outline">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Détails colis et paiement */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{delivery.package_description || 'Colis standard'}</span>
            </div>
            <Badge 
              variant={delivery.payment_method === 'cod' ? 'secondary' : 'default'}
              className={delivery.payment_method === 'cod' ? 'bg-yellow-100 text-yellow-800' : ''}
            >
              {delivery.payment_method === 'cod' ? (
                <>
                  <Banknote className="h-3 w-3 mr-1" />
                  COD: {formatCurrency(delivery.delivery_fee)}
                </>
              ) : (
                'Prépayé'
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Action suivante */}
      {nextAction && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="pt-4">
            {/* Vérification code au retrait */}
            {isAtVendor && delivery.metadata?.pickup_code ? (
              <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-green-500"
                    size="lg"
                    disabled={updating}
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    Confirmer le retrait
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Code de retrait</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Entrez le code fourni par le vendeur ou scannez le QR code
                    </p>
                    <Input
                      placeholder="Ex: ABC123"
                      value={pickupCode}
                      onChange={(e) => setPickupCode(e.target.value)}
                      className="text-center text-2xl font-mono"
                      maxLength={6}
                    />
                    <Button onClick={verifyPickupCode} className="w-full">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Valider le code
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : isAtClient ? (
              // Preuve de livraison
              <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                    size="lg"
                    disabled={updating}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Terminer la livraison
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Preuve de livraison</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Button variant="outline" className="w-full">
                      <Camera className="h-4 w-4 mr-2" />
                      Prendre une photo
                    </Button>
                    <Button variant="outline" className="w-full">
                      Signature client
                    </Button>
                    {delivery.payment_method === 'cod' && (
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="font-medium flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-yellow-600" />
                          Collecter: {formatCurrency(delivery.delivery_fee)}
                        </p>
                      </div>
                    )}
                    <Button onClick={completeDelivery} className="w-full bg-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Confirmer la livraison
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              // Action standard
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-green-500"
                size="lg"
                onClick={() => updateStatus(nextAction.to)}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {(() => {
                      const Icon = nextAction.icon;
                      return <Icon className="h-5 w-5 mr-2" />;
                    })()}
                    {nextAction.label}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bouton d'urgence */}
      <Button variant="outline" className="w-full border-red-300 text-red-600">
        <AlertTriangle className="h-4 w-4 mr-2" />
        Signaler un problème
      </Button>
    </div>
  );
}
