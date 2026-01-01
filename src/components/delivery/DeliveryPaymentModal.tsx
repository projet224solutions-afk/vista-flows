/**
 * MODAL PAIEMENT LIVRAISONS
 * Support: Wallet, Card (Stripe), Mobile Money (Orange, MTN, Moov), PayPal, Cash
 * Pattern sécurisé INP < 200ms
 */

import { useState, useEffect, useCallback, startTransition, useRef } from 'react';
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
import { CreditCard, Smartphone, Wallet, Banknote, Loader2, Shield, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeliveryPaymentService } from "@/services/delivery/DeliveryPaymentService";
import { SecureButton } from "@/components/ui/SecureButton";

export type DeliveryPaymentMethod = 'wallet' | 'cash' | 'mobile_money' | 'card' | 'paypal';

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
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cardToken, setCardToken] = useState('');

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
      description: 'Paiement instantané depuis votre wallet',
      icon: Wallet,
      color: 'text-primary'
    },
    {
      id: 'card' as DeliveryPaymentMethod,
      name: 'Carte bancaire',
      description: 'Visa, Mastercard',
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
      id: 'paypal' as DeliveryPaymentMethod,
      name: 'PayPal',
      description: 'Paiement via PayPal',
      icon: CreditCard,
      color: 'text-blue-500'
    },
    {
      id: 'cash' as DeliveryPaymentMethod,
      name: 'Paiement à la livraison',
      description: 'Payez en espèces au livreur',
      icon: Banknote,
      color: 'text-green-600'
    }
  ];

  // Action de paiement sécurisée - séparée du handler UI
  const executePayment = useCallback(async () => {
    console.log('[DeliveryPayment] Starting payment:', {
      deliveryId,
      customerId,
      deliveryManId,
      amount,
      paymentMethod
    });

    // Vérifier le solde pour wallet
    if (paymentMethod === 'wallet') {
      if (walletBalance !== null && walletBalance < amount) {
        toast.error('Solde insuffisant', {
          description: 'Veuillez recharger votre wallet'
        });
        throw new Error('Solde insuffisant');
      }
    }

    // Validation des champs requis
    if (paymentMethod === 'mobile_money' && (!phoneNumber || phoneNumber.length < 8)) {
      toast.error('Numéro de téléphone requis', {
        description: 'Veuillez entrer votre numéro Mobile Money'
      });
      throw new Error('Numéro de téléphone requis');
    }

    if (paymentMethod === 'paypal' && (!paypalEmail || !paypalEmail.includes('@'))) {
      toast.error('Email PayPal requis', {
        description: 'Veuillez entrer un email PayPal valide'
      });
      throw new Error('Email PayPal requis');
    }

    if (paymentMethod === 'card' && (!cardToken || cardToken.length < 10)) {
      toast.error('Informations carte requises', {
        description: 'Veuillez entrer les informations de votre carte'
      });
      throw new Error('Informations carte requises');
    }

    let result;

    // Appeler le service de paiement approprié
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
      case 'card':
        result = await DeliveryPaymentService.payWithCard(deliveryId, amount, customerId, cardToken);
        break;
      case 'paypal':
        result = await DeliveryPaymentService.payWithPayPal(deliveryId, amount, customerId, paypalEmail);
        break;
      case 'cash':
        result = await DeliveryPaymentService.payWithCash(deliveryId, amount, customerId);
        break;
      default:
        throw new Error('Méthode de paiement non supportée');
    }

    if (result.success) {
      toast.success('Paiement effectué avec succès!', {
        description: `Transaction ID: ${result.transaction_id}`
      });
      onPaymentSuccess();
      onClose();
    } else {
      toast.error('Erreur de paiement', {
        description: result.error || 'Une erreur est survenue'
      });
      throw new Error(result.error || 'Erreur de paiement');
    }
  }, [deliveryId, customerId, deliveryManId, amount, paymentMethod, walletBalance, phoneNumber, mobileProvider, paypalEmail, cardToken, onPaymentSuccess, onClose]);

  const insufficientBalance = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < amount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement de la livraison</DialogTitle>
          <DialogDescription>
            Montant à payer: <span className="font-bold text-lg">{amount.toLocaleString()} GNF</span>
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
                Paiement sécurisé: Les fonds sont conservés jusqu'à la livraison confirmée
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

        <div className="space-y-4 py-4">
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as DeliveryPaymentMethod)}>
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent"
                     onClick={() => setPaymentMethod(method.id)}>
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Icon className={`w-6 h-6 ${method.color}`} />
                  <div className="flex-1">
                    <Label htmlFor={method.id} className="font-medium cursor-pointer">
                      {method.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>

          {/* Sélection méthode de paiement */}
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as DeliveryPaymentMethod)}>
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
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

          {/* Champs conditionnels */}
          {paymentMethod === 'mobile_money' && (
            <div className="space-y-3">
              <div>
                <Label>Opérateur Mobile Money</Label>
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
                <Label>Numéro de téléphone</Label>
                <Input
                  type="tel"
                  placeholder="622123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>
          )}

          {paymentMethod === 'paypal' && (
            <div>
              <Label>Email PayPal</Label>
              <Input
                type="email"
                placeholder="votre@email.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
          )}

          {paymentMethod === 'card' && (
            <div>
              <Label>Token de carte (Stripe)</Label>
              <Input
                type="text"
                placeholder="tok_visa_..."
                value={cardToken}
                onChange={(e) => setCardToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                En production, utilisez Stripe Elements pour la saisie sécurisée
              </p>
            </div>
          )}

          {paymentMethod === 'cash' && (
            <Alert>
              <Banknote className="h-4 w-4" />
              <AlertDescription>
                Vous paierez en espèces au livreur lors de la remise du colis
              </AlertDescription>
            </Alert>
          )}

          {/* Bouton de paiement sécurisé - INP optimisé */}
          <SecureButton
            onSecureClick={executePayment}
            disabled={insufficientBalance}
            className="w-full"
            size="lg"
            loadingText="Traitement en cours..."
            debounceMs={1000}
          >
            {paymentMethod === 'cash' ? 'Confirmer' : 'Payer'} {amount.toLocaleString()} GNF
          </SecureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
