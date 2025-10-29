// @ts-nocheck
import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import WalletTransactionHistory from "@/components/WalletTransactionHistory";
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

export default function WalletDashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { wallet, transactions, loading, refetch, createTransaction } = useWallet(userId);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showTransferPreview, setShowTransferPreview] = useState(false);
  const [transferPreview, setTransferPreview] = useState<any>(null);

  const walletId = useMemo(() => wallet?.id, [wallet]);
  const balanceDisplay = useMemo(() => {
    if (!wallet) return "—";
    return `${wallet.balance.toLocaleString()} ${wallet.currency}`;
  }, [wallet]);

  const handleDeposit = useCallback(async () => {
    if (!userId || !wallet) return;
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (amount < 1000) {
      toast.error('Montant minimum 1000 GNF');
      return;
    }
    try {
      setBusy(true);

      // Créer une transaction de dépôt
      const referenceNumber = `DEP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'deposit',
          amount: amount,
          net_amount: amount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: 'Dépôt via interface vendeur',
          receiver_wallet_id: wallet.id
        });

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const newBalance = wallet.balance + amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setDepositAmount("");
      toast.success(`Dépôt de ${amount.toLocaleString()} GNF effectué avec succès`);
      await refetch(userId);
    } catch (e: any) {
      console.error('Erreur dépôt:', e);
      toast.error(e?.message || 'Erreur lors du dépôt');
    } finally {
      setBusy(false);
    }
  }, [depositAmount, userId, wallet, refetch]);

  const handleWithdraw = useCallback(async () => {
    if (!userId || !wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (amount < 5000) {
      toast.error('Montant minimum 5000 GNF');
      return;
    }
    if (amount > wallet.balance) {
      toast.error('Solde insuffisant');
      return;
    }
    try {
      setBusy(true);

      // Créer une transaction de retrait
      const referenceNumber = `WDR${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'withdraw',
          amount: -amount,
          net_amount: -amount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: 'Retrait via interface vendeur',
          sender_wallet_id: wallet.id
        });

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const newBalance = wallet.balance - amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setWithdrawAmount("");
      toast.success(`Retrait de ${amount.toLocaleString()} GNF effectué avec succès`);
      await refetch(userId);
    } catch (e: any) {
      console.error('Erreur retrait:', e);
      toast.error(e?.message || 'Erreur lors du retrait');
    } finally {
      setBusy(false);
    }
  }, [withdrawAmount, userId, wallet, refetch]);

  const handlePreviewTransfer = useCallback(async () => {
    if (!userId || !wallet) return;
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!receiverId) {
      toast.error('Destinataire requis (Code utilisateur)');
      return;
    }
    
    try {
      setBusy(true);

      // Convertir le custom_id en UUID si nécessaire
      let recipientUuid = receiverId;
      
      // Vérifier si c'est un custom_id (format: AAA0001 ex: USR0001, VND0001) ou un UUID
      if (!receiverId.includes('-')) {
        // C'est probablement un custom_id, on le convertit en UUID
        // Chercher d'abord dans user_ids
        let recipientData = await supabase
          .from('user_ids')
          .select('user_id')
          .eq('custom_id', receiverId.toUpperCase())
          .maybeSingle();

        // Si pas trouvé, chercher dans profiles en fallback
        if (!recipientData.data) {
          recipientData = await supabase
            .from('profiles')
            .select('id')
            .eq('custom_id', receiverId.toUpperCase())
            .maybeSingle();
          
          if (recipientData.data) {
            recipientUuid = recipientData.data.id;
          }
        } else {
          recipientUuid = recipientData.data.user_id;
        }

        if (!recipientUuid || recipientUuid === receiverId) {
          toast.error('Destinataire introuvable. Vérifiez le code.');
          setBusy(false);
          return;
        }
      }

      // Vérifier qu'on ne transfère pas à soi-même
      if (recipientUuid === userId) {
        toast.error('Vous ne pouvez pas transférer à vous-même');
        setBusy(false);
        return;
      }

      // Appeler la fonction de prévisualisation
      const { data, error } = await supabase.rpc('preview_wallet_transfer', {
        p_sender_id: userId,
        p_receiver_id: recipientUuid,
        p_amount: amount,
        p_currency: 'GNF'
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error);
        return;
      }

      setTransferPreview({ ...data, recipient_uuid: recipientUuid });
      setShowTransferPreview(true);
    } catch (e: any) {
      console.error('Erreur prévisualisation:', e);
      toast.error(e?.message || 'Erreur lors de la prévisualisation');
    } finally {
      setBusy(false);
    }
  }, [transferAmount, receiverId, userId, wallet]);

  const handleConfirmTransfer = useCallback(async () => {
    if (!userId || !transferPreview) return;
    
    try {
      setBusy(true);
      setShowTransferPreview(false);

      // Exécuter le transfert avec l'UUID du destinataire
      const { data, error } = await supabase.rpc('process_wallet_transaction', {
        p_sender_id: userId,
        p_receiver_id: transferPreview.recipient_uuid, // Utiliser l'UUID converti
        p_amount: transferPreview.amount,
        p_currency: 'GNF',
        p_description: transferReason || `Transfert de ${transferPreview.amount.toLocaleString()} GNF`
      });

      if (error) throw error;

      setTransferAmount("");
      setReceiverId("");
      setTransferReason("");
      setTransferPreview(null);
      
      toast.success(
        `✅ Transfert réussi\n💸 Frais appliqués : ${transferPreview.fee_amount.toLocaleString()} GNF\n💰 Montant transféré : ${transferPreview.amount.toLocaleString()} GNF`,
        { duration: 5000 }
      );
      
      await refetch(userId);
    } catch (e: any) {
      console.error('Erreur transfert:', e);
      toast.error(e?.message || 'Erreur lors du transfert');
    } finally {
      setBusy(false);
    }
  }, [transferPreview, receiverId, transferReason, userId, refetch]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletIcon className="w-5 h-5" />
          Wallet
          <Badge variant="outline" className="ml-2">Opérationnel</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border">
          <div>
            <p className="text-sm text-muted-foreground">Solde actuel</p>
            <p className="text-2xl font-bold">{balanceDisplay}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => userId && refetch(userId)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Tabs defaultValue="deposit">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="deposit">Dépôt</TabsTrigger>
            <TabsTrigger value="withdraw">Retrait</TabsTrigger>
            <TabsTrigger value="transfer">Transfert</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Montant à déposer</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" placeholder="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                  <Button onClick={handleDeposit} disabled={busy || !depositAmount} className="min-w-[140px]">
                    <ArrowDownCircle className="w-4 h-4 mr-2" />
                    Déposer
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Montant à retirer</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input type="number" placeholder="0" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                  <Button onClick={handleWithdraw} disabled={busy || !withdrawAmount} className="min-w-[140px]">
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Retirer
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <Label>Code Destinataire</Label>
                  <Input 
                    placeholder="Ex: 0002ABC" 
                    value={receiverId} 
                    onChange={(e) => setReceiverId(e.target.value.toUpperCase())} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrez le code d'identification (format: 0002ABC)
                  </p>
                </div>
                <div>
                  <Label>Motif du transfert</Label>
                  <Input placeholder="Ex: Paiement marchandise, Remboursement..." value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
                </div>
                <div>
                  <Label>Montant à transférer</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="number" placeholder="0" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
                    <Button onClick={handlePreviewTransfer} disabled={busy || !transferAmount || !receiverId} className="min-w-[140px]">
                      Transférer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <WalletTransactionHistory />
          </TabsContent>
        </Tabs>

        {/* Dialog de confirmation avec prévisualisation */}
        <AlertDialog open={showTransferPreview} onOpenChange={setShowTransferPreview}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Confirmer le transfert
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 mt-4">
                  <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">💰 Montant à transférer</span>
                      <span className="text-lg font-bold">{transferPreview?.amount?.toLocaleString()} GNF</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-600">
                      <span className="text-sm font-medium">💸 Frais de transfert ({transferPreview?.fee_percent}%)</span>
                      <span className="text-lg font-bold">{transferPreview?.fee_amount?.toLocaleString()} GNF</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="text-sm font-medium">📉 Total débité de votre compte</span>
                      <span className="text-xl font-bold text-red-600">{transferPreview?.total_debit?.toLocaleString()} GNF</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span className="text-sm font-medium">📈 Montant net reçu par le destinataire</span>
                      <span className="text-lg font-bold">{transferPreview?.amount_received?.toLocaleString()} GNF</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Solde actuel:</strong> {transferPreview?.current_balance?.toLocaleString()} GNF
                      <br />
                      <strong>Solde après transfert:</strong> {transferPreview?.balance_after?.toLocaleString()} GNF
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Souhaitez-vous confirmer ce transfert ?
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Non, annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmTransfer} disabled={busy}>
                Oui, confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
