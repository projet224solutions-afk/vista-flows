/**
 * MODAL PAIEMENT PRODUITS
 * Support: Wallet, Card (Stripe), Orange Money, MTN MoMo (ChapChapPay PULL), Cash
 * Inclut le calcul et la facturation des commissions
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Wallet, Banknote, Loader2, AlertCircle, Shield, Info, Phone, Truck, CreditCard, Smartphone, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Escrow224Service } from "@/services/escrow224Service";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";
import { SecureButton } from "@/components/ui/SecureButton";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useChapChapPay } from "@/hooks/useChapChapPay";
import { usePriceConverter } from "@/hooks/usePriceConverter";

const StripeCheckoutButton = lazy(() => import("@/components/payment/StripeCheckoutButton"));

export type ProductPaymentMethod = 'wallet' | 'cash' | 'cash_on_delivery' | 'orange_money' | 'mtn_money' | 'card';

type PaymentStep = 'select_method' | 'card_form' | 'mobile_money_form' | 'processing' | 'success';

interface CartItem {
  id: string;
  name: string;
  price: number;
  vendorId?: string;
  quantity?: number;
}

interface CommissionConfig {
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  min_amount?: number;
}

interface ProductPaymentModalProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalAmount: number;
  onPaymentSuccess: () => void;
  userId: string;
  customerId: string | null;
  /** Devise source du produit/vendeur (ex: 'XOF', 'GNF'). Défaut: 'GNF' */
  currency?: string;
}

