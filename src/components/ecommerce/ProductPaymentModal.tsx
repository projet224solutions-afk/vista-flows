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
  /** Devise source du produit/vendeur (ex: 'XOF', 'GNF'). DÃ©faut: 'GNF' */
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
    { id: 'wallet' as ProductPaymentMethod, name: 'Wallet 224Solutions', description: 'Paiement instantanÃ© depuis votre wallet', icon: Wallet, color: 'text-primary' },
    { id: 'card' as ProductPaymentMethod, name: 'Carte Bancaire', description: 'Paiement sÃ©curisÃ© VISA / Mastercard via Stripe', icon: CreditCard, color: 'text-primary' },
    { id: 'orange_money' as ProductPaymentMethod, name: 'Orange Money', description: 'DÃ©bit instantanÃ© sur votre tÃ©lÃ©phone', icon: Smartphone, color: 'text-orange-500' },
    { id: 'mtn_money' as ProductPaymentMethod, name: 'MTN Mobile Money', description: 'DÃ©bit instantanÃ© via MTN MoMo', icon: Smartphone, color: 'text-yellow-600' },
    { id: 'cash' as ProductPaymentMethod, name: 'Paiement Ã  la livraison', description: 'Payez en espÃ¨ces Ã  la rÃ©ception', icon: Banknote, color: 'text-primary-orange-600' },
  ];

  const createOrderAfterPayment = async (paymentId: string, method: string) => {
    let effectiveCustomerId = customerId;
    if (!effectiveCustomerId) {
      const { data: existingCustomer } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
      if (existingCustomer) { effectiveCustomerId = existingCustomer.id; }
      else {
        const { data: newCustomer, error: createError } = await supabase.from('customers').insert({ user_id: userId }).select('id').single();
        if (createError || !newCustomer) { toast.error('Impossible de crÃ©er le compte client'); return; }
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
        p_shipping_address: { address: 'Adresse de livraison', city: 'Conakry', country: 'GuinÃ©e', commission_fee: commissionPerVendor, product_total: vendorProductTotal, external_payment_id: paymentId }
      });

      if (orderError || !orderResult?.length) {
        console.error('[ProductPayment] Order creation failed:', orderError);
        toast.error('Erreur lors de la crÃ©ation de la commande');
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

  // Handle Stripe escrow success (capture manuelle â€” fonds bloquÃ©s)
  const handleCardSuccess = async (data: { paymentIntentId: string; amount: number; currency: string }) => {
    setPaymentStep('processing');
    try {
      console.log('[ProductPayment] handleCardSuccess called:', { paymentIntentId: data.paymentIntentId, cartItems: cartItems.length });

      // CrÃ©er les commandes avec payment_status = 'pending' (fonds en escrow)
      let effectiveCustomerId = customerId;
      if (!effectiveCustomerId) {
        const { data: existingCustomer } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
        if (existingCustomer) { effectiveCustomerId = existingCustomer.id; }
        else {
          const { data: newCustomer, error: custErr } = await supabase.from('customers').insert({ user_id: userId }).select('id').single();
          if (custErr) console.error('[ProductPayment] Customer creation error:', custErr);
          if (newCustomer) effectiveCustomerId = newCustomer.id;
        }
      }

      const itemsByVendor = cartItems.reduce((acc, item) => {
        const vendorKey = item.vendorId || 'unknown';
        if (!acc[vendorKey]) acc[vendorKey] = [];
        acc[vendorKey].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      const vendorEntries = Object.entries(itemsByVendor).filter(([k]) => k !== 'unknown');
      
      if (vendorEntries.length === 0) {
        console.error('[ProductPayment] No vendor entries found! cartItems:', JSON.stringify(cartItems));
        toast.error('Erreur: aucun vendeur identifiÃ© pour cette commande');
        setPaymentStep('select_method');
        return;
      }

      const commissionPerVendor = vendorEntries.length > 0 ? Math.round(commissionFee / vendorEntries.length) : 0;
      const createdOrders: string[] = [];
      const errors: string[] = [];

      for (const [vendorId, items] of vendorEntries) {
        const vendorProductTotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        const vendorTotalWithCommission = vendorProductTotal + commissionPerVendor;

        console.log('[ProductPayment] Creating order for vendor:', { vendorId, itemCount: items.length, total: vendorTotalWithCommission });

        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: userId, p_vendor_id: vendorId,
          p_items: items.map(item => ({ product_id: item.id, quantity: item.quantity || 1, price: item.price })),
          p_total_amount: vendorTotalWithCommission, p_payment_method: 'card',
          p_shipping_address: { address: 'Adresse de livraison', city: 'Conakry', country: 'GuinÃ©e', commission_fee: commissionPerVendor, product_total: vendorProductTotal, external_payment_id: data.paymentIntentId }
        });

        if (orderError || !orderResult?.length) {
          const errMsg = orderError?.message || 'RÃ©sultat vide';
          console.error('[ProductPayment] Order creation failed for vendor', vendorId, ':', errMsg);
          errors.push(errMsg);
          toast.error(`Erreur commande: ${errMsg}`);
          continue;
        }

        const orderId = orderResult[0].order_id;
        createdOrders.push(orderId);
        console.log('[ProductPayment] Order created:', { orderId, orderNumber: orderResult[0].order_number });

        // payment_status = 'pending' car fonds en escrow (pas encore capturÃ©s)
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

        // Lier l'escrow Ã  l'order_id cÃ´tÃ© serveur (bypass RLS)
        const { data: linkData, error: linkError } = await supabase.functions.invoke('link-escrow-order', {
          body: {
            payment_intent_id: data.paymentIntentId,
            vendor_id: vendorId,
            order_id: orderId,
          }
        });

        if (linkError || !linkData?.success) {
          console.error('[ProductPayment] Escrow linking failed:', linkError || linkData?.error);
          errors.push(linkError?.message || linkData?.error || 'Ã‰chec liaison escrow');
        }

        // Enregistrer la commission PDG
        if (commissionPerVendor > 0) {
          await supabase.rpc('record_pdg_revenue', {
            p_source_type: 'frais_achat_commande', p_amount: commissionPerVendor,
            p_percentage: commissionConfig?.commission_value || 10, p_transaction_id: data.paymentIntentId,
            p_user_id: userId, p_metadata: { order_id: orderId, vendor_id: vendorId, product_total: vendorProductTotal }
          });
        }
      }

      if (createdOrders.length === 0) {
        console.error('[ProductPayment] NO orders created! Errors:', errors);
        toast.error('Le paiement a Ã©tÃ© effectuÃ© mais la commande n\'a pas pu Ãªtre crÃ©Ã©e. Contactez le support.', {
          description: errors[0] || 'Erreur inconnue',
          duration: 10000,
        });
        setPaymentStep('select_method');
        return;
      }

      setPaymentStep('success');
      toast.success('Paiement sÃ©curisÃ© par escrow !', {
        description: `${fc(grandTotal, cur)} bloquÃ©s â€” libÃ©rÃ©s aprÃ¨s confirmation de rÃ©ception`
      });
      setTimeout(() => { onPaymentSuccess(); onClose(); navigate('/my-purchases'); }, 2000);
    } catch (err) {
      console.error('[ProductPayment] Order creation after escrow payment failed:', err);
      toast.error('Paiement rÃ©ussi mais erreur lors de la commande. Contactez le support.', {
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        duration: 10000,
      });
      setPaymentStep('select_method');
    }
  };

  // Handle Mobile Money PULL
  const handleMobileMoneyPay = async () => {
    if (!mobilePhone.trim() || mobilePhone.trim().length < 8) {
      toast.error('Veuillez saisir un numÃ©ro de tÃ©lÃ©phone valide');
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
        toast.error(result.error || 'Ã‰chec du paiement mobile');
        setPaymentStep('mobile_money_form');
        setMobileProcessing(false);
        return;
      }

      if (result.transactionId) {
        toast.info('Confirmez le paiement sur votre tÃ©lÃ©phone...');
        const finalStatus = await pollStatus(result.transactionId);

        if (finalStatus.status === 'completed') {
          await createOrderAfterPayment(result.transactionId, paymentMethod);
          setPaymentStep('success');
          toast.success('Paiement mobile rÃ©ussi !', { description: `${fc(grandTotal, cur)} dÃ©bitÃ© de votre compte` });
          setTimeout(() => { onPaymentSuccess(); onClose(); navigate('/my-purchases'); }, 2000);
        } else {
          toast.error('Paiement non confirmÃ©', { description: 'Veuillez rÃ©essayer' });
          setPaymentStep('mobile_money_form');
        }
      } else {
        await createOrderAfterPayment(`mobile-${Date.now()}`, paymentMethod);
        setPaymentStep('success');
        toast.success('Paiement initiÃ© avec succÃ¨s !');
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
    if (isCODMethod && (!codPhone.trim() || !codCity.trim())) { toast.error('Veuillez remplir le numÃ©ro de tÃ©lÃ©phone et la ville'); throw new Error('COD info missing'); }

    let effectiveCustomerId = customerId;
    if (!effectiveCustomerId) {
      const { data: existingCustomer } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle();
      if (existingCustomer) { effectiveCustomerId = existingCustomer.id; }
      else {
        const { data: newCustomer, error: createError } = await supabase.from('customers').insert({ user_id: userId }).select('id').single();
        if (createError || !newCustomer) { toast.error('Impossible de crÃ©er le compte client'); throw new Error('Customer creation failed'); }
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
          city: isCODMethod && codCity ? codCity : 'Conakry', country: 'GuinÃ©e',
          commission_fee: commissionPerVendor, product_total: vendorProductTotal,
          ...(isCODMethod ? { is_cod: true, cod_phone: codPhone, cod_city: codCity } : {})
        }
      });

      if (orderError || !orderResult?.length) { toast.error('Erreur crÃ©ation commande', { description: orderError?.message }); continue; }

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
      toast.success('Paiement sÃ©curisÃ© effectuÃ© !', { description: `${fc(grandTotal, cur)} bloquÃ©s en escrow. Redirection vers vos achats...` });
    } else if (isCODMethod) {
      toast.success('Commande crÃ©Ã©e !', { description: `Total Ã  payer Ã  la livraison: ${fc(grandTotal, cur)}. Redirection...` });
    }

    onPaymentSuccess();
    onClose();
    navigate('/my-purchases');
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
            <h3 className="text-xl font-bold text-primary">Paiement rÃ©ussi !</h3>
            <p className="text-muted-foreground text-center">{fc(grandTotal, cur)} â€” Votre commande a Ã©tÃ© crÃ©Ã©e</p>
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
                ? 'Confirmez le paiement sur votre tÃ©lÃ©phone'
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
              Un dÃ©bit de {fc(grandTotal, cur)} sera envoyÃ© sur votre tÃ©lÃ©phone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg border ${providerBg}`}>
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold">{fc(grandTotal, cur)}</p>
                <p className="text-sm text-muted-foreground">Montant Ã  dÃ©biter</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-phone">NumÃ©ro de tÃ©lÃ©phone {providerName} <span className="text-red-500">*</span></Label>
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
                AprÃ¨s avoir cliquÃ© sur "Payer", vous recevrez une demande de confirmation sur votre tÃ©lÃ©phone. 
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
            Paiement SÃ©curisÃ©
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
                  <span>Total Ã  payer:</span>
                  {renderPrice(grandTotal, 'text-primary')}
                </div>
              </div>

              {paymentMethod === 'wallet' && (
                <>
                  <div className="flex items-center gap-2 p-2 bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 dark:bg-primary-orange-950 rounded-md border border-primary-orange-200 dark:border-primary-orange-800">
                    <Shield className="w-4 h-4 text-primary-orange-600" />
                    <span className="text-xs text-primary-orange-800 dark:text-primary-orange-200">
                      Vos fonds sont protÃ©gÃ©s par notre systÃ¨me Escrow jusqu'Ã  la livraison
                    </span>
                  </div>
                  <div className="text-sm">
                    Solde disponible: <span className={`font-semibold ${insufficientBalance ? 'text-destructive' : 'text-primary-orange-600'}`}>
                      {fc(walletBalance || 0, cur)}
                    </span>
                  </div>
                  {walletBalance === 0 && (
                    <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-900 dark:text-orange-200">
                        Votre wallet est vide. Rechargez-le d'abord ou sÃ©lectionnez un autre moyen de paiement.
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
            <div className="space-y-3 p-4 bg-primary-blue-50 border border-primary-orange-200 rounded-lg animate-in slide-in-from-top-2">
              <h4 className="font-semibold text-primary-blue-800 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" /> Informations de contact
              </h4>
              <div className="space-y-2">
                <Label htmlFor="marketplace-cod-phone" className="text-sm">NumÃ©ro Ã  contacter <span className="text-red-500">*</span></Label>
                <Input id="marketplace-cod-phone" type="tel" inputMode="tel" placeholder="Ex: 620 00 00 00" value={codPhone} onChange={(e) => setCodPhone(e.target.value)} className="bg-white" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketplace-cod-city" className="text-sm">Ville <span className="text-red-500">*</span></Label>
                <Input id="marketplace-cod-city" placeholder="Ex: Conakry, Kindia, Dakar..." value={codCity} onChange={(e) => setCodCity(e.target.value)} className="bg-white" required />
              </div>
              <Alert className="bg-primary-blue-50 border-primary-orange-200 mt-2">
                <Truck className="h-4 w-4 text-primary-blue-600" />
                <AlertDescription className="text-primary-blue-700">
                  <strong>Paiement Ã  la livraison confirmÃ©</strong><br/>
                  Vous serez contactÃ© par tÃ©lÃ©phone pour confirmer votre adresse exacte. PrÃ©parez {fc(grandTotal, cur)} en espÃ¨ces.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Carte bancaire Stripe inline */}
        {showCardInline && paymentMethod === 'card' && (
          <div className="space-y-3 py-2 border-t">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 dark:bg-primary-orange-950 rounded-md border border-primary-orange-200 dark:border-primary-orange-800">
              <Shield className="w-4 h-4 text-primary-orange-600" />
              <span className="text-xs text-primary-orange-800 dark:text-primary-orange-200">
                Vos fonds sont protÃ©gÃ©s par notre systÃ¨me Escrow jusqu'Ã  la confirmation de rÃ©ception
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">Paiement sÃ©curisÃ© par carte (Escrow)</span>
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
              <ArrowLeft className="w-4 h-4 mr-2" /> Changer de mÃ©thode
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
