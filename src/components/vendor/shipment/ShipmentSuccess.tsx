/**
 * Ã‰CRAN DE CONFIRMATION D'EXPÃ‰DITION
 * Affiche le numÃ©ro de suivi et les dÃ©tails aprÃ¨s crÃ©ation
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, User, MapPin, Clock, Edit, Plus, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ShipmentSuccessProps {
  shipmentId: string;
  trackingNumber: string;
  onNewShipment: () => void;
  onEdit?: () => void;
}

interface ShipmentDetails {
  id: string;
  tracking_number: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  weight: number;
  pieces_count: number;
  item_type?: string;
  package_description?: string;
  cash_on_delivery: boolean;
  cod_amount?: number;
  insurance: boolean;
  insurance_amount?: number;
  return_option: boolean;
  status: string;
  created_at: string;
}

export function ShipmentSuccess({ shipmentId, trackingNumber, onNewShipment, onEdit }: ShipmentSuccessProps) {
  const [shipment, setShipment] = useState<ShipmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShipmentDetails();
  }, [shipmentId]);

  const loadShipmentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single();

      if (error) throw error;
      setShipment(data as any);
    } catch (error) {
      console.error('Error loading shipment:', error);
      toast.error('Erreur lors du chargement des dÃ©tails');
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingNumber = () => {
    navigator.clipboard.writeText(trackingNumber);
    toast.success('NumÃ©ro de suivi copiÃ© !');
  };

  if (loading || !shipment) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Animation de succÃ¨s */}
      <Card className="bg-primary-blue-50 border-primary-orange-200">
        <CardContent className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-orange-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-primary-orange-600 animate-in zoom-in duration-300" />
          </div>
          <h2 className="text-2xl font-bold text-primary-orange-900 mb-2">ä¸‹å•æˆåŠŸ !</h2>
          <p className="text-primary-orange-700 mb-6">Commande d'expÃ©dition crÃ©Ã©e avec succÃ¨s</p>
          
          {/* NumÃ©ro de suivi */}
          <div className="bg-white rounded-lg p-4 mb-4 border-2 border-primary-orange-300">
            <p className="text-sm text-muted-foreground mb-1">NumÃ©ro de suivi</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold text-primary-orange-900 tracking-wider">{trackingNumber}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyTrackingNumber}
                className="h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Date et heure */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(shipment.created_at), 'dd/MM/yyyy Ã  HH:mm')}</span>
          </div>
        </CardContent>
      </Card>

      {/* DÃ©tails de l'expÃ©dition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            DÃ©tails de l'expÃ©dition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ExpÃ©diteur */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
              <User className="h-4 w-4" />
              <span>ExpÃ©diteur</span>
            </div>
            <div className="ml-6 space-y-1">
              <p className="font-medium">{shipment.sender_name}</p>
              <p className="text-sm text-muted-foreground">{shipment.sender_phone}</p>
              <p className="text-sm text-muted-foreground">{shipment.sender_address}</p>
            </div>
          </div>

          {/* Destinataire */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary-orange-600">
              <MapPin className="h-4 w-4" />
              <span>Destinataire</span>
            </div>
            <div className="ml-6 space-y-1">
              <p className="font-medium">{shipment.receiver_name}</p>
              <p className="text-sm text-muted-foreground">{shipment.receiver_phone}</p>
              <p className="text-sm text-muted-foreground">{shipment.receiver_address}</p>
            </div>
          </div>

          {/* DÃ©tails du colis */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <Package className="h-4 w-4" />
              <span>Informations du colis</span>
            </div>
            <div className="ml-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Poids</p>
                <p className="font-medium">{shipment.weight} kg</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre de piÃ¨ces</p>
                <p className="font-medium">{shipment.pieces_count}</p>
              </div>
              {shipment.item_type && (
                <div>
                  <p className="text-sm text-muted-foreground">Type d'article</p>
                  <p className="font-medium">{shipment.item_type}</p>
                </div>
              )}
            </div>
            {shipment.package_description && (
              <div className="ml-6 mt-2">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{shipment.package_description}</p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-2">
            {shipment.cash_on_delivery && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Contre-remboursement: {shipment.cod_amount?.toLocaleString()} GNF
              </Badge>
            )}
            {shipment.insurance && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                AssurÃ©: {shipment.insurance_amount?.toLocaleString()} GNF
              </Badge>
            )}
            {shipment.return_option && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Option de retour
              </Badge>
            )}
          </div>

          {/* Statut */}
          <div className="flex items-center gap-2">
            <Badge className="bg-primary-orange-100 text-primary-orange-800">
              Commande crÃ©Ã©e
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        {onEdit && (
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier la commande
          </Button>
        )}
        <Button
          onClick={onNewShipment}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/40 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          CrÃ©er un nouvel envoi
        </Button>
      </div>
    </div>
  );
}
