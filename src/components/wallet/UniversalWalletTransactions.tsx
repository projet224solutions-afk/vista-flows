import { useState, useEffect, lazy, Suspense } from 'react';
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
import { signedInvoke } from '@/lib/security/hmacSigner';
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
  Shield,
  Loader2
} from 'lucide-react';
import { Building2 } from 'lucide-react';
import StripeInlineDeposit from './StripeWalletDeposit';
import StripeWalletTopup from './StripeWalletTopup';
import PayPalInlineDeposit from './PayPalInlineDeposit';
import { usePriceConverter } from '@/hooks/usePriceConverter';
import { InternationalTransferConfirmation, type InternationalPreviewData } from './InternationalTransferConfirmation';
import {
  changeWalletPin,
  depositToWallet,
  getWalletPinStatus,
  setupWalletPin,
  transferToWallet,
  withdrawFromWallet,
} from '@/services/walletBackendService';
import { WalletPinPromptDialog, WalletPinSetupDialog } from './WalletPinDialogs';

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
  const { convert } = usePriceConverter();
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
  const [depositMethod, setDepositMethod] = useState<'card' | 'mobile_money' | 'card_stripe'>('card');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<'orange' | 'mtn'>('orange');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'mobile_money' | 'bank' | 'paypal'>('mobile_money');
  // Bank withdrawal states
  const [bankName, setBankName] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  // PayPal card deposit states
  const [cardDepositStep, setCardDepositStep] = useState<'input' | 'approve' | 'capturing'>('input');
  const [cardDepositOrderId, setCardDepositOrderId] = useState<string | null>(null);
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState<'orange' | 'mtn'>('orange');
  // PayPal states
  const [paypalDepositAmount, setPaypalDepositAmount] = useState('');
  const [paypalDepositStep, setPaypalDepositStep] = useState<'input' | 'approve' | 'capturing'>('input');
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalWithdrawEmail, setPaypalWithdrawEmail] = useState('');
  const [paypalWithdrawAmount, setPaypalWithdrawAmount] = useState('');
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
  const [intlPreview, setIntlPreview] = useState<InternationalPreviewData | null>(null);
  const [showIntlConfirm, setShowIntlConfirm] = useState(false);
  const [intlExecuting, setIntlExecuting] = useState(false);
  const [pinStatus, setPinStatus] = useState<{ pin_enabled: boolean; pin_locked_until: string | null } | null>(null);
  const [pinAction, setPinAction] = useState<'withdraw' | 'transfer' | 'intl-transfer' | null>(null);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [pinSetupMode, setPinSetupMode] = useState<'setup' | 'change'>('setup');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveUserId) {
      checkIfAgent();
      void loadPinStatus();
    } else {
      setLoading(false);
    }
  }, [effectiveUserId]);

  const loadPinStatus = async () => {
    const response = await getWalletPinStatus();
    if (response.success && response.data) {
      setPinStatus({
        pin_enabled: response.data.pin_enabled,
        pin_locked_until: response.data.pin_locked_until,
      });
    }
  };

  const requestTransactionPin = (action: 'withdraw' | 'transfer' | 'intl-transfer') => {
    setPinError(null);

    if (!pinStatus?.pin_enabled) {
      setPinSetupMode('setup');
      setPinSetupOpen(true);
      return;
    }

    setPinAction(action);
    setPinPromptOpen(true);
  };

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
        // Détecter la devise native de l'utilisateur depuis le profil
        let nativeCurrency = 'GNF';
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('detected_currency')
            .eq('id', effectiveUserId)
            .maybeSingle();
          if (profileData?.detected_currency) {
            nativeCurrency = profileData.detected_currency;
          }
        } catch (e) {
          console.warn('Could not detect user currency, defaulting to GNF');
        }

        // Créer le wallet avec la devise détectée
        const { data: newWallet, error: insertError } = await supabase
          .from('wallets')
          .insert({
            user_id: effectiveUserId,
            balance: 0,
            currency: nativeCurrency,
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
      // Charger depuis enhanced_transactions
      const { data: enhancedData, error: enhancedError } = await (supabase
        .from('enhanced_transactions' as any)
        .select('*')
        .or(`sender_id.eq.${effectiveUserId},receiver_id.eq.${effectiveUserId}`)
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
        const wtResult: any = await (supabase as any)
          .from('wallet_transactions')
          .select('*')
          .or(`sender_wallet_id.eq.${userWalletId},receiver_wallet_id.eq.${userWalletId}`)
          .order('created_at', { ascending: false })
          .limit(10);
        const wtData = wtResult.data || [];
        const walletError = wtResult.error;

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

      // 3) Charger en batch: profiles avec public_id, full_name, first_name, last_name, email
      const idsArray = Array.from(userIdsToResolve);
      let profilesRows: Array<{ id: string; public_id: string | null; full_name: string | null; first_name: string | null; last_name: string | null; email: string | null }> = [];

      if (idsArray.length > 0) {
        const { data: profilesRes } = await supabase
          .from('profiles')
          .select('id, public_id, full_name, first_name, last_name, email')
          .in('id', idsArray);

        profilesRows = (profilesRes ?? []) as any;
      }

      const userIdToPublicId = new Map(profilesRows.map((r) => [r.id, r.public_id]));
      const userIdToProfile = new Map(profilesRows.map((r) => [r.id, r]));

      const getUserDisplay = (uid?: string | null) => {
        if (!uid) {
          return { name: 'Système', customId: 'SYS' };
        }
        const p = userIdToProfile.get(uid);
        let name = 'Utilisateur';
        if (p) {
          // Priorité: full_name (si pas "Utilisateur") > first_name + last_name > email
          if (p.full_name && p.full_name !== 'Utilisateur') {
            name = p.full_name;
          } else if (p.first_name || p.last_name) {
            name = [p.first_name, p.last_name].filter(Boolean).join(' ');
          } else if (p.email) {
            name = p.email.split('@')[0];
          }
        }
        return {
          name,
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
    
    const normalizedRole = (profile?.role || '').toString().toLowerCase().trim();

    if (!normalizedRole) {
      toast.error('UNAUTHORIZED_ACTION: Rôle utilisateur non défini');
      return false;
    }

    const permissions: Record<string, string[]> = {
      send: ['admin', 'pdg', 'ceo', 'agent', 'vendor_agent', 'vendeur', 'client', 'livreur', 'taxi', 'syndicat', 'transitaire', 'bureau'],
      receive: ['admin', 'pdg', 'ceo', 'agent', 'vendor_agent', 'vendeur', 'client', 'livreur', 'taxi', 'syndicat', 'transitaire', 'bureau'],
      withdraw: ['admin', 'pdg', 'ceo', 'agent', 'vendor_agent', 'vendeur', 'client', 'livreur', 'taxi', 'syndicat', 'transitaire', 'bureau'],
      deposit: ['admin', 'pdg', 'ceo', 'agent', 'vendor_agent', 'vendeur', 'client', 'livreur', 'taxi', 'syndicat', 'transitaire', 'bureau']
    };

    if (!permissions[action].includes(normalizedRole)) {
      toast.error(`UNAUTHORIZED_ACTION: Votre rôle (${normalizedRole}) ne permet pas cette action`);
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

    // Si Mobile Money, utiliser ChapChapPay
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
      
      const backendResult = await depositToWallet(amount, 'Dépôt manuel sur le wallet', referenceNumber);
      if (!backendResult.success) {
        throw new Error(backendResult.error || 'Échec du dépôt wallet');
      }

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
      // ✅ ChapChapPay pour les depots Mobile Money
      const paymentMethod = mobileMoneyProvider === 'orange' ? 'orange_money' : 'mtn_momo';
      
      const { data, error } = await supabase.functions.invoke('chapchappay-pull', {
        body: {
          amount: amount,
          currency: 'GNF',
          paymentMethod: paymentMethod,
          customerPhone: `224${cleanPhone}`,
          description: `Recharge wallet - ${amount.toLocaleString()} GNF`,
          orderId: `WLT-${Date.now()}`,
        }
      });

      toast.dismiss(loadingToast);

      if (error) throw error;

      if (data?.success) {
        toast.success('Demande de paiement envoyée!', {
          description: `Confirmez le paiement sur votre téléphone ${paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}`
        });

        // Polling pour vérifier le statut
        pollPaymentStatus(data.transactionId, amount);
      } else {
        throw new Error(data?.error || data?.message || 'Erreur initialisation paiement');
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

  const executeWithdraw = async (pin: string) => {
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

    const minAmount = withdrawMethod === 'bank' ? 50000 : 5000;
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

      } else if (withdrawMethod === 'bank') {
        // Validation côté client
        if (!bankAccountHolder || bankAccountHolder.trim().length < 3) {
          throw new Error('Nom du titulaire invalide (3 caractères minimum)');
        }
        if (!bankName || bankName.trim().length < 2) {
          throw new Error('Nom de la banque invalide');
        }
        if (!bankIban || bankIban.replace(/\s/g, '').length < 10) {
          throw new Error('IBAN/numéro de compte invalide (10 caractères minimum)');
        }

        // Retrait bancaire via Edge Function (flux manuel admin)
        const { data, error } = await supabase.functions.invoke('stripe-withdrawal', {
          body: {
            amount,
            currency: wallet?.currency || 'gnf',
            bankDetails: {
              bank_name: bankName.trim(),
              iban: bankIban.replace(/\s/g, '').trim(),
              account_holder: bankAccountHolder.trim(),
            }
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erreur lors du retrait bancaire');

        console.log('✅ Demande de retrait bancaire enregistrée:', data);

        toast.success('Demande de retrait enregistrée !', {
          description: `${formatPrice(data.netAmount || amount)} net (frais: ${formatPrice(data.withdrawalFee || 0)}). Votre demande sera examinée par notre équipe.`
        });
      }
      
      setWithdrawAmount('');
      setWithdrawPhone('');
      setBankName('');
      setBankIban('');
      setBankAccountHolder('');
      setWithdrawOpen(false);
      await Promise.all([loadWalletData(), loadTransactions()]);
    } catch (error: any) {
      console.error('❌ Erreur retrait:', error);

      // Fallback robuste: retrait interne wallet via backend v2
      try {
        const fallback = await withdrawFromWallet(amount, `Retrait wallet (${withdrawMethod})`, pin);
        if (fallback.success) {
          toast.success(`Retrait ${formatPrice(amount)} effectué via fallback backend`);
          setWithdrawAmount('');
          setWithdrawPhone('');
          setBankName('');
          setBankIban('');
          setBankAccountHolder('');
          setWithdrawOpen(false);
          await Promise.all([loadWalletData(), loadTransactions()]);
          return;
        }
      } catch {
        // Ignore fallback error and show original message
      }

      toast.error(error.message || 'Erreur lors du retrait');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!effectiveUserId || !withdrawAmount) {
      toast.error('Veuillez entrer un montant');
      return;
    }

    requestTransactionPin('withdraw');
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

    if (amount < 100) {
      toast.error('Le montant minimum est de 100 GNF');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      toast.error('Solde insuffisant');
      return;
    }

    setProcessing(true);
    
    try {
      console.log('🔍 Recherche du destinataire:', recipientId);
      
      const searchTerm = recipientId.trim();
      const isEmail = searchTerm.includes('@');
      const isPhone = /^[+]?\d{6,}$/.test(searchTerm.replace(/[\s\-()]/g, ''));
      
      // 1. Chercher dans profiles par email, téléphone ou ID
      let profileQuery = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, custom_id, public_id, phone');
      
      if (isEmail) {
        profileQuery = profileQuery.ilike('email', searchTerm);
      } else if (isPhone) {
        const cleanPhone = searchTerm.replace(/[\s\-()]/g, '');
        profileQuery = profileQuery.or(`phone.ilike.%${cleanPhone}%`);
      } else {
        profileQuery = profileQuery.or(`custom_id.eq.${searchTerm.toUpperCase()},public_id.eq.${searchTerm.toUpperCase()}`);
      }
      
      const { data: profileData, error: profileError } = await profileQuery.maybeSingle();

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
      } else if (!isEmail && !isPhone) {
        // 2. Sinon, chercher dans agents_management (agent_code) - seulement pour les IDs
        console.log('🔍 Recherche dans agents_management...');
        const { data: agentData, error: agentError } = await supabase
          .from('agents_management')
          .select('user_id, name, agent_code')
          .eq('agent_code', searchTerm.toUpperCase())
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
            .eq('bureau_code', searchTerm.toUpperCase())
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
          fee_percent: 1,
          total_debit: totalDebit,
          amount_received: amount,
          current_balance: wallet?.balance || 0,
          balance_after: (wallet?.balance || 0) - totalDebit,
          recipient_uuid: recipientUuid,
          recipient_name: recipientName,
          is_bureau_transfer: true,
          currency_sent: wallet?.currency || 'GNF',
          currency_received: wallet?.currency || 'GNF',
        });
        setShowTransferPreview(true);
        setTransferOpen(false);
      } else {
        // ✅ Appeler l'edge function pour TOUS les transferts (local ET international)
        const { data, error } = await supabase.functions.invoke(
          'wallet-transfer',
          {
            body: {
              action: 'preview',
              sender_id: effectiveUserId,
              receiver_id: recipientUuid,
              amount,
            },
          }
        );

        if (error) {
          console.error('❌ Erreur preview:', error);
          toast.error(error.message || 'Erreur lors de la prévisualisation');
          return;
        }

        console.log('✅ Réponse prévisualisation:', data);

        if (!data?.success) {
          console.error('❌ Preview échouée:', data?.error);
          toast.error(data?.error || 'Erreur inconnue');
          return;
        }

        // ✅ International = devises différentes → afficher le dialogue international
        if (data.is_international) {
          setIntlPreview({
            success: true,
            amount_sent: data.amount_sent || amount,
            currency_sent: data.currency_sent || 'GNF',
            fee_percentage: data.fee_percentage || 0,
            fee_amount: data.fee_amount || 0,
            amount_after_fee: data.amount_after_fee || 0,
            rate_displayed: data.rate_displayed || 1,
            amount_received: data.amount_received || 0,
            currency_received: data.currency_received || 'GNF',
            is_international: true,
            sender_country: data.sender_country || '',
            receiver_country: data.receiver_country || '',
            commission_conversion: data.commission_conversion || 0,
            frais_international: data.frais_international || 0,
            rate_lock_seconds: data.rate_lock_seconds || 60,
            receiver_name: recipientName || data.receiver_name,
            receiver_code: recipientUuid,
          });
          setShowIntlConfirm(true);
          setTransferOpen(false);
          return;
        }

        // ✅ Local = même devise → dialogue simple
        setTransferPreview({ 
          success: true,
          amount: data.amount_sent || amount,
          fee_percent: data.fee_percentage || 0,
          fee_amount: data.fee_amount || 0,
          total_debit: data.total_debit || amount,
          amount_received: data.amount_received || amount,
          current_balance: data.sender_balance || (wallet?.balance || 0),
          balance_after: data.balance_after ?? ((wallet?.balance || 0) - (data.total_debit || amount)),
          recipient_uuid: recipientUuid,
          recipient_name: recipientName,
          is_bureau_transfer: false,
          currency_sent: data.currency_sent || wallet?.currency || 'GNF',
          currency_received: data.currency_received || wallet?.currency || 'GNF',
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

  const executeConfirmTransfer = async (pin: string) => {
    console.log('🔵 handleConfirmTransfer appelé', { 
      userId: user?.id, 
      effectiveUserId,
      hasPreview: !!transferPreview,
      preview: transferPreview 
    });
    
    if (!effectiveUserId || !transferPreview) {
      console.error('❌ Transfert annulé: données manquantes', { effectiveUserId, transferPreview });
      toast.error('Données de transfert manquantes');
      return;
    }
    
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
        const { error: txError } = await (supabase
          .from('wallet_transactions')
          .insert([
            {
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
                transaction_type: 'transfer',
                reference: transactionId,
                recipient_type: 'bureau',
                bureau_id: bureauId,
                bureau_wallet_id: bureauWalletId,
                bureau_code: recipientId
              }
            } as any
          ] as any));

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
        // ✅ Transfert normal via edge function (local ET international)
        const result = await transferToWallet(
          transferPreview.recipient_uuid,
          transferPreview.amount,
          transferDescription || 'Transfert wallet',
          pin
        );
        if (!result.success) {
          throw new Error(result.error || 'Erreur lors du transfert');
        }

        console.log('✅ Transfert backend réussi:', result);
      }

      const cur = transferPreview.currency_sent || wallet?.currency || 'GNF';
      toast.success(
        `✅ Transfert réussi vers ${transferPreview.recipient_name || 'le destinataire'}\n💸 Frais: ${transferPreview.fee_amount?.toLocaleString()} ${cur}\n📤 Total débité: ${transferPreview.total_debit?.toLocaleString()} ${cur}\n📥 Reçu: ${transferPreview.amount_received?.toLocaleString()} ${transferPreview.currency_received || cur}`,
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

  const handleConfirmTransfer = async () => {
    requestTransactionPin('transfer');
  };

  const executeIntlConfirmTransfer = async (pin: string) => {
    if (!effectiveUserId || !intlPreview) return;
    setIntlExecuting(true);
    try {
      const receiverId = intlPreview.receiver_code || recipientId.trim();
      const result = await transferToWallet(
        receiverId,
        intlPreview.amount_sent,
        transferDescription || 'Transfert international wallet',
        pin
      );
      if (!result.success) throw new Error(result.error || 'Erreur lors du transfert');

      toast.success(
        '🌍 Transfert international réussi !',
        { duration: 5000 }
      );

      setTransferAmount('');
      setRecipientId('');
      setTransferDescription('');
      setIntlPreview(null);
      setShowIntlConfirm(false);
      await Promise.all([loadWalletData(), loadTransactions()]);
      window.dispatchEvent(new CustomEvent('wallet-updated'));
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du transfert international');
    } finally {
      setIntlExecuting(false);
    }
  };

  const handleIntlConfirmTransfer = async () => {
    requestTransactionPin('intl-transfer');
  };

  const handlePinConfirm = async (pin: string) => {
    try {
      setPinLoading(true);
      setPinError(null);

      if (pinAction === 'withdraw') {
        await executeWithdraw(pin);
      }

      if (pinAction === 'transfer') {
        setPinPromptOpen(false);
        await executeConfirmTransfer(pin);
      }

      if (pinAction === 'intl-transfer') {
        setPinPromptOpen(false);
        await executeIntlConfirmTransfer(pin);
      }
    } catch (error: any) {
      setPinError(error?.message || 'Erreur de validation du code PIN');
    } finally {
      setPinLoading(false);
      setPinAction(null);
      await loadPinStatus();
    }
  };

  const handlePinSetup = async ({ currentPin, pin, confirmPin }: { currentPin?: string; pin: string; confirmPin: string }) => {
    try {
      setPinLoading(true);
      setPinError(null);

      const response = pinSetupMode === 'change'
        ? await changeWalletPin(currentPin || '', pin, confirmPin)
        : await setupWalletPin(pin, confirmPin);

      if (!response.success) {
        throw new Error(response.error || 'Erreur configuration code PIN');
      }

      toast.success(pinSetupMode === 'change' ? 'Code PIN modifié' : 'Code PIN activé');
      setPinSetupOpen(false);
      await loadPinStatus();
    } catch (error: any) {
      setPinError(error?.message || 'Erreur configuration code PIN');
    } finally {
      setPinLoading(false);
    }
  };

  const formatPrice = (amount: number, fromCurrency?: string) => {
    const sourceCurrency = fromCurrency || wallet?.currency || 'GNF';
    return convert(amount, sourceCurrency).formatted;
  };

  // Affichage du solde en devise native du wallet (sans conversion)
  const formatWalletBalance = (amount: number) => {
    const cur = wallet?.currency || 'GNF';
    return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${cur}`;
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
    <Card className="shadow-elegant border-0 sm:border">
      <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-client-gradient flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">Historique Wallet</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">Gérez vos transactions</CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => Promise.all([loadWalletData(), loadTransactions()])}
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
        {/* Solde - optimisé mobile */}
        <div className="bg-client-gradient rounded-lg p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm opacity-90">Solde actuel</p>
            {isAgent && agentInfo ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] sm:text-xs px-1.5 sm:px-2">
                {agentInfo.agent_code}
              </Badge>
            ) : userCustomId ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] sm:text-xs px-1.5 sm:px-2">
                {userCustomId}
              </Badge>
            ) : profile?.role ? (
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-[10px] sm:text-xs px-1.5 sm:px-2">
                {profile.role}
              </Badge>
            ) : null}
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            {wallet ? formatWalletBalance(wallet.balance) : 'Chargement...'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <div className="text-xs sm:text-sm text-muted-foreground">
            {pinStatus?.pin_enabled ? 'Code PIN actif pour retraits et transferts' : 'Code PIN non configuré'}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPinSetupMode(pinStatus?.pin_enabled ? 'change' : 'setup');
              setPinError(null);
              setPinSetupOpen(true);
            }}
          >
            <Shield className="w-4 h-4 mr-2" />
            {pinStatus?.pin_enabled ? 'Modifier PIN' : 'Activer PIN'}
          </Button>
        </div>

        {/* Boutons d'actions - optimisés mobile */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Dépôt */}
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-16 sm:h-20 gap-1 sm:gap-2 px-1 sm:px-4">
                <ArrowDownToLine className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <span className="text-[10px] sm:text-xs">Dépôt</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-w-md max-h-[90vh] overflow-y-auto"
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onFocusOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Effectuer un dépôt</DialogTitle>
                <DialogDescription>
                  Ajoutez des fonds à votre wallet
                </DialogDescription>
              </DialogHeader>
              <Tabs value={depositMethod} onValueChange={(v) => setDepositMethod(v as 'card' | 'mobile_money' | 'card_stripe')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="card" className="gap-1 text-xs">
                    <CreditCard className="w-3 h-3" />
                    Carte
                  </TabsTrigger>
                  <TabsTrigger value="mobile_money" className="gap-1 text-xs">
                    <Smartphone className="w-3 h-3" />
                    Mobile
                  </TabsTrigger>
                  <TabsTrigger value="card_stripe" className="gap-1 text-xs">
                    PayPal
                  </TabsTrigger>
                </TabsList>
                
                {/* Onglet Carte Bancaire - via Stripe */}
                <TabsContent value="card" className="space-y-4 mt-4">
                  {effectiveUserId && wallet ? (
                    <StripeWalletTopup
                      userId={effectiveUserId}
                      walletId={wallet.id}
                      onSuccess={async () => {
                        setDepositAmount('');
                        setDepositOpen(false);
                        await Promise.all([loadWalletData(), loadTransactions()]);
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground text-sm py-4">
                      Chargement...
                    </div>
                  )}
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

                {/* Onglet PayPal */}
                <TabsContent value="card_stripe" className="space-y-4 mt-4">
                  <PayPalInlineDeposit
                    onSuccess={async () => {
                      setDepositAmount('');
                      setDepositOpen(false);
                      await Promise.all([loadWalletData(), loadTransactions()]);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Retrait - optimisé mobile */}
          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-16 sm:h-20 gap-1 sm:gap-2 px-1 sm:px-4">
                <ArrowUpFromLine className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                <span className="text-[10px] sm:text-xs">Retrait</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Effectuer un retrait</DialogTitle>
                <DialogDescription>
                  Retirez des fonds de votre wallet vers votre compte
                </DialogDescription>
              </DialogHeader>
              
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mb-2">
                <p className="text-sm text-orange-800">
                  Solde disponible: <span className="font-bold">{formatWalletBalance(wallet?.balance || 0)}</span>
                </p>
              </div>
              
              <Tabs value={withdrawMethod} onValueChange={(v) => setWithdrawMethod(v as 'mobile_money' | 'bank' | 'paypal')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="mobile_money" className="gap-1 text-xs">
                    <Smartphone className="w-3 h-3" />
                    Mobile
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="gap-1 text-xs">
                    <Building2 className="w-3 h-3" />
                    Banque
                  </TabsTrigger>
                  <TabsTrigger value="paypal" className="gap-1 text-xs">
                    <span className="text-[10px] font-bold">PP</span>
                    PayPal
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
                
                {/* Retrait Virement bancaire */}
                <TabsContent value="bank" className="space-y-4 mt-4">
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Retrait par virement bancaire</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Votre demande sera examinée par notre équipe avant traitement. Les fonds sont réservés jusqu'à validation. Délai: 3-5 jours ouvrés.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bank-holder">Titulaire du compte</Label>
                    <Input
                      id="bank-holder"
                      placeholder="Nom complet du titulaire"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bank-name">Nom de la banque</Label>
                    <Input
                      id="bank-name"
                      placeholder="Ex: BCRG, Ecobank, BICIGUI..."
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bank-iban">IBAN / Numéro de compte</Label>
                    <Input
                      id="bank-iban"
                      placeholder="Ex: GN76 0001 0000 0000 0000"
                      value={bankIban}
                      onChange={(e) => setBankIban(e.target.value)}
                    />
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
                    <Label htmlFor="withdraw-amount-bank">Montant à retirer (GNF)</Label>
                    <Input
                      id="withdraw-amount-bank"
                      type="number"
                      placeholder="Ex: 500000"
                      min="50000"
                      max={wallet?.balance || 0}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum: 50,000 GNF · Frais dynamiques (configurable par l'administration)</p>
                  </div>
                  
                  <Button 
                    onClick={handleWithdraw} 
                    disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) < 50000 || !bankName || !bankIban || !bankAccountHolder}
                    className="w-full"
                  >
                    {processing ? 'Traitement...' : `Demander le retrait de ${withdrawAmount ? parseFloat(withdrawAmount).toLocaleString() : '0'} GNF`}
                  </Button>
                  
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Les fonds sont réservés dès la demande. Si la demande est rejetée ou échoue, les fonds sont automatiquement restaurés sur votre wallet.
                    </p>
                  </div>
                </TabsContent>

                {/* Retrait PayPal */}
                <TabsContent value="paypal" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="pp-wd-email">Email PayPal du destinataire</Label>
                    <Input
                      id="pp-wd-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={paypalWithdrawEmail}
                      onChange={(e) => setPaypalWithdrawEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Montants rapides (USD)</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {[10, 25, 50, 100, 250, 500].map((amt) => (
                        <Button
                          key={amt}
                          variant={paypalWithdrawAmount === amt.toString() ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPaypalWithdrawAmount(amt.toString())}
                          className="text-xs"
                        >
                          ${amt}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="pp-wd-amt">Montant (USD)</Label>
                    <Input
                      id="pp-wd-amt"
                      type="number"
                      placeholder="Ex: 50"
                      value={paypalWithdrawAmount}
                      onChange={(e) => setPaypalWithdrawAmount(e.target.value)}
                      min="5"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum: $5 USD · Frais: 1.5%</p>
                  </div>
                  <Button
                    onClick={async () => {
                      const numAmt = parseFloat(paypalWithdrawAmount);
                      if (!numAmt || numAmt < 5) { toast.error('Minimum $5 USD'); return; }
                      if (!paypalWithdrawEmail || !paypalWithdrawEmail.includes('@')) { toast.error('Email PayPal invalide'); return; }
                      setProcessing(true);
                      try {
                        const { data, error } = await signedInvoke('paypal-withdrawal', {
                          amount: numAmt, currency: 'USD', paypalEmail: paypalWithdrawEmail,
                        });
                        if (error) throw new Error(error.message);
                        if (!data?.success) throw new Error(data?.error || 'Erreur retrait');
                        toast.success(data.message || 'Retrait PayPal effectué !');
                        setPaypalWithdrawAmount('');
                        setPaypalWithdrawEmail('');
                        setWithdrawOpen(false);
                        window.dispatchEvent(new Event('wallet-updated'));
                        await Promise.all([loadWalletData(), loadTransactions()]);
                      } catch (err: any) {
                        toast.error(err.message || 'Erreur retrait PayPal');
                      } finally { setProcessing(false); }
                    }}
                    disabled={processing || !paypalWithdrawAmount || parseFloat(paypalWithdrawAmount) < 5 || !paypalWithdrawEmail}
                    className="w-full bg-[#0070BA] hover:bg-[#003087] text-white"
                    size="lg"
                  >
                    {processing ? 'Traitement...' : `Retirer $${paypalWithdrawAmount || '0'} vers PayPal`}
                  </Button>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">Paiement sécurisé via PayPal Payouts</p>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Transfert - optimisé mobile */}
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex flex-col h-16 sm:h-20 gap-1 sm:gap-2 px-1 sm:px-4">
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="text-[10px] sm:text-xs">Transfert</span>
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
                  <Label htmlFor="recipient-id">Destinataire</Label>
                  <Input
                    id="recipient-id"
                    placeholder="ID, email ou téléphone"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrez l'ID (ex: CLT0001), l'email ou le numéro de téléphone
                  </p>
                </div>
                <div>
                  <Label htmlFor="transfer-amount">Montant</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    placeholder="10000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solde disponible: {formatWalletBalance(wallet?.balance || 0)}
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
                      <span className="text-lg font-bold">{formatWalletBalance(transferPreview?.amount || 0)}</span>
                    </div>
                    {transferPreview?.is_international && (
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="text-sm font-medium">📊 Frais de conversion</span>
                        <span className="text-sm">Intégrés au taux (3%)</span>
                      </div>
                    )}
                    {!transferPreview?.is_international && (transferPreview?.fee_amount || 0) > 0 && (
                      <div className="flex justify-between items-center text-orange-600">
                        <span className="text-sm font-medium">💸 Frais de transfert ({transferPreview?.fee_percent}%)</span>
                        <span className="text-lg font-bold">{formatWalletBalance(transferPreview?.fee_amount || 0)}</span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="text-sm font-medium">📉 Total débité de votre compte</span>
                      <span className="text-xl font-bold text-destructive">{formatWalletBalance(transferPreview?.total_debit || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span className="text-sm font-medium">📈 Montant net reçu par le destinataire</span>
                      <span className="text-lg font-bold">{formatWalletBalance(transferPreview?.amount_received || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <p className="text-sm">
                      <strong>Solde actuel:</strong> {formatWalletBalance(transferPreview?.current_balance || 0)}
                      <br />
                      <strong>Solde après transfert:</strong> {formatWalletBalance(transferPreview?.balance_after || 0)}
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
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmTransfer();
                }}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transfert en cours...
                  </>
                ) : (
                  'Oui, confirmer'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* International transfer confirmation with rate-lock timer */}
        <InternationalTransferConfirmation
          open={showIntlConfirm}
          onOpenChange={(val) => {
            setShowIntlConfirm(val);
            if (!val) setIntlPreview(null);
          }}
          preview={intlPreview}
          onConfirm={handleIntlConfirmTransfer}
          loading={intlExecuting}
        />

        <WalletPinPromptDialog
          open={pinPromptOpen}
          onOpenChange={setPinPromptOpen}
          loading={pinLoading}
          error={pinError}
          onConfirm={handlePinConfirm}
        />

        <WalletPinSetupDialog
          open={pinSetupOpen}
          onOpenChange={setPinSetupOpen}
          mode={pinSetupMode}
          loading={pinLoading}
          error={pinError}
          onSubmit={handlePinSetup}
        />

        {/* Historique des transactions - optimisé mobile */}
        <div>
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <History className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm sm:text-base">Historique récent</h3>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <History className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Aucune transaction</p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {(showAllTransactions ? transactions : transactions.slice(0, 4)).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start sm:items-center justify-between p-2 sm:p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">
                      {getTransactionType(tx)}{' '}
                      {(tx.sender_id !== effectiveUserId || tx.receiver_id !== effectiveUserId) && (
                        <>
                          <span className="text-foreground">
                            {tx.sender_id === effectiveUserId 
                              ? (tx.receiver_name || 'Utilisateur')
                              : (tx.sender_name || 'Utilisateur')}
                          </span>
                        </>
                      )}
                    </p>
                    {(tx.sender_id !== effectiveUserId || tx.receiver_id !== effectiveUserId) && (
                      <span className="font-mono text-primary text-[10px] sm:text-xs block">
                        {tx.sender_id === effectiveUserId ? tx.receiver_custom_id : tx.sender_custom_id}
                      </span>
                    )}
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {tx.metadata?.description && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground italic truncate mt-0.5 max-w-[150px] sm:max-w-full">
                        {tx.metadata.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-xs sm:text-sm ${getTransactionColor(tx)}`}>
                      {tx.sender_id === effectiveUserId && tx.receiver_id !== effectiveUserId ? '-' : '+'}
                      {formatPrice(tx.amount)}
                    </p>
                    {tx.sender_id === effectiveUserId && tx.metadata?.fee_amount && (
                      <p className="text-[10px] sm:text-xs text-orange-600">
                        +{formatPrice(tx.metadata.fee_amount)} frais
                      </p>
                    )}
                    <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-[10px] sm:text-xs px-1 sm:px-2 py-0 mt-0.5">
                      {tx.status === 'completed' ? 'OK' : tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {transactions.length > 4 && (
                <Button
                  variant="ghost"
                  className="w-full mt-1 sm:mt-2 text-xs sm:text-sm h-8 sm:h-10"
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
    
    {/* PayPal deposit tab content is handled inline above */}
  </>
  );
};

export default UniversalWalletTransactions;