export default function ProductPaymentModal({
  open,
  onClose,
  cartItems,
  totalAmount,
  onPaymentSuccess,
  userId,
  customerId,
  currency = 'GNF'
}: ProductPaymentModalProps) {
  const navigate = useNavigate();
  const fc = useFormatCurrency();
  const { convert, userCurrency } = usePriceConverter();
  const cur = currency.toUpperCase();

  /** Affiche le montant converti en devise locale, avec l'original en dessous si conversion */
  const renderPrice = (amount: number, className?: string) => {
    const converted = convert(amount, cur);
    if (!converted.wasConverted) {
      return <span className={className}>{converted.formatted}</span>;
    }
    return (
      <span className={`inline-flex flex-col ${className || ''}`}>
        <span>{converted.formatted}</span>
        <span className="text-xs text-muted-foreground font-normal">({converted.originalFormatted})</span>
      </span>
    );
  };

  /** Version inline texte pour les boutons / toasts */
  const priceText = (amount: number) => {
    const converted = convert(amount, cur);
    return converted.formatted;
  };
  const { initiatePullPayment, pollStatus, isLoading: ccpLoading } = useChapChapPay();

  const [paymentMethod, setPaymentMethod] = useState<ProductPaymentMethod>('wallet');
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('select_method');
  const [showCardInline, setShowCardInline] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [vendorCode, setVendorCode] = useState<string | null>(null);
  const [loadingVendorCode, setLoadingVendorCode] = useState(false);
  const [codPhone, setCodPhone] = useState('');
  const [codCity, setCodCity] = useState('');
  
  const [mobilePhone, setMobilePhone] = useState('');
  const [mobileProcessing, setMobileProcessing] = useState(false);
  
  const [sellerUserId, setSellerUserId] = useState<string>('');
  
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig | null>(null);
  const [loadingCommission, setLoadingCommission] = useState(false);
  const [commissionFee, setCommissionFee] = useState(0);
  const [grandTotal, setGrandTotal] = useState(totalAmount);

  useEffect(() => {
    if (open && cartItems.length > 0) {
      const vendorId = cartItems.find(item => item.vendorId)?.vendorId;
      if (vendorId) {
        supabase.from('vendors').select('user_id').eq('id', vendorId).single()
          .then(({ data }) => {
            if (data?.user_id) setSellerUserId(data.user_id);
          });
      }
    }
  }, [open, cartItems]);

  useEffect(() => {
    if (open) {
      setPaymentStep('select_method');
      setShowCardInline(false);
    } else {
      setPaymentStep('select_method');
      setShowCardInline(false);
      setMobilePhone('');
      setMobileProcessing(false);
      setSellerUserId('');
    }
  }, [open]);

  useEffect(() => {
    if (open && userId) {
      loadWalletBalance();
      loadCommissionConfig();
    }
  }, [open, userId]);

  useEffect(() => {
    if (commissionConfig && totalAmount > 0) {
      calculateCommissionFee();
    } else {
      setCommissionFee(0);
      setGrandTotal(totalAmount);
    }
  }, [totalAmount, commissionConfig]);

  useEffect(() => {
    if (open && paymentMethod === 'wallet' && cartItems.length > 0) {
      loadVendorCode();
    } else {
      setVendorCode(null);
    }
  }, [open, paymentMethod, cartItems]);

  useEffect(() => {
    if (!open) setVendorCode(null);
  }, [open]);

  const loadCommissionConfig = async () => {
    setLoadingCommission(true);
    try {
      const { data: settingsData, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'purchase_fee_percent')
        .single();

      if (error) {
        setCommissionConfig({ commission_type: 'percentage', commission_value: 10 });
      } else if (settingsData?.setting_value) {
        setCommissionConfig({ commission_type: 'percentage', commission_value: Number(settingsData.setting_value) });
      } else {
        setCommissionConfig({ commission_type: 'percentage', commission_value: 10 });
      }
    } catch {
      setCommissionConfig({ commission_type: 'percentage', commission_value: 10 });
    } finally {
      setLoadingCommission(false);
    }
  };

  const calculateCommissionFee = () => {
    if (!commissionConfig) { setCommissionFee(0); setGrandTotal(totalAmount); return; }
    if (commissionConfig.min_amount && totalAmount < commissionConfig.min_amount) { setCommissionFee(0); setGrandTotal(totalAmount); return; }
    const fee = commissionConfig.commission_type === 'percentage'
      ? Math.round(totalAmount * (commissionConfig.commission_value / 100))
      : commissionConfig.commission_value;
    setCommissionFee(fee);
    setGrandTotal(totalAmount + fee);
  };

  const loadWalletBalance = async () => {
    setLoadingBalance(true);
    try {
      const { data, error } = await supabase.from('wallets').select('balance').eq('user_id', userId).eq('currency', cur).single();
      if (error) throw error;
      setWalletBalance(data?.balance || 0);
    } catch { setWalletBalance(0); } finally { setLoadingBalance(false); }
  };

  const loadVendorCode = async () => {
    setLoadingVendorCode(true);
    try {
      const firstVendorId = cartItems.find(item => item.vendorId)?.vendorId;
      if (!firstVendorId) { setVendorCode(null); return; }
      const { data: vendorData, error: vendorError } = await supabase.from('vendors').select('user_id, vendor_code').eq('id', firstVendorId).single();
      if (vendorError || !vendorData) { setVendorCode(null); return; }
      if (vendorData.vendor_code) { setVendorCode(vendorData.vendor_code); } else {
        const { data: walletData, error: walletError } = await supabase.from('wallets').select('id').eq('user_id', vendorData.user_id).eq('currency', cur).single();
        if (walletError || !walletData) { setVendorCode(vendorData.user_id.slice(0, 8).toUpperCase()); } else { setVendorCode(String(walletData.id).slice(0, 8).toUpperCase()); }
      }
    } catch { setVendorCode(null); } finally { setLoadingVendorCode(false); }
  };

  const paymentMethods = [
    { id: 'wallet' as ProductPaymentMethod, name: 'Wallet 224Solutions', description: 'Paiement instantané depuis votre wallet', icon: Wallet, color: 'text-primary' },
    { id: 'card' as ProductPaymentMethod, name: 'Carte Bancaire', description: 'Paiement sécurisé VISA / Mastercard via Stripe', icon: CreditCard, color: 'text-primary' },
    { id: 'orange_money' as ProductPaymentMethod, name: 'Orange Money', description: 'Débit instantané sur votre téléphone', icon: Smartphone, color: 'text-orange-500' },
    { id: 'mtn_money' as ProductPaymentMethod, name: 'MTN Mobile Money', description: 'Débit instantané via MTN MoMo', icon: Smartphone, color: 'text-yellow-600' },
    { id: 'cash' as ProductPaymentMethod, name: 'Paiement à la livraison', description: 'Payez en espèces à la réception', icon: Banknote, color: 'text-green-600' },
  ];

  const createOrderAfterPayment = async (paymentId: string, method: string) => {
    let effectiveCustomerId = customerId;
    if (!effectiveCustomerId) {
      const { data: existingCustomer } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
      if (existingCustomer) { effectiveCustomerId = existingCustomer.id; }
      else {
        const { data: newCustomer, error: createError } = await supabase.from('customers').insert({ user_id: userId }).select('id').single();
        if (createError || !newCustomer) { toast.error('Impossible de créer le compte client'); return; }
        effectiveCustomerId = newCustomer.id;
      }
    }

    const itemsByVendor = cartItems.reduce((acc, item) => {
      const vendorKey = item.vendorId || 'unknown';
      if (!acc[vendorKey]) acc[vendorKey] = [];
      acc[vendorKey].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);

    const vendorCount = Object.keys(itemsByVendor).filter(k => k !== 'unknown').length;
    const commissionPerVendor = vendorCount > 0 ? Math.round(commissionFee / vendorCount) : 0;

    for (const [vendorId, items] of Object.entries(itemsByVendor)) {
      if (vendorId === 'unknown') continue;
      const vendorProductTotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      const vendorTotalWithCommission = vendorProductTotal + commissionPerVendor;
      const normalizedMethod = method === 'mtn_money' ? 'mobile_money' : method === 'orange_money' ? 'mobile_money' : method;

      const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
        p_user_id: userId, p_vendor_id: vendorId,
        p_items: items.map(item => ({ product_id: item.id, quantity: item.quantity || 1, price: item.price })),
        p_total_amount: vendorTotalWithCommission, p_payment_method: normalizedMethod,
        p_shipping_address: { address: 'Adresse de livraison', city: 'Conakry', country: 'Guinée', commission_fee: commissionPerVendor, product_total: vendorProductTotal, external_payment_id: paymentId }
      });

      if (orderError || !orderResult?.length) {
        console.error('[ProductPayment] Order creation failed:', orderError);
        toast.error('Erreur lors de la création de la commande');
        continue;
      }

      const orderId = orderResult[0].order_id;
      await supabase.from('orders').update({ payment_status: 'paid', metadata: { external_payment_id: paymentId, commission_fee: commissionPerVendor, product_total: vendorProductTotal } }).eq('id', orderId);

      if (commissionPerVendor > 0) {
        await supabase.rpc('record_pdg_revenue', {
          p_source_type: 'frais_achat_commande', p_amount: commissionPerVendor,
          p_percentage: commissionConfig?.commission_value || 10, p_transaction_id: paymentId,
          p_user_id: userId, p_metadata: { order_id: orderId, vendor_id: vendorId, product_total: vendorProductTotal }
        });
      }
    }
  };

  // Handle Stripe escrow success (capture manuelle — fonds bloqués)
  const handleCardSuccess = async (data: { paymentIntentId: string; amount: number; currency: string }) => {
    setPaymentStep('processing');
    try {
      // Créer les commandes avec payment_status = 'pending' (fonds en escrow)
      let effectiveCustomerId = customerId;
      if (!effectiveCustomerId) {
        const { data: existingCustomer } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
        if (existingCustomer) { effectiveCustomerId = existingCustomer.id; }
        else {
          const { data: newCustomer } = await supabase.from('customers').insert({ user_id: userId }).select('id').single();
          if (newCustomer) effectiveCustomerId = newCustomer.id;
        }
      }

      const itemsByVendor = cartItems.reduce((acc, item) => {
        const vendorKey = item.vendorId || 'unknown';
        if (!acc[vendorKey]) acc[vendorKey] = [];
        acc[vendorKey].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      const vendorCount = Object.keys(itemsByVendor).filter(k => k !== 'unknown').length;
      const commissionPerVendor = vendorCount > 0 ? Math.round(commissionFee / vendorCount) : 0;

      for (const [vendorId, items] of Object.entries(itemsByVendor)) {
        if (vendorId === 'unknown') continue;
        const vendorProductTotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const vendorTotalWithCommission = vendorProductTotal + commissionPerVendor;

        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: userId, p_vendor_id: vendorId,
          p_items: items.map(item => ({ product_id: item.id, quantity: item.quantity || 1, price: item.price })),
          p_total_amount: vendorTotalWithCommission, p_payment_method: 'card',
          p_shipping_address: { address: 'Adresse de livraison', city: 'Conakry', country: 'Guinée', commission_fee: commissionPerVendor, product_total: vendorProductTotal, external_payment_id: data.paymentIntentId }
        });

        if (orderError || !orderResult?.length) {
          console.error('[ProductPayment] Order creation failed:', orderError);
          continue;
        }

        const orderId = orderResult[0].order_id;

        // payment_status = 'pending' car fonds en escrow (pas encore capturés)
        await supabase.from('orders').update({
          payment_status: 'pending',
          metadata: {
            external_payment_id: data.paymentIntentId,
            escrow_active: true,
            commission_fee: commissionPerVendor,
            product_total: vendorProductTotal,
            commission_percent: commissionConfig?.commission_value || 10
          }
        }).eq('id', orderId);

        // Lier l'escrow à l'order_id
        await supabase.from('escrow_transactions')
          .update({ order_id: orderId })
          .eq('stripe_payment_intent_id', data.paymentIntentId)
          .eq('seller_id', (await supabase.from('vendors').select('user_id').eq('id', vendorId).single()).data?.user_id);
      }

      setPaymentStep('success');
      toast.success('Paiement sécurisé par escrow !', {
        description: `${fc(grandTotal, cur)} bloqués — libérés après confirmation de réception`
      });
      setTimeout(() => { onPaymentSuccess(); onClose(); navigate('/my-purchases'); }, 2000);
    } catch (err) {
      console.error('Order creation after escrow payment failed:', err);
      toast.error('Paiement réussi mais erreur lors de la commande');
      onClose();
    }
  };

  // Handle Mobile Money PULL
  const handleMobileMoneyPay = async () => {
    if (!mobilePhone.trim() || mobilePhone.trim().length < 8) {
      toast.error('Veuillez saisir un numéro de téléphone valide');
      return;
    }
    setMobileProcessing(true);
    setPaymentStep('processing');

    const ccpMethod = paymentMethod === 'orange_money' ? 'orange_money' : 'mtn_momo';
    try {
      const result = await initiatePullPayment({
        amount: grandTotal,
        currency: cur,
        paymentMethod: ccpMethod,
        customerPhone: mobilePhone.trim(),
        description: `Achat 224Solutions - ${cartItems.length} article(s)`,
        orderId: `order-${Date.now()}`,
      });

      if (!result.success) {
        toast.error(result.error || 'Échec du paiement mobile');
        setPaymentStep('mobile_money_form');
        setMobileProcessing(false);
        return;
      }

      if (result.transactionId) {
        toast.info('Confirmez le paiement sur votre téléphone...');
        const finalStatus = await pollStatus(result.transactionId);

        if (finalStatus.status === 'completed') {
          await createOrderAfterPayment(result.transactionId, paymentMethod);
          setPaymentStep('success');
          toast.success('Paiement mobile réussi !', { description: `${fc(grandTotal, cur)} débité de votre compte` });
          setTimeout(() => { onPaymentSuccess(); onClose(); navigate('/my-purchases'); }, 2000);
        } else {
          toast.error('Paiement non confirmé', { description: 'Veuillez réessayer' });
          setPaymentStep('mobile_money_form');
        }
      } else {
        await createOrderAfterPayment(`mobile-${Date.now()}`, paymentMethod);
        setPaymentStep('success');
        toast.success('Paiement initié avec succès !');
        setTimeout(() => { onPaymentSuccess(); onClose(); navigate('/my-purchases'); }, 2000);
      }
    } catch (err) {
      console.error('Mobile money payment failed:', err);
      toast.error('Erreur lors du paiement mobile');
      setPaymentStep('mobile_money_form');
    } finally {
      setMobileProcessing(false);
    }
  };

  // Handle wallet + COD
  const executePayment = useCallback(async () => {
    if (!userId || cartItems.length === 0) { toast.error('Informations manquantes'); throw new Error('Informations manquantes'); }

    if (paymentMethod === 'card') { setShowCardInline(true); return; }
    if (paymentMethod === 'orange_money' || paymentMethod === 'mtn_money') { setPaymentStep('mobile_money_form'); return; }

    const isCODMethod = paymentMethod === 'cash' || paymentMethod === 'cash_on_delivery';
    if (isCODMethod && (!codPhone.trim() || !codCity.trim())) { toast.error('Veuillez remplir le numéro de téléphone et la ville'); throw new Error('COD info missing'); }

    let effectiveCustomerId = customerId;
    if (!effectiveCustomerId) {
      const { data: existingCustomer } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
      if (existingCustomer) { effectiveCustomerId = existingCustomer.id; }
      else {
        const { data: newCustomer, error: createError } = await supabase.from('customers').insert({ user_id: userId }).select('id').single();
        if (createError || !newCustomer) { toast.error('Impossible de créer le compte client'); throw new Error('Customer creation failed'); }
        effectiveCustomerId = newCustomer.id;
      }
    }

    const itemsByVendor = cartItems.reduce((acc, item) => {
      const vendorKey = item.vendorId || 'unknown';
      if (!acc[vendorKey]) acc[vendorKey] = [];
      acc[vendorKey].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);

    const vendorCount = Object.keys(itemsByVendor).filter(k => k !== 'unknown').length;
    const commissionPerVendor = vendorCount > 0 ? Math.round(commissionFee / vendorCount) : 0;

    for (const [vendorId, items] of Object.entries(itemsByVendor)) {
      if (vendorId === 'unknown') continue;
      const vendorProductTotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      const vendorTotalWithCommission = vendorProductTotal + commissionPerVendor;

      if (paymentMethod === 'wallet') {
        if (walletBalance !== null && walletBalance < grandTotal) {
          toast.error('Solde insuffisant', { description: `Vous avez besoin de ${fc(grandTotal, cur)}` });
          setProcessing(false);
          return;
        }
      }

      const { data: vendorData, error: vendorError } = await supabase.from('vendors').select('user_id').eq('id', vendorId).single();
      if (vendorError || !vendorData) { toast.error('Erreur vendeur'); continue; }

      const normalizedPaymentMethod = isCODMethod ? 'cash' : paymentMethod;

      const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
        p_user_id: userId, p_vendor_id: vendorId,
        p_items: items.map(item => ({ product_id: item.id, quantity: item.quantity || 1, price: item.price })),
        p_total_amount: vendorTotalWithCommission, p_payment_method: normalizedPaymentMethod,
        p_shipping_address: {
          address: isCODMethod && codPhone ? codPhone : 'Adresse de livraison',
          city: isCODMethod && codCity ? codCity : 'Conakry', country: 'Guinée',
          commission_fee: commissionPerVendor, product_total: vendorProductTotal,
          ...(isCODMethod ? { is_cod: true, cod_phone: codPhone, cod_city: codCity } : {})
        }
      });

      if (orderError || !orderResult?.length) { toast.error('Erreur création commande', { description: orderError?.message }); continue; }

      const orderId = orderResult[0].order_id;
      const orderNumber = orderResult[0].order_number;

      if (paymentMethod === 'wallet') {
        const escrowResult = await UniversalEscrowService.createEscrow({
          buyer_id: userId, seller_id: vendorData.user_id, order_id: orderId,
          amount: vendorTotalWithCommission, currency: cur, transaction_type: 'product', payment_provider: 'wallet',
          metadata: { product_ids: items.map(i => i.id), order_number: orderNumber, description: `Achat produits (${items.length} articles)`, product_total: vendorProductTotal, commission_fee: commissionPerVendor, commission_percent: commissionConfig?.commission_value || 10 },
          escrow_options: { commission_percent: commissionConfig?.commission_value || 10 }
        });

        if (!escrowResult.success) { toast.error('Erreur de paiement', { description: escrowResult.error }); continue; }

        await supabase.from('orders').update({ metadata: { escrow_transaction_id: escrowResult.escrow_id, commission_fee: commissionPerVendor, product_total: vendorProductTotal, commission_percent: commissionConfig?.commission_value || 10 }, payment_status: 'paid' }).eq('id', orderId);

        if (commissionPerVendor > 0) {
          await supabase.rpc('record_pdg_revenue', { p_source_type: 'frais_achat_commande', p_amount: commissionPerVendor, p_percentage: commissionConfig?.commission_value || 10, p_transaction_id: escrowResult.escrow_id, p_user_id: userId, p_metadata: { order_id: orderId, order_number: orderNumber, vendor_id: vendorId, product_total: vendorProductTotal } });
        }
      }
    }

    if (paymentMethod === 'wallet') {
      toast.success('Paiement sécurisé effectué !', { description: `${fc(grandTotal, cur)} bloqués en escrow. Redirection vers vos achats...` });
    } else if (isCODMethod) {
      toast.success('Commande créée !', { description: `Total à payer à la livraison: ${fc(grandTotal, cur)}. Redirection...` });
    }

    onPaymentSuccess();
    onClose();
    navigate('/mes-commandes');
  }, [userId, customerId, cartItems, paymentMethod, totalAmount, commissionFee, grandTotal, walletBalance, commissionConfig, onPaymentSuccess, onClose, codPhone, codCity, fc, navigate]);

  const insufficientBalance = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < grandTotal;
  const firstVendorId = cartItems.find(item => item.vendorId)?.vendorId || '';

  // ======== RENDER: Success screen ========
  if (paymentStep === 'success') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-primary">Paiement réussi !</h3>
            <p className="text-muted-foreground text-center">{fc(grandTotal, cur)} — Votre commande a été créée</p>
            <p className="text-sm text-muted-foreground animate-pulse">Redirection vers vos achats...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ======== RENDER: Processing screen ========
  if (paymentStep === 'processing') {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">Traitement en cours...</h3>
            <p className="text-sm text-muted-foreground text-center">
              {paymentMethod === 'orange_money' || paymentMethod === 'mtn_money'
                ? 'Confirmez le paiement sur votre téléphone'
                : 'Veuillez patienter'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ======== RENDER: Mobile Money form ========
  if (paymentStep === 'mobile_money_form') {
    const isMTN = paymentMethod === 'mtn_money';
    const providerName = isMTN ? 'MTN Mobile Money' : 'Orange Money';
    const providerColor = isMTN ? 'text-yellow-600' : 'text-orange-500';
    const providerBg = isMTN ? 'bg-yellow-50 border-yellow-200' : 'bg-orange-50 border-orange-200';

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setPaymentStep('select_method')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className={`w-5 h-5 ${providerColor}`} />
                {providerName}
              </DialogTitle>
            </div>
            <DialogDescription>
              Un débit de {fc(grandTotal, cur)} sera envoyé sur votre téléphone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg border ${providerBg}`}>
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold">{fc(grandTotal, cur)}</p>
                <p className="text-sm text-muted-foreground">Montant à débiter</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-phone">Numéro de téléphone {providerName} <span className="text-red-500">*</span></Label>
              <Input
                id="mobile-phone"
                type="tel"
                inputMode="tel"
                placeholder={isMTN ? "Ex: 66X XX XX XX" : "Ex: 62X XX XX XX"}
                value={mobilePhone}
                onChange={(e) => setMobilePhone(e.target.value)}
                className="text-lg py-3"
              />
            </div>

            <Alert className={`${providerBg}`}>
              <Phone className={`h-4 w-4 ${providerColor}`} />
              <AlertDescription className="text-sm">
                Après avoir cliqué sur "Payer", vous recevrez une demande de confirmation sur votre téléphone. 
                Composez votre code PIN pour valider le paiement.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setPaymentStep('select_method')} className="flex-1" disabled={mobileProcessing}>
                Retour
              </Button>
              <Button
                onClick={handleMobileMoneyPay}
                className="flex-1"
                disabled={mobileProcessing || !mobilePhone.trim()}
              >
                {mobileProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traitement...</>
                ) : (
                  <>Payer {fc(grandTotal, cur)}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ======== RENDER: Method selection (default) ========
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Paiement Sécurisé
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 mt-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm items-start">
                  <span>Sous-total produits:</span>
                  {renderPrice(totalAmount)}
                </div>
                {commissionFee > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground items-start">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Frais de service ({commissionConfig?.commission_value || 1.5}%):
                    </span>
                    <span>+{priceText(commissionFee)}</span>
                  </div>
                )}
                {loadingCommission && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Calcul des frais...
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2 items-start">
                  <span>Total à payer:</span>
                  {renderPrice(grandTotal, 'text-primary')}
                </div>
              </div>

              {paymentMethod === 'wallet' && (
                <>
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-800 dark:text-green-200">
                      Vos fonds sont protégés par notre système Escrow jusqu'à la livraison
                    </span>
                  </div>
                  <div className="text-sm">
                    Solde disponible: <span className={`font-semibold ${insufficientBalance ? 'text-destructive' : 'text-green-600'}`}>
                      {fc(walletBalance || 0, cur)}
                    </span>
                  </div>
                  {walletBalance === 0 && (
                    <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-900 dark:text-orange-200">
                        Votre wallet est vide. Rechargez-le d'abord ou sélectionnez un autre moyen de paiement.
                      </AlertDescription>
                    </Alert>
                  )}
                  {vendorCode && (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm">ID Vendeur: <span className="font-bold text-primary">{vendorCode}</span></span>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {insufficientBalance && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Solde insuffisant. Il vous manque {fc(grandTotal - (walletBalance || 0), cur)}.</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <RadioGroup value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v as ProductPaymentMethod); setShowCardInline(false); }}>
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent"
                     onClick={() => { setPaymentMethod(method.id); setShowCardInline(false); }}>
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Icon className={`w-6 h-6 ${method.color}`} />
                  <div className="flex-1">
                    <Label htmlFor={method.id} className="font-medium cursor-pointer">{method.name}</Label>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {paymentMethod === 'cash' && (
            <div className="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg animate-in slide-in-from-top-2">
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" /> Informations de contact
              </h4>
              <div className="space-y-2">
                <Label htmlFor="marketplace-cod-phone" className="text-sm">Numéro à contacter <span className="text-red-500">*</span></Label>
                <Input id="marketplace-cod-phone" type="tel" inputMode="tel" placeholder="Ex: 620 00 00 00" value={codPhone} onChange={(e) => setCodPhone(e.target.value)} className="bg-white" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketplace-cod-city" className="text-sm">Ville <span className="text-red-500">*</span></Label>
                <Input id="marketplace-cod-city" placeholder="Ex: Conakry, Kindia, Dakar..." value={codCity} onChange={(e) => setCodCity(e.target.value)} className="bg-white" required />
              </div>
              <Alert className="bg-emerald-50 border-emerald-200 mt-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  <strong>Paiement à la livraison confirmé</strong><br/>
                  Vous serez contacté par téléphone pour confirmer votre adresse exacte. Préparez {fc(grandTotal, cur)} en espèces.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Carte bancaire Stripe inline */}
        {showCardInline && paymentMethod === 'card' && (
          <div className="space-y-3 py-2 border-t">
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-800 dark:text-green-200">
                Vos fonds sont protégés par notre système Escrow jusqu'à la confirmation de réception
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">Paiement sécurisé par carte (Escrow)</span>
            </div>
            <Suspense fallback={
              <div className="flex items-center justify-center p-4 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Chargement...</span>
              </div>
            }>
              <StripeCheckoutButton
                amount={totalAmount}
                currency={cur}
                description={`Achat ${cartItems.length} article(s) - Marketplace 224Solutions`}
                edgeFunction="marketplace-escrow-payment"
                extraParams={{ cartItems: cartItems.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity || 1, vendorId: i.vendorId })) }}
                onSuccess={handleCardSuccess}
                onCancel={() => setShowCardInline(false)}
                onError={(error) => { toast.error(error); setShowCardInline(false); }}
              />
            </Suspense>
            <Button variant="outline" onClick={() => setShowCardInline(false)} className="w-full" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Changer de méthode
            </Button>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={processing}>Annuler</Button>
          <SecureButton
            onSecureClick={executePayment}
            className="flex-1"
            disabled={insufficientBalance || loadingCommission || showCardInline}
            loadingText="Traitement..."
            debounceMs={1000}
          >
            {paymentMethod === 'card' ? `Payer maintenant ${priceText(grandTotal)}` :
             paymentMethod === 'orange_money' || paymentMethod === 'mtn_money' ? 'Continuer' :
             paymentMethod === 'wallet' ? `Payer ${priceText(grandTotal)}` : `Confirmer ${priceText(grandTotal)}`}
          </SecureButton>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
