import React, { useCallback, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle, Eye, EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AgentWalletDiagnosticTool from "./AgentWalletDiagnosticTool";
import TransferMoney from "./TransferMoney";
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

interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  wallet_status: string;
}

export default function AgentWalletManagement({ 
  agentId, 
  agentCode,
  showTransactions = true 
}: AgentWalletManagementProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [agentUserId, setAgentUserId] = useState<string | null>(null);
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
      console.warn('⚠️ loadWallet: agentId manquant');
      toast.error('ID agent manquant');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Chargement wallet agent (via wallets table) pour agentId:', agentId);

      // ÉTAPE 1: Récupérer le user_id de l'agent depuis agents_management
      const { data: agentData, error: agentError } = await supabase
        .from('agents_management')
        .select('user_id, name')
        .eq('id', agentId)
        .single();

      if (agentError || !agentData?.user_id) {
        console.error('❌ Agent non trouvé ou sans user_id:', agentError);
        toast.error('Agent non trouvé ou non lié à un compte utilisateur');
        setLoading(false);
        return;
      }

      const userId = agentData.user_id;
      setAgentUserId(userId);
      console.log('✅ Agent trouvé:', agentData.name, '| user_id:', userId);

      // ÉTAPE 2: Récupérer le wallet depuis la table wallets (table standard)
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency, wallet_status')
        .eq('user_id', userId)
        .eq('wallet_status', 'active')
        .maybeSingle();

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('❌ Erreur chargement wallet:', walletError);
        toast.error(`Erreur d'accès au wallet: ${walletError.message}`);
        throw walletError;
      }

      // ÉTAPE 3: Si le wallet existe, l'utiliser
      if (walletData) {
        console.log('✅ Wallet trouvé:', walletData);
        setWallet(walletData);
        
        // Charger les transactions
        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .or(`receiver_wallet_id.eq.${walletData.id},sender_wallet_id.eq.${walletData.id}`)
          .order('created_at', { ascending: false })
          .limit(50);

        setTransactions(txData || []);
        setLoading(false);
        return;
      }

      // ÉTAPE 4: Si le wallet n'existe pas, le créer automatiquement
      console.log('💡 Wallet non trouvé, création automatique pour userId:', userId);
      
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          currency: 'GNF',
          wallet_status: 'active'
        })
        .select('id, user_id, balance, currency, wallet_status')
        .single();

      if (createError) {
        console.error('❌ Erreur création wallet:', createError);
        toast.error(`Impossible de créer le wallet: ${createError.message}`);
        setLoading(false);
        return;
      }

      console.log('✅ Wallet créé avec succès:', newWallet);
      setWallet(newWallet);
      toast.success('Wallet créé avec succès !');
      setLoading(false);
    } catch (error: any) {
      console.error('❌ Erreur critique chargement wallet agent:', error);
      toast.error(`Erreur: ${error?.message || 'Impossible de charger le wallet'}`);
      setWallet(null);
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadWallet();

    // Écouter les mises à jour en temps réel sur la table wallets
    if (agentUserId) {
      const channel = supabase
        .channel(`agent-wallet-unified-${agentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${agentUserId}`,
          },
          () => {
            console.log('💰 Wallet mis à jour (realtime)');
            loadWallet();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [agentId, agentUserId, loadWallet]);

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

      // Mettre à jour le solde dans la table wallets
      const { error: updateError } = await supabase
        .from('wallets')
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
      
      const newBalance = wallet.balance - amount;
      
      // ÉTAPE 1: Mettre à jour le solde dans la table wallets
      console.log('📝 Mise à jour du solde wallets:', wallet.id, 'nouveau solde:', newBalance);
      const { data: updateData, error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)
        .select();

      if (updateError) {
        console.error('❌ Erreur mise à jour solde:', updateError);
        throw new Error(`Impossible de mettre à jour le solde: ${updateError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.error('❌ Aucune ligne mise à jour - vérifiez les permissions RLS');
        throw new Error('Mise à jour du solde échouée - permissions insuffisantes');
      }

      console.log('✅ Solde mis à jour:', updateData);

      // ÉTAPE 2: Créer la transaction de retrait
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
            balance_after: newBalance
          }
        });

      if (txError) {
        console.error('❌ Erreur création transaction:', txError);
        // Rollback: restaurer le solde original
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance })
          .eq('id', wallet.id);
        throw new Error(`Impossible de créer la transaction: ${txError.message}`);
      }

      console.log('✅ Transaction créée avec succès');
      toast.success(`Retrait de ${amount.toLocaleString()} GNF effectué avec succès`);
      setWithdrawAmount('');
      setShowWithdrawConfirm(false);
      await loadWallet();
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      console.error('❌ Erreur retrait:', error);
      toast.error(error.message || 'Erreur lors du retrait');
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
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-4">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <div>
                <p className="text-lg font-semibold mb-2">
                  Impossible de charger ou créer le wallet de l'agent
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Agent ID: <code className="bg-muted px-2 py-1 rounded">{agentId}</code>
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Vérifiez que l'agent est bien lié à un compte utilisateur (user_id)
                </p>
              </div>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <Button onClick={loadWallet} variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
                <Button 
                  onClick={() => {
                    console.log('🔍 Informations de débogage:');
                    console.log('- Agent ID:', agentId);
                    console.log('- Agent Code:', agentCode);
                    console.log('- Agent User ID:', agentUserId);
                    console.log('- Wallet:', wallet);
                    toast.info('Informations affichées dans la console');
                  }} 
                  variant="outline"
                  size="sm"
                >
                  Afficher les infos de débogage
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Outil de diagnostic */}
        <AgentWalletDiagnosticTool agentId={agentId} />
      </div>
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
      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transfer">
            <Send className="w-4 h-4 mr-2" />
            Transférer
          </TabsTrigger>
          <TabsTrigger value="deposit">
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Dépôt
          </TabsTrigger>
          <TabsTrigger value="withdraw">
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Retrait
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfer" className="space-y-4">
          <TransferMoney
            walletId={wallet.id}
            currentBalance={wallet.balance}
            currency={wallet.currency}
            onTransferComplete={loadWallet}
            senderUserId={agentUserId || undefined}
          />
        </TabsContent>

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
            <CardTitle className="text-lg">Dernières transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {tx.amount > 0 ? (
                        <ArrowDownCircle className="w-4 h-4" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description || tx.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} {tx.currency}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs de confirmation */}
      <AlertDialog open={showDepositConfirm} onOpenChange={setShowDepositConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le dépôt</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de déposer <strong>{parseFloat(depositAmount || '0').toLocaleString()} GNF</strong> sur votre wallet.
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

      <AlertDialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le retrait</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de retirer <strong>{parseFloat(withdrawAmount || '0').toLocaleString()} GNF</strong> de votre wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} disabled={busy}>
              {busy ? 'Traitement...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}