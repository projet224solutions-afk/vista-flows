/**
 * MODAL PAIEMENT TAXI-MOTO
 * Support: Card (Stripe), Orange Money, Wallet 224Solutions, Cash
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Wallet, Banknote, Loader2 } from "lucide-react";
import { PaymentsService, type PaymentMethod } from "@/services/taxi/paymentsService";
import { toast } from "sonner";

interface TaxiMotoPaymentModalProps {
  open: boolean;
  onClose: () => void;
  rideId: string;
  amount: number;
  onPaymentSuccess: () => void;
}

export default function TaxiMotoPaymentModal({
  open,
  onClose,
  rideId,
  amount,
  onPaymentSuccess
}: TaxiMotoPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'wallet' as PaymentMethod,
      name: 'Wallet 224Solutions',
      description: 'Paiement instantané depuis votre wallet',
      icon: Wallet,
      color: 'text-primary'
    },
    {
      id: 'card' as PaymentMethod,
      name: 'Carte bancaire',
      description: 'Visa, Mastercard',
      icon: CreditCard,
      color: 'text-blue-600'
    },
    {
      id: 'orange_money' as PaymentMethod,
      name: 'Orange Money',
      description: 'Paiement mobile',
      icon: Smartphone,
      color: 'text-orange-600'
    },
    {
      id: 'cash' as PaymentMethod,
      name: 'Espèces',
      description: 'Paiement en liquide au conducteur',
      icon: Banknote,
      color: 'text-green-600'
    }
  ];

  const handlePayment = async () => {
    setProcessing(true);

    try {
      const result = await PaymentsService.initiatePayment({
        rideId,
        amount,
        paymentMethod
      });

      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      // Si paiement par carte, rediriger vers Stripe
      if (paymentMethod === 'card' && result.payment && typeof result.payment === 'object' && 'client_secret' in result.payment) {
        toast.info('Redirection vers le paiement sécurisé...');
        // TODO: Intégrer Stripe Elements ou rediriger vers hosted page
        return;
      }

      // Si Orange Money, afficher instructions
      if (paymentMethod === 'orange_money') {
        toast.success('Confirmez le paiement sur votre téléphone', {
          description: 'Vous allez recevoir une demande de paiement',
          duration: 10000
        });
      }

      // Si wallet ou cash
      if (paymentMethod === 'wallet') {
        toast.success('Paiement effectué !', {
          description: `${amount.toLocaleString()} GNF débités de votre wallet`
        });
      } else if (paymentMethod === 'cash') {
        toast.success('Paiement en espèces confirmé', {
          description: 'Préparez le montant exact'
        });
      }

      onPaymentSuccess();
      onClose();

    } catch (error) {
      console.error('[TaxiPayment] Error:', error);
      toast.error('Erreur de paiement', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement de la course</DialogTitle>
          <DialogDescription>
            Montant à payer: <span className="font-bold text-lg">{amount.toLocaleString()} GNF</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
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

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={processing}
          >
            Annuler
          </Button>
          <Button
            onClick={handlePayment}
            className="flex-1"
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              'Payer maintenant'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}