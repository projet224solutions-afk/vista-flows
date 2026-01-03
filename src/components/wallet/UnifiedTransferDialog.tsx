/**
 * COMPOSANT UNIFIÉ DE TRANSFERT WALLET
 * Utilise les fonctions RPC standardisées avec codes ID
 * SUPPORTE LES TRANSFERTS MULTI-DEVISES
 */

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2, Wallet, AlertCircle, CheckCircle, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface UnifiedTransferDialogProps {
  senderCode: string; // Le code de l'expéditeur (USR0001, etc.)
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
  onSuccess?: () => void;
  /** Devise par défaut du wallet */
  currency?: string;
}

interface TransferPreview {
  success: boolean;
  sender: {
    id: string;
    name: string;
    email: string;
    phone: string;
    custom_id: string;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    phone: string;
    custom_id: string;
  };
  amount: number;
  fee_percent: number;
  fee_amount: number;
  total_debit: number;
  amount_received: number;
  current_balance: number;
  balance_after: number;
  error?: string;
}

export function UnifiedTransferDialog({
  senderCode,
  variant = "default",
  size = "default",
  className = "",
  showText = true,
  onSuccess,
  currency: propCurrency
}: UnifiedTransferDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipientCode, setRecipientCode] = useState('');
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [walletCurrency, setWalletCurrency] = useState(propCurrency || 'GNF');

  // Charger la devise du wallet de l'utilisateur
  useEffect(() => {
    if (propCurrency) {
      setWalletCurrency(propCurrency);
      return;
    }
    
    const loadWalletCurrency = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from('wallets')
          .select('currency')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data?.currency) {
          setWalletCurrency(data.currency);
        }
      } catch (error) {
        console.error('Erreur chargement devise wallet:', error);
      }
    };
    
    loadWalletCurrency();
  }, [user?.id, propCurrency]);

  const handlePreview = async () => {
    if (!amount || !recipientCode || !description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Prévisualisation transfert:', {
        sender: senderCode,
        recipient: recipientCode,
        amount: transferAmount
      });
      
      console.log('📞 Appel RPC preview_wallet_transfer_by_code...');

      const { data, error } = await supabase.rpc('preview_wallet_transfer_by_code', {
        p_sender_code: senderCode.toUpperCase(),
        p_receiver_code: recipientCode.toUpperCase(),
        p_amount: transferAmount,
        p_currency: walletCurrency
      });

      if (error) {
        console.error('❌ Erreur RPC:', error);
        throw error;
      }

      console.log('📋 Résultat prévisualisation:', data);

      const previewData = data as unknown as TransferPreview;

      if (!previewData.success) {
        toast.error(previewData.error || 'Erreur lors de la prévisualisation');
        return;
      }

      setPreview(previewData);
      setShowPreview(true);
      setOpen(false);
    } catch (error: any) {
      console.error('❌ Erreur prévisualisation:', error);
      toast.error(error.message || 'Erreur lors de la prévisualisation');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    
    setLoading(true);
    setShowPreview(false);
    
    try {
      console.log('💸 Exécution du transfert...');

      const { data, error } = await supabase.rpc('process_wallet_transfer_with_fees', {
        p_sender_code: senderCode.toUpperCase(),
        p_receiver_code: recipientCode.toUpperCase(),
        p_amount: preview.amount,
        p_currency: walletCurrency,
        p_description: description
      });

      if (error) {
        console.error('❌ Erreur RPC transfert:', error);
        throw error;
      }

      console.log('✅ Transfert réussi:', data);

      const result = data as { success: boolean; error?: string; transaction_id?: string; fee_amount?: number };

      if (!result.success) {
        toast.error(result.error || 'Erreur lors du transfert');
        return;
      }

      toast.success(
        `✅ Transfert réussi !\n💸 Frais : ${preview.fee_amount.toLocaleString()} ${walletCurrency}\n💰 Montant transféré : ${preview.amount.toLocaleString()} ${walletCurrency}`,
        { duration: 5000 }
      );
      
      // Reset
      setAmount('');
      setRecipientCode('');
      setDescription('');
      setPreview(null);

      // Callback
      if (onSuccess) {
        onSuccess();
      }

      // Événement de mise à jour
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      console.error('❌ Erreur transfert:', error);
      toast.error(error.message || 'Erreur lors du transfert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            <Send className="w-4 h-4" />
            {showText && <span className="ml-2">Transfert rapide</span>}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Transfert rapide
            </DialogTitle>
            <DialogDescription>
              Transférez des fonds rapidement à un autre utilisateur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Code expéditeur (affiché) */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Votre code :</span>
                <Badge variant="default" className="font-mono text-base">
                  {senderCode}
                </Badge>
              </div>
            </div>

            {/* Code destinataire */}
            <div className="space-y-2">
              <Label htmlFor="recipient">Code du destinataire *</Label>
              <Input
                id="recipient"
                placeholder="Ex: USR0001, VND0001, etc."
                value={recipientCode}
                onChange={(e) => setRecipientCode(e.target.value.toUpperCase())}
                disabled={loading}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Entrez le code d'identification du destinataire
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant ({walletCurrency}) *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ex: 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
                {walletCurrency !== 'GNF' && (
                  <Badge variant="secondary" className="shrink-0">
                    <Globe className="w-3 h-3 mr-1" />
                    {walletCurrency}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Motif du transfert *</Label>
              <Input
                id="description"
                placeholder="Ex: Paiement produit, Remboursement..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button
              onClick={handlePreview}
              disabled={loading || !amount || !recipientCode || !description}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Vérification...' : 'Voir les frais et confirmer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation avec prévisualisation */}
      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-primary" />
              Confirmer le transfert
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-4">
                {/* Informations du destinataire */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    👤 Informations du destinataire
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nom:</strong> {preview?.receiver.name}</p>
                    <p><strong>Email:</strong> {preview?.receiver.email}</p>
                    <p><strong>Téléphone:</strong> {preview?.receiver.phone}</p>
                    <p><strong>ID:</strong> <Badge variant="outline" className="font-mono">{preview?.receiver.custom_id}</Badge></p>
                  </div>
                </div>

                {/* Détails du transfert */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">💰 Montant à transférer</span>
                    <span className="text-lg font-bold">{preview?.amount?.toLocaleString()} {walletCurrency}</span>
                  </div>
                  <div className="flex justify-between items-center text-orange-600 dark:text-orange-400">
                    <span className="text-sm font-medium">💸 Frais de transfert ({preview?.fee_percent}%)</span>
                    <span className="text-lg font-bold">{preview?.fee_amount?.toLocaleString()} {walletCurrency}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-sm font-medium">📉 Total débité de votre compte</span>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">{preview?.total_debit?.toLocaleString()} {walletCurrency}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span className="text-sm font-medium">📈 Montant net reçu par le destinataire</span>
                    <span className="text-lg font-bold">{preview?.amount_received?.toLocaleString()} {walletCurrency}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm">
                    <strong>Solde actuel:</strong> {preview?.current_balance?.toLocaleString()} {walletCurrency}
                    <br />
                    <strong>Solde après transfert:</strong> {preview?.balance_after?.toLocaleString()} {walletCurrency}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">
                  Souhaitez-vous confirmer ce transfert ?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Non, annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Oui, confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
