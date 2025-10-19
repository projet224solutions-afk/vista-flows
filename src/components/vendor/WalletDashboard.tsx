// @ts-nocheck
import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import WalletTransactionHistory from "@/components/WalletTransactionHistory";

export default function WalletDashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { wallet, transactions, loading, refetch, createTransaction } = useWallet(userId);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [busy, setBusy] = useState(false);

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

  const handleTransfer = useCallback(async () => {
    if (!userId || !wallet) return;
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!receiverId) {
      toast.error('Destinataire requis (ID utilisateur)');
      return;
    }
    if (amount > wallet.balance) {
      toast.error('Solde insuffisant');
      return;
    }
    try {
      setBusy(true);

      // Vérifier que le destinataire existe et récupérer son wallet
      const { data: receiverWallet, error: receiverError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', receiverId)
        .single();

      if (receiverError || !receiverWallet) {
        toast.error('Destinataire introuvable');
        return;
      }

      // Créer une transaction de transfert
      const referenceNumber = `TRF${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'transfer',
          amount: amount,
          net_amount: amount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: `Transfert vers ${receiverId.substring(0, 8)}...`,
          sender_wallet_id: wallet.id,
          receiver_wallet_id: receiverWallet.id
        });

      if (transactionError) throw transactionError;

      // Débiter l'expéditeur
      const newSenderBalance = wallet.balance - amount;
      const { error: senderUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newSenderBalance })
        .eq('user_id', userId);

      if (senderUpdateError) throw senderUpdateError;

      // Créditer le destinataire
      const { data: currentReceiverWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', receiverId)
        .single();

      const newReceiverBalance = (currentReceiverWallet?.balance || 0) + amount;
      const { error: receiverUpdateError } = await supabase
        .from('wallets')
        .update({ balance: newReceiverBalance })
        .eq('user_id', receiverId);

      if (receiverUpdateError) throw receiverUpdateError;

      setTransferAmount("");
      setReceiverId("");
      toast.success(`Transfert de ${amount.toLocaleString()} GNF effectué avec succès`);
      await refetch(userId);
    } catch (e: any) {
      console.error('Erreur transfert:', e);
      toast.error(e?.message || 'Erreur lors du transfert');
    } finally {
      setBusy(false);
    }
  }, [transferAmount, receiverId, userId, wallet, refetch]);

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
              <div className="md:col-span-2 space-y-2">
                <div>
                  <Label>ID Destinataire</Label>
                  <Input placeholder="UUID du destinataire" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} />
                </div>
                <div>
                  <Label>Montant à transférer</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input type="number" placeholder="0" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
                    <Button onClick={handleTransfer} disabled={busy || !transferAmount || !receiverId} className="min-w-[140px]">
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
      </CardContent>
    </Card>
  );
}
