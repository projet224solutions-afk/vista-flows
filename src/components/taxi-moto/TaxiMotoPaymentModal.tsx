/**
 * MODAL PAIEMENT TAXI-MOTO
 * Support: Card (Stripe), Orange Money, Wallet 224Solutions, Cash
 */

import { useState, useEffect } from 'react';
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
import { CreditCard, Smartphone, Wallet, Banknote, Loader2, Shield } from "lucide-react";
import { PaymentsService, type PaymentMethod } from "@/services/taxi/paymentsService";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";
import { supabase } from "@/integrations/supabase/client";

interface TaxiMotoPaymentModalProps {
  open: boolean;
  onClose: () => void;
  rideId: string;
  amount: number;
  customerId: string;
  driverId: string;
  onPaymentSuccess: () => void;
}

export default function TaxiMotoPaymentModal({
  open,
  onClose,
  rideId,
  amount,
  customerId,
  driverId,
  onPaymentSuccess
}: TaxiMotoPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

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
      console.error('[TaxiPayment] Error loading balance:', error);
      setWalletBalance(0);
    }
  };

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
      console.log('[TaxiPayment] Starting payment with escrow:', {
        rideId,
        customerId,
        driverId,
        amount,
        paymentMethod
      });

      // Vérifier le solde pour wallet
      if (paymentMethod === 'wallet') {
        if (walletBalance !== null && walletBalance < amount) {
          toast.error('Solde insuffisant', {
            description: 'Veuillez recharger votre wallet'
          });
          setProcessing(false);
          return;
        }
      }

      // Créer l'escrow pour sécuriser le paiement
      const escrowResult = await UniversalEscrowService.createEscrow({
        buyer_id: customerId,
        seller_id: driverId,
        order_id: rideId,
        amount,
        currency: 'GNF',
        transaction_type: 'taxi',
        payment_provider: paymentMethod === 'wallet' ? 'wallet' : 
                         paymentMethod === 'card' ? 'stripe' :
                         paymentMethod === 'cash' ? 'cash' : 'wallet',
        metadata: {
          ride_id: rideId,
          description: 'Paiement course taxi-moto'
        },
        escrow_options: {
          auto_release_days: 1, // Libération auto après 1 jour pour taxi
          commission_percent: 2.5
        }
      });

      if (!escrowResult.success) {
        throw new Error(escrowResult.error || 'Échec de la création de l\'escrow');
      }

      console.log('[TaxiPayment] ✅ Escrow created:', escrowResult.escrow_id);

      // Note: L'escrow_id est stocké dans escrow_transactions.order_id
      // Pas besoin de mettre à jour taxi_rides car la relation existe via order_id

      // Messages selon la méthode
      if (paymentMethod === 'wallet') {
        toast.success('Paiement sécurisé effectué !', {
          description: `${amount.toLocaleString()} GNF bloqués en escrow - Seront transférés au chauffeur à la fin de la course`
        });
      } else if (paymentMethod === 'cash') {
        toast.success('Course confirmée !', {
          description: 'Vous paierez en espèces au chauffeur'
        });
      } else if (paymentMethod === 'card') {
        toast.info('Redirection vers le paiement sécurisé...');
        // TODO: Intégrer Stripe
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
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Paiement Sécurisé (Escrow)
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <div>
                Montant: <span className="font-bold text-lg">{amount.toLocaleString()} GNF</span>
              </div>
              {paymentMethod === 'wallet' && walletBalance !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Solde disponible:</span>
                  <span className="font-semibold">{walletBalance.toLocaleString()} GNF</span>
                </div>
              )}
              {(paymentMethod === 'wallet' || paymentMethod === 'card') && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Vos fonds sont protégés par notre système Escrow jusqu'à la fin de la course
                  </AlertDescription>
                </Alert>
              )}
            </div>
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
            disabled={processing || (paymentMethod === 'wallet' && walletBalance !== null && walletBalance < amount)}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sécurisation...
              </>
            ) : (
              paymentMethod === 'wallet' || paymentMethod === 'card' ? 'Payer en sécurité' : 
              paymentMethod === 'cash' ? 'Confirmer la course' : 'Payer maintenant'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}