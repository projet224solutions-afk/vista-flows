import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle, Eye, EyeOff, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import WalletTransactionHistory from "@/components/WalletTransactionHistory";
import { UnifiedTransferDialog } from "./UnifiedTransferDialog";
import StripeWalletTopup from "./StripeWalletTopup";
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

interface UniversalWalletDashboardProps {
  userId: string;
  userCode?: string;
  showTransactions?: boolean;
}

export default function UniversalWalletDashboard({ 
  userId, 
  userCode,
  showTransactions = true 
}: UniversalWalletDashboardProps) {
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
    if (!userId) {
      console.warn('loadWallet: userId manquant');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('🔍 Chargement wallet pour userId:', userId);

      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError) {
        console.error('❌ Erreur chargement wallet:', walletError);
        
        // Si le wallet n'existe pas, l'initialiser via RPC
        if (walletError.code === 'PGRST116') {
          console.log('💡 Initialisation du wallet via RPC pour:', userId);
          
          try {
            const { data: initResult, error: rpcError } = await supabase
              .rpc('initialize_user_wallet', { p_user_id: userId });
            
            console.log('📊 Résultat RPC initialize_user_wallet:', { initResult, rpcError });
            
            if (rpcError) {
              console.error('❌ Erreur RPC initialize_user_wallet:', rpcError);
              toast.error(`Impossible d'initialiser le wallet: ${rpcError.message}`);
              throw rpcError;
            }
            
            const result = initResult as any;
            if (!result || !result.success) {
              const errorMsg = result?.error || 'Échec initialisation wallet';
              console.error('❌ Échec initialisation wallet:', errorMsg);
              toast.error(errorMsg);
              throw new Error(errorMsg);
            }
            
            console.log('✅ Wallet initialisé via RPC:', result);
            
            // Recharger le wallet depuis la base de données
            const { data: reloadedWallet, error: reloadError } = await supabase
              .from('wallets')
              .select('*')
              .eq('user_id', userId)
              .single();
            
            if (reloadError) {
              console.error('❌ Erreur rechargement wallet:', reloadError);
              throw reloadError;
            }
            
            console.log('✅ Wallet rechargé avec succès:', reloadedWallet);
            setWallet(reloadedWallet);
            toast.success('Wallet chargé avec succès !');
            setLoading(false);
            return;
          } catch (initError: any) {
            console.error('❌ Erreur lors de l\'initialisation:', initError);
            toast.error(`Erreur: ${initError?.message || 'Impossible de charger le wallet'}`);
            throw initError;
          }
        } else {
          // Autre erreur (permissions, etc.)
          toast.error(`Erreur d'accès au wallet: ${walletError.message}`);
          throw walletError;
        }
      }
      
      console.log('✅ Wallet chargé:', walletData);
      setWallet(walletData);

      // Charger les transactions
      if (showTransactions && walletData) {
        const { data: transData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .or(`sender_wallet_id.eq.${walletData.id},receiver_wallet_id.eq.${walletData.id}`)
          .order('created_at', { ascending: false })
          .limit(20);
        
        setTransactions(transData || []);
      }
    } catch (error: any) {
      console.error('❌ Erreur critique chargement wallet:', error);
      toast.error(`Erreur: ${error?.message || 'Impossible de charger le wallet'}`);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [userId, showTransactions]);

  React.useEffect(() => {
    loadWallet();

    // Écouter les mises à jour
    const channel = supabase
      .channel(`wallet-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadWallet();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, loadWallet]);

  const balanceDisplay = useMemo(() => {
    if (!wallet) return "—";
    if (hidden) return "••••••";
    return `${wallet.balance.toLocaleString()} ${wallet.currency}`;
  }, [wallet, hidden]);

  const handleDeposit = useCallback(async () => {
    if (!wallet) return;
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (amount < 1000) {
      toast.error('Montant minimum 1000 GNF');
      return;
    }
    
    setShowDepositConfirm(false);
    
    try {
      setBusy(true);

      const referenceNumber = `DEP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // ⚡ Update atomique du balance (évite race conditions)
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('update_wallet_balance_atomic', {
          p_wallet_id: wallet.id,
          p_amount: amount,
          p_tx_id: referenceNumber,
          p_description: 'Dépôt sur le wallet'
        });

      if (balanceError) throw balanceError;

      // Enregistrer la transaction
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
          description: 'Dépôt sur le wallet',
          receiver_wallet_id: wallet.id,
          receiver_user_id: userId
        });

      if (transactionError) console.warn('Transaction log failed:', transactionError);

      setDepositAmount("");
      toast.success(`Dépôt de ${amount.toLocaleString()} GNF effectué avec succès`);
      window.dispatchEvent(new Event('wallet-updated'));
      await loadWallet();
    } catch (e: any) {
      console.error('Erreur dépôt:', e);
      toast.error(e?.message || 'Erreur lors du dépôt');
    } finally {
      setBusy(false);
    }
  }, [depositAmount, userId, wallet, loadWallet]);

  const handleWithdraw = useCallback(async () => {
    if (!wallet) return;
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
    
    setShowWithdrawConfirm(false);
    
    try {
      setBusy(true);

      const referenceNumber = `WDR${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // ⚡ Update atomique du balance (avec montant négatif pour retrait)
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('update_wallet_balance_atomic', {
          p_wallet_id: wallet.id,
          p_amount: -amount, // Négatif pour retrait
          p_tx_id: referenceNumber,
          p_description: 'Retrait du wallet'
        });

      if (balanceError) throw balanceError;

      // Enregistrer la transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          transaction_id: referenceNumber,
          transaction_type: 'withdrawal',
          amount: amount,
          net_amount: amount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: 'Retrait du wallet',
          sender_wallet_id: wallet.id,
          sender_user_id: userId
        });

      if (transactionError) console.warn('Transaction log failed:', transactionError);

      setWithdrawAmount("");
      toast.success(`Retrait de ${amount.toLocaleString()} GNF effectué avec succès`);
      window.dispatchEvent(new Event('wallet-updated'));
      await loadWallet();
    } catch (e: any) {
      console.error('Erreur retrait:', e);
      toast.error(e?.message || 'Erreur lors du retrait');
    } finally {
      setBusy(false);
    }
  }, [withdrawAmount, userId, wallet, loadWallet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-orange-600" />
            <div className="text-center">
              <h3 className="font-semibold text-orange-800 mb-2">Wallet non disponible</h3>
              <p className="text-sm text-orange-600 mb-4">
                Impossible de charger ou créer votre wallet. Vérifiez votre connexion.
              </p>
              <Button 
                onClick={loadWallet}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Carte solde */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <WalletIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">Solde disponible</p>
                <p className="text-3xl font-bold">{balanceDisplay}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setHidden(!hidden)}
              >
                {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={loadWallet}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Badge variant="secondary" className="bg-white/20">
              ID Wallet: {wallet.id.slice(0, 8)}...
            </Badge>
            <Badge variant="secondary" className="bg-white/20">
              Devise: {wallet.currency}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Tabs defaultValue="card" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="card" className="flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            Carte
          </TabsTrigger>
          <TabsTrigger value="deposit">Dépôt</TabsTrigger>
          <TabsTrigger value="withdraw">Retrait</TabsTrigger>
          <TabsTrigger value="transfer">Transfert</TabsTrigger>
        </TabsList>

        {/* Recharge par carte bancaire Stripe */}
        <TabsContent value="card">
          <StripeWalletTopup
            userId={userId}
            walletId={wallet.id}
            onSuccess={loadWallet}
          />
        </TabsContent>

        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-green-600" />
                Effectuer un dépôt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Montant (GNF)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="Ex: 50000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="1000"
                />
                <p className="text-xs text-muted-foreground">Montant minimum: 1,000 GNF</p>
              </div>
              <Button 
                onClick={() => setShowDepositConfirm(true)} 
                disabled={busy || !depositAmount}
                className="w-full"
              >
                {busy ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownCircle className="w-4 h-4 mr-2" />}
                Déposer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-red-600" />
                Effectuer un retrait
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Montant (GNF)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="Ex: 50000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="5000"
                  max={wallet.balance}
                />
                <p className="text-xs text-muted-foreground">
                  Montant minimum: 5,000 GNF | Disponible: {wallet.balance.toLocaleString()} GNF
                </p>
              </div>
              <Button 
                onClick={() => setShowWithdrawConfirm(true)} 
                disabled={busy || !withdrawAmount}
                variant="destructive"
                className="w-full"
              >
                {busy ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpCircle className="w-4 h-4 mr-2" />}
                Retirer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-blue-600" />
                Transférer de l'argent
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userCode ? (
                <UnifiedTransferDialog
                  senderCode={userCode}
                  variant="default"
                  size="lg"
                  className="w-full"
                  showText={true}
                  onSuccess={() => {
                    toast.success('Transfert réussi !');
                    loadWallet();
                  }}
                />
              ) : (
                <div className="text-center p-6">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm text-muted-foreground">
                    Code utilisateur non disponible pour les transferts
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Historique des transactions */}
      {showTransactions && (
        <WalletTransactionHistory limit={20} />
      )}

      {/* Dialogs de confirmation */}
      <AlertDialog open={showDepositConfirm} onOpenChange={setShowDepositConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le dépôt</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez déposer {parseFloat(depositAmount || '0').toLocaleString()} GNF sur votre wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeposit}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le retrait</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez retirer {parseFloat(withdrawAmount || '0').toLocaleString()} GNF de votre wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleWithdraw} className="bg-red-600 hover:bg-red-700">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}