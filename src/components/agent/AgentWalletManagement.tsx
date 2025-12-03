import React, { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

interface AgentWalletManagementProps {
  agentId: string;
  agentCode?: string;
  showTransactions?: boolean;
}

export default function AgentWalletManagement({ 
  agentId, 
  agentCode,
  showTransactions = true 
}: AgentWalletManagementProps) {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDepositConfirm, setShowDepositConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!agentId) {
      console.warn('loadWallet: agentId manquant');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Chargement wallet agent pour agentId:', agentId);

      const { data: walletData, error: walletError } = await supabase
        .from('agent_wallets')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (walletError) {
        console.error('❌ Erreur chargement wallet agent:', walletError);
        
        // Si le wallet n'existe pas, le créer automatiquement
        if (walletError.code === 'PGRST116') {
          console.log('💡 Création automatique du wallet agent pour:', agentId);
          
          const { data: newWallet, error: createError } = await supabase
            .from('agent_wallets')
            .insert({
              agent_id: agentId,
              balance: 0,
              currency: 'GNF'
            })
            .select('*')
            .single();

          if (createError) {
            console.error('❌ Erreur création wallet agent:', createError);
            toast.error(`Impossible de créer le wallet: ${createError.message}`);
            throw createError;
          }

          if (newWallet) {
            console.log('✅ Wallet agent créé avec succès:', newWallet);
            setWallet(newWallet);
            toast.success('Wallet créé avec succès !');
            setLoading(false);
            return;
          }
        } else {
          toast.error(`Erreur d'accès au wallet: ${walletError.message}`);
          throw walletError;
        }
      }
      
      console.log('✅ Wallet agent chargé:', walletData);
      setWallet(walletData);

      // Charger les transactions depuis wallet_transactions filtrées par le wallet_id de l'agent
      if (walletData) {
        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .or(`receiver_wallet_id.eq.${walletData.id},sender_wallet_id.eq.${walletData.id}`)
          .order('created_at', { ascending: false })
          .limit(50);

        setTransactions(txData || []);
      }
    } catch (error: any) {
      console.error('❌ Erreur critique chargement wallet agent:', error);
      toast.error(`Erreur: ${error?.message || 'Impossible de charger le wallet'}`);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadWallet();

    // Écouter les mises à jour en temps réel
    const channel = supabase
      .channel(`agent-wallet-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_wallets',
          filter: `agent_id=eq.${agentId}`,
        },
        () => {
          console.log('💰 Wallet agent mis à jour');
          loadWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, loadWallet]);

  // Écouter l'événement personnalisé de mise à jour
  useEffect(() => {
    const handleWalletUpdate = () => {
      console.log('📢 Event wallet-updated reçu');
      loadWallet();
    };

    window.addEventListener('wallet-updated', handleWalletUpdate);
    return () => window.removeEventListener('wallet-updated', handleWalletUpdate);
  }, [loadWallet]);

  const handleDeposit = useCallback(async () => {
    if (!wallet) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    try {
      setBusy(true);
      
      // Créer une transaction de dépôt dans wallet_transactions
      const referenceNumber = `AGT-DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'deposit',
          amount: amount,
          net_amount: amount,
          fee: 0,
          currency: wallet.currency || 'GNF',
          status: 'completed',
          description: 'Dépôt manuel sur wallet agent',
          receiver_wallet_id: wallet.id,
          metadata: { 
            method: 'manual',
            agent_id: agentId,
            balance_before: wallet.balance,
            balance_after: wallet.balance + amount
          }
        });

      if (txError) throw txError;

      // Mettre à jour le solde
      const { error: updateError } = await supabase
        .from('agent_wallets')
        .update({ 
          balance: wallet.balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) throw updateError;

      toast.success(`Dépôt de ${amount.toLocaleString()} GNF effectué`);
      setDepositAmount('');
      setShowDepositConfirm(false);
      await loadWallet();
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      console.error('Erreur dépôt:', error);
      toast.error('Erreur lors du dépôt');
    } finally {
      setBusy(false);
    }
  }, [wallet, depositAmount, agentId, loadWallet]);

  const handleWithdraw = useCallback(async () => {
    if (!wallet) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    if (amount > wallet.balance) {
      toast.error('Solde insuffisant');
      return;
    }

    try {
      setBusy(true);
      
      // Créer une transaction de retrait dans wallet_transactions
      const referenceNumber = `AGT-WDR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'withdraw',
          amount: -amount,
          net_amount: -amount,
          fee: 0,
          currency: wallet.currency || 'GNF',
          status: 'completed',
          description: 'Retrait des commissions',
          sender_wallet_id: wallet.id,
          metadata: { 
            method: 'manual',
            type: 'commission_withdrawal',
            agent_id: agentId,
            balance_before: wallet.balance,
            balance_after: wallet.balance - amount
          }
        });

      if (txError) throw txError;

      // Mettre à jour le solde
      const { error: updateError } = await supabase
        .from('agent_wallets')
        .update({ 
          balance: wallet.balance - amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) throw updateError;

      toast.success(`Retrait de ${amount.toLocaleString()} GNF effectué avec succès`);
      setWithdrawAmount('');
      setShowWithdrawConfirm(false);
      await loadWallet();
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      console.error('Erreur retrait:', error);
      toast.error('Erreur lors du retrait');
    } finally {
      setBusy(false);
    }
  }, [wallet, withdrawAmount, agentId, loadWallet]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Chargement du wallet...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-lg font-semibold mb-2">
              Impossible de charger ou créer le wallet de l'agent
            </p>
            <Button onClick={loadWallet} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Carte du solde */}
      <Card className="bg-gradient-to-br from-blue-600/10 to-purple-600/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6" />
              <span>Wallet Agent {agentCode ? `(${agentCode})` : ''}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setHidden(!hidden)}
              >
                {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadWallet}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Solde disponible</p>
            <p className="text-4xl font-bold">
              {hidden ? '******' : wallet.balance.toLocaleString()} {wallet.currency}
            </p>
            <Badge variant="outline" className="mt-2">
              ID Wallet: {wallet.id.slice(0, 8)}...
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs pour les actions */}
      <Tabs defaultValue="withdraw" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Dépôt
          </TabsTrigger>
          <TabsTrigger value="withdraw">
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Retrait Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Effectuer un dépôt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Montant ({wallet?.currency || 'GNF'})</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => setShowDepositConfirm(true)}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || busy}
              >
                <ArrowDownCircle className="w-4 h-4 mr-2" />
                Déposer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Retirer les commissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Montant ({wallet?.currency || 'GNF'})</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={wallet?.balance || 0}
                />
                <p className="text-xs text-muted-foreground">
                  Solde disponible: {wallet.balance.toLocaleString()} {wallet.currency}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setShowWithdrawConfirm(true)}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > wallet.balance || busy}
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Retirer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Historique des transactions */}
      {showTransactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.transaction_type === 'deposit' || tx.transaction_type === 'commission' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {tx.transaction_type === 'deposit' || tx.transaction_type === 'commission' ? (
                        <ArrowDownCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {tx.description || tx.transaction_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} GNF
                    </p>
                    {tx.metadata?.balance_after && (
                      <p className="text-xs text-muted-foreground">
                        Solde: {tx.metadata.balance_after.toLocaleString()} GNF
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmation dépôt */}
      <AlertDialog open={showDepositConfirm} onOpenChange={setShowDepositConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le dépôt</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment déposer {parseFloat(depositAmount || '0').toLocaleString()} {wallet?.currency || 'GNF'} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeposit} disabled={busy}>
              {busy ? 'Traitement...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmation retrait */}
      <AlertDialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le retrait des commissions</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment retirer {parseFloat(withdrawAmount || '0').toLocaleString()} {wallet?.currency || 'GNF'} ?
              <br />
              <span className="text-xs mt-2 block">Cette action retirera le montant de vos commissions disponibles.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} disabled={busy}>
              {busy ? 'Traitement...' : 'Confirmer le retrait'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
