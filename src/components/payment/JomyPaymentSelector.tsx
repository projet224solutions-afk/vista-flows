/**
 * 💳 SÉLECTEUR DE PAIEMENT - MULTI-PROVIDERS
 * Stripe pour les cartes bancaires, ChapChapPay pour Mobile Money (Orange, MTN, PayCard)
 * Méthodes: Carte Bancaire (Stripe), Orange Money, MTN MoMo, PayCard (ChapChapPay)
 */

import { useState, useEffect } from 'react';
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
  Truck
} from 'lucide-react';
import { useChapChapPay } from '@/hooks/useChapChapPay';
import { CCPPaymentMethod } from '@/services/payment/ChapChapPayService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { StripeCardPaymentModal } from '@/components/pos/StripeCardPaymentModal';

interface JomyPaymentSelectorProps {
  amount: number;
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
  sellerId?: string; // ID vendeur pour Stripe
}

type PaymentMethodId = 'STRIPE_CARD' | 'WALLET' | 'CASH_ON_DELIVERY' | 'CCP_ORANGE' | 'CCP_MTN' | 'CCP_PAYCARD';

interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  requiresPhone: boolean;
  phonePrefix?: string;
  phonePlaceholder?: string;
  provider?: 'chapchappay' | 'stripe' | 'wallet';
}

export function JomyPaymentSelector({
  amount,
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
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>(recipientId ? 'WALLET' : 'STRIPE_CARD');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'polling' | 'success' | 'failed'>('idle');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);

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
          .select('balance')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setWalletBalance(data.balance);
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
      description: `Solde: ${walletBalance !== null ? walletBalance.toLocaleString() : '...'} GNF`,
      icon: <Wallet className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-100',
      requiresPhone: false,
      provider: 'wallet' as const
    }] : []),
    {
      id: 'STRIPE_CARD' as const,
      name: 'Carte Bancaire',
      description: 'Paiement sécurisé VISA / Mastercard via Stripe',
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

    // Paiement par carte Stripe
    if (selectedMethod === 'STRIPE_CARD') {
      console.log('🔵 [JomyPaymentSelector] Opening Stripe modal');
      setShowStripeModal(true);
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
            action: 'transfer',
            amount,
            recipient_public_id: recipientId,
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
            if (status.status === 'success' || status.status === 'completed') {
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
            if (finalStatus.status === 'success' || finalStatus.status === 'completed') {
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

  const handleStripeSuccess = (paymentIntentId: string) => {
    console.log('✅ [JomyPaymentSelector] Stripe payment success:', paymentIntentId);
    setShowStripeModal(false);
    setPaymentStatus('success');
    onPaymentSuccess(paymentIntentId, 'SUCCESS');
  };

  const handleStripeError = (errorMsg: string) => {
    console.error('❌ [JomyPaymentSelector] Stripe payment error:', errorMsg);
    setShowStripeModal(false);
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
            Votre paiement de {amount.toLocaleString()} GNF a été effectué avec succès.
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
              {amount.toLocaleString()} GNF
            </p>
            <p className="text-sm text-muted-foreground">Montant à payer</p>
            
            {enableEscrow && transactionType !== 'transfer' && (
              <Alert className="mt-3">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Vos fonds sont protégés jusqu'à confirmation de la transaction
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
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/30",
                    processing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <RadioGroupItem 
                    value={method.id} 
                    id={method.id}
                    disabled={processing}
                    className="border-2 flex-shrink-0"
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

          {/* Formulaire adresse de livraison pour COD */}
          {selectedMethod === 'CASH_ON_DELIVERY' && (
            <div className="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg animate-in slide-in-from-top-2">
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Adresse de livraison
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="street" className="text-sm">
                  Rue et numéro <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="street"
                  placeholder="Ex: Avenue de la République, Immeuble 234"
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                  className="bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood" className="text-sm">Quartier</Label>
                <Input
                  id="neighborhood"
                  placeholder="Ex: Kaloum, Matam, Dixinn..."
                  value={deliveryAddress.neighborhood}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, neighborhood: e.target.value})}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm">
                  Ville <span className="text-red-500">*</span>
                </Label>
                <select
                  id="city"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  required
                >
                  <option value="Conakry">Conakry</option>
                  <option value="Kindia">Kindia</option>
                  <option value="Labé">Labé</option>
                  <option value="Kankan">Kankan</option>
                  <option value="N'Zérékoré">N'Zérékoré</option>
                  <option value="Mamou">Mamou</option>
                  <option value="Boké">Boké</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="landmark" className="text-sm">Point de repère</Label>
                <Input
                  id="landmark"
                  placeholder="Ex: En face de la banque BICIGUI"
                  value={deliveryAddress.landmark}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, landmark: e.target.value})}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions" className="text-sm">Instructions spéciales</Label>
                <Input
                  id="instructions"
                  placeholder="Ex: Appeler 10 minutes avant"
                  value={deliveryAddress.instructions}
                  onChange={(e) => setDeliveryAddress({...deliveryAddress, instructions: e.target.value})}
                  className="bg-white"
                />
              </div>
            </div>
          )}

          {/* Info pour paiement à la livraison */}
          {selectedMethod === 'CASH_ON_DELIVERY' && (
            <Alert className="bg-emerald-50 border-emerald-200">
              <Truck className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-700">
                <strong>Paiement à la livraison confirmé</strong><br/>
                Vous serez contacté par téléphone pour confirmer votre adresse exacte avant la livraison. 
                Préparez {amount.toLocaleString()} GNF en espèces.
              </AlertDescription>
            </Alert>
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

          {/* Boutons */}
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
        </CardContent>
      </Card>

      {/* Modal Stripe pour paiement par carte */}
      <StripeCardPaymentModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        amount={amount}
        currency="GNF"
        orderId={orderId || `order-${Date.now()}`}
        sellerId={sellerId || recipientId || ''}
        description={description}
        onSuccess={handleStripeSuccess}
        onError={handleStripeError}
      />
    </>
  );
}

export default JomyPaymentSelector;
