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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertCircle,
  CreditCard,
  Smartphone,
  Shield
} from 'lucide-react';
import { StripeCardPaymentModal } from '@/components/pos/StripeCardPaymentModal';

interface UniversalWalletTransactionsProps {
  userId?: string;
  showBalance?: boolean;
}

interface WalletInfo {
  id: string | number;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_custom_id?: string;
  receiver_custom_id?: string;
  sender_name?: string;
  receiver_name?: string;
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
  const [depositMethod, setDepositMethod] = useState<'card' | 'mobile_money'>('card');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<'orange' | 'mtn'>('orange');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'card' | 'mobile_money'>('mobile_money');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState<'orange' | 'mtn'>('orange');
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  
  // États des dialogs
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [showTransferPreview, setShowTransferPreview] = useState(false);
  const [transferPreview, setTransferPreview] = useState<any>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

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
        // Si ce n'est pas un agent, charger le public_id depuis profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('public_id')
          .eq('id', effectiveUserId)
          .maybeSingle();

        if (profileData?.public_id) {
          setUserCustomId(profileData.public_id);
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
      // IMPORTANT: Tous les utilisateurs (y compris les agents) utilisent la table 'wallets'
      // car c'est là que les transferts sont crédités via process_wallet_transaction
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
        // Créer le wallet directement dans la table wallets
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
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
      toast.error('Erreur lors du chargement du wallet');
      setLoading(false);
    }
  };


  const loadTransactions = async () => {
    if (!effectiveUserId) return;

    console.info('[WalletTx] loadTransactions v3', { effectiveUserId });

    try {
      // Charger depuis enhanced_transactions (exclure les archivées)
      const { data: enhancedData, error: enhancedError } = await (supabase
        .from('enhanced_transactions' as any)
        .select('*')
        .or(`sender_id.eq.${effectiveUserId},receiver_id.eq.${effectiveUserId}`)
        .neq('is_archived', true)
        .order('created_at', { ascending: false })
        .limit(10) as any);

      if (enhancedError) console.error('Erreur enhanced_transactions:', enhancedError);

      // D'abord récupérer le wallet_id de l'utilisateur
      const { data: userWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      const userWalletId = userWallet?.id ?? null;

      // Charger les wallet_transactions seulement si on a un wallet_id
      let walletTxData: any[] = [];
      if (userWalletId) {
        const { data: wtData, error: walletError } = await supabase
          .from('wallet_transactions' as any)
          .select('*')
          .or(`sender_wallet_id.eq.${userWalletId},receiver_wallet_id.eq.${userWalletId}`)
          .neq('is_archived', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (walletError) console.error('Erreur wallet_transactions:', walletError);
        if (wtData) walletTxData = wtData;
      }

      // -------- Résolution des identités (nom + ID standardisé) --------
      // 1) Pour wallet_transactions: convertir wallet_id -> user_id (contrepartie)
      const otherWalletIds = userWalletId
        ? Array.from(
            new Set(
              walletTxData
                .map((tx) => (tx.sender_wallet_id === userWalletId ? tx.receiver_wallet_id : tx.sender_wallet_id))
                .filter(Boolean)
            )
          )
        : [];

      let otherWalletRows: Array<{ id: string; user_id: string }> = [];
      if (otherWalletIds.length > 0) {
        const { data } = await supabase
          .from('wallets')
          .select('id, user_id')
          .in('id', otherWalletIds);
        otherWalletRows = (data ?? []) as any;
      }

      const walletIdToUserId = new Map(otherWalletRows.map((w) => [w.id, w.user_id]));

      // 2) Collecter tous les user_id à résoudre (enhanced + wallet_transactions)
      const userIdsToResolve = new Set<string>();

      if (enhancedData) {
        for (const tx of enhancedData as any[]) {
          if (tx.sender_id) userIdsToResolve.add(tx.sender_id);
          if (tx.receiver_id) userIdsToResolve.add(tx.receiver_id);
        }
      }

      for (const w of otherWalletRows) {
        if (w.user_id) userIdsToResolve.add(w.user_id);
      }

      // 3) Charger en batch: profiles avec public_id et full_name
      const idsArray = Array.from(userIdsToResolve);
      let profilesRows: Array<{ id: string; public_id: string | null; full_name: string | null }> = [];

      if (idsArray.length > 0) {
        const { data: profilesRes } = await supabase
          .from('profiles')
          .select('id, public_id, full_name')
          .in('id', idsArray);

        profilesRows = (profilesRes ?? []) as any;
      }

      const userIdToPublicId = new Map(profilesRows.map((r) => [r.id, r.public_id]));
      const userIdToName = new Map(profilesRows.map((r) => [r.id, r.full_name]));

      const getUserDisplay = (uid?: string | null) => {
        if (!uid) {
          return { name: 'Système', customId: 'SYS' };
        }
        return {
          name: userIdToName.get(uid) || 'Utilisateur',
          customId: userIdToPublicId.get(uid) || uid.slice(0, 8),
        };
      };

      // -------- Construction liste finale --------
      const allTransactions: any[] = [];

      // Ajouter les enhanced_transactions
      if (enhancedData) {
        for (const tx of enhancedData as any[]) {
          const sender = getUserDisplay(tx.sender_id);
          const receiver = getUserDisplay(tx.receiver_id);

          allTransactions.push({
            ...tx,
            sender_custom_id: sender.customId,
            receiver_custom_id: receiver.customId,
            sender_name: sender.name,
            receiver_name: receiver.name,
            source: 'enhanced',
          });
        }
      }

      // Ajouter les wallet_transactions
      if (walletTxData.length > 0) {
        for (const tx of walletTxData as any[]) {
          const metadata = (tx.metadata ?? {}) as any;
          const isBureauTransfer = metadata?.recipient_type === 'bureau' || !!metadata?.bureau_id;

          const isOutgoing = userWalletId ? tx.sender_wallet_id === userWalletId : false;
          const otherWalletId = isOutgoing ? tx.receiver_wallet_id : tx.sender_wallet_id;
          const otherUserId = otherWalletId ? walletIdToUserId.get(otherWalletId) : null;

          const counterparty = isBureauTransfer
            ? {
                id: metadata?.bureau_id ?? null,
                name: metadata?.bureau_name || metadata?.bureau_code || 'Bureau',
                customId: metadata?.bureau_code || 'Bureau',
              }
            : {
                id: otherUserId,
                ...getUserDisplay(otherUserId),
              };

          const sender_id = isOutgoing ? effectiveUserId : counterparty.id || 'system';
          const receiver_id = isOutgoing ? counterparty.id || 'system' : effectiveUserId;

          allTransactions.push({
            id: tx.id,
            sender_id,
            receiver_id,
            amount: tx.amount,
            method: tx.transaction_type,
            status: tx.status,
            currency: tx.currency ?? 'GNF',
            created_at: tx.created_at,
            metadata: {
              ...metadata,
              description: tx.description ?? metadata?.description,
              fee_amount: tx.fee ?? metadata?.fee_amount,
              net_amount: tx.net_amount ?? metadata?.net_amount,
            },
            sender_custom_id: isOutgoing ? 'Vous' : (counterparty.customId || 'SYS'),
            receiver_custom_id: isOutgoing ? (counterparty.customId || 'SYS') : 'Vous',
            sender_name: isOutgoing ? 'Vous' : (counterparty.name || 'Système'),
            receiver_name: isOutgoing ? (counterparty.name || 'Système') : 'Vous',
            source: 'wallet',
            is_bureau_transfer: isBureauTransfer,
          });
        }
      }

      // Trier par date décroissante et limiter
      allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const visible = allTransactions.slice(0, 15);
      setTransactions(visible);

      const unresolved = visible
        .filter((t) => t.sender_name === 'Utilisateur' || t.receiver_name === 'Utilisateur')
        .slice(0, 3);

      console.info('[WalletTx] loaded', {
        enhancedCount: enhancedData?.length ?? 0,
        walletTxCount: walletTxData.length,
        resolvedUserIds: idsArray.length,
        profilesCount: profilesRows.length,
        sampleUnresolved: unresolved,
      });
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
      receive: ['admin', 'agent', 'vendeur', 'client', 'livreur'],
      withdraw: ['admin', 'agent', 'vendeur', 'client', 'livreur'],
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

    // Si Mobile Money, utiliser Djomy
    if (depositMethod === 'mobile_money') {
      await handleMobileMoneyDeposit(amount);
      return;
    }

    // Sinon, dépôt manuel (dev mode)
    setProcessing(true);
    console.log('🔄 Dépôt manuel en cours:', { amount, userId: effectiveUserId });
    
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
      
      // ⚡ Update atomique
      const { error: balanceError } = await (supabase
        .rpc('update_wallet_balance_atomic' as any, {
          p_wallet_id: Number(walletData.id),
          p_amount: amount,
          p_tx_id: referenceNumber,
          p_description: 'Dépôt manuel sur le wallet'
        }) as any);

      if (balanceError) throw balanceError;

      // Enregistrer transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions' as any)
        .insert({
          amount: amount,
          net_amount: amount,
          fee: 0,
          currency: 'GNF',
          status: 'completed',
          description: 'Dépôt manuel sur le wallet',
          receiver_wallet_id: Number(walletData.id),
          receiver_user_id: effectiveUserId,
          metadata: { transaction_type: 'deposit', reference: referenceNumber }
        });

      if (transactionError) console.warn('Transaction log failed:', transactionError);

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

  const handleMobileMoneyDeposit = async (amount: number) => {
    // Nettoyer et valider le numéro
    const cleanPhone = mobileMoneyPhone.replace(/[^0-9]/g, '').replace(/^(224|00224)/, '');
    
    if (!cleanPhone || cleanPhone.length !== 9) {
      toast.error('Numéro de téléphone invalide', {
        description: `Entrez 9 chiffres (ex: 621234567). Vous avez entré: ${cleanPhone.length} chiffres`
      });
      return;
    }

    setProcessing(true);
    const loadingToast = toast.loading('Initialisation du paiement Mobile Money...');

    try {
      const paymentMethodCode = mobileMoneyProvider === 'orange' ? 'OM' : 'MOMO';
      
      const { data, error } = await supabase.functions.invoke('djomy-init-payment', {
        body: {
          amount: amount,
          payerPhone: `224${cleanPhone}`,
          paymentMethod: paymentMethodCode,
          description: `Recharge wallet - ${amount.toLocaleString()} GNF`,
          orderId: `WLT-${Date.now()}`,
          useSandbox: false, // ✅ MODE PRODUCTION
          countryCode: 'GN',
        }
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      if (data?.success) {
        toast.success('Demande de paiement envoyée!', {
          description: `Confirmez le paiement sur votre téléphone ${paymentMethodCode}`
        });

        // Polling pour vérifier le statut
        pollPaymentStatus(data.transactionId, amount);
      } else {
        throw new Error(data?.message || 'Erreur initialisation paiement');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('❌ Erreur paiement Mobile Money:', error);
      toast.error('Échec du paiement Mobile Money', {
        description: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const pollPaymentStatus = async (transactionId: string, amount: number) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    const checkStatus = setInterval(async () => {
      attempts++;

      try {
        // Vérifier si le solde a augmenté (simple check)
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', effectiveUserId)
          .single();

        if (walletData && wallet && walletData.balance > wallet.balance) {
          clearInterval(checkStatus);
          toast.success('✅ Paiement confirmé!', {
            description: `${formatPrice(amount)} ajoutés à votre wallet`
          });
          setDepositAmount('');
          setMobileMoneyPhone('');
          setDepositOpen(false);
          await Promise.all([loadWalletData(), loadTransactions()]);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkStatus);
          toast.warning('⏱️ Délai dépassé', {
            description: 'Vérifiez manuellement le statut du paiement'
          });
        }
      } catch (error) {
        console.error('Erreur poll status:', error);
      }
    }, 5000);
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

    const minAmount = withdrawMethod === 'card' ? 50000 : 5000;
    if (amount < minAmount) {
      toast.error(`INVALID_AMOUNT: Montant minimum ${formatPrice(minAmount)}`);
      return;
    }

    if (!wallet || wallet.balance < amount) {
      toast.error(`INSUFFICIENT_FUNDS: Solde insuffisant (${formatPrice(wallet?.balance || 0)} disponible)`);
      return;
    }

    // Validation spécifique à la méthode
    if (withdrawMethod === 'mobile_money') {
      const cleanPhone = withdrawPhone.replace(/[^0-9]/g, '').replace(/^(224|00224)/, '');
      if (!cleanPhone || cleanPhone.length !== 9) {
        toast.error('Numéro de téléphone invalide (9 chiffres requis)');
        return;
      }
    }

    setProcessing(true);
    console.log('🔄 Retrait en cours:', { amount, method: withdrawMethod, userId: effectiveUserId });
    
    try {
      if (withdrawMethod === 'mobile_money') {
        // Appeler l'edge function Mobile Money Withdrawal
        const cleanPhone = withdrawPhone.replace(/[^0-9]/g, '').replace(/^(224|00224)/, '');
        
        const { data, error } = await supabase.functions.invoke('mobile-money-withdrawal', {
          body: {
            amount,
            phoneNumber: cleanPhone,
            provider: withdrawProvider,
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erreur lors du retrait');

        console.log('✅ Retrait Mobile Money:', data);
        
        const providerLabel = withdrawProvider === 'orange' ? 'Orange Money' : 'MTN MoMo';
        if (data.status === 'completed') {
          toast.success(`Retrait ${providerLabel} effectué !`, {
            description: `${formatPrice(data.netAmount)} envoyés vers +224${cleanPhone}`
          });
        } else {
          toast.success(`Demande de retrait ${providerLabel} enregistrée !`, {
            description: `${formatPrice(data.netAmount)} seront envoyés sous 24-48h`
          });
        }

      } else if (withdrawMethod === 'card') {
        // Appeler l'edge function Stripe Withdrawal
        const { data, error } = await supabase.functions.invoke('stripe-withdrawal', {
          body: {
            amount,
            currency: 'gnf',
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erreur lors du retrait');

        console.log('✅ Retrait Stripe:', data);
        
        toast.success(`Demande de retrait de ${formatPrice(amount)} enregistrée !`, {
          description: `Montant net: ${formatPrice(data.netAmount)} (frais: ${formatPrice(data.withdrawalFee)}). Virement sous 24-48h.`
        });
      }
      
      setWithdrawAmount('');
      setWithdrawPhone('');
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

        if (updateBureauError) {
          console.error('❌ Erreur update bureau_wallets:', updateBureauError);
          throw new Error('Impossible de créditer le portefeuille du bureau: ' + updateBureauError.message);
        }

        console.log('✅ Bureau wallet crédité avec succès');

        // 4. Enregistrer la transaction dans wallet_transactions
        const transactionId = `TRX-BUREAU-${Date.now()}`;
        const { error: txError } = await supabase.from('wallet_transactions').insert({
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

        if (txError) {
          console.error('❌ Erreur insert wallet_transactions:', txError);
          // Ne pas throw car le transfert est déjà fait
        }

        // 5. Enregistrer aussi dans bureau_transactions
        const { error: bureauTxError } = await supabase.from('bureau_transactions').insert({
          bureau_id: bureauId,
          type: 'credit',
          amount: transferPreview.amount,
          date: new Date().toISOString(),
          description: `Transfert reçu: ${transferDescription || 'Sans description'}`,
          status: 'completed'
        });

        if (bureauTxError) {
          console.error('❌ Erreur insert bureau_transactions:', bureauTxError);
          // Ne pas throw car le transfert est déjà fait
        }

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
    <>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Effectuer un dépôt</DialogTitle>
                <DialogDescription>
                  Ajoutez des fonds à votre wallet
                </DialogDescription>
              </DialogHeader>
              <Tabs value={depositMethod} onValueChange={(v) => setDepositMethod(v as 'card' | 'mobile_money')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="card" className="gap-1 text-xs">
                    <CreditCard className="w-3 h-3" />
                    Carte
                  </TabsTrigger>
                  <TabsTrigger value="mobile_money" className="gap-1 text-xs">
                    <Smartphone className="w-3 h-3" />
                    Mobile
                  </TabsTrigger>
                </TabsList>
                
                {/* Onglet Carte Bancaire - Stripe */}
                <TabsContent value="card" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <Label>Montants rapides</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[10000, 25000, 50000, 100000, 250000, 500000].map((amt) => (
                        <Button
                          key={amt}
                          variant={depositAmount === amt.toString() ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDepositAmount(amt.toString())}
                          className="text-xs"
                        >
                          {amt.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="card-deposit-amount">Montant personnalisé (GNF)</Label>
                    <Input
                      id="card-deposit-amount"
                      type="number"
                      placeholder="Ex: 100000"
                      min="5000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum: 5,000 GNF</p>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-700">Paiement 100% sécurisé via Stripe</p>
                  </div>
                  
                  <Button 
                    onClick={() => {
                      const numAmount = parseFloat(depositAmount);
                      if (!numAmount || numAmount < 5000) {
                        toast.error('Montant minimum: 5,000 GNF');
                        return;
                      }
                      setShowStripeModal(true);
                    }}
                    disabled={processing || !depositAmount || parseFloat(depositAmount) < 5000}
                    className="w-full"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer {depositAmount ? `${parseFloat(depositAmount).toLocaleString()} GNF` : ''}
                  </Button>
                  
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="text-xs text-muted-foreground">Cartes acceptées:</span>
                    <div className="flex gap-2">
                      <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-[6px] font-bold">
                        VISA
                      </div>
                      <div className="w-8 h-5 bg-gradient-to-r from-red-600 to-orange-500 rounded flex items-center justify-center">
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="mobile_money" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="mobile-provider">Opérateur</Label>
                    <Select value={mobileMoneyProvider} onValueChange={(v) => setMobileMoneyProvider(v as 'orange' | 'mtn')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orange">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            Orange Money
                          </div>
                        </SelectItem>
                        <SelectItem value="mtn">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            MTN MoMo
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="mobile-phone">Numéro de téléphone</Label>
                    <div className="flex gap-2">
                      <Input
                        value="224"
                        disabled
                        className="w-16"
                      />
                      <Input
                        id="mobile-phone"
                        type="tel"
                        placeholder="621234567"
                        maxLength={9}
                        value={mobileMoneyPhone}
                        onChange={(e) => setMobileMoneyPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">9 chiffres sans le +224</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="mobile-amount">Montant (GNF)</Label>
                    <Input
                      id="mobile-amount"
                      type="number"
                      placeholder="10000"
                      min="1000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum: 1 000 GNF</p>
                  </div>
                  
                  <Button 
                    onClick={handleDeposit} 
                    disabled={processing || !depositAmount || !mobileMoneyPhone || mobileMoneyPhone.length !== 9}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {processing ? 'Traitement...' : `Recharger ${depositAmount ? parseFloat(depositAmount).toLocaleString() : '0'} GNF`}
                  </Button>
                </TabsContent>
              </Tabs>
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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Effectuer un retrait</DialogTitle>
                <DialogDescription>
                  Retirez des fonds de votre wallet vers votre compte
                </DialogDescription>
              </DialogHeader>
              
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mb-2">
                <p className="text-sm text-orange-800">
                  Solde disponible: <span className="font-bold">{wallet ? formatPrice(wallet.balance) : '0 GNF'}</span>
                </p>
              </div>
              
              <Tabs value={withdrawMethod} onValueChange={(v) => setWithdrawMethod(v as 'card' | 'mobile_money')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mobile_money" className="gap-2">
                    <Smartphone className="w-4 h-4" />
                    Mobile Money
                  </TabsTrigger>
                  <TabsTrigger value="card" className="gap-2">
                    <CreditCard className="w-4 h-4" />
                    Carte
                  </TabsTrigger>
                </TabsList>
                
                {/* Retrait Mobile Money */}
                <TabsContent value="mobile_money" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="withdraw-provider">Opérateur</Label>
                    <Select value={withdrawProvider} onValueChange={(v) => setWithdrawProvider(v as 'orange' | 'mtn')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="orange">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            Orange Money
                          </div>
                        </SelectItem>
                        <SelectItem value="mtn">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            MTN MoMo
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="withdraw-phone">Numéro de téléphone</Label>
                    <div className="flex gap-2">
                      <Input
                        value="224"
                        disabled
                        className="w-16"
                      />
                      <Input
                        id="withdraw-phone"
                        type="tel"
                        placeholder="621234567"
                        maxLength={9}
                        value={withdrawPhone}
                        onChange={(e) => setWithdrawPhone(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">9 chiffres sans le +224</p>
                  </div>
                  
                  <div>
                    <Label>Montants rapides</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[10000, 25000, 50000, 100000, 200000, 500000].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant={withdrawAmount === amt.toString() ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setWithdrawAmount(amt.toString())}
                          className="text-xs"
                          disabled={wallet && wallet.balance < amt}
                        >
                          {amt.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="withdraw-amount-mm">Montant personnalisé (GNF)</Label>
                    <Input
                      id="withdraw-amount-mm"
                      type="number"
                      placeholder="Ex: 100000"
                      min="5000"
                      max={wallet?.balance || 0}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum: 5,000 GNF</p>
                  </div>
                  
                  <Button 
                    onClick={handleWithdraw} 
                    disabled={processing || !withdrawAmount || !withdrawPhone || withdrawPhone.length !== 9 || parseFloat(withdrawAmount) < 5000}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {processing ? 'Traitement...' : `Retirer ${withdrawAmount ? parseFloat(withdrawAmount).toLocaleString() : '0'} GNF`}
                  </Button>
                  
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-700">Le retrait sera traité sous 24-48h</p>
                  </div>
                </TabsContent>
                
                {/* Retrait Carte bancaire */}
                <TabsContent value="card" className="space-y-4 mt-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Retrait vers carte bancaire</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Le montant sera transféré sur votre carte bancaire enregistrée. Délai: 3-5 jours ouvrés.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Montants rapides</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[50000, 100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant={withdrawAmount === amt.toString() ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setWithdrawAmount(amt.toString())}
                          className="text-xs"
                          disabled={wallet && wallet.balance < amt}
                        >
                          {amt >= 1000000 ? `${(amt/1000000).toFixed(0)}M` : `${(amt/1000).toFixed(0)}k`}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="withdraw-amount-card">Montant à retirer (GNF)</Label>
                    <Input
                      id="withdraw-amount-card"
                      type="number"
                      placeholder="Ex: 500000"
                      min="50000"
                      max={wallet?.balance || 0}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum: 50,000 GNF pour les retraits par carte</p>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700">Transaction sécurisée via Stripe</p>
                  </div>
                  
                  <Button 
                    onClick={handleWithdraw} 
                    disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) < 50000}
                    className="w-full"
                  >
                    {processing ? 'Traitement...' : `Demander le retrait de ${withdrawAmount ? parseFloat(withdrawAmount).toLocaleString() : '0'} GNF`}
                  </Button>
                  
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <span className="text-xs text-muted-foreground">Cartes supportées:</span>
                    <div className="flex gap-2">
                      <div className="w-8 h-5 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-[6px] font-bold">
                        VISA
                      </div>
                      <div className="w-8 h-5 bg-gradient-to-r from-red-600 to-orange-500 rounded flex items-center justify-center">
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
              {(showAllTransactions ? transactions : transactions.slice(0, 4)).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getTransactionType(tx)}{' '}
                      {(tx.sender_id !== effectiveUserId || tx.receiver_id !== effectiveUserId) && (
                        <>
                          <span className="text-foreground">
                            {tx.sender_id === effectiveUserId 
                              ? (tx.receiver_name || 'Utilisateur')
                              : (tx.sender_name || 'Utilisateur')}
                          </span>
                          {' '}
                          <span className="font-mono text-primary text-xs">
                            ({tx.sender_id === effectiveUserId ? tx.receiver_custom_id : tx.sender_custom_id})
                          </span>
                        </>
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
              
              {transactions.length > 4 && (
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-sm"
                  onClick={() => setShowAllTransactions(!showAllTransactions)}
                >
                  {showAllTransactions 
                    ? 'Afficher moins' 
                    : `Voir tout (${transactions.length - 4} de plus)`}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    
    {/* Modal Stripe pour paiement par carte */}
    <StripeCardPaymentModal
      isOpen={showStripeModal}
      onClose={() => setShowStripeModal(false)}
      amount={parseFloat(depositAmount) || 0}
      currency="GNF"
      orderId={`TOPUP-${Date.now()}`}
      sellerId={effectiveUserId || ''} 
      description="Recharge wallet par carte bancaire"
      onSuccess={async (paymentIntentId) => {
        setProcessing(true);
        try {
          const numAmount = parseFloat(depositAmount);
          const referenceNumber = `TOP${Date.now()}${Math.floor(Math.random() * 1000)}`;
          
          // Créer la transaction de dépôt
          const { error: transactionError } = await supabase
            .from('wallet_transactions' as any)
            .insert({
              amount: numAmount,
              net_amount: numAmount,
              fee: 0,
              currency: 'GNF',
              status: 'completed',
              description: 'Recharge wallet par carte bancaire (Stripe)',
              receiver_wallet_id: Number(wallet?.id),
              metadata: { transaction_type: 'deposit', stripe_payment_intent_id: paymentIntentId, reference: referenceNumber }
            });

          if (transactionError) throw transactionError;

          // ⚡ Update atomique du balance
          const { error: balanceError } = await (supabase
            .rpc('update_wallet_balance_atomic' as any, {
              p_wallet_id: Number(wallet?.id),
              p_amount: numAmount,
              p_tx_id: referenceNumber,
              p_description: 'Recharge wallet par carte bancaire (Stripe)'
            }) as any);

          if (balanceError) throw balanceError;

          toast.success('Recharge réussie !', {
            description: `${numAmount.toLocaleString()} GNF ajoutés à votre wallet`
          });

          setDepositAmount('');
          setShowStripeModal(false);
          setDepositOpen(false);
          window.dispatchEvent(new Event('wallet-updated'));
          await loadWalletData(isAgent, agentInfo);
          await loadTransactions();
          
        } catch (error) {
          console.error('[StripeTopup] Error:', error);
          toast.error('Erreur lors de la recharge');
        } finally {
          setProcessing(false);
        }
      }}
      onError={(error) => {
        toast.error('Erreur paiement carte', { description: error });
        setShowStripeModal(false);
      }}
    />
  </>
  );
};

export default UniversalWalletTransactions;
