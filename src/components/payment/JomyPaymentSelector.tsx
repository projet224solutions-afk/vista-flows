/**
 * 💳 SÉLECTEUR DE PAIEMENT - MULTI-PROVIDERS
 * Stripe pour les cartes bancaires, ChapChapPay pour Mobile Money (Orange, MTN, PayCard)
 * Méthodes: Carte Bancaire (Stripe), Orange Money, MTN MoMo, PayCard (ChapChapPay)
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
  currency?: string; // Devise du produit/vendeur (ex: XOF, EUR). Défaut: GNF
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
  
  // Conversion si devise produit ≠ devise utilisateur
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

  // État pour adresse de livraison (COD)
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

  // Méthodes de paiement disponibles
  const paymentMethods: PaymentMethodOption[] = [
    // Option Wallet en premier si recipientId est fourni
    ...(recipientId ? [{
      id: 'WALLET' as const,
      name: 'Wallet 224Solutions',
      description: `Solde: ${walletBalance !== null ? formatCurrency(walletBalance, walletCurrency) : '...'}`,
      icon: <Wallet className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-100',
      requiresPhone: false,
      provider: 'wallet' as const
    }] : []),
    {
      id: 'CARD' as const,
      name: 'Carte Bancaire',
      description: 'Paiement sécurisé par carte VISA / Mastercard via Stripe',
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      requiresPhone: false,
      provider: 'stripe' as const
    },
    // ChapChapPay - Orange Money (prioritaire)
    {
      id: 'CCP_ORANGE' as const,
      name: 'Orange Money',
      description: 'Paiement instantané via ChapChapPay',
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
    // ChapChapPay - PayCard
    {
      id: 'CCP_PAYCARD' as const,
      name: 'PayCard',
      description: 'Carte de paiement locale (ChapChapPay)',
      icon: <CreditCard className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-100',
      requiresPhone: false,
      provider: 'chapchappay' as const
    },
    // Paiement à la livraison - uniquement pour produits physiques
    ...(productType === 'physical' && transactionType === 'product' && onCashOnDelivery ? [{
      id: 'CASH_ON_DELIVERY' as const,
      name: 'Paiement à la livraison',
      description: 'Vous serez contacté pour confirmer l\'adresse de livraison',
      icon: <Truck className="h-5 w-5 text-emerald-600" />,
      iconBg: 'bg-emerald-100',
      requiresPhone: false,
      provider: undefined
    }] : [])
  ];

  const selectedOption = paymentMethods.find(m => m.id === selectedMethod);
  const requiresPhone = selectedOption?.requiresPhone || false;

  const handlePayment = async () => {
    console.log('🔵 [JomyPaymentSelector] handlePayment called');
    console.log('🔵 [JomyPaymentSelector] selectedMethod:', selectedMethod);
    
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer un paiement');
      return;
    }

    // Paiement à la livraison
    if (selectedMethod === 'CASH_ON_DELIVERY') {
      // Valider adresse complète
      if (!deliveryAddress.street.trim()) {
        toast.error('Adresse requise', {
          description: 'Veuillez entrer votre adresse complète'
        });
        return;
      }
      
      if (!deliveryAddress.city) {
        toast.error('Ville requise', {
          description: 'Veuillez sélectionner votre ville'
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
      console.log('🔵 [JomyPaymentSelector] Showing Stripe inline');
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
          throw new Error(data?.error || error?.message || 'Échec du transfert');
        }

        setPaymentStatus('success');
        toast.success('🎉 Transfert réussi !');
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
        toast.error('Numéro de téléphone invalide');
        return;
      }

      setProcessing(true);
      setPaymentStatus('processing');

      try {
        // Mapper vers les méthodes ChapChapPay
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
          throw new Error(result.error || 'Échec du paiement');
        }

        // Polling pour vérifier le statut ChapChapPay
        if (result.transactionId) {
          setPaymentStatus('polling');
          
          const finalStatus = await pollStatus(result.transactionId, (status) => {
            if (status.status === 'completed') {
              setPaymentStatus('success');
              toast.success('🎉 Paiement réussi via ChapChapPay !');
              onPaymentSuccess(result.transactionId!, 'SUCCESS');
            } else if (status.status === 'failed' || status.status === 'cancelled') {
              setPaymentStatus('failed');
              toast.error('Paiement échoué');
              onPaymentFailed?.(status.error || 'Paiement refusé');
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
              onPaymentFailed?.(finalStatus.error || 'Paiement échoué');
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

    // Ce bloc n'est plus utilisé - ChapChapPay gère tous les paiements Mobile Money
    toast.error('Méthode de paiement non supportée');
    setProcessing(false);
  };

  const handlePayPalSuccess = (captureData: { paypalOrderId: string; captureId: string; amount: number; currency: string }) => {
    console.log('✅ [JomyPaymentSelector] PayPal payment success:', captureData);
    setShowPaypalInline(false);
    setPaymentStatus('success');
    onPaymentSuccess(captureData.captureId || captureData.paypalOrderId, 'SUCCESS');
  };

  const handlePayPalError = (errorMsg: string) => {
    console.error('❌ [JomyPaymentSelector] PayPal payment error:', errorMsg);
    setShowPaypalInline(false);
    setPaymentStatus('failed');
    onPaymentFailed?.(errorMsg);
  };

  const isConfirmDisabled = 
    processing || 
    isLoading || 
    (requiresPhone && (!phoneNumber || phoneNumber.length < 9));

  // Affichage succès
  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-700 mb-2">Paiement réussi !</h3>
          <p className="text-muted-foreground mb-4">
            Votre paiement de {formattedAmount} a été effectué avec succès.
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
            Paiement sécurisé
          </CardTitle>
          <div className="text-center mt-2">
            <p className="text-3xl font-bold text-primary">
              {formattedAmount}
            </p>
            <p className="text-sm text-muted-foreground">Montant à payer</p>
            {converted && (
              <p className="text-sm text-muted-foreground mt-1">
                ≈ {converted.formatted} dans votre devise
              </p>
            )}
            
            {enableEscrow && transactionType !== 'transfer' && (
              <Alert className="mt-3">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Vos fonds sont protégés par notre système Escrow jusqu'à la confirmation de la livraison
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Erreur */}
          {(error || paymentStatus === 'failed') && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'Paiement échoué'}</AlertDescription>
            </Alert>
          )}

          {/* Méthodes de paiement */}
          <RadioGroup
            value={selectedMethod}
            onValueChange={(value) => setSelectedMethod(value as PaymentMethodId)}
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

          {/* Champ téléphone pour Mobile Money */}
          {requiresPhone && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border animate-in slide-in-from-top-2">
              <Label htmlFor="phone-number" className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4" />
                Numéro {selectedOption?.name}
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
                Une demande de confirmation sera envoyée sur ce numéro
              </p>
            </div>
          )}

          {/* Formulaire téléphone et ville pour COD */}
          {selectedMethod === 'CASH_ON_DELIVERY' && (
            <div className="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg animate-in slide-in-from-top-2">
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                Informations de contact
              </h4>

              <div className="space-y-2">
                <Label htmlFor="cod-phone" className="text-sm">
                  Numéro à contacter <span className="text-red-500">*</span>
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

              <Alert className="bg-emerald-50 border-emerald-200 mt-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  <strong>Paiement à la livraison confirmé</strong><br/>
                  Vous serez contacté par téléphone pour confirmer votre adresse exacte avant la livraison. 
                  Préparez {formattedAmount} en espèces.
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

          {/* PayPal inline — formulaire carte affiché directement */}
          {showPaypalInline && selectedMethod === 'PAYPAL' ? (
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Saisissez vos informations de carte</span>
              </div>
              <PayPalCheckoutButton
                amount={amount}
                currency={displayCurrency === 'GNF' ? 'USD' : displayCurrency}
                description={description || 'Paiement 224Solutions'}
                orderId={orderId}
                onSuccess={handlePayPalSuccess}
                onCancel={() => setShowPaypalInline(false)}
                onError={handlePayPalError}
                cardOnly
              />
              <Button
                variant="outline"
                onClick={() => setShowPaypalInline(false)}
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
