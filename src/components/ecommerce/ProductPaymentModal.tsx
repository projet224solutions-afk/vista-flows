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
import { Wallet, Banknote, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    if (!userId || !customerId || cartItems.length === 0) {
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

        // Si paiement wallet, effectuer le transfert
        if (paymentMethod === 'wallet') {
          // Vérifier le solde
          if (walletBalance !== null && walletBalance < vendorTotal) {
            toast.error('Solde insuffisant', {
              description: 'Veuillez recharger votre wallet'
            });
            setProcessing(false);
            return;
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

          // Effectuer le transfert wallet
          const { error: transferError } = await supabase.rpc('process_wallet_transaction', {
            p_sender_id: userId,
            p_receiver_id: vendorData.user_id,
            p_amount: vendorTotal,
            p_description: `Paiement commande - ${items.map(i => i.name).join(', ')}`
          });

          if (transferError) {
            console.error('[ProductPayment] Transfer error:', transferError);
            toast.error('Erreur de paiement', {
              description: transferError.message || 'Le transfert a échoué'
            });
            continue;
          }
        }

        // Créer la commande (order_number est généré automatiquement par la BD)
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([{
            customer_id: customerId,
            vendor_id: vendorId,
            total_amount: vendorTotal,
            subtotal: vendorTotal,
            tax_amount: 0,
            shipping_amount: 0,
            discount_amount: 0,
            status: 'pending',
            payment_status: paymentMethod === 'wallet' ? 'paid' : 'pending',
            payment_method: paymentMethod === 'wallet' ? 'mobile_money' : 'cash',
            shipping_address: { address: 'Adresse de livraison', city: 'Conakry', country: 'Guinée' },
            notes: `Paiement ${paymentMethod === 'wallet' ? 'Wallet' : 'à la livraison'}`
          } as any]) // Type assertion pour éviter l'erreur order_number
          .select()
          .single();

        if (orderError || !orderData) {
          console.error('[ProductPayment] Order error:', orderError);
          toast.error('Erreur création commande');
          continue;
        }

        // Créer les items de commande
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            items.map(item => ({
              order_id: orderData.id,
              product_id: item.id,
              quantity: item.quantity || 1,
              unit_price: item.price,
              total_price: item.price * (item.quantity || 1)
            }))
          );

        if (itemsError) {
          console.error('[ProductPayment] Items error:', itemsError);
        }
      }

      // Succès
      if (paymentMethod === 'wallet') {
        toast.success('Paiement effectué !', {
          description: `${totalAmount.toLocaleString()} GNF débités de votre wallet`
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
          <DialogTitle>Paiement de la commande</DialogTitle>
          <DialogDescription>
            Montant total: <span className="font-bold text-lg">{totalAmount.toLocaleString()} GNF</span>
            {paymentMethod === 'wallet' && (
              <div className="mt-2 space-y-1">
                <div>
                  Solde disponible: <span className="font-semibold">{walletBalance?.toLocaleString() || 0} GNF</span>
                </div>
                {vendorCode && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-primary/10 rounded-md">
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
              </div>
            )}
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
