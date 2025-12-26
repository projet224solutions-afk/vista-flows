import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreditCard, ArrowLeft, Wallet, Receipt, TrendingUp, TrendingDown, Clock, Send, User, Smartphone, ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import WalletTransactionHistory from "@/components/WalletTransactionHistory";
import { ProfessionalVirtualCard } from "@/components/virtual-card";
import { PawaPayPaymentDialog } from "@/components/payment/PawaPayPaymentDialog";
import WalletMonthlyStats from "@/components/WalletMonthlyStats";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";
import { PaymentMethodsManager } from "@/components/payment/PaymentMethodsManager";
import { PaymentMethodSelection, type PaymentMethodType } from "@/components/payment/PaymentMethodSelection";

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // États pour le paiement
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPaymentPreview, setShowPaymentPreview] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState<{
    amount: number;
    fee_percent: number;
    fee_amount: number;
    total_debit: number;
    amount_received: number;
    current_balance: number;
    balance_after: number;
    receiver_id?: string;
  } | null>(null);
  const [showFedaPayDialog, setShowFedaPayDialog] = useState(false);
  
  // États pour la sélection de méthode de paiement
  const [paymentStep, setPaymentStep] = useState<'form' | 'method'>('form');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
      loadRecentTransactions();
      loadProductPaymentInfo();
    }
  }, [user]);

  // État pour stocker les infos produit (un seul produit)
  const [productPaymentInfo, setProductPaymentInfo] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    vendorId: string;
    vendorUserId: string;
  } | null>(null);

  // État pour stocker les infos du panier (multi-produits)
  const [cartPaymentInfo, setCartPaymentInfo] = useState<{
    items: any[];
    totalAmount: number;
    vendorId: string;
    vendorUserId: string;
  } | null>(null);

  // Charger les informations de paiement de produit ou panier
  const loadProductPaymentInfo = async () => {
    // Vérifier les query params
    const productId = searchParams.get('productId');
    const quantity = searchParams.get('quantity');
    
    // Vérifier le state
    const stateData = location.state as any;
    
    // CAS 1: Panier multi-produits depuis Cart.tsx
    if (stateData?.fromCart && stateData?.cartItems && stateData.cartItems.length > 0) {
      try {
        const cartItems = stateData.cartItems;
        const totalAmount = stateData.totalAmount;
        
        // Grouper par vendeur (pour simplifier, on prend le premier vendeur)
        const firstItem = cartItems[0];
        
        // Charger les infos du vendeur
        const { data: vendorInfo, error: vendorError } = await supabase
          .from('vendors')
          .select('id, user_id')
          .eq('id', firstItem.vendor_id)
          .single();
          
        if (vendorError || !vendorInfo) {
          console.error('Erreur chargement vendeur:', vendorError);
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de charger les informations du vendeur"
          });
          return;
        }

        // Stocker les infos du panier
        setCartPaymentInfo({
          items: cartItems,
          totalAmount: totalAmount,
          vendorId: vendorInfo.id,
          vendorUserId: vendorInfo.user_id
        });

        // Récupérer le public_id / custom_id du vendeur depuis profiles
        const { data: vendorProfile } = await supabase
          .from('profiles')
          .select('public_id, custom_id')
          .eq('id', vendorInfo.user_id)
          .single();

        // Pré-remplir les champs
        setPaymentAmount(totalAmount.toString());
        const vendorCode = vendorProfile?.custom_id || vendorProfile?.public_id;
        if (vendorCode) {
          setRecipientId(vendorCode);
        }
        
        const itemNames = cartItems.map((item: any) => `${item.name} (x${item.quantity})`).join(', ');
        setPaymentDescription(`Achat panier: ${itemNames}`);
        
        // Ouvrir automatiquement le dialog de paiement
        setPaymentOpen(true);
        
      } catch (error) {
        console.error('Erreur chargement panier:', error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les informations du panier"
        });
      }
      return;
    }
    
    // CAS 2: Achat produit unique
    if (productId || stateData?.productId) {
      try {
        const id = productId || stateData?.productId;
        const qty = quantity ? parseInt(quantity) : stateData?.quantity || 1;
        
        // Charger les détails du produit
        const { data: product, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            price,
            vendor_id,
            vendors!inner(user_id)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        if (product) {
          const totalAmount = product.price * qty;
          
          // Stocker les infos produit pour créer la commande plus tard
          setProductPaymentInfo({
            productId: product.id,
            productName: product.name,
            quantity: qty,
            vendorId: product.vendor_id,
            vendorUserId: product.vendors.user_id
          });
          
          // Récupérer le public_id / custom_id du vendeur depuis profiles
          const { data: vendorProfile } = await supabase
            .from('profiles')
            .select('public_id, custom_id')
            .eq('id', product.vendors.user_id)
            .single();

          // Pré-remplir les champs
          setPaymentAmount(totalAmount.toString());
          const vendorCode = vendorProfile?.custom_id || vendorProfile?.public_id;
          if (vendorCode) {
            setRecipientId(vendorCode);
          }
          setPaymentDescription(`Achat: ${product.name} (x${qty})`);
          
          // Ouvrir automatiquement le dialog de paiement
          setPaymentOpen(true);
        }
      } catch (error) {
        console.error('Erreur chargement infos produit:', error);
      }
    }
  };

  const loadWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setWalletBalance(data?.balance || 0);
    } catch (error) {
      console.error('Erreur chargement wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('enhanced_transactions')
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentTransactions(data || []);
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' GNF';
  };

  const getTransactionIcon = (type: string, senderId: string) => {
    if (senderId === user?.id) {
      return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
    return <TrendingUp className="h-4 w-4 text-success" />;
  };

  const getTransactionColor = (type: string, senderId: string) => {
    if (senderId === user?.id) {
      return 'text-destructive';
    }
    return 'text-success';
  };

  // Fonction pour rechercher un utilisateur par public_id
  const searchRecipient = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, public_id, full_name, phone')
        .ilike('public_id', `%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      // Transformer le format pour compatibilité
      return data?.map(p => ({
        user_id: p.id,
        custom_id: p.public_id,
        profiles: { full_name: p.full_name, phone: p.phone }
      })) || null;
    } catch (error) {
      console.error('Erreur recherche utilisateur:', error);
      return null;
    }
  };

  // Fonction pour prévisualiser un paiement
  const handlePreviewPayment = async () => {
    if (!user?.id || !paymentAmount || !recipientId) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Montant invalide",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Convertir le code (custom_id ou public_id) en user_id
      const normalizedRecipient = recipientId.trim().toUpperCase();
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .or(`public_id.eq.${normalizedRecipient},custom_id.eq.${normalizedRecipient}`)
        .maybeSingle();

      if (userError || !userData) {
        toast({
          title: "Erreur",
          description: "Utilisateur introuvable avec cet ID",
          variant: "destructive"
        });
        setProcessing(false);
        return;
      }
      
      const receiverId = userData.id;

      const { data, error } = await supabase.rpc('preview_wallet_transfer', {
        p_sender_id: user.id,
        p_receiver_id: receiverId,
        p_amount: amount
      });

      if (error) throw error;

      console.log('[Payment] Preview response:', data);

      // La fonction retourne un JSON, donc data est déjà l'objet complet
      const result = data as any;

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la prévisualisation');
      }

      const previewData = {
        amount: result.amount || 0,
        fee_percent: result.fee_percent || 0,
        fee_amount: result.fee_amount || 0,
        total_debit: result.total_debit || 0,
        amount_received: result.amount_received || 0,
        current_balance: result.current_balance || 0,
        balance_after: result.balance_after || 0,
        receiver_id: receiverId // Stocker le user_id pour la confirmation
      };

      console.log('[Payment] Preview data extracted:', previewData);

      setPaymentPreview(previewData);
      setShowPaymentPreview(true);
      setPaymentOpen(false);
    } catch (error: any) {
      console.error('Erreur prévisualisation:', error);
      
      // Détecter si c'est une erreur de solde insuffisant
      const errorMessage = error.message || '';
      const isInsufficientBalance = errorMessage.toLowerCase().includes('insuffisant') || 
                                   errorMessage.toLowerCase().includes('insufficient');
      
      if (isInsufficientBalance) {
        toast({
          title: "💳 Solde insuffisant",
          description: "Votre solde est insuffisant pour effectuer cette transaction. Veuillez recharger votre wallet.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: errorMessage || 'Impossible de prévisualiser le paiement',
          variant: "destructive"
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  // Fonction pour paiement à la livraison
  const handleCashOnDeliveryPayment = async () => {
    if (!user?.id || !paymentAmount || !recipientId) return;

    setProcessing(true);
    try {
      // Convertir le code (custom_id ou public_id) en user_id
      const normalizedRecipient = recipientId.trim().toUpperCase();
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .or(`public_id.eq.${normalizedRecipient},custom_id.eq.${normalizedRecipient}`)
        .maybeSingle();

      if (userError || !userData) {
        toast({
          title: "Erreur",
          description: "Utilisateur introuvable avec cet ID",
          variant: "destructive"
        });
        return;
      }

      // Si c'est un achat produit ou panier, créer la commande en mode "cash on delivery"
      if (productPaymentInfo || cartPaymentInfo) {
        const vendorId = productPaymentInfo?.vendorId || cartPaymentInfo?.vendorId;
        const items = productPaymentInfo 
          ? [{ product_id: productPaymentInfo.productId, quantity: productPaymentInfo.quantity, price: parseFloat(paymentAmount) / productPaymentInfo.quantity }]
          : cartPaymentInfo?.items.map((item: any) => ({ product_id: item.product_id || item.id, quantity: item.quantity, price: item.price }));

        // Utiliser 'cash' comme payment_method (valeur valide de l'enum) avec is_cod dans metadata
        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: user.id,
          p_vendor_id: vendorId,
          p_items: items,
          p_total_amount: parseFloat(paymentAmount),
          p_payment_method: 'cash', // Utiliser 'cash' car 'cash_on_delivery' n'existe pas dans l'enum
          p_shipping_address: {
            address: 'Adresse de livraison',
            city: 'Conakry',
            country: 'Guinée',
            is_cod: true // Marquer comme paiement à la livraison
          }
        });

        if (orderError) throw orderError;

        toast({
          title: "✅ Commande créée !",
          description: "Votre commande sera payée à la livraison"
        });

        setPaymentOpen(false);
        setPaymentStep('form');
        setProductPaymentInfo(null);
        setCartPaymentInfo(null);
        navigate('/client');
      } else {
        toast({
          title: "Information",
          description: "Le paiement à la livraison n'est disponible que pour les achats de produits",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Erreur paiement livraison:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la commande",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  // Fonction pour paiement Mobile Money
  const handleMobileMoneyPayment = async (method: 'orange_money' | 'mtn_money', phone: string) => {
    if (!user?.id || !paymentAmount) return;

    setProcessing(true);
    try {
      // Invoquer la fonction FedaPay ou mobile money selon le provider
      const provider = method === 'orange_money' ? 'orange' : 'mtn';
      
      toast({
        title: "📱 Demande envoyée",
        description: `Confirmez le paiement sur votre téléphone ${provider.toUpperCase()} (${phone})`
      });

      // TODO: Intégrer avec l'API FedaPay ou autre provider mobile money
      // Pour l'instant, on ouvre le dialog FedaPay
      setPaymentOpen(false);
      setShowFedaPayDialog(true);
      
    } catch (error: any) {
      console.error('Erreur paiement mobile money:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  // Fonction pour paiement par carte
  const handleCardPayment = async () => {
    if (!user?.id || !paymentAmount) return;

    setProcessing(true);
    try {
      toast({
        title: "💳 Paiement par carte",
        description: "Redirection vers la page de paiement sécurisé..."
      });

      // TODO: Intégrer avec Stripe ou autre provider
      // Pour l'instant, afficher un message
      setTimeout(() => {
        toast({
          title: "Information",
          description: "Le paiement par carte sera bientôt disponible",
        });
        setProcessing(false);
        setPaymentOpen(false);
        setPaymentStep('form');
      }, 1500);
      
    } catch (error: any) {
      console.error('Erreur paiement carte:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initier le paiement",
        variant: "destructive"
      });
      setProcessing(false);
    }
  };

  // Fonction pour confirmer et effectuer un paiement
  const handleConfirmPayment = async () => {
    if (!user?.id || !paymentPreview || !paymentPreview.receiver_id) return;

    setProcessing(true);
    setShowPaymentPreview(false);

    try {
      // CAS 1: Paiement du panier (multi-produits)
      if (cartPaymentInfo) {
        console.log('[Payment] Creating cart order:', cartPaymentInfo);

        // Préparer les items pour la commande
        const orderItems = cartPaymentInfo.items.map((item: any) => ({
          product_id: item.product_id || item.id,
          quantity: item.quantity,
          price: item.price
        }));

        // Créer la commande via la fonction PostgreSQL
        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: user.id,
          p_vendor_id: cartPaymentInfo.vendorId,
          p_items: orderItems,
          p_total_amount: paymentPreview.amount,
          p_payment_method: 'wallet',
          p_shipping_address: {
            address: 'Adresse de livraison',
            city: 'Conakry',
            country: 'Guinée'
          }
        });

        if (orderError || !orderResult || orderResult.length === 0) {
          console.error('[Payment] Cart order creation failed:', orderError);
          throw new Error(orderError?.message || 'Impossible de créer la commande');
        }

        const orderId = orderResult[0].order_id;
        const orderNumber = orderResult[0].order_number;
        console.log('[Payment] Cart order created:', { orderId, orderNumber });

        // Créer l'escrow pour le panier
        const escrowResult = await UniversalEscrowService.createEscrow({
          buyer_id: user.id,
          seller_id: cartPaymentInfo.vendorUserId,
          order_id: orderId,
          amount: paymentPreview.amount,
          currency: 'GNF',
          transaction_type: 'product',
          payment_provider: 'wallet',
          metadata: {
            items_count: cartPaymentInfo.items.length,
            order_number: orderNumber,
            description: paymentDescription || `Achat panier (${cartPaymentInfo.items.length} articles)`
          }
        });

        if (!escrowResult.success) {
          throw new Error(escrowResult.error || 'Échec de la création de l\'escrow');
        }

        // Mettre à jour la commande avec l'escrow_transaction_id
        await supabase
          .from('orders')
          .update({ 
            metadata: { escrow_transaction_id: escrowResult.escrow_id },
            payment_status: 'paid'
          })
          .eq('id', orderId);

        toast({
          title: "✅ Commande créée !",
          description: `Commande ${orderNumber} - ${cartPaymentInfo.items.length} article(s) - Paiement sécurisé`
        });

        // Réinitialiser et naviguer vers les commandes
        setCartPaymentInfo(null);
        navigate('/client');
        return;
      } 
      
      // CAS 2: Paiement d'un seul produit
      if (productPaymentInfo) {
        console.log('[Payment] Creating product order:', productPaymentInfo);

        // Créer la commande via la fonction PostgreSQL
        const { data: orderResult, error: orderError } = await supabase.rpc('create_online_order', {
          p_user_id: user.id,
          p_vendor_id: productPaymentInfo.vendorId,
          p_items: [{
            product_id: productPaymentInfo.productId,
            quantity: productPaymentInfo.quantity,
            price: paymentPreview.amount / productPaymentInfo.quantity
          }],
          p_total_amount: paymentPreview.amount,
          p_payment_method: 'wallet',
          p_shipping_address: {
            address: 'Adresse de livraison',
            city: 'Conakry',
            country: 'Guinée'
          }
        });

        if (orderError || !orderResult || orderResult.length === 0) {
          console.error('[Payment] Order creation failed:', orderError);
          throw new Error(orderError?.message || 'Impossible de créer la commande');
        }

        const orderId = orderResult[0].order_id;
        const orderNumber = orderResult[0].order_number;
        console.log('[Payment] Order created:', { orderId, orderNumber });

        // Créer l'escrow pour le produit
        const escrowResult = await UniversalEscrowService.createEscrow({
          buyer_id: user.id,
          seller_id: productPaymentInfo.vendorUserId,
          order_id: orderId,
          amount: paymentPreview.amount,
          currency: 'GNF',
          transaction_type: 'product',
          payment_provider: 'wallet',
          metadata: {
            product_id: productPaymentInfo.productId,
            product_name: productPaymentInfo.productName,
            order_number: orderNumber,
            description: paymentDescription || `Achat: ${productPaymentInfo.productName}`
          }
        });

        if (!escrowResult.success) {
          throw new Error(escrowResult.error || 'Échec de la création de l\'escrow');
        }

        // Mettre à jour la commande avec l'escrow_transaction_id
        await supabase
          .from('orders')
          .update({ 
            metadata: { escrow_transaction_id: escrowResult.escrow_id },
            payment_status: 'paid'
          })
          .eq('id', orderId);

        toast({
          title: "✅ Commande créée !",
          description: `Commande ${orderNumber} - Paiement sécurisé par Escrow`
        });

        // Réinitialiser l'info produit et rediriger
        setProductPaymentInfo(null);
        navigate('/client');
        return;
      } else {
        // Transfert wallet normal (non-produit)
        const shouldUseEscrow = paymentPreview.amount >= 10000;

        if (shouldUseEscrow) {
          console.log('[Payment] Using escrow for wallet transfer');
          
          const escrowResult = await UniversalEscrowService.createEscrow({
            buyer_id: user.id,
            seller_id: paymentPreview.receiver_id,
            amount: paymentPreview.amount,
            currency: 'GNF',
            transaction_type: 'wallet_transfer',
            payment_provider: 'wallet',
            metadata: {
              description: paymentDescription || 'Transfert wallet',
              fee_amount: paymentPreview.fee_amount,
              total_debit: paymentPreview.total_debit
            },
            escrow_options: {
              auto_release_days: 0,
              commission_percent: 0
            }
          });

          if (!escrowResult.success) {
            throw new Error(escrowResult.error || 'Échec de la création de l\'escrow');
          }

          toast({
            title: "Transfert sécurisé effectué",
            description: `✅ Transfert réussi via Escrow\n💸 Frais appliqués : ${paymentPreview.fee_amount.toLocaleString()} GNF\n💰 Montant transféré : ${paymentPreview.amount.toLocaleString()} GNF`
          });
        } else {
          // Transfert direct sans escrow
          const { data, error } = await supabase.rpc('process_wallet_transaction', {
            p_sender_id: user.id,
            p_receiver_id: paymentPreview.receiver_id,
            p_amount: paymentPreview.amount,
            p_description: paymentDescription || 'Paiement via wallet'
          });

          if (error) throw error;

          toast({
            title: "Paiement effectué",
            description: `✅ Paiement réussi\n💸 Frais appliqués : ${paymentPreview.fee_amount.toLocaleString()} GNF\n💰 Montant payé : ${paymentPreview.amount.toLocaleString()} GNF`
          });
        }
      }

      setPaymentAmount('');
      setRecipientId('');
      setPaymentDescription('');
      setPaymentPreview(null);
      
      loadWalletData();
      loadRecentTransactions();
    } catch (error: any) {
      console.error('❌ Erreur paiement:', error);
      
      // Détecter si c'est une erreur de solde insuffisant
      const errorMessage = error.message || '';
      const isInsufficientBalance = errorMessage.toLowerCase().includes('insuffisant') || 
                                   errorMessage.toLowerCase().includes('insufficient');
      
      if (isInsufficientBalance) {
        toast({
          title: "💳 Solde insuffisant",
          description: "Votre solde est insuffisant pour effectuer cette transaction. Veuillez recharger votre wallet.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: errorMessage || 'Erreur lors du paiement',
          variant: "destructive"
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="container max-w-6xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => {
            const productId = searchParams.get('productId') || location.state?.productId;
            if (productId) {
              navigate(`/product/${productId}`);
            } else {
              navigate('/marketplace');
            }
          }}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        {/* Header avec solde */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Solde disponible</p>
                  <h2 className="text-3xl font-bold">
                    {loading ? '...' : formatCurrency(walletBalance)}
                  </h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => setShowFedaPayDialog(true)}
                >
                  <Smartphone className="h-4 w-4" />
                  Recharger (Orange/MTN)
                </Button>
                <ProfessionalVirtualCard />
                <Dialog 
                  open={paymentOpen} 
                  onOpenChange={(open) => {
                    setPaymentOpen(open);
                    if (!open) {
                      setPaymentStep('form');
                      setSelectedPaymentMethod(null);
                      setMobileMoneyPhone('');
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Send className="h-4 w-4" />
                      Payer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md w-[calc(100%-1rem)] sm:w-full max-h-[76vh] sm:max-h-[88vh] overflow-hidden p-4 sm:p-6 top-[3%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
                    {paymentStep === 'form' ? (
                      <>
                        <DialogHeader>
                          <DialogTitle>Effectuer un paiement</DialogTitle>
                          <DialogDescription>
                            Payez facilement avec votre wallet 224SOLUTIONS
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="recipient-id">ID du destinataire *</Label>
                            <Input
                              id="recipient-id"
                              placeholder="USR0001, VEN0001..."
                              value={recipientId}
                              onChange={(e) => setRecipientId(e.target.value.toUpperCase())}
                              maxLength={7}
                              readOnly={searchParams.get('productId') !== null || location.state?.productId}
                              className={searchParams.get('productId') || location.state?.productId ? 'bg-muted cursor-not-allowed' : ''}
                            />
                            <p className="text-xs text-muted-foreground">
                              Format: 3 lettres + 4 chiffres (ex: USR0001)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment-amount">Montant (GNF) *</Label>
                            <Input
                              id="payment-amount"
                              type="number"
                              placeholder="10000"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              readOnly={searchParams.get('productId') !== null || location.state?.productId}
                              className={searchParams.get('productId') || location.state?.productId ? 'bg-muted cursor-not-allowed font-bold text-primary' : ''}
                            />
                          </div>
                          <div className="space-y-2">
                            <Input
                              id="payment-description"
                              placeholder="Achat de produits..."
                              value={paymentDescription}
                              onChange={(e) => setPaymentDescription(e.target.value)}
                              readOnly={searchParams.get('productId') !== null || location.state?.productId}
                              className={searchParams.get('productId') || location.state?.productId ? 'bg-muted cursor-not-allowed' : ''}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => setPaymentStep('method')} 
                            disabled={!paymentAmount || !recipientId}
                            className="gap-2"
                          >
                            Choisir le mode de paiement
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <PaymentMethodSelection
                        walletBalance={walletBalance}
                        amount={parseFloat(paymentAmount) || 0}
                        recipientId={recipientId}
                        processing={processing}
                        isEscrow={!!(productPaymentInfo || cartPaymentInfo)}
                        onMethodSelected={(method, phone) => {
                          setSelectedPaymentMethod(method);
                          if (phone) setMobileMoneyPhone(phone);
                          
                          // Si wallet, on procède à la prévisualisation normale
                          if (method === 'wallet') {
                            handlePreviewPayment();
                          } else if (method === 'orange_money' || method === 'mtn_money') {
                            // Mobile money via PawaPay
                            handleMobileMoneyPayment(method, phone || '');
                          }
                        }}
                        onCancel={() => setPaymentStep('form')}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques mensuelles */}
        <WalletMonthlyStats />

        {/* Transactions récentes */}
        <Card className="mt-6 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Transactions récentes
            </CardTitle>
            <CardDescription>
              Les 5 dernières transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune transaction récente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(tx.type, tx.sender_id)}
                      <div>
                        <p className="font-medium">
                          {tx.sender_id === user?.id ? 'Envoyé' : 'Reçu'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getTransactionColor(tx.type, tx.sender_id)}`}>
                        {tx.sender_id === user?.id ? '-' : '+'}{formatCurrency(tx.amount)}
                      </p>
                      <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate('/wallet')}
            >
              Voir toutes les transactions
            </Button>
          </CardContent>
        </Card>

        {/* Tabs pour plus d'options */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Historique complet</TabsTrigger>
            <TabsTrigger value="cards">Moyens de paiement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Historique des transactions</CardTitle>
                <CardDescription>
                  Toutes vos transactions détaillées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WalletTransactionHistory />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cards" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Moyens de paiement
                </CardTitle>
                <CardDescription>
                  Gérez vos moyens de paiement pour des transactions plus rapides
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gestionnaire des 5 moyens de paiement */}
                <PaymentMethodsManager />

                {/* Séparateur */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Carte virtuelle
                    </span>
                  </div>
                </div>

                {/* Carte virtuelle */}
                <div className="text-center py-4">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-2">Carte virtuelle 224SOLUTIONS</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gérez votre carte virtuelle pour les paiements en ligne
                  </p>
                  <ProfessionalVirtualCard />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de confirmation du paiement */}
        <AlertDialog open={showPaymentPreview} onOpenChange={setShowPaymentPreview}>
          <AlertDialogContent className="max-h-[90vh] flex flex-col">
            <AlertDialogHeader className="flex-shrink-0">
              <AlertDialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Confirmer le paiement
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto pr-2">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">💰 Montant</span>
                      <span className="text-lg font-bold">{paymentPreview?.amount?.toLocaleString()} GNF</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium">💸 Frais de paiement ({paymentPreview?.fee_percent}%)</span>
                      <span className="text-lg font-bold">{paymentPreview?.fee_amount?.toLocaleString()} GNF</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 bg-red-50 dark:bg-red-950 -mx-4 px-4 py-2 rounded">
                      <span className="text-sm font-bold">💳 Total à débiter</span>
                      <span className="text-xl font-bold text-destructive">{paymentPreview?.total_debit?.toLocaleString()} GNF</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 bg-green-50 dark:bg-green-950 -mx-4 px-4 py-2 rounded">
                      <span className="text-sm font-medium">✅ Le destinataire recevra</span>
                      <span className="text-lg font-bold text-success">{paymentPreview?.amount_received?.toLocaleString()} GNF</span>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>
                      <strong>Solde actuel:</strong> {paymentPreview?.current_balance?.toLocaleString()} GNF
                    </p>
                    <p>
                      <strong>Solde après paiement:</strong> {paymentPreview?.balance_after?.toLocaleString()} GNF
                    </p>
                  </div>
                  
                  <p className="text-sm">
                    Souhaitez-vous confirmer ce paiement ?
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-shrink-0 mt-4">
              <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmPayment} disabled={processing}>
                {processing ? 'Traitement...' : 'Confirmer le paiement'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de recharge PawaPay Mobile Money */}
        <PawaPayPaymentDialog
          open={showFedaPayDialog}
          onOpenChange={setShowFedaPayDialog}
          amount={10000}
          description="Recharge wallet via Mobile Money"
          metadata={{ wallet_recharge: true }}
          onPaymentSuccess={(depositId) => {
            console.log('Paiement PawaPay réussi:', depositId);
            toast({
              title: 'Paiement réussi',
              description: 'Votre wallet a été rechargé',
            });
            loadWalletData();
          }}
        />
      </div>
    </div>
  );
}
