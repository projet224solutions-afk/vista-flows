/**
 * MODAL PAIEMENT PRODUITS
 * Support: Wallet 224Solutions, Cash
 */

import { useState, useEffect } from 'react';
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
import { Wallet, Banknote, Loader2, AlertCircle, Shield } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Escrow224Service } from "@/services/escrow224Service";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";

export type ProductPaymentMethod = 'wallet' | 'cash';

interface CartItem {
  id: string;
  name: string;
  price: number;
  vendorId?: string;
  quantity?: number;
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

  // Charger le solde wallet au montage du modal
  useEffect(() => {
    if (open && userId) {
      loadWalletBalance();
    }
  }, [open, userId]);

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

  const handlePayment = async () => {
    console.log('[ProductPayment] Starting payment process:', {
      userId,
      customerId,
      cartItems: cartItems.length,
      paymentMethod,
      totalAmount
    });

    if (!userId || !customerId || cartItems.length === 0) {
      console.error('[ProductPayment] Missing information:', { userId, customerId, cartItems });
      toast.error('Informations manquantes');
      return;
    }

    setProcessing(true);

    try {
      // Grouper les articles par vendeur
      const itemsByVendor = cartItems.reduce((acc, item) => {
        const vendorKey = item.vendorId || 'unknown';
        if (!acc[vendorKey]) {
          acc[vendorKey] = [];
        }
        acc[vendorKey].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      // Traiter chaque vendeur séparément
      for (const [vendorId, items] of Object.entries(itemsByVendor)) {
        if (vendorId === 'unknown') {
          console.error('❌ Produit sans vendeur:', items);
          continue;
        }

        const vendorTotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

        // Vérifier le solde en premier si paiement wallet
        if (paymentMethod === 'wallet') {
          if (walletBalance !== null && walletBalance < vendorTotal) {
            console.error('[ProductPayment] Insufficient balance:', { walletBalance, vendorTotal });
            toast.error('Solde insuffisant', {
              description: 'Veuillez recharger votre wallet'
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
        console.log('[ProductPayment] Creating order via create_online_order:', {
          user_id: userId,
          vendor_id: vendorId,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity || 1, price: i.price })),
          total_amount: vendorTotal,
          payment_method: paymentMethod
        });

        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: userId,
          p_vendor_id: vendorId,
          p_items: items.map(item => ({
            product_id: item.id,
            quantity: item.quantity || 1,
            price: item.price
          })),
          p_total_amount: vendorTotal,
          p_payment_method: paymentMethod,
          p_shipping_address: {
            address: 'Adresse de livraison',
            city: 'Conakry',
            country: 'Guinée'
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

        // Si paiement wallet, initier l'escrow
        if (paymentMethod === 'wallet') {
          console.log('[ProductPayment] Initiating escrow:', {
            order_id: orderId,
            buyer_id: userId,
            seller_id: vendorData.user_id,
            amount: vendorTotal
          });

          // Initier l'escrow via le service universel
          const escrowResult = await UniversalEscrowService.createEscrow({
            buyer_id: userId,
            seller_id: vendorData.user_id,
            order_id: orderId,
            amount: vendorTotal,
            currency: 'GNF',
            transaction_type: 'product',
            payment_provider: 'wallet',
            metadata: {
              product_ids: items.map(i => i.id),
              order_number: orderNumber,
              description: `Achat produits (${items.length} articles)`
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

          // Mettre à jour la commande avec l'escrow_transaction_id
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              metadata: { escrow_transaction_id: escrowId },
              payment_status: 'paid'
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('[ProductPayment] Failed to update order with escrow ID:', updateError);
          }
        }
      }

      // Succès
      if (paymentMethod === 'wallet') {
        toast.success('Paiement sécurisé effectué !', {
          description: `${totalAmount.toLocaleString()} GNF bloqués en escrow - Seront transférés à la livraison`
        });
      } else {
        toast.success('Commande créée !', {
          description: 'Vous paierez à la livraison'
        });
      }

      onPaymentSuccess();
      onClose();

    } catch (error) {
      console.error('[ProductPayment] Error:', error);
      toast.error('Erreur de paiement', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer'
      });
    } finally {
      setProcessing(false);
    }
  };

  const insufficientBalance = paymentMethod === 'wallet' && walletBalance !== null && walletBalance < totalAmount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Paiement Sécurisé (Escrow)
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <div>
                Montant total: <span className="font-bold text-lg">{totalAmount.toLocaleString()} GNF</span>
              </div>
              {paymentMethod === 'wallet' && (
                <>
                  <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-800 dark:text-green-200">
                      Vos fonds sont protégés par notre système Escrow jusqu'à la livraison
                    </span>
                  </div>
                  <div>
                    Solde disponible: <span className="font-semibold">{walletBalance?.toLocaleString() || 0} GNF</span>
                  </div>
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
              Solde insuffisant. Veuillez recharger votre wallet pour continuer.
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
          <Button
            onClick={handlePayment}
            className="flex-1"
            disabled={processing || insufficientBalance}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              paymentMethod === 'wallet' ? 'Payer maintenant' : 'Confirmer la commande'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
