/**
 * 💳 SÉLECTEUR DE PAIEMENT JOMY.AFRICA - MOYEN UNIQUE
 * Intégration exclusive Jomy.africa pour tous les paiements
 * Méthodes: Carte Bancaire, Orange Money, Mobile Money
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle
} from 'lucide-react';
import { useDjomyPayment, type DjomyPaymentMethod } from '@/hooks/useDjomyPayment';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface JomyPaymentSelectorProps {
  amount: number;
  orderId?: string;
  description?: string;
  transactionType?: 'product' | 'taxi' | 'delivery' | 'service' | 'transfer';
  onPaymentSuccess: (transactionId: string, status: string) => void;
  onPaymentPending?: (transactionId: string) => void;
  onPaymentFailed?: (error: string) => void;
  onCancel: () => void;
  enableEscrow?: boolean;
}

interface PaymentMethodOption {
  id: DjomyPaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  requiresPhone: boolean;
  phonePrefix?: string;
  phonePlaceholder?: string;
}

export function JomyPaymentSelector({
  amount,
  orderId,
  description,
  transactionType = 'product',
  onPaymentSuccess,
  onPaymentPending,
  onPaymentFailed,
  onCancel,
  enableEscrow = true
}: JomyPaymentSelectorProps) {
  const { user } = useAuth();
  const { initializePayment, pollPaymentStatus, isLoading, error } = useDjomyPayment();
  
  const [selectedMethod, setSelectedMethod] = useState<DjomyPaymentMethod>('OM');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'polling' | 'success' | 'failed'>('idle');

  // Méthodes de paiement Jomy.africa disponibles (Carte, Orange Money, Mobile Money uniquement)
  const paymentMethods: PaymentMethodOption[] = [
    {
      id: 'VISA',
      name: 'Carte Bancaire',
      description: 'Paiement par carte VISA / Mastercard',
      icon: <CreditCard className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      requiresPhone: false
    },
    {
      id: 'OM',
      name: 'Orange Money',
      description: 'Paiement instantané via Orange Money',
      icon: <Smartphone className="h-5 w-5 text-orange-500" />,
      iconBg: 'bg-orange-100',
      requiresPhone: true,
      phonePrefix: '620',
      phonePlaceholder: '620 XX XX XX'
    },
    {
      id: 'MOMO',
      name: 'Mobile Money',
      description: 'Paiement via MTN Mobile Money',
      icon: <Smartphone className="h-5 w-5 text-yellow-600" />,
      iconBg: 'bg-yellow-100',
      requiresPhone: true,
      phonePrefix: '660',
      phonePlaceholder: '660 XX XX XX'
    }
  ];

  const selectedOption = paymentMethods.find(m => m.id === selectedMethod);
  const requiresPhone = selectedOption?.requiresPhone || false;

  const handlePayment = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer un paiement');
      return;
    }

    if (requiresPhone && (!phoneNumber || phoneNumber.length < 9)) {
      toast.error('Numéro de téléphone invalide');
      return;
    }

    setProcessing(true);
    setPaymentStatus('processing');

    try {
      const result = await initializePayment({
        amount,
        payerPhone: requiresPhone ? phoneNumber : undefined,
        paymentMethod: selectedMethod,
        orderId: orderId || `${transactionType}-${Date.now()}`,
        description: description || `Paiement ${transactionType}`,
        successUrl: `${window.location.origin}/payment/success`,
        failureUrl: `${window.location.origin}/payment/failed`,
        callbackUrl: `${window.location.origin}/payment/callback`,
        useGateway: !requiresPhone // Utiliser le gateway pour les cartes
      });

      if (!result.success) {
        throw new Error(result.error || 'Échec du paiement');
      }

      // Pour les cartes, rediriger vers l'URL Jomy
      if (result.redirectUrl && !requiresPhone) {
        window.open(result.redirectUrl, '_blank');
        toast.info('Complétez le paiement dans la fenêtre ouverte');
      }

      // Polling pour vérifier le statut
      if (result.transactionId) {
        setPaymentStatus('polling');
        
        const finalStatus = await pollPaymentStatus(result.transactionId, {
          maxAttempts: 60, // 5 minutes max
          intervalMs: 5000,
          onStatusChange: (status) => {
            console.log('[Jomy] Payment status:', status);
            if (status.status === 'SUCCESS' || status.status === 'completed') {
              setPaymentStatus('success');
              toast.success('🎉 Paiement réussi !');
              onPaymentSuccess(result.transactionId!, 'SUCCESS');
            } else if (status.status === 'FAILED' || status.status === 'failed') {
              setPaymentStatus('failed');
              toast.error('Paiement échoué');
              onPaymentFailed?.(status.error || 'Paiement refusé');
            }
          }
        });

        if (finalStatus) {
          if (finalStatus.status === 'SUCCESS' || finalStatus.status === 'completed') {
            setPaymentStatus('success');
            onPaymentSuccess(result.transactionId, 'SUCCESS');
          } else if (finalStatus.status === 'PENDING' || finalStatus.status === 'pending') {
            onPaymentPending?.(result.transactionId);
            toast.info('Paiement en attente de confirmation');
          } else {
            setPaymentStatus('failed');
            onPaymentFailed?.(finalStatus.error || 'Paiement échoué');
          }
        }
      }

    } catch (err) {
      console.error('[Jomy] Payment error:', err);
      setPaymentStatus('failed');
      toast.error(err instanceof Error ? err.message : 'Erreur de paiement');
      onPaymentFailed?.(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setProcessing(false);
    }
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
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Paiement sécurisé Jomy.africa
        </CardTitle>
        <div className="text-center mt-2">
          <p className="text-3xl font-bold text-primary">
            {amount.toLocaleString()} GNF
          </p>
          <p className="text-sm text-muted-foreground">Montant à payer</p>
          
          {/* Badge Jomy.africa */}
          <div className="flex items-center justify-center gap-1 mt-2">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Powered by Jomy.africa</span>
          </div>
          
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
          onValueChange={(value) => setSelectedMethod(value as DjomyPaymentMethod)}
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

        {/* Champ téléphone */}
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
  );
}

export default JomyPaymentSelector;
