/**
 * 💳 PAWAPAY PAYMENT DIALOG
 * Composant unifié pour tous les paiements Mobile Money via PawaPay
 * SEUL moyen de paiement sur 224SOLUTIONS
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Shield, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { usePawapayPayment } from '@/hooks/usePawapayPayment';
import { cn } from '@/lib/utils';

export type PawaPayProvider = 'orange_money' | 'mtn_money';

interface PawaPayPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, any>;
  onPaymentSuccess: (depositId: string) => void;
  onPaymentFailed?: (error: string) => void;
  enableEscrow?: boolean;
  recipientName?: string;
}

type PaymentStep = 'select' | 'processing' | 'waiting' | 'success' | 'failed';

export function PawaPayPaymentDialog({
  open,
  onOpenChange,
  amount,
  currency = 'GNF',
  description,
  metadata,
  onPaymentSuccess,
  onPaymentFailed,
  enableEscrow = false,
  recipientName,
}: PawaPayPaymentDialogProps) {
  const { initializePayment, waitForPaymentConfirmation, isLoading } = usePawapayPayment();
  
  const [provider, setProvider] = useState<PawaPayProvider>('orange_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<PaymentStep>('select');
  const [currentDepositId, setCurrentDepositId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('select');
      setPhoneNumber('');
      setCurrentDepositId(null);
      setErrorMessage(null);
      setStatusMessage('');
    }
  }, [open]);

  const validatePhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\s+/g, '').replace(/^(\+|00)?224/, '');
    return cleaned.length >= 9;
  };

  const handleSubmit = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage('Numéro de téléphone invalide');
      return;
    }

    setStep('processing');
    setErrorMessage(null);

    const result = await initializePayment({
      amount,
      currency,
      phoneNumber,
      correspondent: provider,
      description,
      metadata,
    });

    if (!result.success) {
      setStep('failed');
      setErrorMessage(result.error || 'Erreur lors de l\'initialisation du paiement');
      onPaymentFailed?.(result.error || 'Erreur inconnue');
      return;
    }

    setCurrentDepositId(result.depositId!);
    setStep('waiting');
    setStatusMessage('Veuillez confirmer le paiement sur votre téléphone...');

    // Start polling for payment confirmation
    const finalStatus = await waitForPaymentConfirmation(result.depositId!, {
      maxAttempts: 60,
      intervalMs: 5000,
      onStatusChange: (status) => {
        if (status.mappedStatus === 'pending') {
          setStatusMessage('En attente de confirmation...');
        }
      },
    });

    if (finalStatus?.mappedStatus === 'completed') {
      setStep('success');
      setTimeout(() => {
        onPaymentSuccess(result.depositId!);
        onOpenChange(false);
      }, 2000);
    } else {
      setStep('failed');
      setErrorMessage(
        finalStatus?.mappedStatus === 'cancelled' 
          ? 'Paiement annulé' 
          : 'Le paiement n\'a pas pu être complété'
      );
      onPaymentFailed?.(errorMessage || 'Paiement échoué');
    }
  };

  const handleRetry = () => {
    setStep('select');
    setErrorMessage(null);
  };

  const providers = [
    {
      id: 'orange_money' as const,
      name: 'Orange Money',
      color: '#FF6B00',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      placeholder: '620 XX XX XX',
    },
    {
      id: 'mtn_money' as const,
      name: 'MTN Mobile Money',
      color: '#FFCC00',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      placeholder: '660 XX XX XX',
    },
  ];

  const selectedProvider = providers.find(p => p.id === provider)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
            Paiement Mobile Money
          </DialogTitle>
          <DialogDescription className="text-center">
            Paiement sécurisé via PawaPay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Display */}
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {amount.toLocaleString('fr-GN')} {currency}
            </p>
            {recipientName && (
              <p className="text-sm text-muted-foreground mt-1">
                Paiement à: {recipientName}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>

          {/* Escrow Badge */}
          {enableEscrow && (
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 text-sm">
                Vos fonds sont protégés par notre système Escrow jusqu'à confirmation
              </AlertDescription>
            </Alert>
          )}

          {/* Step: Select Provider */}
          {step === 'select' && (
            <>
              <RadioGroup
                value={provider}
                onValueChange={(value) => setProvider(value as PawaPayProvider)}
                className="space-y-3"
              >
                {providers.map((p) => (
                  <div key={p.id}>
                    <Label
                      htmlFor={p.id}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        provider === p.id
                          ? `${p.borderColor} ${p.bgColor} ring-2 ring-offset-2`
                          : "border-border hover:border-primary/50"
                      )}
                      style={{ 
                        borderColor: provider === p.id ? p.color : undefined,
                      }}
                    >
                      <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                      <div 
                        className="flex items-center justify-center w-12 h-12 rounded-full"
                        style={{ backgroundColor: `${p.color}20` }}
                      >
                        <Smartphone className="h-6 w-6" style={{ color: p.color }} />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold block">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Paiement instantané
                        </span>
                      </div>
                      {provider === p.id && (
                        <CheckCircle2 className="h-5 w-5" style={{ color: p.color }} />
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" style={{ color: selectedProvider.color }} />
                  Numéro {selectedProvider.name}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={selectedProvider.placeholder}
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setErrorMessage(null);
                  }}
                  className={cn(
                    "text-lg",
                    errorMessage && "border-destructive"
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Entrez votre numéro sans le préfixe +224
                </p>
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!phoneNumber || isLoading}
                  className="flex-1"
                  style={{ 
                    background: `linear-gradient(135deg, ${selectedProvider.color}, ${selectedProvider.color}CC)`,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    'Payer maintenant'
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
              <p className="font-medium">Initialisation du paiement...</p>
              <p className="text-sm text-muted-foreground">
                Veuillez patienter
              </p>
            </div>
          )}

          {/* Step: Waiting for confirmation */}
          {step === 'waiting' && (
            <div className="text-center py-8 space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <Clock className="h-20 w-20 text-primary animate-pulse" />
              </div>
              <p className="font-medium text-lg">En attente de confirmation</p>
              <p className="text-sm text-muted-foreground">{statusMessage}</p>
              <Alert className="mt-4">
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  Vérifiez votre téléphone et confirmez le paiement avec votre code secret
                </AlertDescription>
              </Alert>
              <Badge variant="outline" className="mt-2">
                ID: {currentDepositId?.substring(0, 8)}...
              </Badge>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
              <p className="font-bold text-xl text-green-600">Paiement réussi !</p>
              <p className="text-sm text-muted-foreground">
                Votre paiement de {amount.toLocaleString('fr-GN')} {currency} a été confirmé
              </p>
            </div>
          )}

          {/* Step: Failed */}
          {step === 'failed' && (
            <div className="text-center py-8 space-y-4">
              <XCircle className="h-20 w-20 mx-auto text-destructive" />
              <p className="font-bold text-xl text-destructive">Paiement échoué</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fermer
                </Button>
                <Button onClick={handleRetry}>
                  Réessayer
                </Button>
              </div>
            </div>
          )}

          {/* Powered by PawaPay */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" />
              Paiement sécurisé par <span className="font-semibold">PawaPay</span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PawaPayPaymentDialog;
