// @ts-nocheck
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle, Smartphone, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

interface WalletInfo {
  id: string;
  balance: number;
  currency: string;
}

export default function WalletDashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showTransferPreview, setShowTransferPreview] = useState(false);
  const [transferPreview, setTransferPreview] = useState<any>(null);
  const [showFedaPayDialog, setShowFedaPayDialog] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
    }
  }, [user?.id]);

  const loadWalletData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, balance, currency')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const walletId = useMemo(() => wallet?.id, [wallet]);
  const balanceDisplay = useMemo(() => {
    if (!wallet) return "—";
    return `${wallet.balance.toLocaleString()} ${wallet.currency}`;
  }, [wallet]);

  const handleDeposit = useCallback(async () => {
    if (!user?.id || !wallet) return;
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
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setDepositAmount("");
      toast.success(`Dépôt de ${amount.toLocaleString()} GNF effectué avec succès`);
      await loadWalletData();
    } catch (e: any) {
      console.error('Erreur dépôt:', e);
      toast.error(e?.message || 'Erreur lors du dépôt');
    } finally {
      setBusy(false);
    }
  }, [depositAmount, user?.id, wallet]);

  const handleWithdraw = useCallback(async () => {
    if (!user?.id || !wallet) return;
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
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setWithdrawAmount("");
      toast.success(`Retrait de ${amount.toLocaleString()} GNF effectué avec succès`);
      await loadWalletData();
    } catch (e: any) {
      console.error('Erreur retrait:', e);
      toast.error(e?.message || 'Erreur lors du retrait');
    } finally {
      setBusy(false);
    }
  }, [withdrawAmount, user?.id, wallet]);

  const handlePreviewTransfer = useCallback(async () => {
    if (!user?.id || !wallet) return;
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
      
      const recipientCodeUpper = receiverId.toUpperCase();
      
      console.log('🔍 [Vendeur] Début prévisualisation transfert:', {
        recipient: recipientCodeUpper,
        amount
      });
      
      // Récupérer notre propre code pour l'API
      let senderCode = null;
      
      // Chercher dans user_ids d'abord
      const { data: senderIdData } = await supabase
        .from('user_ids')
        .select('custom_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (senderIdData?.custom_id) {
        senderCode = senderIdData.custom_id;
      } else {
        // Sinon chercher dans profiles
        const { data: senderProfileData } = await supabase
          .from('profiles')
          .select('custom_id, public_id')
          .eq('id', user.id)
          .maybeSingle();
        
        senderCode = senderProfileData?.custom_id || senderProfileData?.public_id;
      }
      
      if (!senderCode) {
        toast.error('Votre code utilisateur est introuvable');
        setBusy(false);
        return;
      }
      
      console.log('📋 [Vendeur] Code expéditeur:', senderCode);
      console.log('📞 [Vendeur] Appel preview_wallet_transfer_by_code...');
      
      // Appeler la nouvelle fonction de prévisualisation par code
      const { data, error } = await supabase.rpc('preview_wallet_transfer_by_code', {
        p_sender_code: senderCode,
        p_receiver_code: recipientCodeUpper,
        p_amount: amount,
        p_currency: 'GNF'
      });

      if (error) {
        console.error('❌ [Vendeur] Erreur RPC:', error);
        throw error;
      }
      
      console.log('📋 [Vendeur] Résultat prévisualisation:', data);

      if (!data.success) {
        toast.error(data.error || 'Erreur lors de la prévisualisation');
        setBusy(false);
        return;
      }

      setTransferPreview(data);
      setShowTransferPreview(true);
    } catch (e: any) {
      console.error('Erreur prévisualisation:', e);
      toast.error(e?.message || 'Erreur lors de la prévisualisation');
    } finally {
      setBusy(false);
    }
  }, [transferAmount, receiverId, user?.id, wallet]);

  const handleConfirmTransfer = useCallback(async () => {
    if (!user?.id || !transferPreview) return;
    
    try {
      setBusy(true);
      setShowTransferPreview(false);
      
      console.log('💸 [Vendeur] Exécution du transfert...');

      // Récupérer notre code pour l'API
      let senderCode = null;
      const { data: senderIdData } = await supabase
        .from('user_ids')
        .select('custom_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (senderIdData?.custom_id) {
        senderCode = senderIdData.custom_id;
      } else {
        const { data: senderProfileData } = await supabase
          .from('profiles')
          .select('custom_id, public_id')
          .eq('id', user.id)
          .maybeSingle();
        
        senderCode = senderProfileData?.custom_id || senderProfileData?.public_id;
      }

      // Exécuter le transfert avec la nouvelle fonction
      const { data, error } = await supabase.rpc('process_wallet_transfer_with_fees', {
        p_sender_code: senderCode,
        p_receiver_code: transferPreview.receiver.custom_id,
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
      
      await loadWalletData();
    } catch (e: any) {
      console.error('Erreur transfert:', e);
      toast.error(e?.message || 'Erreur lors du transfert');
    } finally {
      setBusy(false);
    }
  }, [transferPreview, receiverId, transferReason, user?.id]);

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
          <Button variant="outline" size="sm" onClick={loadWalletData} disabled={loading}>
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
            <div className="space-y-4">
              {/* FedaPay - Orange Money, MTN */}
              <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold">Recharger via Mobile Money</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Orange Money ou MTN Mobile Money via FedaPay
                </p>
                <Button 
                  onClick={() => setShowFedaPayDialog(true)} 
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Recharger (Orange/MTN)
                </Button>
              </div>

              {/* Montants rapides */}
              <div className="space-y-2">
                <Label>Montants rapides</Label>
                <div className="flex flex-wrap gap-2">
                  {[5000, 10000, 25000, 50000, 100000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDepositAmount(amount.toString());
                        setShowFedaPayDialog(true);
                      }}
                    >
                      {amount.toLocaleString('fr-FR')} GNF
                    </Button>
                  ))}
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
                  {/* Informations du destinataire */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <h4 className="font-semibold text-blue-900 mb-2">👤 Informations du destinataire</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Nom:</strong> {transferPreview?.recipient_name}</p>
                      <p><strong>Email:</strong> {transferPreview?.recipient_email}</p>
                      <p><strong>Téléphone:</strong> {transferPreview?.recipient_phone}</p>
                      <p><strong>ID:</strong> {transferPreview?.recipient_code}</p>
                    </div>
                  </div>

                  {/* Détails du transfert */}
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
                      <span className="text-sm font-medium">📈 Montant net reçu</span>
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

        {/* PawaPay Mobile Money Dialog */}
        <PawaPayPaymentDialog
          open={showFedaPayDialog}
          onOpenChange={setShowFedaPayDialog}
          amount={depositAmount ? parseInt(depositAmount) : 10000}
          description="Recharge wallet via Mobile Money"
          metadata={{ wallet_recharge: true, user_type: 'vendor' }}
          onPaymentSuccess={(depositId) => {
            console.log('Paiement PawaPay réussi:', depositId);
            toast.success('Wallet rechargé avec succès!');
            setDepositAmount("");
            loadWalletData();
          }}
        />
      </CardContent>
    </Card>
  );
}
