// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Receipt, 
  Search,
  Grid3X3,
  List,
  Calculator,
  Smartphone,
  User,
  CheckSquare,
  Settings,
  Building,
  Printer,
  FileText,
  Clock,
  UserX,
  StickyNote,
  ShoppingBag,
  Check,
  Euro,
  Eye,
  Package,
  Store,
  Upload,
  ImageIcon,
  Percent,
  ChevronRight,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { useFxRates } from '@/hooks/useFxRates';
import { CurrencySelect } from '@/components/ui/currency-select';
import { getCurrencyByCode, formatCurrency } from '@/data/currencies';
import { useAuth } from '@/hooks/useAuth';
import { useAgent } from '@/contexts/AgentContext';
import { supabase } from '@/integrations/supabase/client';
import { useVendorOptimized } from '@/hooks/useVendorOptimized';
import { getEdgeFunctionErrorMessage } from '@/utils/supabaseFunctionsError';
import { NumericKeypadPopup } from './pos/NumericKeypadPopup';
import { QuantityKeypadPopup } from './pos/QuantityKeypadPopup';
import { POSReceipt } from './pos/POSReceipt';
import { BarcodeScannerModal } from './pos/BarcodeScannerModal';
import { Scan } from 'lucide-react';
import { useChapChapPay } from '@/hooks/useChapChapPay';
import { CCPPaymentMethod } from '@/services/payment/ChapChapPayService';
import { StripeCardPaymentModal } from '@/components/pos/StripeCardPaymentModal';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  category: string;
  categoryId?: string | null;
  stock: number;
  barcode?: string;
  // Champs carton
  sell_by_carton?: boolean;
  units_per_carton?: number;
  price_carton?: number;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
  // Type de vente (unité ou carton)
  saleType?: 'unit' | 'carton';
  displayQuantity?: string; // Pour afficher "1 carton (24 unités)"
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export function POSSystem() {
  const { settings, loading: settingsLoading, updateSettings } = usePOSSettings();
  const { user, session } = useAuth();
  const { vendorId: agentVendorId } = useAgent(); // Récupérer le vendor_id depuis le contexte agent
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  
  // Hook ChapChapPay pour paiements Mobile Money sécurisés
  const { initiatePullPayment, pollStatus, isLoading: ccpLoading, error: ccpError } = useChapChapPay();
  
  // Récupérer le vendor_id de l'utilisateur connecté ou du contexte agent
  const [vendorId, setVendorId] = useState<string | null>(agentVendorId || null);
  
  useEffect(() => {
    // Si on a déjà un vendorId depuis le contexte agent, on l'utilise
    if (agentVendorId) {
      setVendorId(agentVendorId);
      return;
    }
    
    // Sinon, on cherche le vendor_id via l'utilisateur connecté
    if (user?.id) {
      supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (data) {
            setVendorId(data.id);
          } else {
            // Pas de vendor_id trouvé, on chargera tous les produits
            console.log('Pas de vendor trouvé, chargement de tous les produits du marketplace');
          }
        });
    }
  }, [user?.id, agentVendorId]);
  
  // Charger les produits du vendor depuis la base de données
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // Charger les catégories depuis la base de données
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  // Devise sélectionnée
  const selectedCurrency = settings?.currency || 'GNF';
  
  // Taux de change (taux exact du jour) via Edge Function
  const { rates: fxRates, lastUpdated: ratesLastUpdated } = useFxRates({
    base: 'GNF',
    symbols: [selectedCurrency].filter(c => c !== 'GNF'),
    refreshMinutes: 12 * 60,
  });

  // Fonction pour convertir un prix de GNF vers la devise sélectionnée
  const convertPrice = (priceInGNF: number): number => {
    if (selectedCurrency === 'GNF') return priceInGNF;
    const rate = fxRates?.[selectedCurrency];
    if (typeof rate === 'number' && rate > 0) {
      return priceInGNF * rate;
    }
    return priceInGNF;
  };
  
  // Formater le prix avec la devise
  const formatPriceWithCurrency = (priceInGNF: number): string => {
    const convertedPrice = convertPrice(priceInGNF);
    const currencyInfo = getCurrencyByCode(selectedCurrency);
    if (!currencyInfo) return `${convertedPrice.toLocaleString()} ${selectedCurrency}`;
    return formatCurrency(convertedPrice, selectedCurrency);
  };
  

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const { data: categoriesData, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);
  
  // ✨ Synchronisation automatique des ventes offline lors de la reconnexion
  useEffect(() => {
    const syncOfflineSales = async () => {
      if (!vendorId || !navigator.onLine) return;
      
      try {
        const { default: offlineDB } = await import('@/lib/offlineDB');
        const pendingEvents = await offlineDB.getPendingEvents();
        const salesEvents = pendingEvents.filter(e => e.type === 'sale' && e.vendor_id === vendorId);
        
        if (salesEvents.length === 0) return;
        
        console.log(`🔄 Synchronisation de ${salesEvents.length} vente(s) offline...`);
        toast.info(`Synchronisation de ${salesEvents.length} vente(s) en cours...`);
        
        for (const event of salesEvents) {
          try {
            const saleData = event.data;
            
            // Obtenir ou créer un customer_id
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('vendor_id', vendorId)
              .eq('name', saleData.customer_name || 'Client comptoir')
              .maybeSingle();
            
            let customerId = existingCustomer?.id;
            
            if (!customerId) {
              const { data: newCustomer } = await supabase
                .from('customers')
                .insert({
                  vendor_id: vendorId,
                  name: saleData.customer_name || 'Client comptoir',
                  phone: saleData.customer_phone || null
                })
                .select('id')
                .single();
              customerId = newCustomer?.id;
            }
            
            if (!customerId) continue;
            
            // Créer la commande
            const { data: order, error: orderError } = await supabase
              .from('orders')
              .insert({
                vendor_id: vendorId,
                customer_id: customerId,
                total_amount: saleData.total_amount,
                subtotal: saleData.subtotal,
                tax_amount: saleData.tax_amount,
                discount_amount: saleData.discount_amount,
                payment_status: 'paid',
                status: 'confirmed',
                payment_method: 'cash',
                shipping_address: { address: 'Point de vente' },
                notes: `Vente offline synchronisée - ${saleData.order_number}`,
                source: 'pos_offline_synced',
                created_at: saleData.sale_date
              })
              .select('id')
              .single();
            
            if (orderError) throw orderError;
            
            // Créer les items
            const orderItems = saleData.items.map((item: any) => ({
              order_id: order.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price
            }));
            
            await supabase.from('order_items').insert(orderItems);
            await supabase.from('orders').update({ status: 'processing' }).eq('id', order.id);
            
            // Marquer l'événement comme synchronisé
            await offlineDB.markEventAsSynced(event.client_event_id);
            console.log(`✅ Vente offline ${saleData.order_number} synchronisée`);
            
          } catch (syncError) {
            console.error('Erreur sync vente offline:', syncError);
            await offlineDB.markEventAsFailed(event.client_event_id, String(syncError));
          }
        }
        
        // Rafraîchir les produits pour avoir les stocks à jour
        await loadVendorProducts();
        toast.success('Ventes hors-ligne synchronisées !');
        
      } catch (error) {
        console.error('Erreur synchronisation offline:', error);
      }
    };
    
    // Sync au montage si online
    syncOfflineSales();
    
    // Sync quand on repasse online
    const handleOnline = () => {
      console.log('📡 Connexion rétablie - synchronisation...');
      syncOfflineSales();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [vendorId]);
  
  const loadVendorProducts = async () => {
    if (!vendorId) return;
    
    try {
      setProductsLoading(true);
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          stock_quantity,
          barcode,
          sku,
          images,
          category_id,
          categories(id, name),
          sell_by_carton,
          units_per_carton,
          price_carton
        `)
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const formattedProducts = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name ?? 'Produit',
        price: Number(p.price || 0),
        category: p.categories?.name || 'Divers',
        categoryId: p.categories?.id || null,
        stock: Number(p.stock_quantity || 0),
        barcode: p.barcode || p.sku || undefined,
        images: p.images || [],
        // Champs carton
        sell_by_carton: p.sell_by_carton || false,
        units_per_carton: Number(p.units_per_carton || 1),
        price_carton: Number(p.price_carton || 0)
      }));

      // Trier les produits: ceux en stock d'abord, rupture de stock en bas
      const sortedProducts = formattedProducts.sort((a, b) => {
        if (a.stock === 0 && b.stock > 0) return 1;
        if (a.stock > 0 && b.stock === 0) return -1;
        return a.name.localeCompare(b.name);
      });

      setProducts(sortedProducts);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      loadVendorProducts();
    }
  }, [vendorId]);

  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Synchroniser le panier avec les données produits mises à jour
  useEffect(() => {
    if (products.length === 0 || cart.length === 0) return;
    
    setCart(prevCart => prevCart.map(cartItem => {
      const updatedProduct = products.find(p => p.id === cartItem.id);
      if (!updatedProduct) return cartItem;
      
      // Mettre à jour les données du produit dans le panier
      const newPrice = cartItem.saleType === 'carton' 
        ? (updatedProduct.price_carton || updatedProduct.price * (updatedProduct.units_per_carton || 1))
        : updatedProduct.price;
      
      // Recalculer le total
      let newTotal: number;
      if (cartItem.saleType === 'carton' && updatedProduct.units_per_carton) {
        const cartonCount = Math.floor(cartItem.quantity / (cartItem.units_per_carton || updatedProduct.units_per_carton));
        newTotal = cartonCount * newPrice;
      } else {
        newTotal = cartItem.quantity * newPrice;
      }
      
      return {
        ...cartItem,
        name: updatedProduct.name,
        price: newPrice,
        stock: updatedProduct.stock,
        sell_by_carton: updatedProduct.sell_by_carton,
        units_per_carton: updatedProduct.units_per_carton,
        price_carton: updatedProduct.price_carton,
        total: newTotal
      };
    }));
  }, [products]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash');
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<'orange' | 'mtn'>('orange');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [numericInput, setNumericInput] = useState('');
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showQuantityKeypad, setShowQuantityKeypad] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<Product | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [keypadMode, setKeypadMode] = useState<'quantity' | 'amount'>('quantity');
  const [selectedCartItemForQuantity, setSelectedCartItemForQuantity] = useState<CartItem | null>(null);
  
  // État pour le modal de paiement Stripe
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [pendingStripeOrder, setPendingStripeOrder] = useState<{id: string, order_number: string} | null>(null);
  
  // États pour personnalisation - Récupérer le nom de l'entreprise depuis le profil vendor
  const { profile: vendorProfile } = useVendorOptimized();
  const companyName = vendorProfile?.business_name || 'Point de Vente';
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Historique des 3 derniers produits sélectionnés
  const [recentlySelected, setRecentlySelected] = useState<string[]>([]);
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Trier les produits: les 3 derniers sélectionnés en premier
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aIndex = recentlySelected.indexOf(a.id);
    const bIndex = recentlySelected.indexOf(b.id);
    
    // Si les deux sont dans les récents, trier par ordre de sélection (plus récent d'abord)
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // Si seulement a est récent, le mettre en premier
    if (aIndex !== -1) return -1;
    // Si seulement b est récent, le mettre en premier
    if (bIndex !== -1) return 1;
    // Sinon garder l'ordre original
    return 0;
  });

  // Calculs automatiques avec TVA dynamique
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxRate = settings?.tax_rate || 0.18;
  const taxEnabled = settings?.tax_enabled ?? true;
  const tax = taxEnabled ? subtotal * taxRate : 0;
  const totalBeforeDiscount = subtotal + tax;
  
  // Calcul de la remise selon le mode sélectionné
  const discountValue = discountMode === 'percent' 
    ? (totalBeforeDiscount * discountPercent) / 100 
    : discountAmount;
  const total = Math.max(0, totalBeforeDiscount - discountValue);
  const change = receivedAmount - total;

  // Fonction d'ajout au panier avec calcul automatique (unités)
  const addToCart = (productOrCartItem: Product | CartItem, quantity: number = 1) => {
    // Récupérer le produit original pour avoir le prix unitaire correct
    const originalProduct = products.find(p => p.id === productOrCartItem.id);
    const product = originalProduct || productOrCartItem;
    const unitPrice = originalProduct?.price || productOrCartItem.price;
    
    if (product.stock <= 0) {
      toast.error('Produit en rupture de stock');
      return;
    }

    // Mettre à jour les produits récemment sélectionnés (max 3)
    setRecentlySelected(prev => {
      const filtered = prev.filter(id => id !== product.id);
      return [product.id, ...filtered].slice(0, 3);
    });

    setCart(prev => {
      const totalUnitsInCart = prev
        .filter(i => i.id === product.id)
        .reduce((sum, i) => sum + (i.quantity || 0), 0);

      if (totalUnitsInCart + quantity > product.stock) {
        toast.error('Stock insuffisant');
        return prev;
      }

      const existingItem = prev.find(item => item.id === product.id && item.saleType !== 'carton');
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        // Utiliser le prix unitaire original pour le calcul
        const originalUnitPrice = originalProduct?.price || existingItem.price;
        return prev.map(item =>
          item.id === product.id && item.saleType !== 'carton'
            ? { ...item, quantity: newQuantity, total: newQuantity * originalUnitPrice }
            : item
        );
      }

      return [...prev, { ...product, quantity, total: unitPrice * quantity, saleType: 'unit' as const, price: unitPrice }];
    });

    toast.success(`${product.name} ajouté au panier`);
  };

  // Fonction d'ajout au panier par carton
  const addToCartByCarton = (productOrCartItem: Product | CartItem, cartonCount: number = 1) => {
    // Récupérer le produit original depuis la liste des produits pour avoir les prix corrects
    const originalProduct = products.find(p => p.id === productOrCartItem.id);
    const product = originalProduct || productOrCartItem;
    
    if (!product.sell_by_carton || !product.units_per_carton || product.units_per_carton <= 1) {
      toast.error('Ce produit ne peut pas être vendu par carton');
      return;
    }

    const unitsNeeded = cartonCount * product.units_per_carton;

    // Mettre à jour les produits récemment sélectionnés (max 3)
    setRecentlySelected(prev => {
      const filtered = prev.filter(id => id !== product.id);
      return [product.id, ...filtered].slice(0, 3);
    });

    // IMPORTANT: Utiliser le prix du produit ORIGINAL, pas celui du CartItem
    // car le CartItem.price peut être le prix carton déjà calculé
    const originalUnitPrice = originalProduct?.price || product.price;
    const originalPriceCarton = originalProduct?.price_carton || product.price_carton;
    
    const pricePerCarton = (originalPriceCarton && originalPriceCarton > 0)
      ? originalPriceCarton
      : (originalUnitPrice * product.units_per_carton);

    setCart(prev => {
      const unitUnits = prev
        .filter(i => i.id === product.id && i.saleType !== 'carton')
        .reduce((sum, i) => sum + (i.quantity || 0), 0);

      const existingCartonItem = prev.find(item => item.id === product.id && item.saleType === 'carton');

      if (existingCartonItem) {
        const existingCartons = existingCartonItem.quantity / product.units_per_carton;
        const newCartonCount = existingCartons + cartonCount;
        const newUnitsQuantity = newCartonCount * product.units_per_carton;

        if (unitUnits + newUnitsQuantity > product.stock) {
          toast.error('Stock insuffisant');
          return prev;
        }

        return prev.map(item =>
          item.id === product.id && item.saleType === 'carton'
            ? {
                ...item,
                quantity: newUnitsQuantity,
                total: newCartonCount * pricePerCarton,
                displayQuantity: `${newCartonCount} carton(s) (${newUnitsQuantity} unités)`,
              }
            : item
        );
      }

      if (unitUnits + unitsNeeded > product.stock) {
        toast.error(`Stock insuffisant pour ${cartonCount} carton(s).`);
        return prev;
      }

      return [
        ...prev,
        {
          ...product,
          quantity: unitsNeeded,
          total: cartonCount * pricePerCarton,
          saleType: 'carton' as const,
          price: pricePerCarton, // Prix affiché = prix carton
          displayQuantity: `${cartonCount} carton(s) (${unitsNeeded} unités)`,
        },
      ];
    });

    toast.success(`📦 ${cartonCount} carton(s) de ${product.name} ajouté(s)`);
  };

  // Mise à jour de quantité avec recalcul automatique
  const updateQuantity = (productId: string, newQuantity: number, saleType?: 'unit' | 'carton') => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);

    // Empêcher de dépasser le stock en tenant compte des autres lignes (unité/carton)
    const otherUnitsInCart = cart
      .filter(i => i.id === productId && i !== selectedCartItemForQuantity)
      .reduce((sum, i) => sum + (i.quantity || 0), 0);

    if (product && otherUnitsInCart + newQuantity > product.stock) {
      toast.error('Stock insuffisant');
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.id !== productId) return item;
        
        // Pour les ventes carton, calculer le total correctement avec le prix du produit ORIGINAL
        if (item.saleType === 'carton' && product?.units_per_carton) {
          const cartonCount = Math.floor(newQuantity / product.units_per_carton);
          // Utiliser les prix du produit original, pas du cartItem
          const pricePerCarton = (product.price_carton && product.price_carton > 0) 
            ? product.price_carton 
            : (product.price * product.units_per_carton);
          return { 
            ...item, 
            quantity: newQuantity, 
            total: cartonCount * pricePerCarton,
            displayQuantity: `${cartonCount} carton(s) (${newQuantity} unités)`
          };
        }
        
        // Vente unitaire standard - utiliser le prix du produit original
        const unitPrice = product?.price || item.price;
        return { ...item, quantity: newQuantity, total: newQuantity * unitPrice };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    toast.info('Article retiré du panier');
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setReceivedAmount(0);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setDiscountMode('percent');
    toast.info('Panier vidé');
  };

  // Fonctions du pavé numérique - maintenant pour quantité
  const handleNumericInput = (input: string) => {
    if (input === 'clear') {
      setNumericInput('');
      if (keypadMode === 'amount') {
        setReceivedAmount(0);
      }
      return;
    }
    
    if (input === 'enter') {
      if (numericInput) {
        if (keypadMode === 'amount') {
          setReceivedAmount(parseFloat(numericInput));
          toast.success(`Montant saisi: ${numericInput} GNF`);
        } else if (keypadMode === 'quantity' && selectedCartItemForQuantity) {
          const qty = parseInt(numericInput, 10);
          if (qty > 0) {
            const product = products.find(p => p.id === selectedCartItemForQuantity.id);
            if (product && qty <= product.stock) {
              updateQuantity(selectedCartItemForQuantity.id, qty);
              toast.success(`Quantité mise à jour: ${qty}`);
            } else {
              toast.error('Stock insuffisant');
            }
          }
          setSelectedCartItemForQuantity(null);
        }
        setNumericInput('');
        setShowKeypad(false);
      }
      return;
    }
    
    // Empêcher les décimales pour les quantités
    if (keypadMode === 'quantity' && input === '.') return;
    
    setNumericInput(prev => prev + input);
  };

  // Ouvrir le pavé numérique pour modifier la quantité d'un article du panier
  const openQuantityKeypadForCartItem = (item: CartItem) => {
    setSelectedCartItemForQuantity(item);
    setKeypadMode('quantity');
    setNumericInput(item.quantity.toString());
    setShowKeypad(true);
  };

  // Ouvrir le pavé numérique pour le montant reçu
  const openAmountKeypad = () => {
    setKeypadMode('amount');
    setSelectedCartItemForQuantity(null);
    setNumericInput('');
    setShowKeypad(true);
  };

  // Validation de la commande
  const validateOrder = () => {
    if (cart.length === 0) {
      toast.error('Panier vide');
      return;
    }
    setShowOrderSummary(true);
  };

  const processPayment = async () => {
    // Note: Le montant reçu n'est plus obligatoire pour valider

    if (isProcessingPayment) return;
    setIsProcessingPayment(true);

    if (!vendorId) {
      toast.error('Vendeur non identifié');
      setIsProcessingPayment(false);
      return;
    }

    if (!user?.id) {
      toast.error('Utilisateur non connecté');
      setIsProcessingPayment(false);
      return;
    }

    // ✨ NOUVEAU: Vérification mode offline
    const isOffline = !navigator.onLine;
    
    // En mode offline, seuls les paiements en espèces sont autorisés
    if (isOffline && paymentMethod !== 'cash') {
      toast.error('Mode hors ligne: Seuls les paiements en espèces sont disponibles', {
        description: 'Mobile Money et carte bancaire nécessitent une connexion internet.',
        duration: 5000
      });
      setIsProcessingPayment(false);
      return;
    }

    // Validation Mobile Money (seulement si online)
    if (paymentMethod === 'mobile_money') {
      if (!mobileMoneyPhone || mobileMoneyPhone.length !== 9) {
        toast.error('Veuillez entrer un numéro de téléphone valide (9 chiffres)');
        setIsProcessingPayment(false);
        return;
      }

      // Validation provider pour Mobile Money
      const starts = mobileMoneyPhone;
      if (mobileMoneyProvider === 'orange') {
        const ok = starts.startsWith('610') || starts.startsWith('611') || starts.startsWith('62');
        if (!ok) {
          toast.error('Numéro non compatible Orange Money', {
            description: 'Orange Money (GN) commence généralement par 610, 611 ou 62.',
          });
          setIsProcessingPayment(false);
          return;
        }
      }
      if (mobileMoneyProvider === 'mtn') {
        if (!starts.startsWith('66')) {
          toast.error('Numéro non compatible MTN MoMo', {
            description: 'MTN MoMo (GN) commence généralement par 66.',
          });
          setIsProcessingPayment(false);
          return;
        }
      }
    }

    try {
      // Pour Mobile Money, utiliser ChapChapPay (paiement sécurisé)
      if (paymentMethod === 'mobile_money') {
        toast.loading('Initialisation du paiement ChapChapPay...');
        
        // Mapper le provider vers le format ChapChapPay
        const ccpPaymentMethod: CCPPaymentMethod = mobileMoneyProvider === 'orange' ? 'orange_money' : 'mtn_momo';
        
        // Créer la commande d'abord pour avoir l'orderId
        const customerId = await getOrCreateCustomerId();
        if (!customerId) {
          toast.dismiss();
          return;
        }

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            vendor_id: vendorId,
            customer_id: customerId,
            total_amount: total,
            subtotal: subtotal,
            tax_amount: tax,
            discount_amount: discountValue,
            payment_status: 'pending',
            status: 'pending',
            payment_method: paymentMethod,
            shipping_address: { address: 'Point de vente' },
            notes: `Paiement Mobile Money (${mobileMoneyProvider === 'orange' ? 'Orange Money' : 'MTN MoMo'}) - ${mobileMoneyPhone}`,
            source: 'pos'
          })
          .select('id, order_number')
          .single();

        if (orderError) {
          toast.dismiss();
          throw orderError;
        }

        // Créer les items de commande
        const orderItems = cart.map(item => ({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.quantity > 0 ? item.total / item.quantity : item.price,
          total_price: item.total
        }));

        await supabase.from('order_items').insert(orderItems);

        // Initialiser le paiement ChapChapPay sécurisé
        const ccpResult = await initiatePullPayment({
          amount: total,
          currency: 'GNF',
          paymentMethod: ccpPaymentMethod,
          customerPhone: mobileMoneyPhone,
          orderId: order.order_number || order.id,
          description: `Vente POS - ${cart.length} article(s)`,
        });

        toast.dismiss();

        if (!ccpResult.success) {
          console.error('[POS] ChapChapPay payment error:', ccpResult.error);
          toast.error('Erreur lors de l\'initialisation du paiement', {
            description: ccpResult.error || 'Veuillez réessayer',
          });
          // Annuler la commande si le paiement échoue
          await supabase.from('orders').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', order.id);
          return;
        }

        // Mettre à jour la commande avec l'ID de transaction ChapChapPay
        await supabase.from('orders')
          .update({ 
            notes: `Paiement ChapChapPay (${mobileMoneyProvider === 'orange' ? 'Orange Money' : 'MTN MoMo'}) - ${mobileMoneyPhone} - Transaction: ${ccpResult.transactionId}` 
          })
          .eq('id', order.id);

        // Notification: demande de paiement envoyée
        toast.info('Demande de paiement envoyée', {
          description: `Confirmez le paiement sur votre téléphone ${mobileMoneyProvider === 'orange' ? 'Orange Money' : 'MTN MoMo'}.`
        });

        // Polling pour vérifier le statut du paiement
        if (ccpResult.transactionId) {
          toast.loading('En attente de confirmation...', { id: 'payment-polling' });
          
          const finalStatus = await pollStatus(ccpResult.transactionId, async (status) => {
            console.log('[POS] Payment status:', status);
            
            if (status.status === 'success' || status.status === 'completed') {
              toast.dismiss('payment-polling');
              toast.success('🎉 Paiement confirmé !');
              
              // Mettre à jour la commande
              await supabase.from('orders')
                .update({ payment_status: 'paid', status: 'processing' })
                .eq('id', order.id);
              
              setLastOrderNumber(order.order_number || order.id.substring(0, 8).toUpperCase());
              setShowOrderSummary(false);
              setShowReceipt(true);
              clearCart();
              await loadVendorProducts();
            } else if (status.status === 'failed' || status.status === 'cancelled') {
              toast.dismiss('payment-polling');
              toast.error('Paiement échoué ou refusé');
              
              // Marquer la commande comme échouée
              await supabase.from('orders')
                .update({ payment_status: 'failed' })
                .eq('id', order.id);
            }
          });

          toast.dismiss('payment-polling');

          if (!finalStatus || (finalStatus.status !== 'success' && finalStatus.status !== 'completed')) {
            // Paiement non confirmé après le délai
            toast.warning('Paiement en attente', {
              description: 'Le statut du paiement sera mis à jour automatiquement.'
            });
          }
        }

        setLastOrderNumber(order.order_number || order.id.substring(0, 8).toUpperCase());
        setShowOrderSummary(false);
        setCart([]);
        return;
      }

      // Paiement par carte bancaire (Stripe) - Ouvrir le modal
      if (paymentMethod === 'card') {
        try {
          const customerId = await getOrCreateCustomerId();
          if (!customerId) {
            return;
          }

          // Créer la commande en attente
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              vendor_id: vendorId,
              customer_id: customerId,
              total_amount: total,
              subtotal: subtotal,
              tax_amount: tax,
              discount_amount: discountValue,
              payment_status: 'pending',
              status: 'pending',
              payment_method: 'card',
              shipping_address: { address: 'Point de vente' },
              notes: 'Paiement par carte bancaire - En attente',
              source: 'pos'
            })
            .select('id, order_number')
            .single();

          if (orderError) throw orderError;

          // Créer les items de commande
          const orderItems = cart.map(item => ({
            order_id: order.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.quantity > 0 ? item.total / item.quantity : item.price,
            total_price: item.total
          }));
          await supabase.from('order_items').insert(orderItems);

          // Sauvegarder la commande et ouvrir le modal Stripe
          setPendingStripeOrder({ id: order.id, order_number: order.order_number || order.id.substring(0, 8).toUpperCase() });
          setShowStripeModal(true);
          setShowOrderSummary(false);
          return;

        } catch (cardError: any) {
          console.error('Card payment error:', cardError);
          toast.error('Erreur paiement carte', {
            description: cardError.message || 'Veuillez réessayer'
          });
          return;
        }
      }

      // Pour les paiements en espèces, procéder normalement OU en mode offline
      const isOfflinePayment = !navigator.onLine;
      
      // ✨ MODE OFFLINE: Stocker localement pour synchronisation ultérieure
      if (isOfflinePayment) {
        try {
          // Générer un ID local unique pour la commande
          const offlineOrderId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const offlineOrderNumber = `POS-OFF-${Date.now().toString(36).toUpperCase()}`;
          
          // Préparer les données de la vente
          const saleData = {
            type: 'sale',
            vendor_id: vendorId,
            data: {
              offline_order_id: offlineOrderId,
              order_number: offlineOrderNumber,
              total_amount: total,
              subtotal: subtotal,
              tax_amount: tax,
              discount_amount: discountValue,
              payment_method: 'cash',
              payment_status: 'paid',
              status: 'confirmed',
              source: 'pos_offline',
              items: cart.map(item => ({
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.quantity > 0 ? item.total / item.quantity : item.price,
                total_price: item.total
              })),
              sale_date: new Date().toISOString(),
              customer_name: selectedCustomer?.name || 'Client comptoir',
              customer_phone: selectedCustomer?.phone || ''
            }
          };
          
          // Stocker dans IndexedDB via offlineDB
          const { default: offlineDB } = await import('@/lib/offlineDB');
          await offlineDB.initDB();
          await offlineDB.storeEvent(saleData, true);
          
          // Mettre à jour le stock localement (décrémenter)
          setProducts(prevProducts => 
            prevProducts.map(product => {
              const cartItem = cart.find(item => item.id === product.id);
              if (cartItem) {
                return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
              }
              return product;
            })
          );
          
          setLastOrderNumber(offlineOrderNumber);
          setShowOrderSummary(false);
          setShowReceipt(true);
          
          toast.success('✅ Vente enregistrée (mode hors-ligne)', {
            description: 'La vente sera synchronisée automatiquement à la reconnexion.',
            duration: 5000
          });
          
          clearCart();
          setIsProcessingPayment(false);
          return;
          
        } catch (offlineError: any) {
          console.error('Erreur stockage offline:', offlineError);
          toast.error('Erreur lors de l\'enregistrement hors-ligne', {
            description: 'Veuillez réessayer.'
          });
          setIsProcessingPayment(false);
          return;
        }
      }
      
      // Mode ONLINE: procéder normalement avec Supabase
      const customerId = await getOrCreateCustomerId();
      if (!customerId) return;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          vendor_id: vendorId,
          customer_id: customerId,
          total_amount: total,
          subtotal: subtotal,
          tax_amount: tax,
          discount_amount: discountValue,
          payment_status: 'paid',
          status: 'confirmed',
          payment_method: paymentMethod,
          shipping_address: { address: 'Point de vente' },
          notes: `Paiement POS - Espèces`,
          source: 'pos'
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // 3. Créer les items de commande
      // Calcul du vrai prix unitaire (important pour ventes carton: total/quantity)
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.quantity > 0 ? item.total / item.quantity : item.price,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // IMPORTANT: laisser la BDD faire le décrément du stock exactement 1 fois.
      // Le trigger update_inventory_on_order_completion (orders.status -> processing/completed)
      // met à jour inventory.quantity, puis sync_inventory_to_products_trigger synchronise products.stock_quantity.
      await supabase.from('orders').update({ status: 'processing' }).eq('id', order.id);

      // 4. Stock: mis à jour automatiquement par la BDD
      // - Trigger `update_inventory_on_order_trigger` (AFTER INSERT ON order_items) décrémente inventory
      // - Trigger `sync_inventory_to_products_trigger` synchronise products.stock_quantity


      setLastOrderNumber(order.order_number || order.id.substring(0, 8).toUpperCase());
      
      setShowOrderSummary(false);
      setShowReceipt(true);
      
      toast.success('Paiement effectué avec succès!');
      
      await loadVendorProducts();
    } catch (error: any) {
      console.error('Erreur paiement:', error);
      
      // ✨ NOUVEAU: Si erreur réseau, proposer le mode offline
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed')) {
        toast.error('Connexion perdue', {
          description: 'Passez en mode hors-ligne pour continuer les ventes en espèces.',
          duration: 5000
        });
      } else {
        toast.error('Erreur lors du paiement', {
          description: error.message || 'Une erreur est survenue'
        });
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Helper function pour obtenir ou créer un customer
  const getOrCreateCustomerId = async (): Promise<string | null> => {
    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCustomer) {
        return existingCustomer.id;
      }

      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ user_id: user.id })
        .select('id')
        .single();

      if (customerError) throw customerError;
      return newCustomer.id;
    } catch (error: any) {
      console.error('Erreur création customer:', error);
      toast.error('Erreur lors de la création du client');
      return null;
    }
  };

  const handleBarcodeSearch = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      toast.error('Produit non trouvé');
    }
  };

  // Mise à jour de l'horloge
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && barcodeInput) {
        handleBarcodeSearch(barcodeInput);
      }
    };

    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [barcodeInput]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-transparent max-w-full -m-2 sm:-m-3 md:-m-6">
      {/* En-tête professionnel - Compact sur mobile */}
      <div className="border-b border-border/50 flex-shrink-0 w-full max-w-full">
        <div className="flex items-center justify-between p-2 sm:p-3 md:p-6 max-w-full overflow-hidden">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-primary to-primary/80 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="h-5 w-5 md:h-7 md:w-7 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-base md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent truncate max-w-[140px] md:max-w-none">
                {companyName}
              </h1>
              <p className="text-[10px] md:text-sm text-muted-foreground font-medium hidden sm:block">Point de Vente</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Horloge - Desktop only */}
            <div className="hidden md:flex bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-md">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-mono font-bold">{currentTime.toLocaleTimeString('fr-FR')}</div>
                  <div className="text-xs text-muted-foreground">{currentTime.toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            </div>
            
            {/* Dialog des paramètres */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className="shadow-md">
                  <Settings className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">TVA & Config</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Paramètres POS
                  </DialogTitle>
                </DialogHeader>
                
                {settingsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-muted-foreground">Chargement...</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Logo Upload Section */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Logo de l'entreprise</label>
                      <div className="flex items-start gap-4">
                        {/* Aperçu du logo */}
                        <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {settings?.logo_url ? (
                            <img
                              src={settings.logo_url}
                              alt="Logo"
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Upload Button */}
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('Le fichier est trop volumineux (max 2MB)');
                                return;
                              }
                              
                              try {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `pos-logo-${user?.id}-${Date.now()}.${fileExt}`;
                                const filePath = `logos/${fileName}`;
                                
                                const { error: uploadError } = await supabase.storage
                                  .from('documents')
                                  .upload(filePath, file, {
                                    contentType: file.type,
                                    upsert: true
                                  });
                                
                                if (uploadError) throw uploadError;
                                
                                const { data: publicUrlData } = supabase.storage
                                  .from('documents')
                                  .getPublicUrl(filePath);
                                
                                await updateSettings({ logo_url: publicUrlData.publicUrl });
                                toast.success('Logo mis à jour');
                              } catch (error) {
                                console.error('Erreur upload logo:', error);
                                toast.error('Erreur lors du téléchargement du logo');
                              }
                            }}
                            className="cursor-pointer text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            PNG, JPG, SVG • Max: 2 MB
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nom de l'entreprise</label>
                      <Input
                        value={settings?.company_name || ''}
                        onChange={(e) => updateSettings({ company_name: e.target.value })}
                        placeholder="Nom de votre entreprise"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        TVA
                        <Badge variant={taxEnabled ? 'default' : 'secondary'} className="text-xs">
                          {taxEnabled ? 'Activée' : 'Désactivée'}
                        </Badge>
                      </label>
                      <div className="flex items-center gap-3 mb-2">
                        <Button
                          variant={taxEnabled ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateSettings({ tax_enabled: !taxEnabled })}
                          className="flex items-center gap-2"
                        >
                          <Check className={`h-4 w-4 ${taxEnabled ? 'opacity-100' : 'opacity-0'}`} />
                          {taxEnabled ? 'Activée' : 'Désactivée'}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {taxEnabled ? `${(taxRate * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                      {taxEnabled && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={taxRate}
                            onChange={(e) => updateSettings({ tax_rate: parseFloat(e.target.value) || 0 })}
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Format décimal (ex: 0.18 pour 18%)
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Devise</label>
                      <CurrencySelect
                        value={settings?.currency || 'GNF'}
                        onValueChange={(value) => updateSettings({ currency: value })}
                        showFlag={true}
                        showName={false}
                      />
                      {ratesLastUpdated && selectedCurrency !== 'GNF' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Taux mis à jour: {ratesLastUpdated.toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Pied de page des reçus</label>
                      <Textarea
                        value={settings?.receipt_footer || ''}
                        onChange={(e) => updateSettings({ receipt_footer: e.target.value })}
                        placeholder="Merci de votre visite !"
                        className="h-20"
                      />
                    </div>
                    
                <div className="bg-muted/30 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">
                        <strong>TVA:</strong> {taxEnabled ? `${(taxRate * 100).toFixed(1)}%` : 'Désactivée'}<br/>
                    <strong>Devise:</strong> {settings?.currency || 'GNF'}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Mobile: Tabs pour basculer entre Produits et Panier */}
      {isMobile && (
        <div className="bg-card border-b border-border/50 px-2 py-2 sticky top-0 z-30">
          <div className="flex gap-2">
            <Button
              variant={mobileTab === 'products' ? 'default' : 'outline'}
              onClick={() => setMobileTab('products')}
              className="h-10 flex-1"
            >
              <Package className="h-4 w-4 mr-2" />
              Produits
            </Button>
            <Button
              variant={mobileTab === 'cart' ? 'default' : 'outline'}
              onClick={() => setMobileTab('cart')}
              className="h-10 px-4 relative"
            >
              <ShoppingCart className="h-4 w-4" />
              {cart.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className={`flex flex-1 min-h-0 overflow-hidden gap-1 sm:gap-2 md:gap-4 p-1 sm:p-2 md:p-4 w-full max-w-full ${isMobile ? 'flex-col' : ''}`}>
        {/* Section Produits - Design moderne */}
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden space-y-1 sm:space-y-2 md:space-y-4 max-w-full ${isMobile && mobileTab !== 'products' ? 'hidden' : ''}`}>
          {/* Barre de recherche améliorée - Compact sur mobile */}
          <div className="flex-shrink-0 overflow-hidden w-full max-w-full p-2 sm:p-3 md:p-4">
              <div className="flex flex-col gap-2 md:gap-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 text-sm border-2 border-border/50 focus:border-primary/50 bg-background/80"
                    />
                  </div>
                  
                  {/* Bouton Scanner */}
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="h-10 w-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
                    title="Scanner un produit"
                  >
                    <Scan className="h-5 w-5" />
                  </Button>
                  
                  {/* Vue mode - Desktop only */}
                  <div className="hidden md:flex gap-1">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Barre-code - Desktop only */}
                <Input
                  placeholder="Scanner code-barres"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="hidden md:block h-10 text-sm border-2 border-border/50 focus:border-primary/50 bg-background/80"
                />
              </div>
              
              {/* Filtres par catégorie - Scroll horizontal */}
              <div 
                className="flex gap-1.5 md:gap-2 mt-3 md:mt-4 overflow-x-auto pb-2 max-w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {categoriesLoading ? (
                  <div className="text-xs text-muted-foreground">Chargement...</div>
                ) : (
                  <>
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                      className="shadow-sm transition-all duration-200 hover:shadow-md flex-shrink-0 text-xs whitespace-nowrap"
                    >
                      Tous
                    </Button>
                    {categories.map(category => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className="shadow-sm transition-all duration-200 hover:shadow-md flex-shrink-0 text-xs whitespace-nowrap"
                      >
                        {category.name}
                      </Button>
                    ))}
                  </>
                )}
              </div>
            </div>

          {/* Grille de produits professionnelle - Mobile optimisé - Sans fond blanc */}
          <div className="flex-1 overflow-auto min-h-0 min-w-0 max-w-full">
                {productsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <div className="text-muted-foreground text-sm">Chargement...</div>
                    </div>
                  </div>
                ) : sortedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
                    <div className="text-center">
                      <div className="text-sm font-semibold text-muted-foreground mb-1">Aucun produit</div>
                      <div className="text-xs text-muted-foreground">
                        {searchTerm ? 'Modifiez votre recherche' : 'Ajoutez des produits'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 p-1 md:p-2">
                    {sortedProducts.map(product => {
                      const isRecent = recentlySelected.includes(product.id);

                      // Stock restant affiché = stock DB - unités déjà dans le panier (unité + carton)
                      const unitsInCart = cart
                        .filter((i) => i.id === product.id)
                        .reduce((sum, i) => sum + (i.quantity || 0), 0);
                      const remainingStock = Math.max(0, product.stock - unitsInCart);

                      const canSellCarton = !!product.sell_by_carton && !!product.units_per_carton && product.units_per_carton > 1;
                      const cartonsAvailable = canSellCarton ? Math.floor(remainingStock / product.units_per_carton) : 0;
                      const cartonPrice = canSellCarton
                        ? (product.price_carton && product.price_carton > 0
                          ? product.price_carton
                          : product.price * product.units_per_carton)
                        : 0;

                      return (
                        <Card 
                          key={product.id} 
                          className={`group relative cursor-pointer transition-all duration-200 hover:shadow-xl border bg-card active:scale-[0.98] ${
                            isRecent 
                              ? 'border-primary/60 ring-2 ring-primary/20 shadow-lg' 
                              : 'border-border/50 hover:border-primary/40'
                          }`}
                          onClick={() => addToCart(product)}
                        >
                        <CardContent className="p-0 flex flex-col">
                          {/* Image produit - Hauteur fixe pour éviter les débordements */}
                          <div className="relative w-full h-20 md:h-28 bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden flex-shrink-0">
                            {/* Badge stock (restant) */}
                            <div className="absolute top-1 right-1 z-10">
                              <Badge 
                                variant={remainingStock > 10 ? 'default' : remainingStock > 0 ? 'secondary' : 'destructive'} 
                                className="shadow-md font-bold text-[10px] px-1.5 py-0.5"
                              >
                                {remainingStock}
                              </Badge>
                            </div>

                            {/* Badge quantité panier (unités) */}
                            {unitsInCart > 0 && (
                              <div className="absolute top-1 left-1 z-10">
                                <Badge variant="default" className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-primary">
                                  ×{unitsInCart}
                                </Badge>
                              </div>
                            )}

                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Package className="h-8 w-8 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info produit - Très compact sur mobile */}
                          <div className="p-2 md:p-3 space-y-1">
                            {/* Nom produit */}
                            <h3 className="font-semibold text-xs md:text-sm leading-tight line-clamp-2 min-h-[2rem]">
                              {product.name}
                            </h3>
                            
                            {/* Prix unité */}
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm md:text-lg font-bold text-primary">
                                {formatPriceWithCurrency(product.price)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">/unité</span>
                            </div>

                            {/* Prix carton */}
                            {canSellCarton && (
                              <div
                                className={`flex items-baseline gap-1 px-1 py-0.5 rounded ${
                                  cartonsAvailable > 0
                                    ? 'bg-green-50 dark:bg-green-950/30'
                                    : 'bg-muted/40'
                                }`}
                              >
                                <span
                                  className={`text-xs font-bold ${
                                    cartonsAvailable > 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  📦 {formatPriceWithCurrency(cartonsAvailable > 0 ? cartonPrice : 0)}
                                </span>
                                <span
                                  className={`text-[9px] ${
                                    cartonsAvailable > 0
                                      ? 'text-green-600/70 dark:text-green-400/70'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  /{cartonsAvailable > 0 ? product.units_per_carton : 0}u
                                </span>
                              </div>
                            )}

                            {/* Stock disponible (unités + cartons) */}
                            {canSellCarton && (
                              <div className="text-[9px] text-muted-foreground">
                                {cartonsAvailable} cartons dispo
                              </div>
                            )}

                            {/* Boutons d'action - Compact */}
                            <div className="flex flex-col gap-1 pt-1">
                              {/* Ligne 1: Quantité + Unité */}
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const qty = cart.find(item => item.id === product.id && item.saleType !== 'carton')?.quantity || 0;
                                    if (qty > 0) updateQuantity(product.id, qty - 1);
                                  }}
                                  disabled={!cart.find(item => item.id === product.id && item.saleType !== 'carton')}
                                  className="h-4 w-4 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                
                                {/* Bouton pavé numérique pour quantité multiple */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductForQuantity(product);
                                    setShowQuantityKeypad(true);
                                  }}
                                  className="h-4 w-4 p-0 border-primary/30 hover:border-primary hover:bg-primary/10"
                                  title="Saisir quantité"
                                >
                                  <Calculator className="h-3 w-3 text-primary" />
                                </Button>
                                
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product);
                                  }}
                                  className="flex-1 h-4 text-[8px] md:text-xs font-semibold"
                                >
                                  <Plus className="h-3 w-3 mr-0.5" />
                                  Unité
                                </Button>
                              </div>

                              {/* Ligne 2: Bouton Carton (visible même si stock insuffisant) */}
                              {canSellCarton && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (cartonsAvailable > 0) addToCartByCarton(product);
                                  }}
                                  disabled={cartonsAvailable <= 0}
                                  className="w-full h-4 text-[8px] md:text-xs font-semibold bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  📦 +1 Carton ({cartonsAvailable > 0 ? product.units_per_carton : 0}u)
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                )}
          </div>
        </div>

        {/* Section Panier - Interface professionnelle - Responsive optimisé mobile */}
        <div className={`w-full md:w-72 lg:w-[320px] flex-shrink-0 flex flex-col min-w-0 max-w-full md:min-h-0 md:max-h-full ${isMobile && mobileTab !== 'cart' ? 'hidden' : ''}`}>
          {/* Panier - Design ultra compact mobile */}
          <Card className="shadow-xl border-0 bg-card overflow-hidden flex flex-col max-w-full md:flex-1 md:max-h-full">
            {/* En-tête compact */}
            <div className="p-1.5 sm:p-2 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-b border-primary/20 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-md bg-primary/20">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <span className="sr-only">Panier</span>
                  <Badge
                    variant="secondary"
                    className="bg-primary text-primary-foreground font-bold px-1.5 text-[11px] tabular-nums"
                  >
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                                <span className="text-xs sm:text-sm font-black text-primary tabular-nums">
                                  {formatPriceWithCurrency(subtotal)}
                                </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Liste des produits du panier - Zone scrollable optimisée */}
            <div className="overflow-auto p-1.5 sm:p-2 max-h-[180px] md:flex-1 md:max-h-none md:min-h-0">
              <ScrollArea className="h-full">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-muted-foreground font-medium text-sm">Panier vide</p>
                    <p className="text-xs text-muted-foreground/80">Ajoutez des produits</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {cart.map(item => (
                      <div 
                        key={`${item.id}-${item.saleType || 'unit'}`} 
                        className="flex items-center gap-1.5 p-1.5 sm:p-2 bg-background/80 rounded-lg border border-border/30"
                      >
                        {/* Nom + Prix */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[11px] sm:text-xs truncate">
                            {item.saleType === 'carton' && '📦 '}
                            {item.name}
                          </p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                            {formatPriceWithCurrency(item.price)}
                          </p>
                        </div>
                        
                        {/* Contrôles quantité ultra compacts */}
                        <div className="flex items-center bg-muted/40 rounded-md">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Pour carton, décrémenter par unités de carton entier
                              const decrementBy = item.saleType === 'carton' && item.units_per_carton 
                                ? item.units_per_carton 
                                : 1;
                              updateQuantity(item.id, item.quantity - decrementBy);
                            }}
                            className="h-6 w-6 p-0 hover:bg-destructive/20"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-mono font-bold text-xs w-5 text-center">
                            {item.saleType === 'carton' && item.units_per_carton 
                              ? Math.floor(item.quantity / item.units_per_carton)
                              : item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => item.saleType === 'carton' ? addToCartByCarton(item) : addToCart(item)}
                            className="h-6 w-6 p-0 hover:bg-primary/20"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Total + Supprimer */}
                        <div className="flex items-center gap-0.5">
                          <span className="font-bold text-primary text-[10px] sm:text-xs min-w-[40px] text-right">
                            {item.total.toLocaleString()}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeFromCart(item.id)}
                            className="text-muted-foreground hover:text-destructive h-5 w-5 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Section paiement ultra compacte mobile */}
            {cart.length > 0 && (
              <div className="border-t border-primary/20 bg-gradient-to-b from-muted/20 to-background flex-shrink-0 p-2 sm:p-3 space-y-2">
                {/* Remise - Version compacte collapsible */}
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <div className="flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold">Remise</span>
                      {discountValue > 0 && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                          -{formatPriceWithCurrency(discountValue)}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  
                  <div className="mt-2 space-y-2 p-2 bg-muted/20 rounded-lg">
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        variant={discountMode === 'percent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setDiscountMode('percent'); setDiscountAmount(0); }}
                        className="h-7 text-[10px]"
                      >
                        <Percent className="h-3 w-3 mr-1" />%
                      </Button>
                      <Button
                        variant={discountMode === 'amount' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setDiscountMode('amount'); setDiscountPercent(0); }}
                        className="h-7 text-[10px]"
                      >
                        <Euro className="h-3 w-3 mr-1" />GNF
                      </Button>
                    </div>
                    
                    <Input
                      type="number"
                      value={discountMode === 'percent' ? (discountPercent || '') : (discountAmount || '')}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (discountMode === 'percent') {
                          setDiscountPercent(Math.min(100, Math.max(0, val)));
                        } else {
                          setDiscountAmount(Math.min(val, totalBeforeDiscount));
                        }
                      }}
                      className="h-8 text-sm font-bold text-center"
                      placeholder={discountMode === 'percent' ? 'Ex: 10%' : 'Ex: 5000'}
                    />
                  </div>
                </details>
                
                {/* Total et TVA sur une ligne */}
                <div className="flex items-center justify-between py-1.5 border-y border-border/30">
                  <span className="text-[10px] text-muted-foreground">
                    TVA: {formatPriceWithCurrency(tax)}
                  </span>
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-primary">{formatPriceWithCurrency(total)}</span>
                  </div>
                </div>

                {/* Mode de paiement - Espèces, Mobile Money, Carte */}
                <div className="flex gap-1">
                  {[
                    { id: 'cash', icon: Euro, label: 'Espèces' },
                    { id: 'mobile_money', icon: Smartphone, label: 'Mobile' },
                    { id: 'card', icon: Shield, label: 'Carte' },
                  ].map((method) => (
                    <Button
                      key={method.id}
                      variant={paymentMethod === method.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`flex-1 h-8 text-[10px] ${paymentMethod === method.id ? 'shadow-md' : ''}`}
                    >
                      <method.icon className="h-3.5 w-3.5 mr-1" />
                      {method.label}
                    </Button>
                  ))}
                </div>

                {paymentMethod === 'mobile_money' && (
                  <div className="space-y-2 p-2 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <Label className="text-xs font-semibold flex items-center gap-1 text-orange-700 dark:text-orange-400">
                      <Smartphone className="h-3.5 w-3.5" />
                      Paiement Mobile Money
                    </Label>
                    
                    {/* Sélection du provider */}
                    <div className="flex gap-1">
                      <Button 
                        variant={mobileMoneyProvider === 'orange' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setMobileMoneyProvider('orange')}
                        className={`flex-1 h-8 text-[10px] ${mobileMoneyProvider === 'orange' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-300'}`}
                      >
                        🟠 Orange Money
                      </Button>
                      <Button 
                        variant={mobileMoneyProvider === 'mtn' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setMobileMoneyProvider('mtn')}
                        className={`flex-1 h-8 text-[10px] ${mobileMoneyProvider === 'mtn' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'border-yellow-400'}`}
                      >
                        🟡 MTN MoMo
                      </Button>
                    </div>
                    
                    {/* Numéro de téléphone */}
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Numéro de téléphone du client</Label>
                      <Input
                        type="tel"
                        value={mobileMoneyPhone}
                        onChange={(e) => setMobileMoneyPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="Ex: 620123456"
                        className="h-9 text-sm font-mono tracking-wider"
                        maxLength={9}
                      />
                      {mobileMoneyPhone && mobileMoneyPhone.length < 9 && (
                        <p className="text-[10px] text-destructive">Entrez 9 chiffres</p>
                      )}
                    </div>
                    
                    <p className="text-[9px] text-muted-foreground">
                      💡 Le client recevra une demande de paiement sur son téléphone
                    </p>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="space-y-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Label className="text-xs font-semibold flex items-center gap-1 text-blue-700 dark:text-blue-400">
                      <Shield className="h-3.5 w-3.5" />
                      Paiement par carte sécurisé
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      💳 Visa, Mastercard, American Express acceptées
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      🔒 Paiement sécurisé via Stripe
                    </p>
                  </div>
                )}

                {/* Bouton de validation */}
                <Button 
                  onClick={validateOrder}
                  className="w-full h-11 sm:h-12 font-bold text-sm shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Valider • {total.toLocaleString()} GNF
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog de confirmation de commande */}
      <Dialog open={showOrderSummary} onOpenChange={setShowOrderSummary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Confirmation de commande
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{item.total.toLocaleString()} GNF</span>
                  </div>
                ))}
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{subtotal.toLocaleString()} GNF</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA ({taxEnabled ? `${(taxRate * 100).toFixed(1)}%` : 'désactivée'})</span>
                  <span>{tax.toLocaleString()} GNF</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                  <span>TOTAL</span>
                  <span className="text-primary">{total.toLocaleString()} GNF</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/20 p-3 rounded-lg">
              <div className="text-sm">
                <strong>Mode de paiement:</strong> {
                  paymentMethod === 'cash' ? 'Espèces' : 
                  paymentMethod === 'card' ? 'Carte bancaire (Stripe)' :
                  'Mobile Money (ChapChapPay)'
                }
              </div>
              {paymentMethod === 'cash' && receivedAmount > 0 && (
                <div className="text-sm mt-1">
                  <strong>Montant reçu:</strong> {receivedAmount.toLocaleString()} GNF<br/>
                  <strong>Rendu:</strong> {change.toLocaleString()} GNF
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowOrderSummary(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={processPayment} className="flex-1" disabled={isProcessingPayment}>
                <CheckSquare className="h-4 w-4 mr-2" />
                {isProcessingPayment ? 'Traitement...' : 'Confirmer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup pavé numérique - Mode quantité ou montant */}
      <NumericKeypadPopup
        open={showKeypad}
        onOpenChange={setShowKeypad}
        numericInput={numericInput}
        onNumericInput={handleNumericInput}
        receivedAmount={receivedAmount}
        total={total}
        change={change}
        currency={settings?.currency || 'GNF'}
        mode={keypadMode}
        productName={selectedCartItemForQuantity?.name}
        maxQuantity={selectedCartItemForQuantity ? products.find(p => p.id === selectedCartItemForQuantity.id)?.stock : undefined}
      />

      {/* Reçu téléchargeable après paiement */}
      <POSReceipt
        open={showReceipt}
        onClose={() => {
          setShowReceipt(false);
          // Reset après fermeture du reçu
          clearCart();
          setReceivedAmount(0);
          setDiscountPercent(0);
          setDiscountAmount(0);
          setNumericInput('');
        }}
        orderData={{
          orderNumber: lastOrderNumber,
          items: cart,
          subtotal,
          tax,
          taxRate,
          taxEnabled,
          discount: discountValue,
          total,
          paymentMethod,
          receivedAmount,
          change,
          currency: settings?.currency || 'GNF',
          companyName: companyName,
          logoUrl: settings?.logo_url,
          receiptFooter: settings?.receipt_footer
        }}
      />

      {/* Popup pavé numérique pour quantité */}
      <QuantityKeypadPopup
        open={showQuantityKeypad}
        onOpenChange={setShowQuantityKeypad}
        selectedProduct={selectedProductForQuantity}
        onConfirm={(product, quantity) => {
          addToCart(product, quantity);
        }}
        currency={settings?.currency || 'GNF'}
      />

      {/* Modal Scanner Code-barres + Vérification Photo */}
      <BarcodeScannerModal
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        products={products}
        onAddToCart={addToCart}
        onAddToCartByCarton={addToCartByCarton}
      />

      {/* Modal Paiement Stripe - Vrai paiement carte bancaire */}
      {pendingStripeOrder && vendorId && (
        <StripeCardPaymentModal
          isOpen={showStripeModal}
          onClose={() => {
            setShowStripeModal(false);
            // Annuler la commande si le modal est fermé sans paiement
            if (pendingStripeOrder) {
              supabase.from('orders')
                .update({ status: 'cancelled', payment_status: 'cancelled' })
                .eq('id', pendingStripeOrder.id);
              setPendingStripeOrder(null);
            }
          }}
          amount={total}
          currency="GNF"
          orderId={pendingStripeOrder.id}
          sellerId={vendorId}
          description={`Vente POS - ${cart.length} article(s)`}
          onSuccess={async (paymentIntentId) => {
            // Paiement réussi - le webhook Stripe mettra à jour le wallet vendeur
            console.log('✅ Paiement Stripe réussi:', paymentIntentId);
            
            // Ne PAS marquer comme payé ici - le webhook s'en charge
            // Juste mettre à jour le statut pour indiquer que le paiement est en cours de traitement
            await supabase.from('orders')
              .update({ 
                payment_status: 'processing',
                status: 'processing',
                notes: `Paiement Stripe confirmé - Intent: ${paymentIntentId}`
              })
              .eq('id', pendingStripeOrder.id);
            
            setLastOrderNumber(pendingStripeOrder.order_number);
            setShowStripeModal(false);
            setPendingStripeOrder(null);
            setShowReceipt(true);
            clearCart();
            await loadVendorProducts();
          }}
          onError={(error) => {
            console.error('❌ Erreur paiement Stripe:', error);
            toast.error('Paiement échoué', {
              description: error
            });
          }}
        />
      )}
    </div>
  );
}

// Export par défaut pour l'import dynamique
export default POSSystem;