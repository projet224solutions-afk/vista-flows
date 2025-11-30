/**
 * MODAL PAIEMENT VENDEUR - 224SOLUTIONS
 * Support de 5 méthodes: wallet, cash, mobile_money, card, paypal
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Banknote, Smartphone, CreditCard, DollarSign, Loader2 } from 'lucide-react';
import { VendorPaymentService } from '@/services/vendor/VendorPaymentService';
import { toast } from 'sonner';

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
  customerId: string;
  onPaymentSuccess?: () => void;
}

type PaymentMethodType = 'wallet' | 'cash' | 'mobile_money' | 'card' | 'paypal';

export const VendorPaymentModal = ({
  isOpen,
  onClose,
  orderId,
  amount,
  customerId,
  onPaymentSuccess
}: VendorPaymentModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mobile Money
  const [mobileProvider, setMobileProvider] = useState<'orange' | 'mtn' | 'moov'>('orange');
  const [mobilePhone, setMobilePhone] = useState('');

  // Card
  const [cardToken, setCardToken] = useState('');

  // PayPal
  const [paypalEmail, setPaypalEmail] = useState('');

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      let result;

      switch (selectedMethod) {
        case 'wallet':
          result = await VendorPaymentService.payWithWallet(orderId, amount, customerId);
          break;

        case 'cash':
          result = await VendorPaymentService.payWithCash(orderId, amount, customerId);
          break;

        case 'mobile_money':
          if (!mobilePhone) {
            toast.error('Veuillez entrer un numéro de téléphone');
            setIsProcessing(false);
            return;
          }
          result = await VendorPaymentService.payWithMobileMoney(
            orderId,
            amount,
            customerId,
            mobilePhone,
            mobileProvider
          );
          break;

        case 'card':
          if (!cardToken) {
            toast.error('Veuillez entrer un token de carte valide');
            setIsProcessing(false);
            return;
          }
          result = await VendorPaymentService.payWithCard(orderId, amount, customerId, cardToken);
          break;

        case 'paypal':
          if (!paypalEmail) {
            toast.error('Veuillez entrer un email PayPal');
            setIsProcessing(false);
            return;
          }
          result = await VendorPaymentService.payWithPayPal(orderId, amount, customerId, paypalEmail);
          break;

        default:
          throw new Error('Méthode de paiement non supportée');
      }

      if (result.success) {
        toast.success('Paiement effectué avec succès');
        onPaymentSuccess?.();
        onClose();
      } else {
        toast.error(result.error || 'Erreur lors du paiement');
      }
    } catch (error: any) {
      console.error('[VendorPaymentModal] Payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF'
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement de la commande</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Montant */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Montant à payer</p>
            <p className="text-2xl font-bold text-primary">{formatAmount(amount)}</p>
          </div>

          {/* Sélection de la méthode de paiement */}
          <div className="space-y-2">
            <Label>Méthode de paiement</Label>
            <RadioGroup value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethodType)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="wallet" id="wallet" />
                <Label htmlFor="wallet" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wallet className="h-4 w-4" />
                  Wallet 224Solutions
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="h-4 w-4" />
                  Espèces (Cash)
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="mobile_money" id="mobile_money" />
                <Label htmlFor="mobile_money" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="h-4 w-4" />
                  Carte bancaire
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted cursor-pointer">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer flex-1">
                  <DollarSign className="h-4 w-4" />
                  PayPal
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Champs conditionnels selon la méthode */}
          {selectedMethod === 'mobile_money' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="provider">Opérateur</Label>
                <Select value={mobileProvider} onValueChange={(v) => setMobileProvider(v as any)}>
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange">Orange Money</SelectItem>
                    <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                    <SelectItem value="moov">Moov Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  placeholder="622123456"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {selectedMethod === 'card' && (
            <div className="space-y-2">
              <Label htmlFor="cardToken">Token de carte</Label>
              <Input
                id="cardToken"
                placeholder="tok_xxxxxxxxxxxxx"
                value={cardToken}
                onChange={(e) => setCardToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Le token sera généré par Stripe lors de la saisie de la carte
              </p>
            </div>
          )}

          {selectedMethod === 'paypal' && (
            <div className="space-y-2">
              <Label htmlFor="paypalEmail">Email PayPal</Label>
              <Input
                id="paypalEmail"
                type="email"
                placeholder="exemple@paypal.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
          )}

          {selectedMethod === 'cash' && (
            <Alert>
              <AlertDescription>
                Le paiement en espèces sera collecté à la livraison. La commande sera marquée comme "en attente de paiement".
              </AlertDescription>
            </Alert>
          )}

          {selectedMethod === 'wallet' && (
            <Alert>
              <AlertDescription>
                Le montant sera débité directement de votre Wallet 224Solutions.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handlePayment} disabled={isProcessing} className="flex-1">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                'Confirmer le paiement'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
