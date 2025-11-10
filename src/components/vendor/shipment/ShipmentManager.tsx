/**
 * GESTIONNAIRE PRINCIPAL DES EXPÉDITIONS
 * Interface principale pour créer et gérer les expéditions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, MapPin, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ShipmentForm } from './ShipmentForm';
import { ShipmentSuccess } from './ShipmentSuccess';
import { format } from 'date-fns';
import { toast } from 'sonner';

type ViewMode = 'list' | 'create' | 'success';

interface Shipment {
  id: string;
  tracking_number: string;
  receiver_name: string;
  receiver_address: string;
  weight: number;
  status: string;
  created_at: string;
}

export function ShipmentManager() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [successShipmentId, setSuccessShipmentId] = useState<string>('');
  const [successTrackingNumber, setSuccessTrackingNumber] = useState<string>('');

  useEffect(() => {
    loadVendorAndShipments();
  }, []);

  const loadVendorAndShipments = async () => {
    setLoading(true);
    try {
      // Récupérer le vendeur
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      if (!vendor) {
        toast.error('Profil vendeur introuvable');
        return;
      }

      setVendorId(vendor.id);

      // Charger les expéditions
      const { data: shipmentsData, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setShipments(shipmentsData as any || []);
    } catch (error) {
      console.error('Error loading vendor shipments:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (shipmentId: string, trackingNumber: string) => {
    setSuccessShipmentId(shipmentId);
    setSuccessTrackingNumber(trackingNumber);
    setViewMode('success');
    loadVendorAndShipments(); // Recharger la liste
  };

  const handleNewShipment = () => {
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
    loadVendorAndShipments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'created': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'created': return 'Créée';
      case 'picked_up': return 'Pris en charge';
      case 'in_transit': return 'En transit';
      case 'delivered': return 'Livré';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (!vendorId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Profil vendeur introuvable
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mode création
  if (viewMode === 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Nouvelle expédition</h2>
          <Button variant="outline" onClick={handleBackToList}>
            Retour à la liste
          </Button>
        </div>
        <ShipmentForm
          vendorId={vendorId}
          onSuccess={handleCreateSuccess}
          onCancel={handleBackToList}
        />
      </div>
    );
  }

  // Mode succès
  if (viewMode === 'success') {
    return (
      <div className="space-y-4">
        <ShipmentSuccess
          shipmentId={successShipmentId}
          trackingNumber={successTrackingNumber}
          onNewShipment={handleNewShipment}
          onEdit={handleBackToList}
        />
        <div className="text-center">
          <Button variant="outline" onClick={handleBackToList}>
            Retour à la liste des expéditions
          </Button>
        </div>
      </div>
    );
  }

  // Mode liste
  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total expéditions</p>
                <p className="text-2xl font-bold">{shipments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">
                  {shipments.filter(s => !['delivered', 'cancelled'].includes(s.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Livrées</p>
                <p className="text-2xl font-bold">
                  {shipments.filter(s => s.status === 'delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des expéditions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                Mes expéditions
              </CardTitle>
              <CardDescription>
                Gérez toutes vos expéditions logistiques
              </CardDescription>
            </div>
            <Button
              onClick={handleNewShipment}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle expédition
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shipments.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground mb-4">Aucune expédition créée</p>
                <Button
                  onClick={handleNewShipment}
                  className="bg-gradient-to-r from-orange-500 to-orange-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer votre première expédition
                </Button>
              </div>
            ) : (
              shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="p-4 bg-gradient-to-r from-orange-50/50 to-white rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(shipment.status)}>
                          {getStatusLabel(shipment.status)}
                        </Badge>
                        <span className="font-mono text-sm font-medium">
                          {shipment.tracking_number}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">{shipment.receiver_name}</p>
                          <p className="text-muted-foreground">{shipment.receiver_address}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span>{shipment.weight} kg</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
