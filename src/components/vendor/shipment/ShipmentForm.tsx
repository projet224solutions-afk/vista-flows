/**
 * FORMULAIRE DE CRÃ‰ATION D'EXPÃ‰DITION
 * InspirÃ© de JYM Express pour 224SOLUTIONS
 * Avec calcul automatique du prix par GPS
 * ET paiement escrow pour sÃ©curiser les fonds du livreur
 */

import { useState, useEffect } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package, User, MapPin, ArrowRight, Calculator, Loader2, Route, Clock, CreditCard, Wallet, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDeliveryPriceCalculation } from '@/hooks/useDeliveryPriceCalculation';
import { UniversalEscrowService } from '@/services/UniversalEscrowService';
import { useWallet } from '@/hooks/useWallet';

interface ShipmentFormProps {
  vendorId: string;
  onSuccess: (shipmentId: string, trackingNumber: string) => void;
  onCancel?: () => void;
}

export function ShipmentForm({ vendorId, onSuccess, onCancel }: ShipmentFormProps) {
  const [loading, setLoading] = useState(false);
  const { wallet } = useWallet();
  const [formData, setFormData] = useState({
    // ExpÃ©diteur
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    
    // Destinataire
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    
    // Colis
    weight: '',
    piecesCount: '1',
    itemType: '',
    packageDescription: '',
    
    // Options
    cashOnDelivery: false,
    codAmount: '',
    insurance: false,
    insuranceAmount: '',
    returnOption: false,
    
    // MÃ©thode de paiement pour le livreur
    deliveryPaymentMethod: 'wallet' as 'wallet' | 'cash',
  });

  // Hook pour calcul de prix
  const { calculateDistance, calculating, priceResult, reset } = useDeliveryPriceCalculation(vendorId);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // RÃ©initialiser le prix si adresse modifiÃ©e
    if (field === 'senderAddress' || field === 'receiverAddress') {
      reset();
    }
  };

  // Calculer le prix de livraison
  const handleCalculatePrice = async () => {
    if (!formData.senderAddress || !formData.receiverAddress) {
      toast.error('Veuillez remplir les adresses avant de calculer le prix');
      return;
    }
    await calculateDistance(formData.senderAddress, formData.receiverAddress);
  };

  // Formater le prix
  const formatCurrency = useFormatCurrency();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.senderName || !formData.senderPhone || !formData.senderAddress) {
      toast.error('Veuillez remplir toutes les informations de l\'expÃ©diteur');
      return;
    }
    
    if (!formData.receiverName || !formData.receiverPhone || !formData.receiverAddress) {
      toast.error('Veuillez remplir toutes les informations du destinataire');
      return;
    }
    
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      toast.error('Veuillez indiquer un poids valide');
      return;
    }

    setLoading(true);
    try {
      // 1. RÃ©cupÃ©rer les infos du vendeur et l'utilisateur courant
      const { data: vendor } = await supabase
        .from('vendors')
        .select('business_name, phone, user_id')
        .eq('id', vendorId)
        .single();

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      // 2. CrÃ©er un customer temporaire si nÃ©cessaire ou utiliser le user courant
      let customerId = currentUserId;
      
      // VÃ©rifier si un customer existe pour cet utilisateur
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (!existingCustomer) {
        // CrÃ©er un customer temporaire
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            user_id: currentUserId,
            addresses: [{
              address: formData.receiverAddress,
              name: formData.receiverName,
              phone: formData.receiverPhone
            }]
          })
          .select()
          .single();

        if (!customerError && newCustomer) {
          customerId = newCustomer.id;
        }
      } else {
        customerId = existingCustomer.id;
      }

      // 3. GÃ©nÃ©rer un numÃ©ro de commande unique
      const orderNumber = `EXP-${Date.now().toString(36).toUpperCase()}`;
      const totalAmount = formData.cashOnDelivery ? parseFloat(formData.codAmount) || 0 : 0;

      // 4. CrÃ©er une commande pour lier la livraison
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          vendor_id: vendorId,
          customer_id: customerId!,
          order_number: orderNumber,
          status: 'confirmed',
          subtotal: totalAmount,
          total_amount: totalAmount,
          payment_status: formData.cashOnDelivery ? 'pending' : 'paid',
          shipping_address: {
            address: formData.receiverAddress,
            name: formData.receiverName,
            phone: formData.receiverPhone
          },
          notes: `ExpÃ©dition: ${formData.packageDescription || formData.itemType || 'Colis'}`,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 5. CrÃ©er l'expÃ©dition dans la table shipments
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          vendor_id: vendorId,
          sender_name: formData.senderName,
          sender_phone: formData.senderPhone,
          sender_address: formData.senderAddress,
          receiver_name: formData.receiverName,
          receiver_phone: formData.receiverPhone,
          receiver_address: formData.receiverAddress,
          weight: parseFloat(formData.weight),
          pieces_count: parseInt(formData.piecesCount) || 1,
          item_type: formData.itemType || null,
          package_description: formData.packageDescription || null,
          cash_on_delivery: formData.cashOnDelivery,
          cod_amount: formData.cashOnDelivery ? parseFloat(formData.codAmount) || 0 : 0,
          insurance: formData.insurance,
          insurance_amount: formData.insurance ? parseFloat(formData.insuranceAmount) || 0 : 0,
          return_option: formData.returnOption,
          status: 'created',
        } as any)
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // 6. Calculer le montant de la livraison
      const deliveryFee = priceResult?.totalPrice || 15000;

      // 7. CrÃ©er une livraison correspondante dans la table deliveries pour les livreurs
      console.log('ðŸ“¦ CrÃ©ation de la livraison pour les livreurs...');
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          order_id: order.id,
          vendor_id: vendorId,
          vendor_name: vendor?.business_name || formData.senderName,
          vendor_phone: vendor?.phone || formData.senderPhone,
          vendor_location: {
            address: formData.senderAddress,
            name: formData.senderName
          },
          pickup_address: { 
            address: formData.senderAddress,
            name: formData.senderName,
            phone: formData.senderPhone
          },
          delivery_address: { 
            address: formData.receiverAddress,
            name: formData.receiverName,
            phone: formData.receiverPhone
          },
          customer_name: formData.receiverName,
          customer_phone: formData.receiverPhone,
          package_description: formData.packageDescription || formData.itemType || `Colis ${parseFloat(formData.weight)} kg`,
          package_type: formData.itemType || 'colis',
          payment_method: formData.cashOnDelivery ? 'cod' : 'prepaid',
          driver_payment_method: formData.deliveryPaymentMethod || 'cash',
          price: formData.cashOnDelivery ? parseFloat(formData.codAmount) || 0 : 0,
          delivery_fee: deliveryFee,
          distance_km: priceResult?.distance || null,
          estimated_time_minutes: priceResult?.estimatedTime || null,
          status: 'pending',
        })
        .select()
        .single();

      if (deliveryError) {
        console.error('âŒ Error creating delivery:', deliveryError);
        toast.error('ExpÃ©dition crÃ©Ã©e mais erreur pour la livraison: ' + deliveryError.message);
      } else {
        console.log('âœ… Livraison crÃ©Ã©e avec succÃ¨s:', delivery?.id);
      }

      // 8. Si paiement par wallet, crÃ©er l'escrow pour bloquer les fonds
      if (formData.deliveryPaymentMethod === 'wallet' && delivery) {
        console.log('ðŸ” CrÃ©ation escrow pour livraison:', deliveryFee);
        
        // VÃ©rifier le solde
        if ((wallet?.balance || 0) < deliveryFee) {
          toast.error('Solde insuffisant pour payer la livraison');
          // Supprimer la livraison crÃ©Ã©e
          await supabase.from('deliveries').delete().eq('id', delivery.id);
          setLoading(false);
          return;
        }

        // CrÃ©er l'escrow - les fonds sont bloquÃ©s jusqu'Ã  confirmation du livreur
        const escrowResult = await UniversalEscrowService.createEscrow({
          buyer_id: vendor?.user_id || currentUserId!,
          seller_id: 'DELIVERY_DRIVER_PLACEHOLDER', // Sera mis Ã  jour quand un livreur accepte
          order_id: order.id,
          amount: deliveryFee,
          currency: 'GNF',
          transaction_type: 'delivery',
          payment_provider: 'wallet',
          metadata: {
            delivery_id: delivery.id,
            vendor_id: vendorId,
            description: `Frais de livraison - ${formData.receiverName}`,
          },
          escrow_options: {
            require_photo: true,
            require_signature: true,
          }
        });

        if (!escrowResult.success) {
          console.error('âŒ Escrow creation failed:', escrowResult.error);
          toast.error('Erreur lors du blocage des fonds');
          await supabase.from('deliveries').delete().eq('id', delivery.id);
          setLoading(false);
          return;
        }

        console.log('âœ… Escrow crÃ©Ã©:', escrowResult.escrow_id);
        toast.success('ðŸ’° Fonds bloquÃ©s en escrow - libÃ©rÃ©s Ã  la confirmation du livreur');
      }

      toast.success('âœ… ExpÃ©dition crÃ©Ã©e avec succÃ¨s !');
      onSuccess(shipment.id, shipment.tracking_number);
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast.error('Erreur lors de la crÃ©ation de l\'expÃ©dition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ExpÃ©diteur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-orange-600" />
            Informations de l'expÃ©diteur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="senderName">Nom complet *</Label>
              <Input
                id="senderName"
                value={formData.senderName}
                onChange={(e) => handleInputChange('senderName', e.target.value)}
                placeholder="Nom de l'expÃ©diteur"
                required
              />
            </div>
            <div>
              <Label htmlFor="senderPhone">TÃ©lÃ©phone *</Label>
              <Input
                id="senderPhone"
                value={formData.senderPhone}
                onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                placeholder="+224 XXX XXX XXX"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="senderAddress">Adresse complÃ¨te *</Label>
            <Textarea
              id="senderAddress"
              value={formData.senderAddress}
              onChange={(e) => handleInputChange('senderAddress', e.target.value)}
              placeholder="Adresse de retrait du colis"
              rows={2}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Destinataire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary-orange-600" />
            Informations du destinataire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receiverName">Nom complet *</Label>
              <Input
                id="receiverName"
                value={formData.receiverName}
                onChange={(e) => handleInputChange('receiverName', e.target.value)}
                placeholder="Nom du destinataire"
                required
              />
            </div>
            <div>
              <Label htmlFor="receiverPhone">TÃ©lÃ©phone *</Label>
              <Input
                id="receiverPhone"
                value={formData.receiverPhone}
                onChange={(e) => handleInputChange('receiverPhone', e.target.value)}
                placeholder="+224 XXX XXX XXX"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="receiverAddress">Adresse complÃ¨te *</Label>
            <Textarea
              id="receiverAddress"
              value={formData.receiverAddress}
              onChange={(e) => handleInputChange('receiverAddress', e.target.value)}
              placeholder="Adresse de livraison"
              rows={2}
              required
            />
          </div>

          {/* Bouton calcul prix */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCalculatePrice}
              disabled={calculating || !formData.senderAddress || !formData.receiverAddress}
              className="w-full"
            >
              {calculating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculer le prix de livraison
                </>
              )}
            </Button>
          </div>

          {/* Affichage du prix calculÃ© */}
          {priceResult && (
            <div className="mt-4 p-4 bg-gradient-to-r from-primary-blue-50 to-primary-orange-50 dark:from-primary-blue-950/20 dark:to-primary-orange-950/20 rounded-lg border border-primary-orange-200 dark:border-primary-orange-800">
              <h4 className="font-semibold text-primary-orange-800 dark:text-primary-orange-300 mb-3 flex items-center gap-2">
                <Route className="h-4 w-4" />
                Estimation de livraison
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-white/60 dark:bg-black/20 rounded">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-bold text-primary-orange-700 dark:text-primary-orange-400">{priceResult.distance} km</p>
                </div>
                <div className="p-2 bg-white/60 dark:bg-black/20 rounded">
                  <p className="text-xs text-muted-foreground">Temps estimÃ©</p>
                  <p className="font-bold text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    {priceResult.estimatedTime} min
                  </p>
                </div>
                <div className="p-2 bg-white/60 dark:bg-black/20 rounded">
                  <p className="text-xs text-muted-foreground">Prix livraison</p>
                  <p className="font-bold text-orange-600">{formatCurrency(priceResult.totalPrice)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {formatCurrency(priceResult.basePrice)} (base) + {formatCurrency(priceResult.distancePrice)} ({priceResult.distance} km Ã— prix/km)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DÃ©tails du colis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-blue-600" />
            DÃ©tails du colis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="weight">Poids (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="0.0"
                required
              />
            </div>
            <div>
              <Label htmlFor="piecesCount">Nombre de piÃ¨ces</Label>
              <Input
                id="piecesCount"
                type="number"
                min="1"
                value={formData.piecesCount}
                onChange={(e) => handleInputChange('piecesCount', e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <Label htmlFor="itemType">Type d'article</Label>
              <Input
                id="itemType"
                value={formData.itemType}
                onChange={(e) => handleInputChange('itemType', e.target.value)}
                placeholder="Ex: æ—¥ç”¨å“, VÃªtements"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="packageDescription">Description du contenu</Label>
            <Textarea
              id="packageDescription"
              value={formData.packageDescription}
              onChange={(e) => handleInputChange('packageDescription', e.target.value)}
              placeholder="Description dÃ©taillÃ©e du contenu du colis"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Options d'expÃ©dition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contre-remboursement */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="cashOnDelivery" className="font-medium">Contre-remboursement</Label>
              <p className="text-sm text-muted-foreground">Le destinataire paie Ã  la livraison</p>
            </div>
            <Switch
              id="cashOnDelivery"
              checked={formData.cashOnDelivery}
              onCheckedChange={(checked) => handleInputChange('cashOnDelivery', checked)}
            />
          </div>
          
          {formData.cashOnDelivery && (
            <div className="ml-4">
              <Label htmlFor="codAmount">Montant Ã  collecter (GNF)</Label>
              <Input
                id="codAmount"
                type="number"
                min="0"
                value={formData.codAmount}
                onChange={(e) => handleInputChange('codAmount', e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {/* Assurance */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="insurance" className="font-medium">Assurance</Label>
              <p className="text-sm text-muted-foreground">ProtÃ©gez votre envoi contre les dommages</p>
            </div>
            <Switch
              id="insurance"
              checked={formData.insurance}
              onCheckedChange={(checked) => handleInputChange('insurance', checked)}
            />
          </div>
          
          {formData.insurance && (
            <div className="ml-4">
              <Label htmlFor="insuranceAmount">Valeur dÃ©clarÃ©e (GNF)</Label>
              <Input
                id="insuranceAmount"
                type="number"
                min="0"
                value={formData.insuranceAmount}
                onChange={(e) => handleInputChange('insuranceAmount', e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {/* Option de retour */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="returnOption" className="font-medium">Option de retour</Label>
              <p className="text-sm text-muted-foreground">Retour gratuit en cas de refus</p>
            </div>
            <Switch
              id="returnOption"
              checked={formData.returnOption}
              onCheckedChange={(checked) => handleInputChange('returnOption', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Boutons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/40"
        >
          {loading ? 'CrÃ©ation...' : 'CrÃ©er l\'expÃ©dition'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
