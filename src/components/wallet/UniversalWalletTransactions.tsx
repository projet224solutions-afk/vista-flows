import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Wallet, 
  ArrowDownToLine,
  ArrowUpFromLine,
  Send,
  RefreshCw,
  History,
  AlertCircle
} from 'lucide-react';

interface UniversalWalletTransactionsProps {
  userId?: string;
  showBalance?: boolean;
}

interface WalletInfo {
  id: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_custom_id?: string;
  receiver_custom_id?: string;
  amount: number;
  method: string;
  status: string;
  currency: string;
  created_at: string;
  metadata: any;
}

export const UniversalWalletTransactions = ({ userId: propUserId, showBalance = true }: UniversalWalletTransactionsProps = {}) => {
  // Utiliser le contexte Auth comme tous les autres composants de l'application
  const { user, profile } = useAuth();
  
  // Utiliser propUserId si fourni, sinon utiliser user?.id
  const effectiveUserId = propUserId || user?.id;
  
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [agentInfo, setAgentInfo] = useState<{ id: string; agent_code: string; name: string } | null>(null);
  const [userCustomId, setUserCustomId] = useState<string | null>(null);
  
  // États pour les formulaires
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  
  // États des dialogs
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [showTransferPreview, setShowTransferPreview] = useState(false);
  const [transferPreview, setTransferPreview] = useState<any>(null);

  useEffect(() => {
    if (effectiveUserId) {
      checkIfAgent();
    } else {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const checkIfAgent = async () => {
    if (!effectiveUserId) return;

    try {
      // Vérifier si l'utilisateur est un agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents_management')
        .select('id, agent_code, name')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      let isAgentUser = false;
      let agentInfoData = null;

      if (agentData) {
        isAgentUser = true;
        agentInfoData = { id: agentData.id, agent_code: agentData.agent_code, name: agentData.name };
        setIsAgent(true);
        setAgentInfo(agentInfoData);
      } else {
        // Si ce n'est pas un agent, charger le custom_id depuis user_ids
        const { data: userIdData } = await supabase
          .from('user_ids')
          .select('custom_id')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (userIdData?.custom_id) {
          setUserCustomId(userIdData.custom_id);
        }
      }

      // Charger les données avec les valeurs calculées localement (pas le state)
      await loadWalletData(isAgentUser, agentInfoData);
      await loadTransactions();
    } catch (error) {
      console.error('Erreur vérification agent:', error);
      await loadWalletData(false, null);
      await loadTransactions();
    }
  };

  const loadWalletData = async (isAgentUser: boolean = false, agentInfoData: any = null) => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    try {
      // Si c'est un agent, charger depuis agent_wallets
      if (isAgentUser && agentInfoData) {
        const { data: agentWalletData, error: agentWalletError } = await supabase
          .from('agent_wallets')
          .select('id, balance, currency')
          .eq('agent_id', agentInfoData.id)
          .maybeSingle();

        if (agentWalletError && agentWalletError.code !== 'PGRST116') {
          throw agentWalletError;
        }

        if (agentWalletData) {
          setWallet(agentWalletData);
        } else {
          // Initialiser le wallet agent si nécessaire
          const { data: agentData } = await supabase
            .from('agents_management')
            .select('id')
            .eq('user_id', effectiveUserId)
            .single();

          if (agentData) {
            const { error: insertError } = await supabase
              .from('agent_wallets')
              .insert({
                agent_id: agentData.id,
                balance: 0,
                currency: 'GNF',
                wallet_status: 'active'
              });

            if (!insertError) {
              const { data: newWallet } = await supabase
                .from('agent_wallets')
                .select('id, balance, currency')
                .eq('agent_id', agentData.id)
                .single();

              if (newWallet) {
                setWallet(newWallet);
              }
            }
          }
        }
      } else {
        // Utilisateur normal - charger depuis wallets
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id, balance, currency')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (walletError && walletError.code !== 'PGRST116') {
          throw walletError;
        }

        if (walletData) {
          setWallet(walletData);
        } else {
          // Créer le wallet directement dans la table
          const { data: newWallet, error: insertError } = await supabase
            .from('wallets')
            .insert({
              user_id: effectiveUserId,
              balance: 0,
              currency: 'GNF',
              wallet_status: 'active'
            })
            .select('id, balance, currency')
            .single();

          if (insertError) {
            console.error('❌ Erreur création wallet:', insertError);
            toast.error('Impossible de créer le wallet');
            setLoading(false);
            return;
          }

          if (newWallet) {
            setWallet(newWallet);
            console.log('✅ Wallet créé avec succès');
            toast.success('Wallet créé avec succès');
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
      toast.error('Erreur lors du chargement du wallet');
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!effectiveUserId) return;

    try {
      const { data, error } = await supabase
        .from('enhanced_transactions')
        .select('*')
        .or(`sender_id.eq.${effectiveUserId},receiver_id.eq.${effectiveUserId}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Enrichir les transactions avec les custom_id
      if (data) {
        const enrichedTransactions = await Promise.all(
          data.map(async (tx) => {
            // Récupérer le custom_id de l'expéditeur
            const { data: senderData } = await supabase
              .from('user_ids')
              .select('custom_id')
              .eq('user_id', tx.sender_id)
              .maybeSingle();

            // Récupérer le custom_id du destinataire
            const { data: receiverData } = await supabase
              .from('user_ids')
              .select('custom_id')
              .eq('user_id', tx.receiver_id)
              .maybeSingle();

            return {
              ...tx,
              sender_custom_id: senderData?.custom_id || tx.sender_id,
              receiver_custom_id: receiverData?.custom_id || tx.receiver_id
            };
          })
        );
        
        setTransactions(enrichedTransactions);
      }
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    }
  };

  /**
   * Vérifie les permissions de l'utilisateur pour une action spécifique
   */
  const checkPermissions = (action: 'send' | 'receive' | 'withdraw' | 'deposit'): boolean => {
    // Si un userId est fourni en prop, on considère que les permissions ont été vérifiées en amont
    if (propUserId) {
      return true;
    }
    
    if (!profile?.role) {
      toast.error('UNAUTHORIZED_ACTION: Rôle utilisateur non défini');
      return false;
    }

    const permissions: Record<string, string[]> = {
      send: ['admin', 'agent', 'vendeur', 'client', 'livreur'],
      receive: ['admin', 'agent', 'vendeur', 'livreur'],
      withdraw: ['admin', 'agent', 'vendeur'],
      deposit: ['admin', 'agent', 'vendeur', 'client', 'livreur']
    };

    if (!permissions[action].includes(profile.role)) {
      toast.error(`UNAUTHORIZED_ACTION: Votre rôle (${profile.role}) ne permet pas cette action`);
      return false;
    }

    return true;
  };

  const handleDeposit = async () => {
    if (!effectiveUserId || !depositAmount) {
      toast.error('Veuillez entrer un montant');
      return;
    }

    // Vérifier les permissions
    if (!checkPermissions('deposit')) {
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('INVALID_AMOUNT: Montant invalide');
      return;
    }

    if (amount < 1000) {
      toast.error('INVALID_AMOUNT: Montant minimum 1000 GNF');
      return;
    }

    setProcessing(true);
    console.log('🔄 Dépôt en cours:', { amount, userId: effectiveUserId });
    
    try {
      // Créer ou récupérer le wallet de l'utilisateur
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', effectiveUserId)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Wallet n'existe pas, initialiser via RPC
        console.log('⚠️ Wallet non trouvé, initialisation via RPC...');
        
        try {
          const { data: initResult, error: rpcError } = await supabase
            .rpc('initialize_user_wallet', { p_user_id: effectiveUserId });
          
          if (rpcError) throw rpcError;
          
          const result = initResult as any;
          if (!result?.success) {
            throw new Error('Échec initialisation wallet');
          }
          
          // Recharger le wallet
          const { data: reloadedWallet, error: reloadError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', effectiveUserId)
            .single();
          
          if (reloadError) throw reloadError;
          walletData = reloadedWallet;
        } catch (initError) {
          console.error('❌ Erreur initialisation:', initError);
          toast.error('Impossible d\'initialiser le wallet');
          setProcessing(false);
          return;
        }
      } else if (walletError) {
        throw walletError;
      }

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
          description: 'Dépôt sur le wallet',
          receiver_wallet_id: walletData.id
        });

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const newBalance = walletData.balance + amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', effectiveUserId);

      if (updateError) throw updateError;

      console.log('✅ Dépôt effectué avec succès');

      toast.success(`Dépôt de ${formatPrice(amount)} effectué avec succès !`);
      setDepositAmount('');
      setDepositOpen(false);
      await Promise.all([loadWalletData(), loadTransactions()]);
    } catch (error: any) {
      console.error('❌ Erreur dépôt:', error);
      toast.error(error.message || 'Erreur lors du dépôt');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!effectiveUserId || !withdrawAmount) {
      toast.error('Veuillez entrer un montant');
      return;
    }

    // Vérifier les permissions
    if (!checkPermissions('withdraw')) {
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('INVALID_AMOUNT: Montant invalide');
      return;
    }

    if (amount < 5000) {
      toast.error('INVALID_AMOUNT: Montant minimum 5000 GNF');
      return;
    }

    if (!wallet || wallet.balance < amount) {
      toast.error(`INSUFFICIENT_FUNDS: Solde insuffisant (${formatPrice(wallet.balance)} disponible)`);
      return;
    }

    setProcessing(true);
    console.log('🔄 Retrait en cours:', { amount, userId: effectiveUserId });
    
    try {
      // Récupérer le wallet de l'utilisateur
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', effectiveUserId)
        .single();

      if (walletError) throw walletError;
      if (!walletData) throw new Error('Wallet introuvable');

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
          description: 'Retrait du wallet',
          sender_wallet_id: walletData.id
        });

      if (transactionError) throw transactionError;

      // Mettre à jour le solde du wallet
      const newBalance = walletData.balance - amount;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', effectiveUserId);

      if (updateError) throw updateError;

      console.log('✅ Retrait effectué avec succès');

      toast.success(`Retrait de ${formatPrice(amount)} effectué avec succès !`);
      setWithdrawAmount('');
      setWithdrawOpen(false);
      await Promise.all([loadWalletData(), loadTransactions()]);
    } catch (error: any) {
      console.error('❌ Erreur retrait:', error);
      toast.error(error.message || 'Erreur lors du retrait');
    } finally {
      setProcessing(false);
    }
  };

  const handlePreviewTransfer = async () => {
    if (!user?.id || !transferAmount || !recipientId || !transferDescription) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      toast.error('Solde insuffisant');
      return;
    }

    setProcessing(true);
    
    try {
      console.log('🔍 Recherche du destinataire:', recipientId);
      
      // 1. D'abord chercher dans profiles (custom_id ou public_id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, custom_id, public_id')
        .or(`custom_id.eq.${recipientId.toUpperCase()},public_id.eq.${recipientId.toUpperCase()}`)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Erreur recherche profil:', profileError);
        toast.error('Erreur lors de la recherche du destinataire');
        return;
      }

      let recipientUuid: string | null = null;
      let recipientName: string | null = null;

      // Si trouvé dans profiles
      if (profileData) {
        console.log('📋 Profil trouvé:', profileData);
        recipientUuid = profileData.id;
        recipientName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 
                       profileData.custom_id || 
                       profileData.public_id || 
                       'Utilisateur';
      } else {
        // 2. Sinon, chercher dans agents_management (agent_code)
        console.log('🔍 Recherche dans agents_management...');
        const { data: agentData, error: agentError } = await supabase
          .from('agents_management')
          .select('user_id, name, agent_code')
          .eq('agent_code', recipientId.toUpperCase())
          .eq('is_active', true)
          .maybeSingle();

        if (agentError) {
          console.error('❌ Erreur recherche agent:', agentError);
          toast.error('Erreur lors de la recherche de l\'agent');
          return;
        }

        if (agentData && agentData.user_id) {
          console.log('📋 Agent trouvé:', agentData);
          recipientUuid = agentData.user_id;
          recipientName = agentData.name || agentData.agent_code;
        } else {
          // 3. Sinon, chercher dans bureaus (bureau_code)
          console.log('🔍 Recherche dans bureaus...');
          const { data: bureauData, error: bureauError } = await supabase
            .from('bureaus')
            .select('id, bureau_code, president_name, commune, prefecture')
            .eq('bureau_code', recipientId.toUpperCase())
            .eq('status', 'active')
            .maybeSingle();

          if (bureauError) {
            console.error('❌ Erreur recherche bureau:', bureauError);
            toast.error('Erreur lors de la recherche du bureau');
            return;
          }

          if (bureauData) {
            console.log('📋 Bureau trouvé:', bureauData);
            // Vérifier que le bureau a un wallet
            const { data: bureauWallet, error: walletError } = await supabase
              .from('bureau_wallets')
              .select('id, balance')
              .eq('bureau_id', bureauData.id)
              .single();

            if (walletError || !bureauWallet) {
              console.error('❌ Bureau sans wallet:', walletError);
              toast.error('Ce bureau n\'a pas de portefeuille configuré');
              return;
            }

            // Utiliser l'ID du bureau comme identifiant spécial avec préfixe
            recipientUuid = `bureau:${bureauData.id}:${bureauWallet.id}`;
            recipientName = `Bureau ${bureauData.bureau_code} - ${bureauData.commune} (${bureauData.president_name || 'Président'})`;
          }
        }
      }

      // Si aucun destinataire trouvé
      if (!recipientUuid) {
        console.error('❌ Aucun destinataire trouvé avec ID:', recipientId);
        toast.error(`Destinataire introuvable: ${recipientId}`);
        return;
      }

      // Vérifier si c'est un transfert vers un bureau
      const isBureauTransfer = recipientUuid.startsWith('bureau:');
      
      if (!isBureauTransfer && recipientUuid === effectiveUserId) {
        toast.error('Vous ne pouvez pas transférer à vous-même');
        return;
      }

      console.log('🔍 Prévisualisation pour:', { 
        sender: effectiveUserId, 
        receiver: recipientUuid,
        recipient_name: recipientName,
        amount,
        isBureauTransfer
      });

      if (isBureauTransfer) {
        // Pour les transferts vers bureau, calculer les frais manuellement
        const feeRate = 0.01; // 1% de frais
        const feeAmount = Math.ceil(amount * feeRate);
        const totalDebit = amount + feeAmount;

        if (totalDebit > (wallet?.balance || 0)) {
          toast.error('Solde insuffisant pour couvrir le montant et les frais');
          return;
        }

        setTransferPreview({ 
          success: true,
          amount: amount,
          fee_amount: feeAmount,
          total_debit: totalDebit,
          recipient_uuid: recipientUuid,
          recipient_name: recipientName,
          is_bureau_transfer: true
        });
        setShowTransferPreview(true);
        setTransferOpen(false);
      } else {
        // Appeler la fonction de prévisualisation pour les transferts normaux
        const { data, error } = await supabase.rpc('preview_wallet_transfer', {
          p_sender_id: effectiveUserId,
          p_receiver_id: recipientUuid,
          p_amount: amount
        });

        if (error) {
          console.error('❌ Erreur RPC:', error);
          toast.error(error.message || 'Erreur lors de la prévisualisation');
          return;
        }

        console.log('✅ Réponse prévisualisation:', data);

        const previewData = data as any;

        if (!previewData.success) {
          console.error('❌ Preview échouée:', previewData.error);
          toast.error(previewData.error || 'Erreur inconnue');
          return;
        }

        setTransferPreview({ 
          ...previewData, 
          recipient_uuid: recipientUuid,
          recipient_name: recipientName,
          is_bureau_transfer: false
        });
        setShowTransferPreview(true);
        setTransferOpen(false);
      }
    } catch (error: any) {
      console.error('❌ Erreur prévisualisation:', error);
      toast.error(error.message || 'Erreur lors de la prévisualisation');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!user?.id || !transferPreview) return;
    
    setProcessing(true);
    setShowTransferPreview(false);
    
    try {
      console.log('🔄 Exécution du transfert:', {
        sender: effectiveUserId,
        receiver: transferPreview.recipient_uuid,
        amount: transferPreview.amount,
        description: transferDescription,
        is_bureau_transfer: transferPreview.is_bureau_transfer
      });

      if (transferPreview.is_bureau_transfer) {
        // Transfert vers un bureau - gestion manuelle
        const parts = transferPreview.recipient_uuid.split(':');
        const bureauId = parts[1];
        const bureauWalletId = parts[2];

        // 1. Débiter le wallet de l'expéditeur
        const { data: senderWallet, error: senderError } = await supabase
          .from('wallets')
          .select('id, balance')
          .eq('user_id', effectiveUserId)
          .single();

        if (senderError || !senderWallet) {
          throw new Error('Impossible de trouver votre portefeuille');
        }

        if (senderWallet.balance < transferPreview.total_debit) {
          throw new Error('Solde insuffisant');
        }

        // 2. Mettre à jour le solde de l'expéditeur
        const { error: updateSenderError } = await supabase
          .from('wallets')
          .update({ 
            balance: senderWallet.balance - transferPreview.total_debit,
            updated_at: new Date().toISOString()
          })
          .eq('id', senderWallet.id);

        if (updateSenderError) throw updateSenderError;

        // 3. Créditer le wallet du bureau
        const { data: bureauWallet, error: bureauWalletError } = await supabase
          .from('bureau_wallets')
          .select('balance')
          .eq('id', bureauWalletId)
          .single();

        if (bureauWalletError || !bureauWallet) {
          throw new Error('Impossible de trouver le portefeuille du bureau');
        }

        const { error: updateBureauError } = await supabase
          .from('bureau_wallets')
          .update({ 
            balance: bureauWallet.balance + transferPreview.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', bureauWalletId);

        if (updateBureauError) throw updateBureauError;

        // 4. Enregistrer la transaction dans wallet_transactions
        const transactionId = `TRX-BUREAU-${Date.now()}`;
        await supabase.from('wallet_transactions').insert({
          transaction_id: transactionId,
          transaction_type: 'transfer',
          amount: transferPreview.total_debit,
          net_amount: transferPreview.amount,
          fee: transferPreview.fee_amount,
          currency: 'GNF',
          status: 'completed',
          description: `${transferDescription} (vers Bureau ${recipientId})`,
          sender_wallet_id: senderWallet.id,
          receiver_wallet_id: bureauWalletId,
          completed_at: new Date().toISOString(),
          metadata: {
            recipient_type: 'bureau',
            bureau_id: bureauId,
            bureau_wallet_id: bureauWalletId,
            bureau_code: recipientId
          }
        });

        // 5. Enregistrer aussi dans bureau_transactions
        await supabase.from('bureau_transactions').insert({
          bureau_id: bureauId,
          type: 'credit',
          amount: transferPreview.amount,
          date: new Date().toISOString(),
          description: `Transfert reçu: ${transferDescription}`,
          status: 'completed'
        });

        console.log('✅ Transfert bureau réussi');
      } else {
        // Transfert normal vers un utilisateur
        const { data, error } = await supabase.rpc('process_wallet_transaction', {
          p_sender_id: effectiveUserId,
          p_receiver_id: transferPreview.recipient_uuid,
          p_amount: transferPreview.amount,
          p_currency: 'GNF',
          p_description: transferDescription
        });

        if (error) {
          console.error('❌ Erreur transfert:', error);
          throw error;
        }

        console.log('✅ Transfert réussi:', data);
      }

      toast.success(
        `✅ Transfert réussi vers ${transferPreview.recipient_name || 'le destinataire'}\n💸 Frais appliqués : ${transferPreview.fee_amount.toLocaleString()} GNF\n📤 Total débité : ${transferPreview.total_debit.toLocaleString()} GNF\n📥 Montant reçu : ${transferPreview.amount.toLocaleString()} GNF`,
        { duration: 6000 }
      );
      
      setTransferAmount('');
      setRecipientId('');
      setTransferDescription('');
      setTransferPreview(null);
      await Promise.all([loadWalletData(), loadTransactions()]);
    } catch (error: any) {
      console.error('❌ Erreur transfert:', error);
      // Afficher le message d'erreur spécifique
      const errorMessage = error.message || error.error || 'Erreur lors du transfert';
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' GNF';
  };

  const getTransactionType = (tx: Transaction) => {
    if (tx.sender_id === effectiveUserId && tx.receiver_id === effectiveUserId) {
      return tx.method === 'deposit' ? 'Dépôt' : 'Retrait';
    }
    return tx.sender_id === effectiveUserId ? 'Envoi' : 'Réception';
  };

  const getTransactionColor = (tx: Transaction) => {
    if (tx.sender_id === effectiveUserId && tx.receiver_id === effectiveUserId) {
      return tx.method === 'deposit' ? 'text-green-600' : 'text-orange-600';
    }
    return tx.sender_id === effectiveUserId ? 'text-red-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Attendre que le profil soit chargé (uniquement si aucun userId n'est fourni en prop)
  if (!profile && !propUserId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground" />
            <div>
              <p className="font-semibold">Chargement du profil...</p>
              <p className="text-sm text-muted-foreground">Veuillez patienter</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-client-gradient flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle>Mon Wallet</CardTitle>
              <CardDescription>Gérez vos transactions</CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => Promise.all([loadWalletData(), loadTransactions()])}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Solde */}
        <div className="bg-client-gradient rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm opacity-90">Solde disponible</p>
            {isAgent && agentInfo ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {agentInfo.agent_code}
              </Badge>
            ) : userCustomId ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {userCustomId}
              </Badge>
            ) : profile?.role ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {profile.role}
              </Badge>
            ) : null}
          </div>
          <p className="text-3xl font-bold">
            {wallet ? formatPrice(wallet.balance) : 'Chargement...'}
          </p>
        </div>

        {/* Boutons d'actions */}
        <div className="grid grid-cols-3 gap-3">
          {/* Dépôt */}
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-20 gap-2">
                <ArrowDownToLine className="w-5 h-5 text-green-600" />
                <span className="text-xs">Dépôt</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Effectuer un dépôt</DialogTitle>
                <DialogDescription>
                  Ajoutez des fonds à votre wallet
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deposit-amount">Montant (GNF)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="10000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleDeposit} 
                  disabled={processing || !depositAmount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {processing ? 'Traitement...' : 'Confirmer le dépôt'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Retrait */}
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-20 gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-orange-600" />
                <span className="text-xs">Retrait</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Effectuer un retrait</DialogTitle>
                <DialogDescription>
                  Retirez des fonds de votre wallet
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="withdraw-amount">Montant (GNF)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="10000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solde disponible: {wallet ? formatPrice(wallet.balance) : '0 GNF'}
                  </p>
                </div>
                <Button 
                  onClick={handleWithdraw} 
                  disabled={processing || !withdrawAmount}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {processing ? 'Traitement...' : 'Confirmer le retrait'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Transfert */}
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-20 gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <span className="text-xs">Transfert</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Effectuer un transfert</DialogTitle>
                <DialogDescription>
                  Transférez des fonds à un autre utilisateur
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipient-id">ID du destinataire</Label>
                  <Input
                    id="recipient-id"
                    placeholder="Ex: USR0001"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrez l'ID standardisé du destinataire (format: AAA0000)
                  </p>
                </div>
                <div>
                  <Label htmlFor="transfer-amount">Montant (GNF)</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    placeholder="10000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solde disponible: {wallet ? formatPrice(wallet.balance) : '0 GNF'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="transfer-description">Motif du transfert</Label>
                  <Input
                    id="transfer-description"
                    placeholder="Ex: Paiement facture, Remboursement..."
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handlePreviewTransfer} 
                  disabled={processing || !transferAmount || !recipientId || !transferDescription}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? 'Traitement...' : 'Voir les frais et confirmer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dialog de confirmation avec prévisualisation des frais */}
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
                    {transferPreview?.recipient_name && (
                      <div className="flex justify-between items-center pb-3 border-b">
                        <span className="text-sm font-medium">👤 Destinataire</span>
                        <span className="text-lg font-semibold text-primary">{transferPreview.recipient_name}</span>
                      </div>
                    )}
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
              <AlertDialogCancel disabled={processing}>Non, annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmTransfer} disabled={processing}>
                Oui, confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Historique des transactions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Historique récent</h3>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getTransactionType(tx)}{' '}
                      {(tx.sender_id !== effectiveUserId || tx.receiver_id !== effectiveUserId) && (
                        <span className="font-mono text-primary text-xs">
                          ({tx.sender_id === effectiveUserId ? tx.receiver_custom_id : tx.sender_custom_id})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {tx.metadata?.description && (
                        <span className="block mt-1 italic">
                          {tx.metadata.description}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTransactionColor(tx)}`}>
                      {tx.sender_id === effectiveUserId && tx.receiver_id !== effectiveUserId ? '-' : '+'}
                      {formatPrice(tx.amount)}
                    </p>
                    {tx.sender_id === effectiveUserId && tx.metadata?.fee_amount && (
                      <p className="text-xs text-orange-600">
                        +{formatPrice(tx.metadata.fee_amount)} frais
                      </p>
                    )}
                    <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UniversalWalletTransactions;
