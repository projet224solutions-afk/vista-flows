import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle, Eye, EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BureauTransferMoney from "./BureauTransferMoney";
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

interface BureauWalletManagementProps {
  bureauId: string;
  bureauCode?: string;
  showTransactions?: boolean;
}

export default function BureauWalletManagement({ 
  bureauId, 
  bureauCode,
  showTransactions = true 
}: BureauWalletManagementProps) {
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
    if (!bureauId) {
      console.warn('loadWallet: bureauId manquant');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Chargement wallet bureau pour bureauId:', bureauId);

      const { data: walletData, error: walletError } = await supabase
        .from('bureau_wallets')
        .select('*')
        .eq('bureau_id', bureauId)
        .single();

      if (walletError) {
        console.error('❌ Erreur chargement wallet bureau:', walletError);
        
        // Si le wallet n'existe pas, le créer automatiquement
        if (walletError.code === 'PGRST116') {
          console.log('💡 Création automatique du wallet bureau pour:', bureauId);
          
          const { data: newWallet, error: createError } = await supabase
            .from('bureau_wallets')
            .insert({
              bureau_id: bureauId,
              balance: 10000,
              currency: 'GNF',
              wallet_status: 'active'
            })
            .select('*')
            .single();

          if (createError) {
            console.error('❌ Erreur création wallet bureau:', createError);
            toast.error(`Impossible de créer le wallet: ${createError.message}`);
            throw createError;
          }

          // Créer une transaction de crédit initial
          if (newWallet) {
            await supabase.from('bureau_transactions').insert({
              bureau_id: bureauId,
              type: 'credit',
              amount: 10000,
              description: 'Crédit de bienvenue',
              status: 'completed',
              date: new Date().toISOString().split('T')[0]
            });
            
            console.log('✅ Wallet bureau créé avec succès:', newWallet);
            setWallet(newWallet);
            toast.success('Wallet créé avec succès ! Vous avez reçu 10,000 GNF de bienvenue.');
            setLoading(false);
            return;
          }
        } else {
          // Autre erreur (permissions, etc.)
          toast.error(`Erreur d'accès au wallet: ${walletError.message}`);
          throw walletError;
        }
      }
      
      console.log('✅ Wallet bureau chargé:', walletData);
      setWallet(walletData);

      // Charger les transactions
      if (walletData) {
        const { data: txData } = await supabase
          .from('bureau_transactions')
          .select('*')
          .eq('bureau_id', bureauId)
          .order('created_at', { ascending: false })
          .limit(50);

        setTransactions(txData || []);
      }
    } catch (error: any) {
      console.error('❌ Erreur critique chargement wallet bureau:', error);
      toast.error(`Erreur: ${error?.message || 'Impossible de charger le wallet'}`);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [bureauId]);

  useEffect(() => {
    loadWallet();

    // Écouter les mises à jour en temps réel
    const channel = supabase
      .channel(`bureau-wallet-${bureauId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bureau_wallets',
          filter: `bureau_id=eq.${bureauId}`,
        },
        () => {
          console.log('💰 Wallet bureau mis à jour');
          loadWallet();
        }
      )
      .subscribe();

    window.addEventListener('wallet-updated', loadWallet);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('wallet-updated', loadWallet);
    };
  }, [bureauId, loadWallet]);

  const balanceDisplay = useMemo(() => {
    if (loading) return '...';
    if (!wallet) return '0';
    if (hidden) return '••••••';
    return new Intl.NumberFormat('fr-GN').format(wallet.balance);
  }, [wallet, loading, hidden]);

  const handleDeposit = useCallback(async () => {
    if (!wallet) return;
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    try {
      setBusy(true);
      
      // Créer la transaction de dépôt
      const { error: txError } = await supabase
        .from('bureau_transactions')
        .insert({
          bureau_id: bureauId,
          type: 'credit',
          amount: amount,
          description: 'Dépôt manuel',
          status: 'completed',
          date: new Date().toISOString().split('T')[0]
        });

      if (txError) throw txError;

      // Mettre à jour le solde
      const { error: updateError } = await supabase
        .from('bureau_wallets')
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
  }, [wallet, depositAmount, bureauId, loadWallet]);

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
      
      // Créer la transaction de retrait
      const { error: txError } = await supabase
        .from('bureau_transactions')
        .insert({
          bureau_id: bureauId,
          type: 'debit',
          amount: amount,
          description: 'Retrait manuel',
          status: 'completed',
          date: new Date().toISOString().split('T')[0]
        });

      if (txError) throw txError;

      // Mettre à jour le solde
      const { error: updateError } = await supabase
        .from('bureau_wallets')
        .update({ 
          balance: wallet.balance - amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) throw updateError;

      toast.success(`Retrait de ${amount.toLocaleString()} GNF effectué`);
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
  }, [wallet, withdrawAmount, bureauId, loadWallet]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Chargement du wallet...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Erreur de chargement du wallet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Impossible de charger ou créer le wallet du bureau
              </p>
              <Button onClick={loadWallet} variant="outline">
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
      {/* Carte du solde */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              <span>Wallet Bureau {bureauCode ? `(${bureauCode})` : ''}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHidden(!hidden)}
              >
                {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadWallet}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Solde actuel</p>
            <p className="text-4xl font-bold">{balanceDisplay} {wallet?.currency || 'GNF'}</p>
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
          <BureauTransferMoney
            bureauWalletId={wallet.id}
            currentBalance={wallet.balance}
            currency={wallet.currency}
            onTransferComplete={loadWallet}
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
              <CardTitle className="text-lg">Effectuer un retrait</CardTitle>
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
                  max={wallet?.balance}
                />
                <p className="text-xs text-muted-foreground">
                  Solde disponible: {wallet?.balance?.toLocaleString()} {wallet?.currency || 'GNF'}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setShowWithdrawConfirm(true)}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > wallet?.balance || busy}
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
                    <div className={`p-2 rounded-full ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {tx.type === 'credit' ? (
                        <ArrowDownCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'credit' ? '+' : '-'}
                      {tx.amount.toLocaleString()} {wallet?.currency || 'GNF'}
                    </p>
                    <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                      {tx.status}
                    </Badge>
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
            <AlertDialogTitle>Confirmer le retrait</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment retirer {parseFloat(withdrawAmount || '0').toLocaleString()} {wallet?.currency || 'GNF'} ?
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
