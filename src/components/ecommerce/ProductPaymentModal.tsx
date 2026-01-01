/**
 * MODAL PAIEMENT PRODUITS
 * Support: Wallet 224Solutions, Cash
 * Inclut le calcul et la facturation des commissions
 */

import { useState, useEffect, useCallback, startTransition, useRef } from 'react';
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
import { Wallet, Banknote, Loader2, AlertCircle, Shield, Info } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Escrow224Service } from "@/services/escrow224Service";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";
import { SecureButton } from "@/components/ui/SecureButton";

export type ProductPaymentMethod = 'wallet' | 'cash' | 'cash_on_delivery';

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
  customerId: string;
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
  const [paymentMethod, setPaymentMethod] = useState<ProductPaymentMethod>('wallet');
  const [processing, setProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [vendorCode, setVendorCode] = useState<string | null>(null);
  const [loadingVendorCode, setLoadingVendorCode] = useState(false);
  
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
      // Chercher la config de commission pour marketplace/ecommerce
      const { data, error } = await supabase
        .from('commission_config')
        .select('commission_type, commission_value, min_amount')
        .in('service_name', ['marketplace', 'ecommerce'])
        .eq('is_active', true)
        .order('service_name', { ascending: true }) // marketplace en premier
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCommissionConfig({
          commission_type: data[0].commission_type as 'percentage' | 'fixed',
          commission_value: Number(data[0].commission_value),
          min_amount: data[0].min_amount ? Number(data[0].min_amount) : undefined
        });
        console.log('[ProductPayment] Commission config loaded:', data[0]);
      } else {
        // Fallback: 1.5% par défaut
        setCommissionConfig({
          commission_type: 'percentage',
          commission_value: 1.5
        });
        console.log('[ProductPayment] Using default commission: 1.5%');
      }
    } catch (error) {
      console.error('[ProductPayment] Error loading commission config:', error);
      // Fallback en cas d'erreur
      setCommissionConfig({
        commission_type: 'percentage',
        commission_value: 1.5
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
          .select('public_id')
          .eq('user_id', vendorData.user_id)
          .eq('currency', 'GNF')
          .single();

        if (walletError || !walletData?.public_id) {
          console.error('[ProductPayment] Error loading wallet code:', walletError);
          setVendorCode(vendorData.user_id.slice(0, 8).toUpperCase());
        } else {
          setVendorCode(walletData.public_id);
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

    if (!userId || !customerId || cartItems.length === 0) {
      console.error('[ProductPayment] Missing information:', { userId, customerId, cartItems });
      toast.error('Informations manquantes');
      throw new Error('Informations manquantes');
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
              description: `Vous avez besoin de ${grandTotal.toLocaleString()} GNF (produits + frais de service)`
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

        // Utiliser la nouvelle fonction PostgreSQL pour créer la commande avec items
        // Note: On passe le total AVEC commission pour que ce soit facturé
        console.log('[ProductPayment] Creating order via create_online_order:', {
          user_id: userId,
          vendor_id: vendorId,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity || 1, price: i.price })),
          product_total: vendorProductTotal,
          commission_fee: commissionPerVendor,
          total_amount_with_commission: vendorTotalWithCommission,
          payment_method: paymentMethod
        });

        const isCOD = paymentMethod === 'cash_on_delivery';
        const normalizedPaymentMethod = isCOD ? 'cash' : paymentMethod;

        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: userId,
          p_vendor_id: vendorId,
          p_items: items.map(item => ({
            product_id: item.id,
            quantity: item.quantity || 1,
            price: item.price
          })),
          p_total_amount: vendorTotalWithCommission, // ← MONTANT AVEC COMMISSION
          p_payment_method: normalizedPaymentMethod,
          p_shipping_address: {
            address: 'Adresse de livraison',
            city: 'Conakry',
            country: 'Guinée',
            commission_fee: commissionPerVendor,
            product_total: vendorProductTotal,
            ...(isCOD ? { is_cod: true } : {})
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
            amount: vendorTotalWithCommission, // ← MONTANT AVEC COMMISSION POUR L'ESCROW
            currency: 'GNF',
            transaction_type: 'product',
            payment_provider: 'wallet',
            metadata: {
              product_ids: items.map(i => i.id),
              order_number: orderNumber,
              description: `Achat produits (${items.length} articles)`,
              product_total: vendorProductTotal,
              commission_fee: commissionPerVendor,
              commission_percent: commissionConfig?.commission_value || 1.5
            },
            escrow_options: {
              commission_percent: commissionConfig?.commission_value || 1.5
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
                commission_percent: commissionConfig?.commission_value || 1.5
              },
              payment_status: 'paid'
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('[ProductPayment] Failed to update order with escrow ID:', updateError);
          }
        }
      }

      // Succès - afficher le montant total avec commission
      if (paymentMethod === 'wallet') {
        toast.success('Paiement sécurisé effectué !', {
          description: `${grandTotal.toLocaleString()} GNF bloqués en escrow (dont ${commissionFee.toLocaleString()} GNF de frais)`
        });
      } else {
        toast.success('Commande créée !', {
          description: `Total à payer à la livraison: ${grandTotal.toLocaleString()} GNF`
        });
      }

      onPaymentSuccess();
      onClose();
  }, [userId, customerId, cartItems, paymentMethod, totalAmount, commissionFee, grandTotal, walletBalance, commissionConfig, onPaymentSuccess, onClose]);

  // Vérifier le solde avec le grandTotal (incluant la commission)
  const insufficientBalance = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < grandTotal;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Paiement Sécurisé (Escrow)
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 mt-2">
              {/* Récapitulatif des montants */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total produits:</span>
                  <span>{totalAmount.toLocaleString()} GNF</span>
                </div>
                
                {commissionFee > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Frais de service ({commissionConfig?.commission_value || 1.5}%):
                    </span>
                    <span>+{commissionFee.toLocaleString()} GNF</span>
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
                  <span className="text-primary">{grandTotal.toLocaleString()} GNF</span>
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
                      {walletBalance?.toLocaleString() || 0} GNF
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
              Solde insuffisant. Il vous manque {(grandTotal - (walletBalance || 0)).toLocaleString()} GNF.
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
        </div>

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
            {paymentMethod === 'wallet' ? 'Payer' : 'Confirmer'} {grandTotal.toLocaleString()} GNF
          </SecureButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
