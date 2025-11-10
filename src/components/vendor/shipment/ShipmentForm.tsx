/**
 * FORMULAIRE DE CRÉATION D'EXPÉDITION
 * Inspiré de JYM Express pour 224SOLUTIONS
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Package, User, MapPin, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShipmentFormProps {
  vendorId: string;
  onSuccess: (shipmentId: string, trackingNumber: string) => void;
  onCancel?: () => void;
}

export function ShipmentForm({ vendorId, onSuccess, onCancel }: ShipmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Expéditeur
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
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.senderName || !formData.senderPhone || !formData.senderAddress) {
      toast.error('Veuillez remplir toutes les informations de l\'expéditeur');
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
      const { data, error } = await supabase
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
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Expédition créée avec succès !');
      onSuccess(data.id, data.tracking_number);
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast.error('Erreur lors de la création de l\'expédition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Expéditeur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-orange-600" />
            Informations de l'expéditeur
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
                placeholder="Nom de l'expéditeur"
                required
              />
            </div>
            <div>
              <Label htmlFor="senderPhone">Téléphone *</Label>
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
            <Label htmlFor="senderAddress">Adresse complète *</Label>
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
            <MapPin className="h-5 w-5 text-green-600" />
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
              <Label htmlFor="receiverPhone">Téléphone *</Label>
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
            <Label htmlFor="receiverAddress">Adresse complète *</Label>
            <Textarea
              id="receiverAddress"
              value={formData.receiverAddress}
              onChange={(e) => handleInputChange('receiverAddress', e.target.value)}
              placeholder="Adresse de livraison"
              rows={2}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Détails du colis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-blue-600" />
            Détails du colis
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
              <Label htmlFor="piecesCount">Nombre de pièces</Label>
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
                placeholder="Ex: 日用品, Vêtements"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="packageDescription">Description du contenu</Label>
            <Textarea
              id="packageDescription"
              value={formData.packageDescription}
              onChange={(e) => handleInputChange('packageDescription', e.target.value)}
              placeholder="Description détaillée du contenu du colis"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Options d'expédition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contre-remboursement */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <Label htmlFor="cashOnDelivery" className="font-medium">Contre-remboursement</Label>
              <p className="text-sm text-muted-foreground">Le destinataire paie à la livraison</p>
            </div>
            <Switch
              id="cashOnDelivery"
              checked={formData.cashOnDelivery}
              onCheckedChange={(checked) => handleInputChange('cashOnDelivery', checked)}
            />
          </div>
          
          {formData.cashOnDelivery && (
            <div className="ml-4">
              <Label htmlFor="codAmount">Montant à collecter (GNF)</Label>
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
              <p className="text-sm text-muted-foreground">Protégez votre envoi contre les dommages</p>
            </div>
            <Switch
              id="insurance"
              checked={formData.insurance}
              onCheckedChange={(checked) => handleInputChange('insurance', checked)}
            />
          </div>
          
          {formData.insurance && (
            <div className="ml-4">
              <Label htmlFor="insuranceAmount">Valeur déclarée (GNF)</Label>
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
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          {loading ? 'Création...' : 'Créer l\'expédition'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
