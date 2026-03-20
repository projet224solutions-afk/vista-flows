/**
 * MODAL PAIEMENT PRODUITS
 * Support: Wallet 224Solutions, Cash
 * Inclut le calcul et la facturation des commissions
 */

import { useState, useEffect, useCallback, startTransition, useRef } from 'react';
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
import { Wallet, Banknote, Loader2, AlertCircle, Shield, Info, Phone, Truck, CreditCard, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Escrow224Service } from "@/services/escrow224Service";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";
import { SecureButton } from "@/components/ui/SecureButton";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";

export type ProductPaymentMethod = 'wallet' | 'cash' | 'cash_on_delivery' | 'orange_money' | 'mtn_money' | 'card';

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
}

export default function ProductPaymentModal({
  open,
  onClose,
  cartItems,
  totalAmount,
  onPaymentSuccess,
  userId,
  customerId
}: ProductPaymentModalProps) {
  console.log('💳 ProductPaymentModal render:', { 
    open, 
    userId, 
    customerId, 
    cartItemsCount: cartItems.length,
    totalAmount 
  });
  const fc = useFormatCurrency();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState<ProductPaymentMethod>('wallet');
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [vendorCode, setVendorCode] = useState<string | null>(null);
  const [loadingVendorCode, setLoadingVendorCode] = useState(false);
  const [codPhone, setCodPhone] = useState('');
  const [codCity, setCodCity] = useState('');
  
  // Commission state
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig | null>(null);
  const [loadingCommission, setLoadingCommission] = useState(false);
  const [commissionFee, setCommissionFee] = useState(0);
  const [grandTotal, setGrandTotal] = useState(totalAmount);

  // Charger le solde wallet et la commission au montage du modal
  useEffect(() => {
    if (open && userId) {
      loadWalletBalance();
      loadCommissionConfig();
    }
  }, [open, userId]);

  // Recalculer les frais quand le totalAmount ou la config change
  useEffect(() => {
    if (commissionConfig && totalAmount > 0) {
      calculateCommissionFee();
    } else {
      setCommissionFee(0);
      setGrandTotal(totalAmount);
    }
  }, [totalAmount, commissionConfig]);

  // Charger le code du vendeur quand wallet est sélectionné
  useEffect(() => {
    if (open && paymentMethod === 'wallet' && cartItems.length > 0) {
      loadVendorCode();
    } else {
      setVendorCode(null);
    }
  }, [open, paymentMethod, cartItems]);

  // Réinitialiser le code vendeur à la fermeture
  useEffect(() => {
    if (!open) {
      setVendorCode(null);
    }
  }, [open]);

  const loadCommissionConfig = async () => {
    setLoadingCommission(true);
    try {
      // CORRIGÉ: Lire depuis system_settings via la fonction RPC
      // Cela utilise les taux modifiables par le PDG dans la section Finance
      // Lire directement depuis system_settings
      const { data: settingsData, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'purchase_fee_percent')
        .single();

      if (error) {
        console.error('[ProductPayment] Error loading commission:', error);
        // Fallback: 10% par défaut
        setCommissionConfig({
          commission_type: 'percentage',
          commission_value: 10
        });
      } else if (settingsData?.setting_value) {
        setCommissionConfig({
          commission_type: 'percentage',
          commission_value: Number(settingsData.setting_value)
        });
        console.log('[ProductPayment] Commission from system_settings:', settingsData.setting_value);
      } else {
        // Fallback: 10% par défaut (taux standard marketplace)
        setCommissionConfig({
          commission_type: 'percentage',
          commission_value: 10
        });
        console.log('[ProductPayment] Using default commission: 10%');
      }
    } catch (error) {
      console.error('[ProductPayment] Error loading commission config:', error);
      // Fallback en cas d'erreur
      setCommissionConfig({
        commission_type: 'percentage',
        commission_value: 10
      });
    } finally {
      setLoadingCommission(false);
    }
  };

  const calculateCommissionFee = () => {
    if (!commissionConfig) {
      setCommissionFee(0);
      setGrandTotal(totalAmount);
      return;
    }

    // Vérifier le montant minimum
    if (commissionConfig.min_amount && totalAmount < commissionConfig.min_amount) {
      setCommissionFee(0);
      setGrandTotal(totalAmount);
      return;
    }

    let fee = 0;
    if (commissionConfig.commission_type === 'percentage') {
      fee = Math.round(totalAmount * (commissionConfig.commission_value / 100));
    } else {
      fee = commissionConfig.commission_value;
    }

    setCommissionFee(fee);
    setGrandTotal(totalAmount + fee);
    console.log('[ProductPayment] Commission calculated:', { fee, grandTotal: totalAmount + fee });
  };

  const loadWalletBalance = async () => {
    setLoadingBalance(true);
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .eq('currency', 'GNF')
        .single();

      if (error) throw error;
      setWalletBalance(data?.balance || 0);
    } catch (error) {
      console.error('[ProductPayment] Error loading balance:', error);
      setWalletBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadVendorCode = async () => {
    setLoadingVendorCode(true);
    try {
      // Récupérer le premier vendeur du panier
      const firstVendorId = cartItems.find(item => item.vendorId)?.vendorId;
      
      if (!firstVendorId) {
        setVendorCode(null);
        return;
      }

      // Récupérer le code du vendeur et le user_id
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('user_id, vendor_code')
        .eq('id', firstVendorId)
        .single();

      if (vendorError || !vendorData) {
        console.error('[ProductPayment] Error loading vendor:', vendorError);
        setVendorCode(null);
        return;
      }

      // Si vendor_code existe, l'utiliser
      if (vendorData.vendor_code) {
        setVendorCode(vendorData.vendor_code);
      } else {
        // Sinon récupérer le public_id du wallet
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', vendorData.user_id)
          .eq('currency', 'GNF')
          .single();

          if (walletError || !walletData) {
            console.error('[ProductPayment] Error loading wallet code:', walletError);
            setVendorCode(vendorData.user_id.slice(0, 8).toUpperCase());
          } else {
            setVendorCode(String(walletData.id).slice(0, 8).toUpperCase());
          }
      }
    } catch (error) {
      console.error('[ProductPayment] Error loading vendor code:', error);
      setVendorCode(null);
    } finally {
      setLoadingVendorCode(false);
    }
  };

  const paymentMethods = [
    {
      id: 'wallet' as ProductPaymentMethod,
      name: 'Wallet 224Solutions',
      description: 'Paiement instantané depuis votre wallet',
      icon: Wallet,
      color: 'text-primary'
    },
    {
      id: 'card' as ProductPaymentMethod,
      name: 'Carte Bancaire',
      description: 'Paiement sécurisé VISA / Mastercard',
      icon: CreditCard,
      color: 'text-primary'
    },
    {
      id: 'orange_money' as ProductPaymentMethod,
      name: 'Orange Money',
      description: 'Paiement instantané via Orange Money',
      icon: Smartphone,
      color: 'text-orange-500'
    },
    {
      id: 'mtn_money' as ProductPaymentMethod,
      name: 'MTN Mobile Money',
      description: 'Paiement via MTN MoMo',
      icon: Smartphone,
      color: 'text-yellow-600'
    },
    {
      id: 'cash' as ProductPaymentMethod,
      name: 'Paiement à la livraison',
      description: 'Payez en espèces à la réception',
      icon: Banknote,
      color: 'text-green-600'
    }
  ];

  // Action de paiement sécurisée - séparée du handler UI
  const executePayment = useCallback(async () => {
    console.log('[ProductPayment] Starting payment process:', {
      userId,
      customerId,
      cartItems: cartItems.length,
      paymentMethod,
      totalAmount,
      commissionFee,
      grandTotal
    });

    if (!userId || cartItems.length === 0) {
      console.error('[ProductPayment] Missing information:', { userId, cartItems });
      toast.error('Informations manquantes');
      throw new Error('Informations manquantes');
    }

    // Validation COD: téléphone et ville requis
    const isCODMethod = paymentMethod === 'cash' || paymentMethod === 'cash_on_delivery';
    if (isCODMethod && (!codPhone.trim() || !codCity.trim())) {
      toast.error('Veuillez remplir le numéro de téléphone et la ville');
      throw new Error('COD info missing');
    }

    // Pour les paiements par carte ou mobile money, rediriger vers la page de paiement
    // L'ordre sera créé APRÈS confirmation du paiement
    if (paymentMethod === 'card' || paymentMethod === 'orange_money' || paymentMethod === 'mtn_money') {
      const firstItem = cartItems[0];
      toast.success('Redirection vers le paiement...');
      onClose();
      
      navigate('/payment', {
        state: {
          fromCart: true,
          cartItems: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            vendorId: item.vendorId,
            quantity: item.quantity || 1,
          })),
          amount: grandTotal,
          totalAmount: grandTotal,
          commissionFee,
          productTotal: totalAmount,
          paymentMethod,
          productName: cartItems.length === 1 ? firstItem.name : `${cartItems.length} articles`,
          vendorId: firstItem.vendorId,
          productType: 'physical'
        }
      });
      
      return;
    }

    // Créer ou récupérer le customer_id si manquant
    let effectiveCustomerId = customerId;
    if (!effectiveCustomerId) {
      console.log('[ProductPayment] Customer ID missing, creating...');
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingCustomer) {
        effectiveCustomerId = existingCustomer.id;
        console.log('[ProductPayment] Found existing customer:', effectiveCustomerId);
      } else {
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({ user_id: userId })
          .select('id')
          .single();
        
        if (createError || !newCustomer) {
          console.error('[ProductPayment] Failed to create customer:', createError);
          toast.error('Impossible de créer le compte client');
          throw new Error('Customer creation failed');
        }
        
        effectiveCustomerId = newCustomer.id;
        console.log('[ProductPayment] Created new customer:', effectiveCustomerId);
        toast.success('Compte client initialisé');
      }
    }

    // Grouper les articles par vendeur
      const itemsByVendor = cartItems.reduce((acc, item) => {
        const vendorKey = item.vendorId || 'unknown';
        if (!acc[vendorKey]) {
          acc[vendorKey] = [];
        }
        acc[vendorKey].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      // Calculer la proportion de commission par vendeur
      const vendorCount = Object.keys(itemsByVendor).filter(k => k !== 'unknown').length;
      const commissionPerVendor = vendorCount > 0 ? Math.round(commissionFee / vendorCount) : 0;

      // Traiter chaque vendeur séparément
      for (const [vendorId, items] of Object.entries(itemsByVendor)) {
        if (vendorId === 'unknown') {
          console.error('❌ Produit sans vendeur:', items);
          continue;
        }

        const vendorProductTotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        // Montant total pour ce vendeur: produits + part de commission
        const vendorTotalWithCommission = vendorProductTotal + commissionPerVendor;

        // Vérifier le solde en premier si paiement wallet (avec commission incluse)
        if (paymentMethod === 'wallet') {
          if (walletBalance !== null && walletBalance < grandTotal) {
            console.error('[ProductPayment] Insufficient balance:', { walletBalance, grandTotal });
            toast.error('Solde insuffisant', {
              description: `Vous avez besoin de ${fc(grandTotal)} (produits + frais de service)`
            });
            setProcessing(false);
            return;
          }
        }

        // Récupérer le user_id du vendeur
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('user_id')
          .eq('id', vendorId)
          .single();

        if (vendorError || !vendorData) {
          toast.error('Erreur vendeur', {
            description: 'Impossible de trouver le vendeur'
          });
          continue;
        }

        // Normaliser vers les valeurs de l'enum payment_method de la DB
        const normalizedPaymentMethod = isCODMethod ? 'cash' : paymentMethod;

        console.log('[ProductPayment] Creating order via create_online_order:', {
          user_id: userId,
          vendor_id: vendorId,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity || 1, price: i.price })),
          product_total: vendorProductTotal,
          commission_fee: commissionPerVendor,
          total_amount_with_commission: vendorTotalWithCommission,
          payment_method: normalizedPaymentMethod
        });

        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: userId,
          p_vendor_id: vendorId,
          p_items: items.map(item => ({
            product_id: item.id,
            quantity: item.quantity || 1,
            price: item.price
          })),
          p_total_amount: vendorTotalWithCommission,
          p_payment_method: normalizedPaymentMethod,
          p_shipping_address: {
            address: isCODMethod && codPhone ? codPhone : 'Adresse de livraison',
            city: isCODMethod && codCity ? codCity : 'Conakry',
            country: 'Guinée',
            commission_fee: commissionPerVendor,
            product_total: vendorProductTotal,
            ...(isCODMethod ? { is_cod: true, cod_phone: codPhone, cod_city: codCity } : {})
          }
        });

        if (orderError || !orderResult || orderResult.length === 0) {
          console.error('[ProductPayment] Order creation failed:', {
            error: orderError,
            message: orderError?.message
          });
          toast.error('Erreur création commande', {
            description: orderError?.message || 'Impossible de créer la commande'
          });
          continue;
        }

        const orderId = orderResult[0].order_id;
        const orderNumber = orderResult[0].order_number;
        console.log('[ProductPayment] Order created successfully:', { orderId, orderNumber });

        // Si paiement wallet, initier l'escrow AVEC le montant incluant la commission
        if (paymentMethod === 'wallet') {
          console.log('[ProductPayment] Initiating escrow with commission:', {
            order_id: orderId,
            buyer_id: userId,
            seller_id: vendorData.user_id,
            product_amount: vendorProductTotal,
            commission_fee: commissionPerVendor,
            total_escrow_amount: vendorTotalWithCommission
          });

          // Initier l'escrow via le service universel - MONTANT AVEC COMMISSION
          const escrowResult = await UniversalEscrowService.createEscrow({
            buyer_id: userId,
            seller_id: vendorData.user_id,
            order_id: orderId,
            amount: vendorTotalWithCommission,
            currency: 'GNF',
            transaction_type: 'product',
            payment_provider: 'wallet',
            metadata: {
              product_ids: items.map(i => i.id),
              order_number: orderNumber,
              description: `Achat produits (${items.length} articles)`,
              product_total: vendorProductTotal,
              commission_fee: commissionPerVendor,
              commission_percent: commissionConfig?.commission_value || 10
            },
            escrow_options: {
              commission_percent: commissionConfig?.commission_value || 10
            }
          });

          if (!escrowResult.success) {
            console.error('[ProductPayment] Escrow initiation failed:', escrowResult.error);
            toast.error('Erreur de paiement', {
              description: escrowResult.error || 'L\'escrow a échoué'
            });
            continue;
          }

          const escrowId = escrowResult.escrow_id;
          console.log('✅ Escrow initiated successfully:', escrowId);

          // Mettre à jour la commande avec l'escrow_transaction_id et les infos de commission
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              metadata: {
                escrow_transaction_id: escrowId,
                commission_fee: commissionPerVendor,
                product_total: vendorProductTotal,
                commission_percent: commissionConfig?.commission_value || 10
              },
              payment_status: 'paid'
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('[ProductPayment] Failed to update order with escrow ID:', updateError);
          }

          // Enregistrer le revenu PDG (commission sur achat)
          if (commissionPerVendor > 0) {
            const { error: revenueError } = await supabase.rpc('record_pdg_revenue', {
              p_source_type: 'frais_achat_commande',
              p_amount: commissionPerVendor,
              p_percentage: commissionConfig?.commission_value || 10,
              p_transaction_id: escrowId,
              p_user_id: userId,
              p_metadata: {
                order_id: orderId,
                order_number: orderNumber,
                vendor_id: vendorId,
                product_total: vendorProductTotal
              }
            });

            if (revenueError) {
              console.error('[ProductPayment] Failed to record PDG revenue:', revenueError);
            } else {
              console.log('✅ PDG revenue recorded:', commissionPerVendor, 'GNF');
            }
          }
        }
      }

      // Succès
      if (paymentMethod === 'wallet') {
        toast.success('Paiement sécurisé effectué !', {
          description: `${fc(grandTotal)} bloqués en escrow (dont ${fc(commissionFee)} de frais)`
        });
      } else if (isCODMethod) {
        toast.success('Commande créée !', {
          description: `Total à payer à la livraison: ${fc(grandTotal)}`
        });
      }

      onPaymentSuccess();
      onClose();
  }, [userId, customerId, cartItems, paymentMethod, totalAmount, commissionFee, grandTotal, walletBalance, commissionConfig, onPaymentSuccess, onClose, codPhone, codCity, fc]);

  // Vérifier le solde avec le grandTotal (incluant la commission)
  const insufficientBalance = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < grandTotal;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Paiement Sécurisé (Escrow)
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 mt-2">
              {/* Debug info - visible en dev */}
              {!customerId && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ℹ️ Customer ID: {customerId || 'null'} - Sera créé automatiquement
                  </p>
                </div>
              )}
              
              {/* Récapitulatif des montants */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total produits:</span>
                  <span>{fc(totalAmount)}</span>
                </div>
                
                {commissionFee > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Frais de service ({commissionConfig?.commission_value || 1.5}%):
                    </span>
                    <span>+{fc(commissionFee)}</span>
                  </div>
                )}
                
                {loadingCommission && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calcul des frais...
                  </div>
                )}
                
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total à payer:</span>
                  <span className="text-primary">{fc(grandTotal)}</span>
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
                      {fc(walletBalance || 0)}
                    </span>
                  </div>
                  {walletBalance === 0 && (
                    <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-900 dark:text-orange-200">
                        Votre wallet est vide. Rechargez-le d'abord via l'onglet Wallet ou sélectionnez "Paiement à la livraison".
                      </AlertDescription>
                    </Alert>
                  )}
                  {vendorCode && (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm">
                        ID Vendeur: <span className="font-bold text-primary">{vendorCode}</span>
                      </span>
                    </div>
                  )}
                  {loadingVendorCode && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Chargement ID vendeur...
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
            <AlertDescription>
              Solde insuffisant. Il vous manque {fc(grandTotal - (walletBalance || 0))}.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as ProductPaymentMethod)}>
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-accent"
                     onClick={() => setPaymentMethod(method.id)}>
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Icon className={`w-6 h-6 ${method.color}`} />
                  <div className="flex-1">
                    <Label htmlFor={method.id} className="font-medium cursor-pointer">
                      {method.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {/* Formulaire téléphone et ville pour COD */}
          {paymentMethod === 'cash' && (
            <div className="space-y-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg animate-in slide-in-from-top-2">
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                Informations de contact
              </h4>

              <div className="space-y-2">
                <Label htmlFor="marketplace-cod-phone" className="text-sm">
                  Numéro à contacter <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="marketplace-cod-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="Ex: 620 00 00 00"
                  value={codPhone}
                  onChange={(e) => setCodPhone(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketplace-cod-city" className="text-sm">
                  Ville <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="marketplace-cod-city"
                  placeholder="Ex: Conakry, Kindia, Dakar..."
                  value={codCity}
                  onChange={(e) => setCodCity(e.target.value)}
                  className="bg-white"
                  required
                />
              </div>

              <Alert className="bg-emerald-50 border-emerald-200 mt-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  <strong>Paiement à la livraison confirmé</strong><br/>
                  Vous serez contacté par téléphone pour confirmer votre adresse exacte avant la livraison.
                  Préparez {fc(grandTotal)} en espèces.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {!customerId && (
          <Alert variant="default" className="border-primary/20 bg-primary/5 dark:bg-primary/10">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground dark:text-foreground/80">
              Votre compte client sera automatiquement créé lors du paiement.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={processing}
          >
            Annuler
          </Button>
          <SecureButton
            onSecureClick={executePayment}
            className="flex-1"
            disabled={insufficientBalance || loadingCommission}
            loadingText="Traitement..."
            debounceMs={1000}
          >
            {paymentMethod === 'wallet' ? 'Payer' : 'Confirmer'} {fc(grandTotal)}
          </SecureButton>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
