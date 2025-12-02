/**
 * PANNEAU DE LIVRAISON ACTIVE
 * Gère le workflow complet après acceptation d'une livraison
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MapPin,
  Navigation,
  Phone,
  Package,
  Store,
  User,
  Check,
  Camera,
  CreditCard,
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export type DeliveryStatus = 
  | 'assigned'
  | 'driver_on_way_to_vendor'
  | 'driver_arrived_vendor'
  | 'package_picked'
  | 'driver_on_way_to_client'
  | 'driver_5min_away'
  | 'driver_arrived'
  | 'delivered'
  | 'paid';

export interface ActiveDelivery {
  id: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone: string;
  vendorLocation: { lat: number; lng: number };
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientLocation: { lat: number; lng: number };
  status: DeliveryStatus;
  estimatedEarnings: number;
  paymentMethod: 'prepaid' | 'cod';
  packageType: string;
  totalDistance: number;
}

interface ActiveDeliveryPanelProps {
  delivery: ActiveDelivery;
  driverLocation: { lat: number; lng: number } | null;
  onUpdateStatus: (status: DeliveryStatus) => Promise<void>;
  onUploadProof: (file: File) => Promise<void>;
  onCancel: (reason: string) => Promise<void>;
}

const STATUS_STEPS: { status: DeliveryStatus; label: string; icon: any }[] = [
  { status: 'assigned', label: 'Acceptée', icon: Check },
  { status: 'driver_on_way_to_vendor', label: 'En route vers vendeur', icon: Navigation },
  { status: 'driver_arrived_vendor', label: 'Arrivé chez vendeur', icon: Store },
  { status: 'package_picked', label: 'Colis récupéré', icon: Package },
  { status: 'driver_on_way_to_client', label: 'En route vers client', icon: Navigation },
  { status: 'driver_arrived', label: 'Arrivé chez client', icon: MapPin },
  { status: 'delivered', label: 'Livré', icon: Check },
];

export function ActiveDeliveryPanel({
  delivery,
  driverLocation,
  onUpdateStatus,
  onUploadProof,
  onCancel
}: ActiveDeliveryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.status === delivery.status);
  const progress = ((currentStepIndex + 1) / STATUS_STEPS.length) * 100;

  const getNextStatus = (): DeliveryStatus | null => {
    const statusFlow: Record<DeliveryStatus, DeliveryStatus | null> = {
      'assigned': 'driver_on_way_to_vendor',
      'driver_on_way_to_vendor': 'driver_arrived_vendor',
      'driver_arrived_vendor': 'package_picked',
      'package_picked': 'driver_on_way_to_client',
      'driver_on_way_to_client': 'driver_arrived',
      'driver_5min_away': 'driver_arrived',
      'driver_arrived': 'delivered',
      'delivered': delivery.paymentMethod === 'cod' ? 'paid' : null,
      'paid': null
    };
    return statusFlow[delivery.status];
  };

  const getNextActionLabel = (): string => {
    const labels: Record<DeliveryStatus, string> = {
      'assigned': '🚗 Démarrer la navigation',
      'driver_on_way_to_vendor': '📍 Je suis arrivé',
      'driver_arrived_vendor': '📦 Colis récupéré',
      'package_picked': '🚗 En route vers client',
      'driver_on_way_to_client': '📍 Je suis arrivé',
      'driver_5min_away': '📍 Je suis arrivé',
      'driver_arrived': '✅ Livraison effectuée',
      'delivered': delivery.paymentMethod === 'cod' ? '💰 Paiement reçu' : '',
      'paid': ''
    };
    return labels[delivery.status];
  };

  const handleNextStep = async () => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    setLoading(true);
    try {
      await onUpdateStatus(nextStatus);
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (destination: { lat: number; lng: number }, label: string) => {
    // Ouvrir Google Maps ou Apple Maps
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    window.open(url, '_blank');
    toast.info(`Navigation vers ${label} ouverte`);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      await onUploadProof(file);
      toast.success('Photo de preuve uploadée');
    } catch (error) {
      toast.error('Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN').format(amount) + ' GNF';
  };

  const isAtVendorPhase = ['assigned', 'driver_on_way_to_vendor', 'driver_arrived_vendor'].includes(delivery.status);
  const currentDestination = isAtVendorPhase 
    ? { location: delivery.vendorLocation, label: delivery.vendorName, address: delivery.vendorAddress, phone: delivery.vendorPhone }
    : { location: delivery.clientLocation, label: delivery.clientName, address: delivery.clientAddress, phone: delivery.clientPhone };

  return (
    <Card className="border-green-500 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Livraison en cours
          </CardTitle>
          <Badge variant="default" className="bg-green-500">
            {STATUS_STEPS[currentStepIndex]?.label || delivery.status}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Destination actuelle */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {isAtVendorPhase ? (
                <Store className="h-6 w-6 text-orange-600 flex-shrink-0" />
              ) : (
                <User className="h-6 w-6 text-green-600 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {isAtVendorPhase ? 'Récupération chez' : 'Livraison à'}
                </p>
                <p className="font-bold text-lg">{currentDestination.label}</p>
                <p className="text-sm text-muted-foreground">{currentDestination.address}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`tel:${currentDestination.phone}`, '_self')}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>

          {/* Bouton navigation */}
          <Button
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
            onClick={() => openNavigation(currentDestination.location, currentDestination.label)}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Ouvrir la navigation GPS
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Informations paiement */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">
              {delivery.paymentMethod === 'cod' ? 'Paiement à la livraison' : 'Déjà payé'}
            </span>
          </div>
          <span className="font-bold text-green-600">
            {formatCurrency(delivery.estimatedEarnings)}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {/* Bouton action principale */}
          {getNextStatus() && (
            <Button
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              onClick={handleNextStep}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                getNextActionLabel()
              )}
            </Button>
          )}

          {/* Upload photo de preuve (après livraison) */}
          {delivery.status === 'delivered' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => document.getElementById('proof-photo')?.click()}
                disabled={loading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Photo de preuve
              </Button>
              <input
                id="proof-photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
          )}

          {/* Bouton annulation */}
          {!['delivered', 'paid'].includes(delivery.status) && (
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:bg-red-50"
              onClick={() => setShowCancelDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Annuler la livraison
            </Button>
          )}
        </div>

        {/* Étapes de progression */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Progression</p>
          <div className="flex justify-between">
            {STATUS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div
                  key={step.status}
                  className={`flex flex-col items-center ${
                    isCompleted ? 'text-green-600' : isCurrent ? 'text-orange-600' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100' : isCurrent ? 'bg-orange-100' : 'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
