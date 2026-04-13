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
import { useCart } from "@/contexts/CartContext";
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { usePriceConverter } from '@/hooks/usePriceConverter';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import WalletTransactionHistory from "@/components/WalletTransactionHistory";
import { ProfessionalVirtualCard } from "@/components/virtual-card";
import WalletMonthlyStats from "@/components/WalletMonthlyStats";
import { UniversalEscrowService } from "@/services/UniversalEscrowService";
import { PaymentMethodsManager } from "@/components/payment/PaymentMethodsManager";
import { JomyPaymentSelector } from "@/components/payment/JomyPaymentSelector";
import { useFormPersistence } from "@/hooks/useAppPersistence";
import { createOrder } from "@/services/orderBackendService";
import { previewWalletTransfer, resolveWalletRecipient, transferToWallet } from "@/services/walletBackendService";

// Mapping pays ÔåÆ devise pour d├®river la devise du vendeur
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR',
  BE: 'EUR', NL: 'EUR', AT: 'EUR', IE: 'EUR', GR: 'EUR',
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD',
  CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF', BJ: 'XOF', TG: 'XOF', NE: 'XOF',
  CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
  SA: 'SAR', AE: 'AED', CN: 'CNY', JP: 'JPY', IN: 'INR',
  BR: 'BRL', ZA: 'ZAR', EG: 'EGP', NG: 'NGN', KE: 'KES',
  MA: 'MAD', DZ: 'DZD', TN: 'TND', GH: 'GHS',
  GN: 'GNF', SL: 'SLL', LR: 'LRD', GM: 'GMD',
};

function getVendorCurrency(country?: string | null): string {
  if (!country) return 'GNF';
  // Try direct ISO code match
  const upper = country.toUpperCase().trim();
  if (COUNTRY_CURRENCY_MAP[upper]) return COUNTRY_CURRENCY_MAP[upper];
  // Try matching country names
  const nameMap: Record<string, string> = {
    'GUIN├ëE': 'GNF', 'GUINEA': 'GNF', 'GUINEE': 'GNF',
    'S├ëN├ëGAL': 'XOF', 'SENEGAL': 'XOF',
    'C├öTE D\'IVOIRE': 'XOF', 'IVORY COAST': 'XOF',
    'MALI': 'XOF', 'BURKINA FASO': 'XOF', 'BENIN': 'XOF', 'B├ëNIN': 'XOF',
    'TOGO': 'XOF', 'NIGER': 'XOF',
    'CAMEROUN': 'XAF', 'CAMEROON': 'XAF',
    'FRANCE': 'EUR', 'GERMANY': 'EUR', 'ALLEMAGNE': 'EUR',
    'UNITED STATES': 'USD', 'USA': 'USD', '├ëTATS-UNIS': 'USD',
    'UNITED KINGDOM': 'GBP', 'ROYAUME-UNI': 'GBP',
    'NIGERIA': 'NGN', 'GHANA': 'GHS', 'KENYA': 'KES',
    'SOUTH AFRICA': 'ZAR', 'AFRIQUE DU SUD': 'ZAR',
    'MOROCCO': 'MAD', 'MAROC': 'MAD',
  };
  return nameMap[upper] || 'GNF';
}

function pickPreferredVendorIdentifier(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return null;
}

