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
  const { wallet, transactions, loading, refetch } = useWallet(userId);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const walletId = useMemo(() => wallet?.id, [wallet]);
  const balanceDisplay = useMemo(() => {
    if (!wallet) return "—";
    return `${wallet.balance.toLocaleString()} ${wallet.currency}`;
  }, [wallet]);

  const ensureWallet = useCallback(async () => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id: userId, balance: 0, currency: 'GNF', status: 'active' })
        .select('id')
        .single();
      if (createError) throw createError;
      return created.id;
    }
    return data.id as string | null;
  }, [userId]);

  const handleDeposit = useCallback(async () => {
    if (!userId) return;
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    try {
      setBusy(true);
      const id = walletId || await ensureWallet();
      if (!id) throw new Error('Wallet introuvable');

      // Insérer la transaction de dépôt
      const txId = `DEP_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: txId,
          transaction_type: 'deposit',
          amount,
          net_amount: amount,
          fee: 0,
          currency: wallet?.currency || 'GNF',
          receiver_wallet_id: id,
          status: 'completed',
          description: 'Dépôt manuel'
        });
      if (txError) throw txError;

      // Mettre à jour le solde
      const { error: upErr } = await supabase
        .from('wallets')
        .update({ balance: (wallet?.balance || 0) + amount })
        .eq('id', id);
      if (upErr) throw upErr;

      setDepositAmount("");
      toast.success('Dépôt effectué');
      await refetch(userId);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur dépôt');
    } finally {
      setBusy(false);
    }
  }, [depositAmount, userId, walletId, wallet, ensureWallet, refetch]);

  const handleWithdraw = useCallback(async () => {
    if (!userId) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!wallet || wallet.balance < amount) {
      toast.error('Solde insuffisant');
      return;
    }
    try {
      setBusy(true);
      const id = walletId || await ensureWallet();
      if (!id) throw new Error('Wallet introuvable');

      const txId = `WDR_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: txId,
          transaction_type: 'withdrawal',
          amount,
          net_amount: amount,
          fee: 0,
          currency: wallet.currency || 'GNF',
          sender_wallet_id: id,
          status: 'completed',
          description: 'Retrait manuel'
        });
      if (txError) throw txError;

      const { error: upErr } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - amount })
        .eq('id', id);
      if (upErr) throw upErr;

      setWithdrawAmount("");
      toast.success('Retrait effectué');
      await refetch(userId);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur retrait');
    } finally {
      setBusy(false);
    }
  }, [withdrawAmount, userId, walletId, wallet, ensureWallet, refetch]);

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
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="deposit">Dépôt</TabsTrigger>
            <TabsTrigger value="withdraw">Retrait</TabsTrigger>
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

          <TabsContent value="history">
            <WalletTransactionHistory />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
