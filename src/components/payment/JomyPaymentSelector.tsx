/**
 * ðŸ’³ SÃ‰LECTEUR DE PAIEMENT - MULTI-PROVIDERS
 * Stripe pour les cartes bancaires, ChapChapPay pour Mobile Money (Orange, MTN, PayCard)
 * MÃ©thodes: Carte Bancaire (Stripe), Orange Money, MTN MoMo, PayCard (ChapChapPay)
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  CreditCard, 
  Shield, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Wallet,
  Truck,
  Phone
} from 'lucide-react';
import { useChapChapPay } from '@/hooks/useChapChapPay';
import { CCPPaymentMethod } from '@/services/payment/ChapChapPayService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import StripeCheckoutButton from '@/components/payment/StripeCheckoutButton';
import { usePriceConverter } from '@/hooks/usePriceConverter';
import { formatCurrency } from '@/lib/formatters';

interface JomyPaymentSelectorProps {
  amount: number;
  currency?: string; // Devise du produit/vendeur (ex: XOF, EUR). DÃ©faut: GNF
  orderId?: string;
  description?: string;
  transactionType?: 'product' | 'taxi' | 'delivery' | 'service' | 'transfer';
  productType?: 'physical' | 'digital';
  onPaymentSuccess: (transactionId: string, status: string) => void;
  onPaymentPending?: (transactionId: string) => void;
  onPaymentFailed?: (error: string) => void;
  onCashOnDelivery?: (addressData?: any) => void;
  onCancel: () => void;
  enableEscrow?: boolean;
  recipientId?: string;
  sellerId?: string;
}

type PaymentMethodId = 'CARD' | 'WALLET' | 'CASH_ON_DELIVERY' | 'CCP_ORANGE' | 'CCP_MTN' | 'CCP_PAYCARD';

interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  requiresPhone: boolean;
  phonePrefix?: string;
  phonePlaceholder?: string;
  provider?: 'chapchappay' | 'wallet' | 'stripe';
}

export function JomyPaymentSelector({
  amount,
  currency = 'GNF',
  orderId,
  description,
  transactionType = 'product',
  productType = 'physical',
  onPaymentSuccess,
  onPaymentPending,
  onPaymentFailed,
  onCashOnDelivery,
  onCancel,
  enableEscrow = true,
  recipientId,
  sellerId
}: JomyPaymentSelectorProps) {
  const { user } = useAuth();
  const { initiatePullPayment, pollStatus, isLoading, error } = useChapChapPay();
  const chapchapLoading = isLoading;
  
  const { convert, userCurrency, loading: converterLoading } = usePriceConverter();
  
  const displayCurrency = currency.toUpperCase();
  const formattedAmount = formatCurrency(amount, displayCurrency);
  
  // Conversion si devise produit â‰  devise utilisateur
  const converted = useMemo(() => {
    if (!amount || displayCurrency === userCurrency.toUpperCase()) return null;
    return convert(amount, displayCurrency);
  }, [amount, displayCurrency, userCurrency, convert]);
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>(recipientId ? 'WALLET' : 'CARD');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'polling' | 'success' | 'failed'>('idle');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletCurrency, setWalletCurrency] = useState<string>('GNF');
  const [showStripeInline, setShowStripeInline] = useState(false);

  // Reset error state when switching payment methods
  const handleMethodChange = (value: string) => {
    setSelectedMethod(value as PaymentMethodId);
    setPaymentStatus('idle');
    setShowStripeInline(false);
  };

  // Ã‰tat pour adresse de livraison (COD)
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    neighborhood: '',
    city: 'Conakry',
    landmark: '',
    instructions: ''
  });

  // Charger le solde wallet si disponible
  useEffect(() => {
    const loadWalletBalance = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('wallets')
          .select('balance, currency')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setWalletBalance(data.balance);
          setWalletCurrency(data.currency || 'GNF');
        }
      } catch (err) {
        console.error('Error loading wallet balance:', err);
      }
    };
    loadWalletBalance();
  }, [user?.id]);

  // MÃ©thodes de paiement disponibles
  const paymentMethods: PaymentMethodOption[] = [
    // Option Wallet en premier si recipientId est fourni
    ...(recipientId ? [{
      id: 'WALLET' as const,
      name: 'Wallet 224Solutions',
      description: `Solde: ${walletBalance !== null ? formatCurrency(walletBalance, walletCurrency) : '...'}`,
      icon: <Wallet className="h-5 w-5 text-primary-orange-600" />,
      iconBg: 'bg-primary-orange-100',
      requiresPhone: false,
      provider: 'wallet' as const
    }] : []),
    {
      id: 'CARD' as const,
      name: 'Carte Bancaire',
      description: 'Paiement sÃ©curisÃ© par carte VISA / Mastercard via Stripe',
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      requiresPhone: false,
      provider: 'stripe' as const
    },
    // ChapChapPay - Orange Money (prioritaire)
    {
      id: 'CCP_ORANGE' as const,
      name: 'Orange Money',
      description: 'Paiement instantanÃ© via ChapChapPay',
      icon: <Smartphone className="h-5 w-5 text-orange-500" />,
      iconBg: 'bg-orange-100',
      requiresPhone: true,
      phonePrefix: '620',
      phonePlaceholder: '620 XX XX XX',
      provider: 'chapchappay' as const
    },
    // ChapChapPay - MTN MoMo
    {
      id: 'CCP_MTN' as const,
      name: 'MTN Mobile Money',
      description: 'Paiement via MTN MoMo (ChapChapPay)',
      icon: <Smartphone className="h-5 w-5 text-yellow-600" />,
      iconBg: 'bg-yellow-100',
      requiresPhone: true,
      phonePrefix: '660',
      phonePlaceholder: '660 XX XX XX',
      provider: 'chapchappay' as const
    },
    // Paiement Ã  la livraison - uniquement pour produits physiques
    ...(productType === 'physical' && transactionType === 'product' && onCashOnDelivery ? [{
      id: 'CASH_ON_DELIVERY' as const,
      name: 'Paiement Ã  la livraison',
      description: 'Vous serez contactÃ© pour confirmer l\'adresse de livraison',
      icon: <Truck className="h-5 w-5 text-primary-blue-600" />,
      iconBg: 'bg-primary-blue-100',
      requiresPhone: false,
      provider: undefined
    }] : [])
  ];

  const selectedOption = paymentMethods.find(m => m.id === selectedMethod);
  const requiresPhone = selectedOption?.requiresPhone || false;

  const handlePayment = async () => {
    console.log('ðŸ”µ [JomyPaymentSelector] handlePayment called');
    console.log('ðŸ”µ [JomyPaymentSelector] selectedMethod:', selectedMethod);
    
    if (!user) {
      toast.error('Vous devez Ãªtre connectÃ© pour effectuer un paiement');
      return;
    }

    // Paiement Ã  la livraison
    if (selectedMethod === 'CASH_ON_DELIVERY') {
      // Valider adresse complÃ¨te
      if (!deliveryAddress.street.trim()) {
        toast.error('Adresse requise', {
          description: 'Veuillez entrer votre adresse complÃ¨te'
        });
        return;
      }
      
      if (!deliveryAddress.city) {
        toast.error('Ville requise', {
          description: 'Veuillez sÃ©lectionner votre ville'
        });
        return;
      }

      if (onCashOnDelivery) {
        onCashOnDelivery(deliveryAddress as any); // Passer l'adresse au callback
      }
      return;
    }

    // Paiement par Carte Bancaire (Stripe)
    if (selectedMethod === 'CARD') {
      console.log('ðŸ”µ [JomyPaymentSelector] Showing Stripe inline');
      setShowStripeInline(true);
      return;
    }

    // Paiement par Wallet
    if (selectedMethod === 'WALLET') {
      if (!recipientId) {
        toast.error('ID du destinataire requis');
        return;
      }
      
      if (walletBalance !== null && walletBalance < amount) {
        toast.error('Solde insuffisant');
        return;
      }

      setProcessing(true);
      setPaymentStatus('processing');

      try {
        const { data, error } = await supabase.functions.invoke('wallet-operations', {
          body: {
            operation: 'transfer',
            amount,
            recipient_id: recipientId,
            description: description || 'Transfert'
          }
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || 'Ã‰chec du transfert');
        }

        setPaymentStatus('success');
        toast.success('ðŸŽ‰ Transfert rÃ©ussi !');
        onPaymentSuccess(data.transaction_id || '', 'SUCCESS');
      } catch (err) {
        console.error('[Wallet] Transfer error:', err);
        setPaymentStatus('failed');
        toast.error(err instanceof Error ? err.message : 'Erreur de transfert');
        onPaymentFailed?.(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // ChapChapPay - Orange Money, MTN MoMo, PayCard
    const isChapChapPayMethod = selectedMethod === 'CCP_ORANGE' || selectedMethod === 'CCP_MTN' || selectedMethod === 'CCP_PAYCARD';
    
    if (isChapChapPayMethod) {
      if (requiresPhone && (!phoneNumber || phoneNumber.length < 9)) {
        toast.error('NumÃ©ro de tÃ©lÃ©phone invalide');
        return;
      }

      setProcessing(true);
      setPaymentStatus('processing');

      try {
        // Mapper vers les mÃ©thodes ChapChapPay
        const ccpMethodMap: Record<string, CCPPaymentMethod> = {
          'CCP_ORANGE': 'orange_money',
          'CCP_MTN': 'mtn_momo',
          'CCP_PAYCARD': 'paycard'
        };

        const result = await initiatePullPayment({
          amount,
          currency: 'XOF',
          paymentMethod: ccpMethodMap[selectedMethod],
          customerPhone: phoneNumber,
          description: description || `Paiement ${transactionType}`,
          orderId: orderId || `${transactionType}-${Date.now()}`
        });

        if (!result.success) {
          throw new Error(result.error || 'Ã‰chec du paiement');
        }

        // Polling pour vÃ©rifier le statut ChapChapPay
        if (result.transactionId) {
          setPaymentStatus('polling');
          
          const finalStatus = await pollStatus(result.transactionId, (status) => {
            if (status.status === 'completed') {
              setPaymentStatus('success');
              toast.success('ðŸŽ‰ Paiement rÃ©ussi via ChapChapPay !');
              onPaymentSuccess(result.transactionId!, 'SUCCESS');
            } else if (status.status === 'failed' || status.status === 'cancelled') {
              setPaymentStatus('failed');
              toast.error('Paiement Ã©chouÃ©');
              onPaymentFailed?.(status.error || 'Paiement refusÃ©');
            }
          });

          if (finalStatus) {
            if (finalStatus.status === 'completed') {
              setPaymentStatus('success');
              onPaymentSuccess(result.transactionId, 'SUCCESS');
            } else if (finalStatus.status === 'pending') {
              onPaymentPending?.(result.transactionId);
              toast.info('Paiement en attente de confirmation');
            } else {
              setPaymentStatus('failed');
              onPaymentFailed?.(finalStatus.error || 'Paiement Ã©chouÃ©');
            }
          }
        }
      } catch (err) {
        console.error('[ChapChapPay] Payment error:', err);
        setPaymentStatus('failed');
        toast.error(err instanceof Error ? err.message : 'Erreur de paiement');
        onPaymentFailed?.(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Ce bloc n'est plus utilisÃ© - ChapChapPay gÃ¨re tous les paiements Mobile Money
    toast.error('MÃ©thode de paiement non supportÃ©e');
    setProcessing(false);
  };

  const handleStripeSuccess = (data: { paymentIntentId: string; amount: number; currency: string }) => {
    console.log('âœ… [JomyPaymentSelector] Stripe payment success:', data);
    setShowStripeInline(false);
    setPaymentStatus('success');
    onPaymentSuccess(data.paymentIntentId, 'SUCCESS');
  };

  const handleStripeError = (errorMsg: string) => {
    console.error('âŒ [JomyPaymentSelector] Stripe payment error:', errorMsg);
    setShowStripeInline(false);
    setPaymentStatus('failed');
    onPaymentFailed?.(errorMsg);
  };

  const isConfirmDisabled = 
    processing || 
    isLoading || 
    (requiresPhone && (!phoneNumber || phoneNumber.length < 9));

  // Affichage succÃ¨s
  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-primary-orange-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-primary-orange-700 mb-2">Paiement rÃ©ussi !</h3>
          <p className="text-muted-foreground mb-4">
            Votre paiement de {formattedAmount} a Ã©tÃ© effectuÃ© avec succÃ¨s.
          </p>
          <Button onClick={() => onPaymentSuccess('', 'SUCCESS')} className="w-full">
            Continuer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Paiement sÃ©curisÃ©
          </CardTitle>
          <div className="text-center mt-2">
            <p className="text-3xl font-bold text-primary">
              {formattedAmount}
            </p>
            <p className="text-sm text-muted-foreground">Montant Ã  payer</p>
            {converted && (
              <p className="text-sm text-muted-foreground mt-1">
                â‰ˆ {converted.formatted} dans votre devise
              </p>
            )}
            
            {enableEscrow && transactionType !== 'transfer' && (
              <Alert className="mt-3">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Vos fonds sont protÃ©gÃ©s par notre systÃ¨me Escrow jusqu'Ã  la confirmation de la livraison
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Erreur â€” only show ChapChapPay error when a ChapChapPay method is selected */}
          {paymentStatus === 'failed' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(selectedMethod.startsWith('CCP_') && error) ? error : 'Paiement Ã©chouÃ©. Veuillez rÃ©essayer.'}
              </AlertDescription>
            </Alert>
          )}

          {/* MÃ©thodes de paiement */}
          <RadioGroup
            value={selectedMethod}
            onValueChange={handleMethodChange}
            className="space-y-2"
            disabled={processing}
          >
            {paymentMethods.map((method) => (
              <div key={method.id}>
                <Label
                  htmlFor={method.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedMethod === method.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/50 ring-offset-0"
                      : "border-border hover:border-primary/50 hover:bg-muted/30",
                    processing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RadioGroupItem 
                    value={method.id} 
                    id={method.id}
                    disabled={processing}
                    className="border-2 flex-shrink-0 focus-visible:ring-1 focus-visible:ring-offset-0"
                  />
                  
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0", method.iconBg)}>
                    {method.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block text-sm">{method.name}</span>
                    <span className="text-xs text-muted-foreground block">{method.description}</span>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Champ tÃ©lÃ©phone pour Mobile Money */}
          {requiresPhone && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border animate-in slide-in-from-top-2">
              <Label htmlFor="phone-number" className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4" />
                NumÃ©ro {selectedOption?.name}
              </Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder={selectedOption?.phonePlaceholder || '6XX XX XX XX'}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={processing}
              />
              <p className="text-xs text-muted-foreground">
                Une demande de confirmation sera envoyÃ©e sur ce numÃ©ro
              </p>
            </div>
          )}

          {/* Formulaire tÃ©lÃ©phone et ville pour COD */}
          {selectedMethod === 'CASH_ON_DELIVERY' && (
            <div className="space-y-3 p-4 bg-primary-blue-50 border border-primary-orange-200 rounded-lg animate-in slide-in-from-top-2">
              <h4 className="font-semibold text-primary-blue-800 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                Informations de contact
              </h4>

              <div className="space-y-2">
                <Label htmlFor="cod-phone" className="text-sm">
                  NumÃ©ro Ã  contacter <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cod-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="Ex: 620 00 00 00"
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                  className="bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cod-city" className="text-sm">
                  Ville <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cod-city"
                  placeholder="Ex: Conakry, Kindia, Dakar..."
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                  className="bg-white"
                  required
                />
              </div>

              <Alert className="bg-primary-blue-50 border-primary-orange-200 mt-2">
                <Truck className="h-4 w-4 text-primary-blue-600" />
                <AlertDescription className="text-primary-blue-700">
                  <strong>Paiement Ã  la livraison confirmÃ©</strong><br/>
                  Vous serez contactÃ© par tÃ©lÃ©phone pour confirmer votre adresse exacte avant la livraison. 
                  PrÃ©parez {formattedAmount} en espÃ¨ces.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Info statut */}
          {paymentStatus === 'polling' && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                En attente de confirmation du paiement...
              </AlertDescription>
            </Alert>
          )}

          {/* Stripe inline â€” formulaire carte affichÃ© directement */}
          {showStripeInline && selectedMethod === 'CARD' ? (
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Saisissez vos informations de carte</span>
              </div>
              <StripeCheckoutButton
                amount={amount}
                currency={displayCurrency}
                description={description || 'Paiement 224Solutions'}
                orderId={orderId}
                sellerId={sellerId || recipientId}
                edgeFunction={
                  transactionType === 'taxi' ? 'taxi-payment' :
                  transactionType === 'delivery' ? 'delivery-payment' :
                  transactionType === 'service' ? 'service-payment' :
                  sellerId ? 'stripe-pos-payment' : undefined
                }
                onSuccess={handleStripeSuccess}
                onCancel={() => setShowStripeInline(false)}
                onError={handleStripeError}
              />
              <Button
                variant="outline"
                onClick={() => setShowStripeInline(false)}
                className="w-full"
              >
                Retour
              </Button>
            </div>
          ) : (
            /* Boutons standard */
            <div className="pt-4 flex gap-2">
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="flex-1"
                disabled={processing}
              >
                Annuler
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={isConfirmDisabled}
                className="flex-1"
              >
                {processing || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  'Payer maintenant'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default JomyPaymentSelector;
