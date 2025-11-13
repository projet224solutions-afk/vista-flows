// @ts-nocheck
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Package } from 'lucide-react';

interface OrderSupplierProductDialogProps {
  product: any;
  vendorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OrderSupplierProductDialog({
  product,
  vendorId,
  open,
  onOpenChange,
  onSuccess
}: OrderSupplierProductDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(product.minimum_order || 1);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const subtotal = product.price_wholesale * quantity;
  const shippingCost = deliveryMethod === 'delivery' ? 5000 : 0;
  const total = subtotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (quantity < product.minimum_order) {
      toast.error(`La quantité minimale est de ${product.minimum_order} unités`);
      return;
    }

    if (quantity > product.stock) {
      toast.error(`Stock insuffisant (${product.stock} unités disponibles)`);
      return;
    }

    if (deliveryMethod === 'delivery' && !deliveryAddress) {
      toast.error('Veuillez fournir une adresse de livraison');
      return;
    }

    setLoading(true);

    try {
      const orderItems = [{
        product_id: product.id,
        product_name: product.product_name,
        quantity,
        price_unit: product.price_wholesale,
        subtotal: subtotal
      }];

      const { error } = await supabase
        .from('supplier_orders')
        .insert({
          supplier_id: product.supplier_id,
          vendor_id: vendorId,
          items: orderItems,
          subtotal,
          shipping_cost: shippingCost,
          total_amount: total,
          payment_method: paymentMethod,
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === 'delivery' ? deliveryAddress : null,
          notes: notes || null
        });

      if (error) throw error;

      toast.success('Commande créée avec succès');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erreur création commande:', error);
      toast.error(error.message || 'Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Commander ce produit</DialogTitle>
          <DialogDescription>
            {product.product_name} - {product.supplier.business_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quantité */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité *</Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="quantity"
                type="number"
                min={product.minimum_order}
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || product.minimum_order)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Min: {product.minimum_order} | Max: {product.stock} unités
            </p>
          </div>

          {/* Résumé des prix */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span>Prix unitaire (gros):</span>
              <span className="font-medium">{formatAmount(product.price_wholesale)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Sous-total ({quantity} × {formatAmount(product.price_wholesale)}):</span>
              <span className="font-medium">{formatAmount(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Frais de livraison:</span>
              <span className="font-medium">{formatAmount(shippingCost)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">{formatAmount(total)}</span>
            </div>
          </div>

          {/* Méthode de paiement */}
          <div className="space-y-2">
            <Label>Méthode de paiement *</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="cursor-pointer">Wallet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debt" id="debt" />
                <Label htmlFor="debt" className="cursor-pointer">Dette (paiement en tranches)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mobile_money" id="mobile_money" />
                <Label htmlFor="mobile_money" className="cursor-pointer">Mobile Money</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="cursor-pointer">Carte Bancaire</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Méthode de livraison */}
          <div className="space-y-2">
            <Label>Méthode de livraison *</Label>
            <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup" className="cursor-pointer">Retrait sur place (Gratuit)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivery" id="delivery" />
                <Label htmlFor="delivery" className="cursor-pointer">Livraison à domicile (5,000 GNF)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Adresse de livraison */}
          {deliveryMethod === 'delivery' && (
            <div className="space-y-2">
              <Label htmlFor="address">Adresse de livraison *</Label>
              <Input
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Votre adresse complète"
                required
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instructions spéciales..."
              rows={2}
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Envoi en cours...' : 'Confirmer la commande'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
