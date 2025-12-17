/**
 * CINETPAY ORANGE MONEY PAYMENT BUTTON
 * Integration with CinetPay service for mobile money payments
 * 224Solutions - Payment System
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, Loader2 } from 'lucide-react';
import { CinetPayService } from '@/services/payment/CinetPayService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CinetPayOrangeMoneyButtonProps {
  amount: number;
  currency?: string;
  description: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CinetPayOrangeMoneyButton({
  amount,
  currency = 'GNF',
  description,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: CinetPayOrangeMoneyButtonProps) {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer un paiement');
      return;
    }

    // Validation du numéro de téléphone
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    // Validation de l'email (optionnel mais recommandé)
    if (email && !email.includes('@')) {
      toast.error('Veuillez entrer un email valide');
      return;
    }

    setProcessing(true);

    try {
      console.log('🚀 Initiation paiement CinetPay:', {
        amount,
        currency,
        phone: phoneNumber,
        email: email || user.email
      });

      const result = await CinetPayService.initiatePayment({
        amount,
        currency,
        transactionId: `224SOL_${Date.now()}_${user.id.substring(0, 8)}`,
        description,
        customerName: user.user_metadata?.full_name || user.email || 'Client 224Solutions',
        customerEmail: email || user.email || '',
        customerPhone: phoneNumber,
        returnUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`,
        notifyUrl: `${window.location.origin}/api/cinetpay/notify`,
        metadata: {
          userId: user.id,
          timestamp: new Date().toISOString()
        }
      });

      if (result.success && result.paymentUrl) {
        console.log('✅ URL de paiement CinetPay reçue:', result.paymentUrl);
        toast.success('Redirection vers CinetPay...');
        
        // Rediriger vers la page de paiement CinetPay
        window.location.href = result.paymentUrl;
        
        if (onSuccess) {
          onSuccess(result.transactionId || '');
        }
      } else {
        console.error('❌ Erreur initiation paiement:', result.error);
        toast.error(result.error || 'Erreur lors de l\'initiation du paiement');
        
        if (onError) {
          onError(result.error || 'Unknown error');
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur paiement CinetPay:', error);
      toast.error(error.message || 'Erreur lors du traitement du paiement');
      
      if (onError) {
        onError(error.message || 'Unknown error');
      }
    } finally {
      setProcessing(false);
      setShowDialog(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={disabled || processing}
        className={`bg-orange-600 hover:bg-orange-700 text-white ${className}`}
      >
        <Smartphone className="mr-2 h-4 w-4" />
        Orange Money
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-orange-600" />
              Paiement Orange Money
            </DialogTitle>
            <DialogDescription>
              Entrez vos informations pour payer {amount.toLocaleString()} {currency} via CinetPay
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Montant affiché */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Montant à payer</p>
              <p className="text-2xl font-bold text-orange-600">
                {amount.toLocaleString()} {currency}
              </p>
            </div>

            {/* Numéro de téléphone Orange Money */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Numéro Orange Money <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="620123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={processing}
                className="border-orange-200 focus:border-orange-500"
              />
              <p className="text-xs text-gray-500">
                Format: 620XXXXXX ou 655XXXXXX
              </p>
            </div>

            {/* Email (optionnel) */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email (optionnel)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={processing}
              />
              <p className="text-xs text-gray-500">
                Pour recevoir la confirmation par email
              </p>
            </div>

            {/* Description du paiement */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Description:</p>
              <p className="text-sm font-medium">{description}</p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={processing}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing || !phoneNumber}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  Confirmer
                </>
              )}
            </Button>
          </div>

          {/* Note de sécurité */}
          <p className="text-xs text-center text-gray-500 mt-2">
            🔒 Paiement sécurisé via CinetPay
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
