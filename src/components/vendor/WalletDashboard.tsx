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
  const { session } = useAuth();
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

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api';

  const handleDeposit = useCallback(async () => {
    if (!userId) return;
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (amount < 1000) {
      toast.error('Montant minimum 1000 GNF');
      return;
    }
    const token = (session as any)?.access_token;
    if (!token) {
      toast.error('Session invalide');
      return;
    }
    try {
      setBusy(true);
      await ensureWallet();

      const res = await fetch(`${API_BASE}/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          paymentMethod: 'mobile_money',
          reference: `UI_${Date.now()}`
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || 'Erreur dépôt');
      }

      setDepositAmount("");
      toast.success('Dépôt effectué');
      await refetch(userId);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur dépôt');
    } finally {
      setBusy(false);
    }
  }, [depositAmount, userId, ensureWallet, refetch, session]);

  const handleWithdraw = useCallback(async () => {
    if (!userId) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (amount < 5000) {
      toast.error('Montant minimum 5000 GNF');
      return;
    }
    const token = (session as any)?.access_token;
    if (!token) {
      toast.error('Session invalide');
      return;
    }
    try {
      setBusy(true);
      await ensureWallet();

      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          paymentMethod: 'mobile_money',
          paymentDetails: { provider: 'orange_money', phone: '620000000' }
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || 'Erreur retrait');
      }

      setWithdrawAmount("");
      toast.success('Retrait effectué');
      await refetch(userId);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur retrait');
    } finally {
      setBusy(false);
    }
  }, [withdrawAmount, userId, ensureWallet, refetch, session]);

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
