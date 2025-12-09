/**
 * ACTIONS DE LIVRAISON POUR LE LIVREUR
 * Boutons de mise à jour du statut avec navigation GPS intégrée
 * Capture photo/signature et notification vendeur
 */

import { useState, useRef } from 'react';
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
  Banknote,
  PenTool,
  ImageIcon
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
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'signature' | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

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

  // Capture photo depuis la caméra
  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    try {
      // Compresser et convertir en base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Upload vers Supabase Storage
        const fileName = `delivery-proof/${delivery.id}-${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
          console.error('Upload error:', error);
          toast.error('Erreur lors de l\'upload de la photo');
          return;
        }

        // Récupérer l'URL publique
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        setProofPhoto(urlData.publicUrl);
        toast.success('📷 Photo capturée');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Photo capture error:', error);
      toast.error('Erreur lors de la capture');
    } finally {
      setIsCapturing(false);
    }
  };

  // Gestion du canvas de signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setClientSignature(null);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsCapturing(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      
      // Convertir base64 en blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Upload vers Supabase Storage
      const fileName = `delivery-signatures/${delivery.id}-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from('documents')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) {
        console.error('Signature upload error:', error);
        toast.error('Erreur lors de l\'enregistrement de la signature');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      setClientSignature(urlData.publicUrl);
      setCaptureMode(null);
      toast.success('✍️ Signature enregistrée');
    } catch (error) {
      console.error('Signature save error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsCapturing(false);
    }
  };

  // Compléter la livraison avec preuve et notifier le vendeur
  const completeDelivery = async () => {
    if (!proofPhoto && !clientSignature) {
      toast.error('Veuillez capturer une photo ou signature comme preuve');
      return;
    }

    setUpdating(true);
    try {
      const confirmedAt = new Date().toISOString();

      // Récupérer les infos du livreur
      const { data: { user } } = await supabase.auth.getUser();
      let driverName = 'Livreur';
      let driverPhone = '';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          driverName = profile.full_name || 'Livreur';
          driverPhone = profile.phone || '';
        }
      }

      // Mettre à jour la livraison
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          status: 'delivered' as any,
          completed_at: confirmedAt,
          proof_photo_url: proofPhoto,
          client_signature: clientSignature,
          updated_at: confirmedAt
        } as any)
        .eq('id', delivery.id);

      if (updateError) throw updateError;

      // Notifier le vendeur via Edge Function
      try {
        const { error: notifyError } = await supabase.functions.invoke('notify-vendor-delivery-complete', {
          body: {
            delivery_id: delivery.id,
            proof_photo_url: proofPhoto,
            client_signature: clientSignature,
            confirmed_at: confirmedAt,
            driver_name: driverName,
            driver_phone: driverPhone
          }
        });

        if (notifyError) {
          console.error('Notification error:', notifyError);
        }
      } catch (notifyErr) {
        console.error('Failed to notify vendor:', notifyErr);
      }

      toast.success('✅ Livraison confirmée ! Vendeur notifié.');
      setShowProofDialog(false);
      onComplete();

    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setUpdating(false);
    }
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
      {/* Input caché pour la capture photo */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

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
              // Preuve de livraison avec capture photo/signature
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
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Preuve de livraison</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Capture Photo */}
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full h-20 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCapturing}
                      >
                        {isCapturing ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : proofPhoto ? (
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-green-600" />
                            <span className="text-green-600">Photo capturée ✓</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Camera className="h-6 w-6" />
                            <span className="text-sm">Prendre une photo</span>
                          </div>
                        )}
                      </Button>
                      {proofPhoto && (
                        <img 
                          src={proofPhoto} 
                          alt="Preuve" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                    </div>

                    {/* Signature Client */}
                    <div className="space-y-2">
                      {captureMode === 'signature' ? (
                        <div className="space-y-2">
                          <canvas
                            ref={canvasRef}
                            width={280}
                            height={150}
                            className="w-full border rounded-lg bg-white touch-none cursor-crosshair"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={clearSignature}
                              className="flex-1"
                            >
                              Effacer
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={saveSignature}
                              disabled={isCapturing}
                              className="flex-1"
                            >
                              {isCapturing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Enregistrer'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full h-16"
                          onClick={() => setCaptureMode('signature')}
                        >
                          {clientSignature ? (
                            <div className="flex items-center gap-2">
                              <PenTool className="h-5 w-5 text-green-600" />
                              <span className="text-green-600">Signature enregistrée ✓</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <PenTool className="h-5 w-5" />
                              <span>Signature client</span>
                            </div>
                          )}
                        </Button>
                      )}
                      {clientSignature && !captureMode && (
                        <img 
                          src={clientSignature} 
                          alt="Signature" 
                          className="w-full h-20 object-contain bg-white rounded-lg border p-2"
                        />
                      )}
                    </div>

                    {/* Info COD */}
                    {delivery.payment_method === 'cod' && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                        <p className="font-medium flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-yellow-600" />
                          Collecter: {formatCurrency(delivery.delivery_fee)}
                        </p>
                      </div>
                    )}

                    {/* Bouton confirmation finale */}
                    <Button 
                      onClick={completeDelivery} 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={updating || (!proofPhoto && !clientSignature)}
                    >
                      {updating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Confirmer la livraison
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Une notification sera envoyée au vendeur avec les preuves
                    </p>
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
