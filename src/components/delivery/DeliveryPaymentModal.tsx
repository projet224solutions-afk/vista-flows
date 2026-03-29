/**
 * MODAL PAIEMENT LIVRAISONS
 * Support: Wallet, Card (Stripe), Mobile Money (Orange, MTN, Moov), Cash
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Smartphone, Wallet, Banknote, Loader2, Shield, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeliveryPaymentService } from "@/services/delivery/DeliveryPaymentService";
import { SecureButton } from "@/components/ui/SecureButton";
import { StripeCardPaymentModal } from "@/components/pos/StripeCardPaymentModal";
import { Button } from "@/components/ui/button";

export type DeliveryPaymentMethod = 'wallet' | 'cash' | 'mobile_money' | 'card';

interface DeliveryPaymentModalProps {
  open: boolean;
  onClose: () => void;
  deliveryId: string;
  amount: number;
  customerId: string;
  deliveryManId: string;
  onPaymentSuccess: () => void;
}

export default function DeliveryPaymentModal({
  open,
  onClose,
  deliveryId,
  amount,
  customerId,
  deliveryManId,
  onPaymentSuccess
}: DeliveryPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<DeliveryPaymentMethod>('wallet');
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mobileProvider, setMobileProvider] = useState<'orange' | 'mtn' | 'moov'>('orange');
  const [showStripeModal, setShowStripeModal] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      loadWalletBalance();
    }
  }, [open, customerId]);

  const loadWalletBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', customerId)
        .eq('currency', 'GNF')
        .single();

      if (error) throw error;
      setWalletBalance(data?.balance || 0);
    } catch (error) {
      console.error('[DeliveryPayment] Error loading balance:', error);
      setWalletBalance(0);
    }
  };

  const paymentMethods = [
    {
      id: 'wallet' as DeliveryPaymentMethod,
      name: 'Wallet 224Solutions',
      description: 'Paiement instantanÃ© depuis votre wallet',
      icon: Wallet,
      color: 'text-primary'
    },
    {
      id: 'card' as DeliveryPaymentMethod,
      name: 'Carte bancaire (Stripe)',
      description: 'Visa, Mastercard - Paiement sÃ©curisÃ©',
      icon: CreditCard,
      color: 'text-blue-600'
    },
    {
      id: 'mobile_money' as DeliveryPaymentMethod,
      name: 'Mobile Money',
      description: 'Orange Money, MTN Money, Moov Money',
      icon: Smartphone,
      color: 'text-orange-600'
    },
    {
      id: 'cash' as DeliveryPaymentMethod,
      name: 'Paiement Ã  la livraison',
      description: 'Payez en espÃ¨ces au livreur',
      icon: Banknote,
      color: 'text-primary-orange-600'
    }
  ];

  const handlePayment = useCallback(async () => {
    // Si carte bancaire sÃ©lectionnÃ©e, ouvrir le modal Stripe
    if (paymentMethod === 'card') {
      setShowStripeModal(true);
      return;
    }

    setProcessing(true);

    try {
      console.log('[DeliveryPayment] Starting payment:', {
        deliveryId,
        customerId,
        deliveryManId,
        amount,
        paymentMethod
      });

      // VÃ©rifier le solde pour wallet
      if (paymentMethod === 'wallet') {
        if (walletBalance !== null && walletBalance < amount) {
          toast.error('Solde insuffisant', {
            description: 'Veuillez recharger votre wallet'
          });
          setProcessing(false);
          return;
        }
      }

      // Validation des champs requis
      if (paymentMethod === 'mobile_money' && (!phoneNumber || phoneNumber.length < 8)) {
        toast.error('NumÃ©ro de tÃ©lÃ©phone requis', {
          description: 'Veuillez entrer votre numÃ©ro Mobile Money'
        });
        setProcessing(false);
        return;
      }

      let result;

      // Appeler le service de paiement appropriÃ©
      switch (paymentMethod) {
        case 'wallet':
          result = await DeliveryPaymentService.payWithWallet(deliveryId, amount, customerId);
          break;
        case 'mobile_money':
          result = await DeliveryPaymentService.payWithMobileMoney(
            deliveryId,
            amount,
            customerId,
            phoneNumber,
            mobileProvider
          );
          break;
        case 'cash':
          result = await DeliveryPaymentService.payWithCash(deliveryId, amount, customerId);
          break;
        default:
          throw new Error('MÃ©thode de paiement non supportÃ©e');
      }

      if (result.success) {
        toast.success('Paiement effectuÃ© avec succÃ¨s!', {
          description: `Transaction ID: ${result.transaction_id}`
        });
        onPaymentSuccess();
        onClose();
      } else {
        toast.error('Erreur de paiement', {
          description: result.error || 'Une erreur est survenue'
        });
      }
    } catch (error) {
      console.error('[DeliveryPayment] Error:', error);
      toast.error('Erreur de paiement', {
        description: error instanceof Error ? error.message : 'Veuillez rÃ©essayer'
      });
    } finally {
      setProcessing(false);
    }
  }, [deliveryId, customerId, deliveryManId, amount, paymentMethod, walletBalance, phoneNumber, mobileProvider, onPaymentSuccess, onClose]);

  const handleStripeSuccess = async (paymentIntentId: string) => {
    console.log('[DeliveryPayment] Stripe payment success:', paymentIntentId);
    
    toast.success('Paiement par carte rÃ©ussi !', {
      description: `${amount.toLocaleString()} GNF payÃ©s par carte`
    });

    setShowStripeModal(false);
    onPaymentSuccess();
    onClose();
  };

  const insufficientBalance = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < amount;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Paiement de la livraison
            </DialogTitle>
            <DialogDescription>
              Montant Ã  payer: <span className="font-bold text-lg">{amount.toLocaleString()} GNF</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Alerte Wallet Balance */}
            {paymentMethod === 'wallet' && walletBalance !== null && (
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription>
                  Solde actuel: <span className="font-bold">{walletBalance.toLocaleString()} GNF</span>
                  {walletBalance < amount && (
                    <span className="text-red-600 ml-2">
                      (Insuffisant - {(amount - walletBalance).toLocaleString()} GNF manquant)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Protection Escrow */}
            {paymentMethod !== 'cash' && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Paiement sÃ©curisÃ©: Les fonds sont conservÃ©s jusqu'Ã  la livraison confirmÃ©e
                </AlertDescription>
              </Alert>
            )}

            {insufficientBalance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Solde insuffisant. Veuillez recharger votre wallet pour continuer.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as DeliveryPaymentMethod)}>
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <div key={method.id} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer"
                         onClick={() => setPaymentMethod(method.id)}>
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="flex items-center space-x-3 flex-1 cursor-pointer">
                        <Icon className={`h-5 w-5 ${method.color}`} />
                        <div>
                          <p className="font-medium">{method.name}</p>
                          <p className="text-sm text-muted-foreground">{method.description}</p>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Champs conditionnels */}
            {paymentMethod === 'mobile_money' && (
              <div className="space-y-3">
                <div>
                  <Label>OpÃ©rateur Mobile Money</Label>
                  <Select value={mobileProvider} onValueChange={(v: any) => setMobileProvider(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orange">Orange Money</SelectItem>
                      <SelectItem value="mtn">MTN Money</SelectItem>
                      <SelectItem value="moov">Moov Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>NumÃ©ro de tÃ©lÃ©phone</Label>
                  <Input
                    type="tel"
                    placeholder="622123456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'card' && (
              <Alert className="bg-blue-50 border-blue-200">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-700">
                  Vous serez redirigÃ© vers le formulaire de paiement Stripe sÃ©curisÃ©
                </AlertDescription>
              </Alert>
            )}

            {paymentMethod === 'cash' && (
              <Alert>
                <Banknote className="h-4 w-4" />
                <AlertDescription>
                  Vous paierez en espÃ¨ces au livreur lors de la remise du colis
                </AlertDescription>
              </Alert>
            )}

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={processing}>
                Annuler
              </Button>
              <Button
                onClick={handlePayment}
                className="flex-1"
                disabled={processing || insufficientBalance || (paymentMethod === 'mobile_money' && phoneNumber.length < 8)}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  paymentMethod === 'card' ? 'Payer par carte' :
                  paymentMethod === 'cash' ? 'Confirmer' : 
                  `Payer ${amount.toLocaleString()} GNF`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Stripe pour paiement par carte */}
      <StripeCardPaymentModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        amount={amount}
        currency="GNF"
        orderId={deliveryId}
        sellerId={deliveryManId}
        description={`Livraison #${deliveryId.slice(0, 8)}`}
        onSuccess={handleStripeSuccess}
        onError={(error) => {
          toast.error('Erreur paiement carte', { description: error });
          setShowStripeModal(false);
        }}
      />
    </>
  );
}