async function resolveVendorDisplayId(options: {
  vendorId?: string | null;
  vendorUserId?: string | null;
  preferredId?: string | null;
}): Promise<string> {
  const immediate = pickPreferredVendorIdentifier(options.preferredId);
  if (immediate) return immediate;

  const [vendorByIdResult, vendorByUserResult, profileResult] = await Promise.all([
    options.vendorId
      ? supabase
          .from('vendors')
          .select('vendor_code, public_id')
          .eq('id', options.vendorId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    options.vendorUserId
      ? supabase
          .from('vendors')
          .select('vendor_code, public_id')
          .eq('user_id', options.vendorUserId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    options.vendorUserId
      ? supabase
          .from('profiles')
          .select('public_id, custom_id')
          .eq('id', options.vendorUserId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  return (
    pickPreferredVendorIdentifier(
      vendorByIdResult?.data?.vendor_code,
      vendorByIdResult?.data?.public_id,
      vendorByUserResult?.data?.vendor_code,
      vendorByUserResult?.data?.public_id,
      profileResult?.data?.custom_id,
      profileResult?.data?.public_id,
      options.vendorUserId,
      options.vendorId,
    ) || ''
  );
}

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart();

  const getDigitalSuccessRoute = (pricingType?: 'one_time' | 'subscription' | 'pay_what_you_want') => {
    return pricingType === 'subscription' ? '/my-digital-subscriptions' : '/my-digital-purchases';
  };
  const { toast } = useToast();
  const { currency: userCurrency } = useCurrency();
  const { convert: convertPrice, loading: converterLoading } = usePriceConverter();
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // Devise du produit/vendeur (d├®riv├®e du pays du vendeur)
  const [productCurrency, setProductCurrency] = useState<string>('GNF');
  
  // ├ëtats pour le paiement
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
    is_international?: boolean;
    currency_sent?: string;
    currency_received?: string;
  } | null>(null);
  
  // Persistance des pr├®f├®rences de paiement
  const { values: paymentPrefs, setValues: setPaymentPrefs, resetForm: resetPaymentPrefs } = useFormPersistence(
    `payment_prefs_${user?.id}`,
    {
      paymentStep: 'form' as 'form' | 'method',
      selectedPaymentMethod: null as string | null,
      mobileMoneyPhone: '',
    },
    { enabled: !!user?.id, maxAge: 60 * 60 * 1000 } // 1 heure
  );
  
  // Aliases pour compatibilit├®
  const paymentStep = paymentPrefs.paymentStep;
  const setPaymentStep = (v: 'form' | 'method') => setPaymentPrefs(prev => ({ ...prev, paymentStep: v }));
  const selectedPaymentMethod = paymentPrefs.selectedPaymentMethod;
  const setSelectedPaymentMethod = (v: string | null) => setPaymentPrefs(prev => ({ ...prev, selectedPaymentMethod: v }));
  const mobileMoneyPhone = paymentPrefs.mobileMoneyPhone;
  const setMobileMoneyPhone = (v: string) => setPaymentPrefs(prev => ({ ...prev, mobileMoneyPhone: v }));

  // V├®rification d'authentification pour les achats
  useEffect(() => {
    const productId = searchParams.get('productId');
    const stateData = location.state as any;
    const hasProductIntent = productId || stateData?.productId || stateData?.fromCart;
    
    if (hasProductIntent && !user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour effectuer un achat",
        variant: "destructive"
      });
      navigate('/auth', { state: { returnTo: location.pathname + location.search } });
      return;
    }
  }, [user, searchParams, location, navigate]);

  useEffect(() => {
    if (user?.id) {
      loadWalletData();
      loadRecentTransactions();
      loadProductPaymentInfo();
    }
  }, [user]);

  // ├ëtat pour stocker les infos produit (un seul produit)
  const [productPaymentInfo, setProductPaymentInfo] = useState<{
    productId: string;
    productName: string;
    quantity: number;
    vendorId: string;
    vendorUserId: string;
    productType: 'physical' | 'digital';
    pricingType?: 'one_time' | 'subscription' | 'pay_what_you_want';
    subscriptionInterval?: 'monthly' | 'yearly' | 'lifetime';
  } | null>(null);

  // ├ëtat pour stocker les infos du panier (multi-produits)
  const [cartPaymentInfo, setCartPaymentInfo] = useState<{
    items: any[];
    totalAmount: number;
    vendorId?: string;
    vendorUserId?: string;
    productType: 'physical' | 'digital'; // Type de produit
  } | null>(null);

  const getVendorIdFromItem = (item: any): string | null => {
    return item?.vendor_id || item?.vendorId || item?.vendor?.id || null;
  };

  const inferPaymentMethod = (status?: string, transactionId?: string): 'card' | 'mobile_money' | 'wallet' => {
    const upperStatus = (status || '').toUpperCase();
    if (upperStatus.includes('WALLET')) return 'wallet';
    if (upperStatus.includes('MOBILE')) return 'mobile_money';
    if (upperStatus.includes('CARD')) return 'card';
    if ((transactionId || '').startsWith('pi_')) return 'card';
    return 'card';
  };

  const createOrderForVendor = async ({
    vendorId,
    items,
    paymentMethod,
    externalPaymentId,
    shippingAddress,
    markAsPaid = false,
  }: {
    vendorId: string;
    items: any[];
    paymentMethod: 'card' | 'mobile_money' | 'wallet' | 'cod';
    externalPaymentId?: string;
    shippingAddress?: {
      full_name: string;
      phone: string;
      address_line: string;
      city: string;
      country: string;
      postal_code?: string | null;
      notes?: string | null;
    };
    markAsPaid?: boolean;
  }) => {
    const response = await createOrder({
      vendor_id: vendorId,
      items: items.map((item: any) => ({
        product_id: item.product_id || item.id,
        quantity: item.quantity,
        variant_id: item.variant_id || null,
      })),
      payment_method: paymentMethod,
      payment_intent_id: externalPaymentId || null,
      shipping_address: shippingAddress || {
        full_name: user?.user_metadata?.full_name || user?.email || 'Client 224Solutions',
        phone: user?.phone || 'Non fourni',
        address_line: 'Adresse de livraison',
        city: 'Conakry',
        country: 'Guin├®e',
        notes: null,
        postal_code: null,
      },
    });

    if (!response.success || !response.data?.order) {
      throw new Error(response.error || 'Impossible de cr├®er la commande');
    }

    const orderId = response.data.order.id;
    const orderNumber = response.data.order.order_number;

    if (markAsPaid || externalPaymentId) {
      await supabase
        .from('orders')
        .update({
          payment_status: (markAsPaid ? 'paid' : response.data.order.payment_status) as "failed" | "paid" | "pending" | "refunded",
          metadata: {
            external_payment_id: externalPaymentId || null,
            source: 'payment_page_post_provider_success',
          },
        })
        .eq('id', orderId);
    }

    return { orderId, orderNumber };
  };

  const createOrdersForCartAfterPayment = async ({
    paymentMethod,
    externalPaymentId,
  }: {
    paymentMethod: 'card' | 'mobile_money' | 'wallet';
    externalPaymentId?: string;
  }) => {
    if (!cartPaymentInfo || !cartPaymentInfo.items.length) return [];

    const byVendor = cartPaymentInfo.items.reduce((acc: Record<string, any[]>, item: any) => {
      const vendorId = getVendorIdFromItem(item);
      if (!vendorId) return acc;
      if (!acc[vendorId]) acc[vendorId] = [];
      acc[vendorId].push(item);
      return acc;
    }, {});

    const vendorEntries = Object.entries(byVendor);
    const results: Array<{ orderId: string; orderNumber: string }> = [];

    for (const [vendorId, items] of vendorEntries) {
      const result = await createOrderForVendor({
        vendorId,
        items: items as any[],
        paymentMethod,
        externalPaymentId,
        markAsPaid: true,
      });
      results.push(result);
    }

    return results;
  };

  // Charger les informations de paiement de produit ou panier
  const loadProductPaymentInfo = async () => {
    // V├®rifier les query params
    const productId = searchParams.get('productId');
    const quantity = searchParams.get('quantity');
    
    // V├®rifier le state
    const stateData = location.state as any;
    
    // CAS 1: Panier multi-produits depuis Cart.tsx
    if (stateData?.fromCart && stateData?.cartItems && stateData.cartItems.length > 0) {
      try {
        const cartItems = stateData.cartItems;
        const totalAmount = stateData.totalAmount;
        
        // Calcul multi-vendeur
        const firstItem = cartItems[0];
        const uniqueVendorIds = Array.from(new Set(cartItems.map((item: any) => getVendorIdFromItem(item)).filter(Boolean))) as string[];
        const isMultiVendorCart = uniqueVendorIds.length > 1;
        
        // Charger les infos du vendeur
        const { data: vendorInfo, error: vendorError } = await supabase
          .from('vendors')
          .select('id, user_id, country, vendor_code, public_id')
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

        // D├®river la devise du vendeur depuis son pays
        const vendorCurr = getVendorCurrency((vendorInfo as any).country);
        setProductCurrency(vendorCurr);

        // Stocker les infos du panier (produits physiques par d├®faut)
        setCartPaymentInfo({
          items: cartItems,
          totalAmount: totalAmount,
          vendorId: vendorInfo.id,
          vendorUserId: vendorInfo.user_id,
          productType: 'physical' // Panier = produits physiques
        });

        // Pr├®-remplir les champs
        setPaymentAmount(totalAmount.toString());

        if (isMultiVendorCart) {
          setRecipientId('');
          setPaymentDescription(`Achat panier multi-vendeurs (${cartItems.length} articles)`);
        } else {
          const vendorCode = await resolveVendorDisplayId({
            vendorId: vendorInfo.id,
            vendorUserId: vendorInfo.user_id,
            preferredId: (vendorInfo as any).vendor_code || (vendorInfo as any).public_id || null,
          });
          setRecipientId(vendorCode);
          const itemNames = cartItems.map((item: any) => `${item.name} (x${item.quantity})`).join(', ');
          setPaymentDescription(`Achat panier: ${itemNames}`);
        }

        // Si une m├®thode de paiement est pr├®-s├®lectionn├®e (depuis ProductPaymentModal)
        if (stateData?.paymentMethod) {
          const method = stateData.paymentMethod;
          if (method === 'card' || method === 'orange_money' || method === 'mtn_money') {
            setSelectedPaymentMethod(method);
            setPaymentStep('method');
          }
        }

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
        const isDigital = stateData?.productType === 'digital';
        
        if (isDigital) {
          // D'abord essayer digital_products (produits num├®riques du marketplace)
          const { data: dpProduct, error: dpError } = await supabase
            .from('digital_products')
            .select(`
              id,
              title,
              price,
              currency,
              vendor_id,
              merchant_id,
              pricing_type,
              subscription_interval,
              access_duration,
              vendors:vendors!digital_products_vendor_id_fkey(user_id, business_name, country, vendor_code, public_id)
            `)
            .eq('id', id)
            .maybeSingle();

          if (dpProduct) {
            const totalAmount = dpProduct.price * qty;
            const vRaw = (dpProduct.vendors as any) || null;
            const v = Array.isArray(vRaw) ? vRaw?.[0] : vRaw;
            const vendorUserId = v?.user_id || dpProduct.merchant_id;
            
            // D├®river la devise du vendeur
            const vendorCurr = getVendorCurrency(v?.country);
            setProductCurrency(dpProduct.currency || vendorCurr);
            
            setProductPaymentInfo({
              productId: dpProduct.id,
              productName: dpProduct.title,
              quantity: qty,
              vendorId: dpProduct.vendor_id || dpProduct.merchant_id,
              vendorUserId: vendorUserId,
              productType: 'digital',
              pricingType: (dpProduct as any).pricing_type || 'one_time',
              subscriptionInterval: (dpProduct as any).subscription_interval || undefined,
            });
            
            const vendorCode = await resolveVendorDisplayId({
              vendorId: dpProduct.vendor_id || null,
              vendorUserId,
              preferredId: (v as any)?.vendor_code || (v as any)?.public_id || null,
            });

            setPaymentAmount(totalAmount.toString());
            setRecipientId(vendorCode);
            const isSubscription = (dpProduct as any).pricing_type === 'subscription';
            const interval = (dpProduct as any).subscription_interval || 'monthly';
            const intervalLabel = interval === 'yearly' ? '/an' : '/mois';
            setPaymentDescription(isSubscription 
              ? `Abonnement ${intervalLabel}: ${dpProduct.title}` 
              : `Achat num├®rique: ${dpProduct.title} (x${qty})`);
            setPaymentOpen(true);
          } else {
            // Fallback: essayer service_products
            const { data: digitalProduct, error: digitalError } = await supabase
              .from('service_products')
              .select(`
                id,
                name,
                price,
                professional_service_id,
                professional_services!inner(user_id, business_name)
              `)
              .eq('id', id)
              .single();

            if (digitalError) throw digitalError;

            if (digitalProduct) {
              const totalAmount = digitalProduct.price * qty;
              const proService = digitalProduct.professional_services as any;
              
              setProductPaymentInfo({
                productId: digitalProduct.id,
                productName: digitalProduct.name,
                quantity: qty,
                vendorId: digitalProduct.professional_service_id,
                vendorUserId: proService.user_id,
                productType: 'digital'
              });
              
              const proUserId = proService.user_id;
              const vendorCode = await resolveVendorDisplayId({
                vendorUserId: proUserId,
              });

              setPaymentAmount(totalAmount.toString());
              setRecipientId(vendorCode);
              setPaymentDescription(`Achat num├®rique: ${digitalProduct.name} (x${qty})`);
              setPaymentOpen(true);
            }
          }
        } else {
          // Charger les d├®tails du produit physique
          const { data: product, error } = await supabase
            .from('products')
            .select(`
              id,
              name,
              price,
              vendor_id,
              vendors!inner(user_id, country, vendor_code, public_id)
            `)
            .eq('id', id)
            .single();

          if (error) throw error;

          if (product) {
            const totalAmount = product.price * qty;
            
            const vendorUserId = (product.vendors as any)?.user_id as string;
            const vendorCountry = (product.vendors as any)?.country as string | null;
            
            // D├®river la devise du vendeur depuis son pays
            const vendorCurr = getVendorCurrency(vendorCountry);
            setProductCurrency(vendorCurr);

            // Stocker les infos produit pour cr├®er la commande plus tard
            setProductPaymentInfo({
              productId: product.id,
              productName: product.name,
              quantity: qty,
              vendorId: product.vendor_id,
              vendorUserId,
              productType: 'physical' // Produit physique
            });
            // Pr├®-remplir les champs
            setPaymentAmount(totalAmount.toString());

            const vendorCode = await resolveVendorDisplayId({
              vendorId: product.vendor_id,
              vendorUserId,
              preferredId: (product.vendors as any)?.vendor_code || (product.vendors as any)?.public_id || null,
            });

            setRecipientId(vendorCode);

            setPaymentDescription(`Achat: ${product.name} (x${qty})`);
            
            // Ouvrir automatiquement le dialog de paiement
            setPaymentOpen(true);
          }
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
      const { data, error } = await (supabase
        .from('enhanced_transactions' as any)
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(5) as any);

      if (error) throw error;
      setRecentTransactions((data || []) as any[]);
    } catch (error) {
      console.error('Erreur chargement transactions:', error);
    }
  };

  const formatCurrency = useFormatCurrency();

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
      // Transformer le format pour compatibilit├®
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

  // Fonction pour pr├®visualiser un paiement
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
      const normalizedRecipient = recipientId.trim();
      const isMarketplaceRecipientLocked = Boolean(
        searchParams.get('productId') !== null || location.state?.productId || location.state?.fromCart
      );

      // Pour un achat marketplace, on conna├«t d├®j├á l'ID r├®el du vendeur.
      let receiverId: string | null = isMarketplaceRecipientLocked
        ? productPaymentInfo?.vendorUserId || cartPaymentInfo?.vendorUserId || null
        : null;

      // Sinon, essayer la r├®solution backend (ID public, email, t├®l├®phone, UUID).
      if (!receiverId && normalizedRecipient) {
        const recipientResolution = await resolveWalletRecipient(normalizedRecipient);
        if (recipientResolution.success && recipientResolution.data?.userId) {
          receiverId = recipientResolution.data.userId;
        }
      }

      // Fallback legacy pour certains vendeurs encore r├®solus via profiles/vendors.
      if (!receiverId) {
        const legacyLookupValue = normalizedRecipient.toUpperCase();

        const { data: profileMatch, error: profileMatchError } = await supabase
          .from('profiles')
          .select('id')
          .or(`public_id.eq.${legacyLookupValue},custom_id.eq.${legacyLookupValue}`)
          .maybeSingle();

        if (profileMatchError) {
          console.warn('Erreur lookup profiles destinataire:', profileMatchError);
        }

        if (profileMatch?.id) {
          receiverId = profileMatch.id;
        }

        if (!receiverId) {
          const { data: vendorMatch, error: vendorMatchError } = await supabase
            .from('vendors')
            .select('user_id')
            .or(`vendor_code.eq.${legacyLookupValue},public_id.eq.${legacyLookupValue}`)
            .maybeSingle();

          if (vendorMatchError) {
            console.warn('Erreur lookup vendors destinataire:', vendorMatchError);
          }

          if (vendorMatch?.user_id) {
            receiverId = vendorMatch.user_id;
          }
        }
      }

      if (!receiverId) {
        toast({
          title: "Erreur",
          description: "Destinataire introuvable. Utilisez un ID public, un email ou un t├®l├®phone valide.",
          variant: "destructive"
        });
        setProcessing(false);
        return;
      }

      const previewResponse = await previewWalletTransfer(receiverId, amount);
      const result = (previewResponse as any)?.data || previewResponse;

      console.log('[Payment] Preview response:', result);

      if (!result?.success) {
        throw new Error(result?.error || 'Erreur lors de la pr├®visualisation');
      }

      const previewData = {
        amount: result.amount ?? result.amount_sent ?? 0,
        fee_percent: result.fee_percent ?? result.fee_percentage ?? 0,
        fee_amount: result.fee_amount ?? 0,
        total_debit: result.total_debit ?? 0,
        amount_received: result.amount_received ?? 0,
        current_balance: result.current_balance ?? result.sender_balance ?? 0,
        balance_after: result.balance_after ?? 0,
        receiver_id: receiverId,
        is_international: Boolean(result.is_international),
        currency_sent: result.currency_sent || result.currency || 'GNF',
        currency_received: result.currency_received || result.currency || 'GNF',
      };

      console.log('[Payment] Preview data extracted:', previewData);

      setPaymentPreview(previewData);
      setShowPaymentPreview(true);
      setPaymentOpen(false);
    } catch (error: any) {
      console.error('Erreur pr├®visualisation:', error);
      
      // D├®tecter si c'est une erreur de solde insuffisant
      const errorMessage = error.message || '';
      const isInsufficientBalance = errorMessage.toLowerCase().includes('insuffisant') || 
                                   errorMessage.toLowerCase().includes('insufficient');
      
      if (isInsufficientBalance) {
        toast({
          title: "­ƒÆ│ Solde insuffisant",
          description: "Votre solde est insuffisant pour effectuer cette transaction. Veuillez recharger votre wallet.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erreur",
          description: errorMessage || 'Impossible de pr├®visualiser le paiement',
          variant: "destructive"
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  // Fonction pour paiement ├á la livraison
  const handleCashOnDeliveryPayment = async (addressData?: any) => {
    if (!user?.id || !paymentAmount) return;

    setProcessing(true);
    try {
      // Si c'est un achat produit ou panier, cr├®er la commande en mode "cash on delivery"
      if (productPaymentInfo || cartPaymentInfo) {
        const vendorId = productPaymentInfo?.vendorId || cartPaymentInfo?.vendorId;
        const items = productPaymentInfo 
          ? [{ product_id: productPaymentInfo.productId, quantity: productPaymentInfo.quantity, price: parseFloat(paymentAmount) / productPaymentInfo.quantity }]
          : cartPaymentInfo?.items.map((item: any) => ({ product_id: item.product_id || item.id, quantity: item.quantity, price: item.price }));

        // Utiliser 'cash' comme payment_method (valeur valide de l'enum) avec is_cod dans metadata
        // R├®cup├®rer le t├®l├®phone du profil si l'adresse ne le contient pas
        const { data: profileData } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .single();

        // Construire l'adresse de livraison avec les donn├®es du formulaire ou valeurs par d├®faut
        const shippingAddress = addressData ? {
          address: addressData.street,
          neighborhood: addressData.neighborhood || '',
          city: addressData.city,
          landmark: addressData.landmark || '',
          phone: profileData?.phone || 'Non fourni',
          cod_phone: addressData.street || '',
          country: 'Guin├®e',
          instructions: addressData.instructions || '',
          is_cod: true
        } : {
          address: 'Adresse ├á confirmer par le client',
          city: 'Conakry',
          phone: profileData?.phone || 'Non fourni',
          country: 'Guin├®e',
          is_cod: true,
          instructions: 'Le client sera contact├® pour confirmer l\'adresse exacte'
        };

        if (cartPaymentInfo?.items?.length) {
          await Promise.all(
            Object.entries(
              cartPaymentInfo.items.reduce((acc: Record<string, any[]>, item: any) => {
                const currentVendorId = getVendorIdFromItem(item);
                if (!currentVendorId) return acc;
                if (!acc[currentVendorId]) acc[currentVendorId] = [];
                acc[currentVendorId].push(item);
                return acc;
              }, {})
            ).map(([currentVendorId, currentItems]) =>
              createOrderForVendor({
                vendorId: currentVendorId,
                items: currentItems as any[],
                paymentMethod: 'cod',
                shippingAddress: {
                  full_name: user.user_metadata?.full_name || user.email || 'Client 224Solutions',
                  phone: profileData?.phone || 'Non fourni',
                  address_line: shippingAddress.address,
                  city: shippingAddress.city,
                  country: shippingAddress.country,
                  notes: shippingAddress.instructions || null,
                  postal_code: null,
                },
              })
            )
          );
        } else if (vendorId && items) {
          await createOrderForVendor({
            vendorId,
            items,
            paymentMethod: 'cod',
            shippingAddress: {
              full_name: user.user_metadata?.full_name || user.email || 'Client 224Solutions',
              phone: profileData?.phone || 'Non fourni',
              address_line: shippingAddress.address,
              city: shippingAddress.city,
              country: shippingAddress.country,
              notes: shippingAddress.instructions || null,
              postal_code: null,
            },
          });
        }

        toast({
          title: "Ô£à Commande cr├®├®e !",
          description: "Votre commande sera pay├®e ├á la livraison"
        });

        setPaymentOpen(false);
        setPaymentStep('form');
        setProductPaymentInfo(null);
        setCartPaymentInfo(null);
        clearCart();
        navigate('/client');
      } else {
        toast({
          title: "Information",
          description: "Le paiement ├á la livraison n'est disponible que pour les achats de produits",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Erreur paiement livraison:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de cr├®er la commande",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  // Fonction pour paiement Mobile Money via ChapChapPay
  const handleMobileMoneyPayment = async (method: 'orange_money' | 'mtn_money', phone: string) => {
    if (!user?.id || !paymentAmount) return;

    setProcessing(true);
    try {
      const provider = method === 'orange_money' ? 'orange' : 'mtn';
      
      toast({
        title: "­ƒô▒ Paiement ChapChapPay",
        description: `Initialisation du paiement ${provider.toUpperCase()}...`
      });

      // Le flux mobile money est gere par le selecteur de paiement
      setPaymentOpen(false);
      
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

  // Fonction pour paiement par carte ÔÇö g├®r├® par le selecteur de paiement inline
  // Cette fonction est conserv├®e comme fallback si besoin
  const handleCardPayment = async () => {
    if (!user?.id || !paymentAmount) return;
    // Redirection vers le flux carte inline
    setSelectedPaymentMethod('card');
    setPaymentStep('method');
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

        const orders = await createOrdersForCartAfterPayment({ paymentMethod: 'wallet' });

        toast({
          title: "Ô£à Commande cr├®├®e !",
          description: `${orders.length} commande(s) cr├®├®e(s) pour votre panier`
        });

        // R├®initialiser et naviguer vers les commandes
        setCartPaymentInfo(null);
        clearCart();
        navigate('/client');
        return;
      } 
      
      // CAS 2: Paiement d'un seul produit
      if (productPaymentInfo) {
        console.log('[Payment] Creating product order:', productPaymentInfo);

        // ====== PRODUIT NUM├ëRIQUE ======
        if (productPaymentInfo.productType === 'digital') {
          const isSubscription = productPaymentInfo.pricingType === 'subscription';
          const billingCycle = productPaymentInfo.subscriptionInterval || 'monthly';
          console.log('[Payment] Digital product payment', { isSubscription, billingCycle });

          // Cr├®er l'escrow pour le produit num├®rique
          const escrowResult = await UniversalEscrowService.createEscrow({
            buyer_id: user.id,
            seller_id: productPaymentInfo.vendorUserId,
            amount: paymentPreview.amount,
            currency: productCurrency || 'GNF',
            transaction_type: 'digital_product',
            payment_provider: 'wallet',
            metadata: {
              product_id: productPaymentInfo.productId,
              product_name: productPaymentInfo.productName,
              quantity: productPaymentInfo.quantity,
              is_subscription: isSubscription,
              billing_cycle: billingCycle,
              description: paymentDescription || `Achat num├®rique: ${productPaymentInfo.productName}`
            },
            escrow_options: {
              auto_release_days: 0,
              commission_percent: 0
            }
          });

          if (!escrowResult.success) {
            throw new Error(escrowResult.error || '├ëchec du paiement');
          }

          // Calculer la date d'expiration
          const now = new Date();
          let accessExpiresAt: string | null = null;
          let periodEnd: Date = new Date();
          
          if (isSubscription && billingCycle !== 'lifetime') {
            if (billingCycle === 'monthly') {
              periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            } else if (billingCycle === 'yearly') {
              periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
            }
            accessExpiresAt = periodEnd.toISOString();
          }

          // Enregistrer l'achat dans digital_product_purchases
          const { error: purchaseError } = await supabase
            .from('digital_product_purchases')
            .insert({
              product_id: productPaymentInfo.productId,
              buyer_id: user.id,
              merchant_id: productPaymentInfo.vendorUserId,
              amount: paymentPreview.amount,
              payment_status: 'completed',
              access_granted: true,
              download_count: 0,
              max_downloads: isSubscription ? null : 10,
              transaction_id: escrowResult.escrow_id || null,
              access_expires_at: accessExpiresAt
            });

          if (purchaseError) {
            console.error('[Payment] Error creating purchase record:', purchaseError);
          }

          // Si c'est un abonnement, cr├®er l'enregistrement dans digital_subscriptions
          if (isSubscription && billingCycle !== 'lifetime') {
            const { error: subError } = await supabase
              .from('digital_subscriptions')
              .insert({
                product_id: productPaymentInfo.productId,
                buyer_id: user.id,
                merchant_id: productPaymentInfo.vendorUserId,
                status: 'active',
                billing_cycle: billingCycle,
                amount_per_period: paymentPreview.amount,
                currency: productCurrency || 'GNF',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                next_billing_date: periodEnd.toISOString(),
                auto_renew: true,
                payment_method: 'wallet',
                total_payments_made: 1,
                total_amount_paid: paymentPreview.amount,
                last_payment_at: now.toISOString(),
                last_payment_transaction_id: escrowResult.escrow_id || null
              });

            if (subError) {
              console.error('[Payment] Error creating subscription:', subError);
            } else {
              console.log('[Payment] Ô£à Digital subscription created');
            }
          }

          // sales_count est incr├®ment├® automatiquement par le trigger DB

          const intervalLabels: Record<string, string> = { monthly: 'mensuel', yearly: 'annuel', lifetime: '' };
          toast({
            title: isSubscription ? "Ô£à Abonnement activ├® !" : "Ô£à Achat r├®ussi !",
            description: isSubscription 
              ? `${productPaymentInfo.productName} ÔÇö Abonnement ${intervalLabels[billingCycle]} activ├®`
              : `${productPaymentInfo.productName} ÔÇö Acc├¿s au t├®l├®chargement accord├®`
          });

          const successRoute = getDigitalSuccessRoute(productPaymentInfo.pricingType);
          setProductPaymentInfo(null);
          navigate(successRoute);
          return;
        }

        // ====== PRODUIT PHYSIQUE ======
        const { orderNumber } = await createOrderForVendor({
          vendorId: productPaymentInfo.vendorId,
          items: [{
            product_id: productPaymentInfo.productId,
            quantity: productPaymentInfo.quantity,
            price: paymentPreview.amount / productPaymentInfo.quantity,
          }],
          paymentMethod: 'wallet',
          markAsPaid: true,
        });

        toast({
          title: "Ô£à Commande cr├®├®e !",
          description: `Commande ${orderNumber} - Paiement s├®curis├® par Escrow`
        });

        // R├®initialiser l'info produit et rediriger
        setProductPaymentInfo(null);
        navigate('/client');
        return;
      } else {
        // Transfert wallet normal (non-produit)
        const shouldUseEscrow = paymentPreview.amount >= 10000 && !paymentPreview.is_international;

        if (shouldUseEscrow) {
          console.log('[Payment] Using escrow for wallet transfer');
          
          const escrowResult = await UniversalEscrowService.createEscrow({
            buyer_id: user.id,
            seller_id: paymentPreview.receiver_id,
            amount: paymentPreview.amount,
            currency: paymentPreview.currency_sent || 'GNF',
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
            throw new Error(escrowResult.error || '├ëchec de la cr├®ation de l\'escrow');
          }

          const senderCurrency = paymentPreview.currency_sent || 'GNF';
          toast({
            title: "Transfert s├®curis├® effectu├®",
            description: `Ô£à Transfert r├®ussi via Escrow\n­ƒÆ© Frais appliqu├®s : ${paymentPreview.fee_amount.toLocaleString()} ${senderCurrency}\n­ƒÆ░ Montant transf├®r├® : ${paymentPreview.amount.toLocaleString()} ${senderCurrency}`
          });
        } else {
          // Transfert direct sans escrow
          const transferResult = await transferToWallet(
            paymentPreview.receiver_id,
            paymentPreview.amount,
            paymentDescription || 'Paiement via wallet'
          );

          if (!transferResult.success) {
            throw new Error(transferResult.error || '├ëchec du paiement wallet');
          }

          const senderCurrency = paymentPreview.currency_sent || 'GNF';
          toast({
            title: "Paiement effectu├®",
            description: `Ô£à Paiement r├®ussi\n­ƒÆ© Frais appliqu├®s : ${paymentPreview.fee_amount.toLocaleString()} ${senderCurrency}\n­ƒÆ░ Montant pay├® : ${paymentPreview.amount.toLocaleString()} ${senderCurrency}`
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
      console.error('ÔØî Erreur paiement:', error);
      
      // D├®tecter si c'est une erreur de solde insuffisant
      const errorMessage = error.message || '';
      const isInsufficientBalance = errorMessage.toLowerCase().includes('insuffisant') || 
                                   errorMessage.toLowerCase().includes('insufficient');
      
      if (isInsufficientBalance) {
        toast({
          title: "­ƒÆ│ Solde insuffisant",
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
                  <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 left-3 right-3 w-auto max-w-none translate-x-0 sm:left-[50%] sm:right-auto sm:w-full sm:max-w-md sm:translate-x-[-50%]">
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
                              placeholder={searchParams.get('productId') !== null || location.state?.productId || location.state?.fromCart
                                ? 'ID r├®el du vendeur d├®tect├® automatiquement'
                                : 'ID public, email, t├®l├®phone ou UUID'}
                              value={recipientId}
                              onChange={(e) => setRecipientId(e.target.value)}
                              maxLength={64}
                              readOnly={searchParams.get('productId') !== null || location.state?.productId || location.state?.fromCart}
                              className={searchParams.get('productId') || location.state?.productId || location.state?.fromCart ? 'bg-muted cursor-not-allowed' : ''}
                            />
                            <p className="text-xs text-muted-foreground">
                              {searchParams.get('productId') !== null || location.state?.productId || location.state?.fromCart
                                ? 'Le vrai ID vendeur est appliqu├® automatiquement pour cet achat marketplace.'
                                : 'Formats accept├®s : VND0001, email, t├®l├®phone ou UUID.'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="payment-amount">Montant ({productCurrency}) *</Label>
                            <Input
                              id="payment-amount"
                              type="number"
                              placeholder="10000"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              readOnly={searchParams.get('productId') !== null || location.state?.productId}
                              className={searchParams.get('productId') || location.state?.productId ? 'bg-muted cursor-not-allowed font-bold text-primary' : ''}
                            />
                            {/* Afficher la conversion si la devise du produit diff├¿re de celle de l'utilisateur */}
                            {paymentAmount && productCurrency !== userCurrency && !converterLoading && (
                              <p className="text-xs text-muted-foreground">
                                Ôëê {convertPrice(parseFloat(paymentAmount) || 0, productCurrency).formatted} dans votre devise
                              </p>
                            )}
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
                      <JomyPaymentSelector
                        amount={parseFloat(paymentAmount) || 0}
                        currency={productCurrency}
                        orderId={productPaymentInfo?.productId || `transfer-${Date.now()}`}
                        description={paymentDescription || 'Transfert'}
                        transactionType={productPaymentInfo || cartPaymentInfo ? 'product' : 'transfer'}
                        productType={productPaymentInfo?.productType || cartPaymentInfo?.productType || 'physical'}
                        enableEscrow={!!(productPaymentInfo || cartPaymentInfo)}
                        recipientId={cartPaymentInfo && new Set(cartPaymentInfo.items.map((item: any) => getVendorIdFromItem(item)).filter(Boolean)).size > 1 ? undefined : recipientId}
                        sellerId={cartPaymentInfo && new Set(cartPaymentInfo.items.map((item: any) => getVendorIdFromItem(item)).filter(Boolean)).size > 1 ? undefined : (productPaymentInfo?.vendorUserId || cartPaymentInfo?.vendorUserId)}
                        onPaymentSuccess={async (transactionId, status) => {
                          console.log('[Payment] Success:', transactionId);
                          const normalizedMethod = inferPaymentMethod(status, transactionId);

                          if (cartPaymentInfo && user?.id) {
                            try {
                              const orders = await createOrdersForCartAfterPayment({
                                paymentMethod: normalizedMethod,
                                externalPaymentId: transactionId || undefined,
                              });

                              if (orders.length === 0) {
                                throw new Error('Aucune commande cr├®├®e apr├¿s paiement');
                              }

                              clearCart();
                            } catch (err: any) {
                              console.error('[Payment] Error creating cart orders after payment:', err);
                              toast({
                                title: 'Paiement re├ºu mais commande incompl├¿te',
                                description: err?.message || 'Contactez le support avec votre r├®f├®rence de paiement',
                                variant: 'destructive',
                                duration: 10000,
                              });
                            }
                          }

                          if (productPaymentInfo?.productType === 'physical' && user?.id) {
                            try {
                              const order = await createOrderForVendor({
                                vendorId: productPaymentInfo.vendorId,
                                items: [{
                                  product_id: productPaymentInfo.productId,
                                  quantity: productPaymentInfo.quantity,
                                  price: (parseFloat(paymentAmount) || 0) / Math.max(productPaymentInfo.quantity, 1),
                                }],
                                paymentMethod: normalizedMethod,
                                externalPaymentId: transactionId || undefined,
                                markAsPaid: true,
                              });
                              console.log('[Payment] Physical order created after provider success:', order);
                            } catch (err: any) {
                              console.error('[Payment] Error creating physical order after payment:', err);
                              toast({
                                title: 'Paiement re├ºu mais commande incompl├¿te',
                                description: err?.message || 'Contactez le support avec votre r├®f├®rence de paiement',
                                variant: 'destructive',
                                duration: 10000,
                              });
                            }
                          }
                          
                          // Pour les produits num├®riques, cr├®er l'enregistrement d'achat
                          if (productPaymentInfo?.productType === 'digital' && user?.id) {
                            try {
                              const isSubscription = productPaymentInfo.pricingType === 'subscription';
                              const billingCycle = productPaymentInfo.subscriptionInterval || 'monthly';
                              const now = new Date();
                              let accessExpiresAt: string | null = null;
                              let periodEnd: Date = new Date();

                              if (isSubscription && billingCycle !== 'lifetime') {
                                if (billingCycle === 'monthly') {
                                  periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                                } else if (billingCycle === 'yearly') {
                                  periodEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
                                }
                                accessExpiresAt = periodEnd.toISOString();
                              }

                              // Cr├®er l'achat dans digital_product_purchases
                              const { error: purchaseError } = await supabase
                                .from('digital_product_purchases')
                                .insert({
                                  product_id: productPaymentInfo.productId,
                                  buyer_id: user.id,
                                  merchant_id: productPaymentInfo.vendorUserId,
                                  amount: parseFloat(paymentAmount) || 0,
                                  payment_status: 'completed',
                                  access_granted: true,
                                  download_count: 0,
                                  max_downloads: isSubscription ? null : 10,
                                  transaction_id: transactionId || null,
                                  access_expires_at: accessExpiresAt
                                });

                              if (purchaseError) {
                                console.error('[Payment] Error creating digital purchase:', purchaseError);
                              } else {
                                console.log('[Payment] Ô£à Digital purchase record created');
                              }

                              // Si abonnement, cr├®er aussi l'enregistrement
                              if (isSubscription && billingCycle !== 'lifetime') {
                                await supabase
                                  .from('digital_subscriptions')
                                  .insert({
                                    product_id: productPaymentInfo.productId,
                                    buyer_id: user.id,
                                    merchant_id: productPaymentInfo.vendorUserId,
                                    status: 'active',
                                    billing_cycle: billingCycle,
                                    amount_per_period: parseFloat(paymentAmount) || 0,
                                    currency: productCurrency || 'GNF',
                                    current_period_start: now.toISOString(),
                                    current_period_end: periodEnd.toISOString(),
                                    next_billing_date: periodEnd.toISOString(),
                                    auto_renew: true,
                                    payment_method: 'wallet',
                                    total_payments_made: 1,
                                    total_amount_paid: parseFloat(paymentAmount) || 0,
                                    last_payment_at: now.toISOString(),
                                    last_payment_transaction_id: transactionId || null
                                  });
                              }

                              // sales_count est incr├®ment├® automatiquement par le trigger DB

                            } catch (err) {
                              console.error('[Payment] Error in digital purchase flow:', err);
                            }
                          }

                          toast({
                            title: "Paiement r├®ussi",
                            description: "Votre paiement a ├®t├® effectu├® avec succ├¿s",
                          });
                          setPaymentOpen(false);
                          setPaymentStep('form');
                          loadWalletData();
                          loadRecentTransactions();
                          if (productPaymentInfo) {
                            if (productPaymentInfo.productType === 'digital') {
                              navigate(getDigitalSuccessRoute(productPaymentInfo.pricingType));
                            } else {
                              navigate('/client');
                            }
                          } else if (cartPaymentInfo) {
                            navigate('/client');
                          }
                        }}
                        onPaymentFailed={(error) => {
                          console.error('[Payment] Failed:', error);
                          toast({
                            title: "Erreur de paiement",
                            description: error,
                            variant: "destructive",
                          });
                        }}
                        onCashOnDelivery={(addressData) => {
                          handleCashOnDeliveryPayment(addressData);
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

        {/* Transactions r├®centes */}
        <Card className="mt-6 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Transactions r├®centes
            </CardTitle>
            <CardDescription>
              Les 5 derni├¿res transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune transaction r├®cente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(tx.type, tx.sender_id)}
                      <div>
                        <p className="font-medium">
                          {tx.sender_id === user?.id ? 'Envoy├®' : 'Re├ºu'}
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
                  Toutes vos transactions d├®taill├®es
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
                  G├®rez vos moyens de paiement pour des transactions plus rapides
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gestionnaire des 5 moyens de paiement */}
                <PaymentMethodsManager />

                {/* S├®parateur */}
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
                    G├®rez votre carte virtuelle pour les paiements en ligne
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
                      <span className="text-sm text-muted-foreground">­ƒÆ░ Montant</span>
                      <span className="text-lg font-bold">{paymentPreview?.amount?.toLocaleString()} {paymentPreview?.currency_sent || 'GNF'}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium">­ƒÆ© Frais de paiement ({paymentPreview?.fee_percent}%)</span>
                      <span className="text-lg font-bold">{paymentPreview?.fee_amount?.toLocaleString()} {paymentPreview?.currency_sent || 'GNF'}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 bg-red-50 dark:bg-red-950 -mx-4 px-4 py-2 rounded">
                      <span className="text-sm font-bold">­ƒÆ│ Total ├á d├®biter</span>
                      <span className="text-xl font-bold text-destructive">{paymentPreview?.total_debit?.toLocaleString()} {paymentPreview?.currency_sent || 'GNF'}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 bg-green-50 dark:bg-green-950 -mx-4 px-4 py-2 rounded">
                      <span className="text-sm font-medium">Ô£à Le destinataire recevra</span>
                      <span className="text-lg font-bold text-success">{paymentPreview?.amount_received?.toLocaleString()} {paymentPreview?.currency_received || paymentPreview?.currency_sent || 'GNF'}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>
                      <strong>Solde actuel:</strong> {paymentPreview?.current_balance?.toLocaleString()} {paymentPreview?.currency_sent || 'GNF'}
                    </p>
                    <p>
                      <strong>Solde apr├¿s paiement:</strong> {paymentPreview?.balance_after?.toLocaleString()} {paymentPreview?.currency_sent || 'GNF'}
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

      </div>
    </div>
  );
}
