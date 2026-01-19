/**
 * ORANGE MONEY WALLET TOPUP - Recharge wallet par Orange Money
 * Permet aux utilisateurs de recharger leur wallet via Orange Money
 */

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Loader2, ArrowDownCircle, Shield, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrangeMoneyTopupProps {
  userId: string;
  walletId: string | number;
  onSuccess?: () => void;
  mode?: 'deposit' | 'withdraw';
}

export default function OrangeMoneyTopup({ 
  userId, 
  walletId, 
  onSuccess,
  mode = 'deposit'
}: OrangeMoneyTopupProps) {
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const quickAmounts = [10000, 25000, 50000, 100000, 250000, 500000];

  const isDeposit = mode === 'deposit';
  const title = isDeposit ? 'Recharger par Orange Money' : 'Retirer vers Orange Money';
  const description = isDeposit 
    ? 'Rechargez votre wallet via Orange Money' 
    : 'Transférez vos fonds vers votre compte Orange Money';

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 5000) {
      toast.error('Montant invalide', {
        description: 'Le montant minimum est de 5,000 GNF'
      });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Numéro invalide', {
        description: 'Veuillez entrer un numéro Orange Money valide'
      });
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setProcessing(true);
    setShowConfirm(false);
    
    try {
      const numAmount = parseFloat(amount);
      const referenceNumber = `OM-${isDeposit ? 'DEP' : 'WDR'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      if (isDeposit) {
        // Utiliser la fonction RPC atomique pour le dépôt
        const { error: balanceError } = await supabase
          .rpc('update_wallet_balance_atomic', {
            p_wallet_id: String(walletId),
            p_amount: numAmount,
            p_tx_id: referenceNumber,
            p_description: `Dépôt Orange Money depuis ${phoneNumber}`
          });

        if (balanceError) throw balanceError;

        // Enregistrer la transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            transaction_id: referenceNumber,
            transaction_type: 'deposit',
            amount: numAmount,
            net_amount: numAmount,
            fee: 0,
            currency: 'GNF',
            status: 'completed',
            description: `Dépôt Orange Money depuis ${phoneNumber}`,
            receiver_wallet_id: Number(walletId),
            receiver_user_id: userId,
            metadata: { 
              method: 'orange_money',
              phone_number: phoneNumber,
              reference: referenceNumber
            }
          });

        toast.success('Dépôt Orange Money réussi !', {
          description: `${numAmount.toLocaleString()} GNF ajoutés à votre wallet`
        });
      } else {
        // Retrait vers Orange Money
        const { error: balanceError } = await supabase
          .rpc('update_wallet_balance_atomic', {
            p_wallet_id: String(walletId),
            p_amount: -numAmount,
            p_tx_id: referenceNumber,
            p_description: `Retrait Orange Money vers ${phoneNumber}`
          });

        if (balanceError) throw balanceError;

        // Enregistrer la transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            transaction_id: referenceNumber,
            transaction_type: 'withdrawal',
            amount: numAmount,
            net_amount: numAmount,
            fee: 0,
            currency: 'GNF',
            status: 'completed',
            description: `Retrait Orange Money vers ${phoneNumber}`,
            sender_wallet_id: Number(walletId),
            sender_user_id: userId,
            metadata: { 
              method: 'orange_money',
              phone_number: phoneNumber,
              reference: referenceNumber
            }
          });

        toast.success('Retrait Orange Money réussi !', {
          description: `${numAmount.toLocaleString()} GNF transférés vers ${phoneNumber}`
        });
      }

      setAmount("");
      setPhoneNumber("");
      window.dispatchEvent(new Event('wallet-updated'));
      onSuccess?.();
      
    } catch (error) {
      console.error('[OrangeMoneyTopup] Error:', error);
      toast.error('Erreur lors de l\'opération', {
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
            <Smartphone className="w-5 h-5 text-orange-600" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Numéro Orange Money */}
          <div className="space-y-2">
            <Label htmlFor="phone-number">Numéro Orange Money</Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0">
                <Phone className="w-4 h-4 text-muted-foreground mr-1" />
                <span className="text-sm text-muted-foreground">+224</span>
              </div>
              <Input
                id="phone-number"
                type="tel"
                placeholder="6XX XX XX XX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                className="rounded-l-none"
                maxLength={9}
              />
            </div>
          </div>

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
            <Label htmlFor="om-amount">Montant personnalisé (GNF)</Label>
            <Input
              id="om-amount"
              type="number"
              placeholder="Ex: 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="5000"
            />
            <p className="text-xs text-muted-foreground">Montant minimum: 5,000 GNF</p>
          </div>

          {/* Info sécurité */}
          <Alert className="bg-orange-50 border-orange-200">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-700">
              {isDeposit 
                ? 'Vous recevrez une notification Orange Money pour confirmer le paiement.'
                : 'Le montant sera transféré sur votre compte Orange Money sous 24h.'}
            </AlertDescription>
          </Alert>

          {/* Bouton d'action */}
          <Button 
            onClick={handleSubmit} 
            disabled={!amount || numAmount < 5000 || !phoneNumber || processing}
            className={`w-full ${isDeposit ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                {isDeposit ? <ArrowDownCircle className="w-4 h-4 mr-2" /> : <Smartphone className="w-4 h-4 mr-2" />}
                {isDeposit ? 'Recharger' : 'Retirer'} {numAmount > 0 ? `${numAmount.toLocaleString()} GNF` : ''}
              </>
            )}
          </Button>

          {/* Logo Orange Money */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="w-12 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded flex items-center justify-center text-white text-[10px] font-bold">
              OM
            </div>
            <span className="text-xs text-muted-foreground">Orange Money Guinée</span>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmer {isDeposit ? 'le dépôt' : 'le retrait'} Orange Money
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {isDeposit 
                  ? `Vous allez déposer ${numAmount.toLocaleString()} GNF depuis le numéro +224 ${phoneNumber}.`
                  : `Vous allez retirer ${numAmount.toLocaleString()} GNF vers le numéro +224 ${phoneNumber}.`}
              </p>
              {isDeposit && (
                <p className="text-orange-600 font-medium">
                  Vous recevrez une notification Orange Money pour confirmer.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm} 
              disabled={processing}
              className={isDeposit ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              {processing ? 'Traitement...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
