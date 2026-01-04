/**
 * WITHDRAWAL FORM COMPONENT
 * Formulaire de demande de retrait
 * 224SOLUTIONS
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/integrations/supabase/client';
import { formatAmount, canRequestWithdrawal, isValidAmount } from '@/types/stripePayment';
import { toast } from 'sonner';
import { 
  ArrowDownLeft, 
  AlertTriangle, 
  Loader2,
  Info,
  CreditCard,
  Smartphone
} from 'lucide-react';
import type { Wallet } from '@/types/stripePayment';

interface WithdrawalFormProps {
  userId: string;
  onSuccess?: (withdrawalId: string) => void;
  onCancel?: () => void;
}

type WithdrawalMethod = 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'STRIPE_PAYOUT';

export function WithdrawalForm({ userId, onSuccess, onCancel }: WithdrawalFormProps) {
  const { wallet, fetchWallet, canWithdraw, getAvailableBalance } = useWallet({ 
    userId, 
    autoFetch: true 
  });

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('BANK_TRANSFER');
  const [bankDetails, setBankDetails] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    swift_code: '',
  });
  const [mobileDetails, setMobileDetails] = useState({
    phone_number: '',
    provider: 'MTN',
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBalance = getAvailableBalance();
  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet) {
      setError('Portefeuille non chargé');
      return;
    }

    // Validations
    if (!isValidAmount(numAmount)) {
      setError('Montant invalide');
      return;
    }

    if (!canWithdraw(numAmount)) {
      setError(`Solde insuffisant. Disponible: ${formatAmount(availableBalance, wallet.currency)}`);
      return;
    }

    if (!canRequestWithdrawal(wallet, numAmount)) {
      setError('Impossible de demander un retrait pour le moment');
      return;
    }

    // Validation des détails selon la méthode
    if (method === 'BANK_TRANSFER') {
      if (!bankDetails.account_name || !bankDetails.account_number || !bankDetails.bank_name) {
        setError('Veuillez remplir tous les champs bancaires requis');
        return;
      }
    } else if (method === 'MOBILE_MONEY') {
      if (!mobileDetails.phone_number || !mobileDetails.provider) {
        setError('Veuillez remplir les informations Mobile Money');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Requesting withdrawal:', {
        wallet_id: wallet.id,
        amount: numAmount,
        method,
      });

      const withdrawalData = {
        wallet_id: wallet.id,
        amount: numAmount,
        currency: wallet.currency,
        method,
        bank_details: method === 'BANK_TRANSFER' ? bankDetails : null,
        mobile_money_details: method === 'MOBILE_MONEY' ? mobileDetails : null,
        notes: notes || null,
        status: 'PENDING',
      };

      const { data, error: insertError } = await supabase
        .from('withdrawals')
        .insert(withdrawalData)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('✅ Withdrawal request created:', data.id);
      toast.success('Demande de retrait envoyée avec succès');
      
      // Rafraîchir le wallet
      await fetchWallet(userId);
      
      onSuccess?.(data.id);

      // Reset form
      setAmount('');
      setBankDetails({ account_name: '', account_number: '', bank_name: '', swift_code: '' });
      setMobileDetails({ phone_number: '', provider: 'MTN' });
      setNotes('');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la demande de retrait';
      console.error('❌ Withdrawal request error:', err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const minWithdrawal = 10000; // GNF
  const canProceed = numAmount >= minWithdrawal && canWithdraw(numAmount);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ArrowDownLeft className="w-5 h-5" />
          <span>Demande de Retrait</span>
        </CardTitle>
        <CardDescription>
          Retirez vos fonds vers votre compte bancaire ou Mobile Money
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Solde disponible */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Solde disponible:</strong> {formatAmount(availableBalance, wallet.currency)}
            </AlertDescription>
          </Alert>

          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Montant à retirer <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="Entrez le montant"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={minWithdrawal}
                max={availableBalance}
                step="1000"
                required
                disabled={loading}
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {wallet.currency.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Montant minimum: {formatAmount(minWithdrawal, wallet.currency)}
            </p>
          </div>

          {/* Méthode de retrait */}
          <div className="space-y-2">
            <Label htmlFor="method">
              Méthode de retrait <span className="text-destructive">*</span>
            </Label>
            <Select
              value={method}
              onValueChange={(value) => setMethod(value as WithdrawalMethod)}
              disabled={loading}
            >
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Virement Bancaire</span>
                  </div>
                </SelectItem>
                <SelectItem value="MOBILE_MONEY">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile Money</span>
                  </div>
                </SelectItem>
                <SelectItem value="STRIPE_PAYOUT">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Stripe Payout (Carte/Compte)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Détails bancaires */}
          {method === 'BANK_TRANSFER' && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm">Informations Bancaires</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_name">
                    Nom du titulaire <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="account_name"
                    value={bankDetails.account_name}
                    onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                    placeholder="Ex: DIALLO Mohamed"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_number">
                    Numéro de compte <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="account_number"
                    value={bankDetails.account_number}
                    onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                    placeholder="Ex: GN123456789"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_name">
                    Nom de la banque <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bank_name"
                    value={bankDetails.bank_name}
                    onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                    placeholder="Ex: Ecobank Guinée"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swift_code">Code SWIFT (optionnel)</Label>
                  <Input
                    id="swift_code"
                    value={bankDetails.swift_code}
                    onChange={(e) => setBankDetails({ ...bankDetails, swift_code: e.target.value })}
                    placeholder="Ex: ECOCGNGX"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Détails Mobile Money */}
          {method === 'MOBILE_MONEY' && (
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm">Informations Mobile Money</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">
                    Opérateur <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={mobileDetails.provider}
                    onValueChange={(value) => setMobileDetails({ ...mobileDetails, provider: value })}
                    disabled={loading}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                      <SelectItem value="ORANGE">Orange Money</SelectItem>
                      <SelectItem value="MOOV">Moov Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">
                    Numéro de téléphone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    value={mobileDetails.phone_number}
                    onChange={(e) => setMobileDetails({ ...mobileDetails, phone_number: e.target.value })}
                    placeholder="Ex: +224 621 234 567"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des informations supplémentaires si nécessaire..."
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="flex-1"
              >
                Annuler
              </Button>
            )}
            <Button
              type="submit"
              disabled={!canProceed || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Demander le retrait
                </>
              )}
            </Button>
          </div>

          {/* Avertissement */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Les demandes de retrait sont traitées sous 24-48h ouvrables. 
              Des frais de transaction peuvent s'appliquer selon la méthode choisie.
            </AlertDescription>
          </Alert>
        </form>
      </CardContent>
    </Card>
  );
}
