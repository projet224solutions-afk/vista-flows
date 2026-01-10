/**
 * STRIPE WALLET TOPUP - Recharge wallet par carte bancaire
 * Utilise Stripe pour permettre aux utilisateurs de recharger leur wallet
 */

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Loader2, ArrowDownCircle, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StripeCardPaymentModal } from "@/components/pos/StripeCardPaymentModal";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StripeWalletTopupProps {
  userId: string;
  walletId: string | number;
  onSuccess?: () => void;
}

export default function StripeWalletTopup({ userId, walletId, onSuccess }: StripeWalletTopupProps) {
  const [amount, setAmount] = useState("");
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const quickAmounts = [10000, 25000, 50000, 100000, 250000, 500000];

  const handleTopup = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 5000) {
      toast.error('Montant invalide', {
        description: 'Le montant minimum est de 5,000 GNF'
      });
      return;
    }
    setShowStripeModal(true);
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    setProcessing(true);
    
    try {
      const numAmount = parseFloat(amount);
      
      // Créer la transaction de dépôt
      const referenceNumber = `TOP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const { error: transactionError } = await (supabase
        .from('wallet_transactions')
        .insert({
          amount: numAmount,
          net_amount: numAmount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: 'Recharge wallet par carte bancaire (Stripe)',
          receiver_wallet_id: Number(walletId),
          metadata: { transaction_type: 'deposit', stripe_payment_intent_id: paymentIntentId, reference: referenceNumber }
        } as any));

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('id', Number(walletId))
        .single();

      if (walletError) throw walletError;

      const newBalance = (wallet?.balance || 0) + numAmount;
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', Number(walletId));

      if (updateError) throw updateError;

      toast.success('Recharge réussie !', {
        description: `${numAmount.toLocaleString()} GNF ajoutés à votre wallet`
      });

      setAmount("");
      setShowStripeModal(false);
      window.dispatchEvent(new Event('wallet-updated'));
      onSuccess?.();
      
    } catch (error) {
      console.error('[StripeTopup] Error:', error);
      toast.error('Erreur lors de la recharge', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer'
      });
    } finally {
      setProcessing(false);
    }
  };

  const numAmount = parseFloat(amount) || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Recharger par Carte Bancaire
          </CardTitle>
          <CardDescription>
            Rechargez votre wallet instantanément avec Visa ou Mastercard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Montants rapides */}
          <div className="space-y-2">
            <Label>Montants rapides</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant={numAmount === quickAmount ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="text-xs"
                >
                  {quickAmount.toLocaleString()} GNF
                </Button>
              ))}
            </div>
          </div>

          {/* Montant personnalisé */}
          <div className="space-y-2">
            <Label htmlFor="topup-amount">Montant personnalisé (GNF)</Label>
            <Input
              id="topup-amount"
              type="number"
              placeholder="Ex: 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="5000"
            />
            <p className="text-xs text-muted-foreground">Montant minimum: 5,000 GNF</p>
          </div>

          {/* Info sécurité */}
          <Alert className="bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-700">
              Paiement 100% sécurisé via Stripe. Vos données bancaires ne sont jamais stockées.
            </AlertDescription>
          </Alert>

          {/* Bouton de recharge */}
          <Button 
            onClick={handleTopup} 
            disabled={!amount || numAmount < 5000 || processing}
            className="w-full"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <ArrowDownCircle className="w-4 h-4 mr-2" />
                Recharger {numAmount > 0 ? `${numAmount.toLocaleString()} GNF` : ''}
              </>
            )}
          </Button>

          {/* Cartes acceptées */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-xs text-muted-foreground">Cartes acceptées:</span>
            <div className="flex gap-2">
              <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-[8px] font-bold">
                VISA
              </div>
              <div className="w-10 h-6 bg-gradient-to-r from-red-600 to-orange-500 rounded flex items-center justify-center">
                <div className="flex gap-0.5">
                  <div className="w-2 h-2 rounded-full bg-white opacity-80"></div>
                  <div className="w-2 h-2 rounded-full bg-white opacity-60"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Stripe */}
      <StripeCardPaymentModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        amount={numAmount}
        currency="GNF"
        orderId={`TOPUP-${Date.now()}`}
        sellerId={userId} // Le vendeur est l'utilisateur lui-même pour un dépôt
        description="Recharge wallet par carte bancaire"
        onSuccess={handleStripeSuccess}
        onError={(error) => {
          toast.error('Erreur paiement carte', { description: error });
          setShowStripeModal(false);
        }}
      />
    </>
  );
}
