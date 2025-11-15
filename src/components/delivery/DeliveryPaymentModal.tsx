/**
 * MODAL PAIEMENT LIVRAISONS
 * Support Escrow universel pour toutes les méthodes de paiement
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
import { Wallet, Banknote, Loader2, Shield, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";

export type DeliveryPaymentMethod = 'wallet' | 'cash';

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
      id: 'cash' as DeliveryPaymentMethod,
      name: 'Paiement à la livraison',
      description: 'Payez en espèces au livreur',
      icon: Banknote,
      color: 'text-green-600'
    }
  ];

  const handlePayment = async () => {
    setProcessing(true);

    try {
      console.log('[DeliveryPayment] Starting payment with escrow:', {
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
          setProcessing(false);
          return;
        }
      }

      // Créer l'escrow pour sécuriser le paiement
      const escrowResult = await UniversalEscrowService.createEscrow({
        buyer_id: customerId,
        seller_id: deliveryManId,
        order_id: deliveryId,
        amount,
        currency: 'GNF',
        transaction_type: 'delivery',
        payment_provider: paymentMethod === 'wallet' ? 'wallet' : 'cash',
        metadata: {
          delivery_id: deliveryId,
          description: 'Paiement livraison'
        },
        escrow_options: {
          auto_release_days: 1, // Libération auto après 1 jour
          commission_percent: 2.5,
          require_signature: true // Signature requise pour livraison
        }
      });

      if (!escrowResult.success) {
        throw new Error(escrowResult.error || 'Échec de la création de l\'escrow');
      }

      console.log('[DeliveryPayment] ✅ Escrow created:', escrowResult.escrow_id);

      // Messages selon la méthode
      if (paymentMethod === 'wallet') {
        toast.success('Paiement sécurisé effectué !', {
          description: `${amount.toLocaleString()} GNF bloqués en escrow - Seront transférés au livreur à la livraison`
        });
      } else {
        toast.success('Livraison confirmée !', {
          description: 'Vous paierez en espèces au livreur'
        });
      }

      onPaymentSuccess();
      onClose();

    } catch (error) {
      console.error('[DeliveryPayment] Error:', error);
      toast.error('Erreur de paiement', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer'
      });
    } finally {
      setProcessing(false);
    }
  };

  const insufficientBalance = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < amount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Paiement Sécurisé Livraison
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <div>
                Montant: <span className="font-bold text-lg">{amount.toLocaleString()} GNF</span>
              </div>
              {paymentMethod === 'wallet' && (
                <>
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-800 dark:text-green-200">
                      Vos fonds sont protégés jusqu'à confirmation de la livraison
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Solde disponible:</span>
                    <span className="font-semibold">{walletBalance?.toLocaleString() || 0} GNF</span>
                  </div>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

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
            disabled={processing || insufficientBalance}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sécurisation...
              </>
            ) : (
              paymentMethod === 'wallet' ? 'Payer en sécurité' : 'Confirmer la livraison'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
