// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  CreditCard, 
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
  ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NumericKeypadPopup } from './pos/NumericKeypadPopup';
import { QuantityKeypadPopup } from './pos/QuantityKeypadPopup';
import { POSReceipt } from './pos/POSReceipt';
import { BarcodeScannerModal } from './pos/BarcodeScannerModal';
import { Scan } from 'lucide-react';

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
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  
  // Récupérer le vendor_id de l'utilisateur connecté
  const [vendorId, setVendorId] = useState<string | null>(null);
  
  useEffect(() => {
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
  }, [user?.id]);
  
  // Charger les produits du vendor depuis la base de données
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // Charger les catégories depuis la base de données
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

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

      setProducts(formattedProducts);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [numericInput, setNumericInput] = useState('');
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [showQuantityKeypad, setShowQuantityKeypad] = useState(false);
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<Product | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [keypadMode, setKeypadMode] = useState<'quantity' | 'amount'>('quantity');
  const [selectedCartItemForQuantity, setSelectedCartItemForQuantity] = useState<CartItem | null>(null);
  
  // États pour personnalisation
  const [companyName] = useState('Vista Commerce Pro');
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
  const total = Math.max(0, totalBeforeDiscount - (totalBeforeDiscount * (discount || 0)) / 100);
  const change = receivedAmount - total;

  // Fonction d'ajout au panier avec calcul automatique (unités)
  const addToCart = (product: Product, quantity: number = 1) => {
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
      const existingItem = prev.find(item => item.id === product.id && item.saleType !== 'carton');
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          toast.error('Stock insuffisant');
          return prev;
        }
        return prev.map(item =>
          item.id === product.id && item.saleType !== 'carton'
            ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
            : item
        );
      }
      return [...prev, { ...product, quantity, total: product.price * quantity, saleType: 'unit' as const }];
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  // Fonction d'ajout au panier par carton
  const addToCartByCarton = (product: Product, cartonCount: number = 1) => {
    if (!product.sell_by_carton || !product.units_per_carton) {
      toast.error('Ce produit ne peut pas être vendu par carton');
      return;
    }

    const unitsNeeded = cartonCount * product.units_per_carton;
    if (product.stock < unitsNeeded) {
      toast.error(`Stock insuffisant pour ${cartonCount} carton(s). Stock disponible: ${product.stock} unités (${Math.floor(product.stock / product.units_per_carton)} cartons)`);
      return;
    }

    // Mettre à jour les produits récemment sélectionnés (max 3)
    setRecentlySelected(prev => {
      const filtered = prev.filter(id => id !== product.id);
      return [product.id, ...filtered].slice(0, 3);
    });

    const pricePerCarton = product.price_carton || (product.price * product.units_per_carton);

    setCart(prev => {
      const existingCartonItem = prev.find(item => item.id === product.id && item.saleType === 'carton');
      if (existingCartonItem) {
        const newCartonCount = (existingCartonItem.quantity / product.units_per_carton) + cartonCount;
        const newUnitsQuantity = newCartonCount * product.units_per_carton;
        if (newUnitsQuantity > product.stock) {
          toast.error('Stock insuffisant');
          return prev;
        }
        return prev.map(item =>
          item.id === product.id && item.saleType === 'carton'
            ? { 
                ...item, 
                quantity: newUnitsQuantity, 
                total: newCartonCount * pricePerCarton,
                displayQuantity: `${newCartonCount} carton(s) (${newUnitsQuantity} unités)`
              }
            : item
        );
      }
      return [...prev, { 
        ...product, 
        quantity: unitsNeeded, 
        total: cartonCount * pricePerCarton, 
        saleType: 'carton' as const,
        price: pricePerCarton, // Prix affiché = prix carton
        displayQuantity: `${cartonCount} carton(s) (${unitsNeeded} unités)`
      }];
    });
    
    toast.success(`📦 ${cartonCount} carton(s) de ${product.name} ajouté(s)`);
  };

  // Mise à jour de quantité avec recalcul automatique
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && newQuantity > product.stock) {
      toast.error('Stock insuffisant');
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
          : item
      )
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

    if (!vendorId) {
      toast.error('Vendeur non identifié');
      return;
    }

    if (!user?.id) {
      toast.error('Utilisateur non connecté');
      return;
    }

    try {
      // 1. Vérifier/créer un enregistrement customer pour l'utilisateur
      let customerId: string;
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Créer un nouveau customer pour les ventes POS
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            user_id: user.id
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // 2. Créer la commande
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          vendor_id: vendorId,
          customer_id: customerId,
          total_amount: total,
          subtotal: subtotal,
          tax_amount: tax,
          discount_amount: (totalBeforeDiscount * (discount || 0)) / 100,
          payment_status: 'paid',
          status: 'confirmed',
          payment_method: paymentMethod,
          shipping_address: { address: 'Point de vente' },
          notes: `Paiement POS - ${paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'card' ? 'Carte' : 'Mobile'}`,
          source: 'pos'  // Identifier cette commande comme une vente POS
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // 3. Créer les items de commande
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 4. Mettre à jour le stock pour chaque produit
      for (const item of cart) {
        // Vérifier d'abord dans inventory
        const { data: inventoryItem } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.id)
          .maybeSingle();

        if (inventoryItem) {
          // Mettre à jour inventory
          const newQuantity = Math.max(0, inventoryItem.quantity - item.quantity);
          await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', inventoryItem.id);
        }

        // Mettre à jour aussi products.stock_quantity
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .maybeSingle();

        if (product) {
          const newStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
          await supabase
            .from('products')
            .update({ 
              stock_quantity: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id);
        }
      }

      // Sauvegarder le numéro de commande pour le reçu
      setLastOrderNumber(order.order_number || order.id.substring(0, 8).toUpperCase());
      
      // Afficher le reçu
      setShowOrderSummary(false);
      setShowReceipt(true);
      
      toast.success('Paiement effectué avec succès!');
      
      // Recharger la liste des produits pour refléter le stock
      await loadVendorProducts();
    } catch (error: any) {
      console.error('Erreur paiement:', error);
      toast.error('Erreur lors du paiement', {
        description: error.message || 'Une erreur est survenue'
      });
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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* En-tête professionnel - Compact sur mobile */}
      <div className="bg-gradient-to-r from-primary/5 via-card to-primary/5 border-b border-border/50 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between p-3 md:p-6 max-w-full overflow-hidden">
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
                {settings?.company_name || companyName}
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
                      <Select 
                        value={settings?.currency || 'GNF'} 
                        onValueChange={(value) => updateSettings({ currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GNF">GNF</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
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
              className={`h-10 relative px-3 transition-all duration-200 ${
                mobileTab === 'cart' 
                  ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' 
                  : 'hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <ShoppingCart className={`h-4 w-4 mr-1 ${mobileTab === 'cart' ? 'text-white' : 'text-primary'}`} />
              <span className="font-semibold text-sm">Panier</span>
              {cart.length > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-orange-500 to-red-500 border-2 border-background shadow-md">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className={`flex flex-1 min-h-0 overflow-hidden gap-2 md:gap-4 p-2 md:p-4 w-full max-w-full ${isMobile ? 'flex-col' : ''}`}>
        {/* Section Produits - Design moderne */}
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden space-y-2 md:space-y-4 ${isMobile && mobileTab !== 'products' ? 'hidden' : ''}`}>
          {/* Barre de recherche améliorée - Compact sur mobile */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm flex-shrink-0 overflow-hidden">
            <CardContent className="p-3 md:p-6 overflow-hidden">
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
              
              {/* Filtres par catégorie - Scroll horizontal sur mobile */}
              {/* Filtres par catégorie - Limité à 6 catégories principales */}
              <div className="flex gap-1.5 md:gap-2 mt-3 md:mt-4 overflow-x-auto pb-1 scrollbar-hide max-w-full">
                {categoriesLoading ? (
                  <div className="text-xs text-muted-foreground">Chargement...</div>
                ) : (
                  <>
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                      className="shadow-sm transition-all duration-200 hover:shadow-md flex-shrink-0 text-xs"
                    >
                      Tous
                    </Button>
                    {categories
                      .filter(cat => ['Alimentation', 'Animalerie', 'Audio', 'Automobile', 'Beauté & Santé'].includes(cat.name))
                      .slice(0, 5)
                      .map(category => (
                        <Button
                          key={category.id}
                          variant={selectedCategory === category.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedCategory(category.id)}
                          className="shadow-sm transition-all duration-200 hover:shadow-md flex-shrink-0 text-xs"
                        >
                          {category.name}
                        </Button>
                      ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grille de produits professionnelle - Mobile optimisé */}
          <Card className="flex-1 shadow-lg border-0 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm overflow-hidden min-h-0 min-w-0">
            <CardContent className="p-2 md:p-4 h-full overflow-hidden">
              <ScrollArea className="h-full w-full">
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
                  <div className="grid grid-cols-3 gap-2 md:gap-3 p-1 md:p-2">
                    {sortedProducts.map(product => {
                      const isRecent = recentlySelected.includes(product.id);
                      return (
                        <Card 
                          key={product.id} 
                          className={`group relative cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-xl border bg-card/95 active:scale-[0.98] ${
                            isRecent 
                              ? 'border-primary/60 ring-2 ring-primary/20 shadow-lg' 
                              : 'border-border/50 hover:border-primary/40'
                          }`}
                          onClick={() => addToCart(product)}
                        >
                        <CardContent className="p-0">
                          {/* Image produit - Compact sur mobile */}
                          <div className="relative w-full aspect-square md:h-32 bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
                            {/* Badge stock */}
                            <div className="absolute top-1 right-1 z-10">
                              <Badge 
                                variant={product.stock > 10 ? 'default' : product.stock > 0 ? 'secondary' : 'destructive'} 
                                className="shadow-md font-bold text-[10px] px-1.5 py-0.5"
                              >
                                {product.stock}
                              </Badge>
                            </div>

                            {/* Badge quantité panier */}
                            {cart.find(item => item.id === product.id) && (
                              <div className="absolute top-1 left-1 z-10">
                                <Badge variant="default" className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-primary">
                                  ×{cart.find(item => item.id === product.id)?.quantity}
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
                                <Package className="h-10 w-10 text-muted-foreground/40" />
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
                                {product.price.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground">GNF/unité</span>
                            </div>

                            {/* Prix carton si disponible */}
                            {product.sell_by_carton && product.price_carton && product.units_per_carton && (
                              <div className="flex items-baseline gap-1 bg-green-50 dark:bg-green-950/30 px-1 py-0.5 rounded">
                                <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                  📦 {product.price_carton.toLocaleString()}
                                </span>
                                <span className="text-[9px] text-green-600/70 dark:text-green-400/70">
                                  GNF/{product.units_per_carton}u
                                </span>
                              </div>
                            )}

                            {/* Stock disponible (unités + cartons) */}
                            {product.sell_by_carton && product.units_per_carton && (
                              <div className="text-[9px] text-muted-foreground">
                                {Math.floor(product.stock / product.units_per_carton)} cartons dispo
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
                                  className="h-7 w-7 p-0"
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
                                  className="h-7 w-7 p-0 border-primary/30 hover:border-primary hover:bg-primary/10"
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
                                  className="flex-1 h-7 text-[10px] md:text-xs font-semibold"
                                >
                                  <Plus className="h-3 w-3 mr-0.5" />
                                  Unité
                                </Button>
                              </div>

                              {/* Ligne 2: Bouton Carton si disponible */}
                              {product.sell_by_carton && product.units_per_carton && product.stock >= product.units_per_carton && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCartByCarton(product);
                                  }}
                                  className="w-full h-7 text-[10px] md:text-xs font-semibold bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400"
                                >
                                  📦 +1 Carton ({product.units_per_carton}u)
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
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Section Panier - Interface professionnelle - Responsive */}
        <div className={`w-full md:w-96 lg:w-[400px] flex-shrink-0 flex flex-col min-h-0 min-w-0 overflow-hidden ${isMobile && mobileTab !== 'cart' ? 'hidden' : ''}`}>
          {/* Panier Ultra Professionnel */}
          <Card className="flex-1 shadow-2xl border-0 bg-gradient-to-br from-card via-card/95 to-background/90 backdrop-blur-lg overflow-hidden flex flex-col min-h-0 min-w-0">
            {/* En-tête du panier avec statistiques */}
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b border-border/30">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                  </div>
                  <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent font-bold">
                    Panier ({cart.length})
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
              
              {/* Statistiques rapides */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gradient-to-br from-primary/5 to-primary/2 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">Articles</div>
                  <div className="font-bold text-sm">{cart.reduce((sum, item) => sum + item.quantity, 0)}</div>
                </div>
                <div className="bg-gradient-to-br from-accent/5 to-accent/2 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">Sous-total</div>
                  <div className="font-bold text-sm">{subtotal.toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-secondary/5 to-secondary/2 rounded-lg p-2 text-center">
                  <div className="text-xs text-muted-foreground">TVA</div>
                  <div className="font-bold text-sm">{tax.toLocaleString()}</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-2 md:p-4 flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full max-h-[35vh] md:max-h-[40vh]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-4">
                    <ShoppingBag className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground/40 mb-2" />
                    <p className="text-muted-foreground font-medium text-sm">Panier vide</p>
                    <p className="text-xs text-muted-foreground/80">Ajoutez des produits</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {cart.map(item => (
                      <Card key={`${item.id}-${item.saleType || 'unit'}`} className="bg-background/80 border border-border/50">
                        <CardContent className="p-1.5 md:p-2">
                          <div className="flex justify-between items-center gap-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-[11px] md:text-xs line-clamp-1">
                                {item.saleType === 'carton' && '📦 '}
                                {item.name}
                              </h4>
                              <p className="text-[9px] md:text-[10px] text-muted-foreground">
                                {item.price.toLocaleString()} GNF
                                {item.saleType === 'carton' && (
                                  <span className="ml-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1 rounded">Carton</span>
                                )}
                              </p>
                            </div>
                            
                            {/* Contrôles quantité compacts */}
                            <div className="flex items-center gap-0.5 bg-muted/30 rounded-md px-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-mono font-bold text-xs min-w-[1.5rem] text-center">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => item.saleType === 'carton' ? addToCartByCarton(item) : addToCart(item)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Total + Actions */}
                            <div className="flex items-center gap-1">
                              <div className="font-bold text-primary text-[10px] md:text-xs min-w-[50px] text-right">
                                {item.total.toLocaleString()}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openQuantityKeypadForCartItem(item)}
                                className="h-5 w-5 p-0 border-primary/30"
                                title="Saisir quantité"
                              >
                                <Calculator className="h-2.5 w-2.5 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeFromCart(item.id)}
                                className="text-muted-foreground hover:text-destructive h-5 w-5 p-0"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            {/* Section totaux et paiement - Compact sur mobile */}
            {cart.length > 0 && (
              <div className="border-t border-border/30 bg-gradient-to-r from-primary/5 via-background/90 to-secondary/5 flex-shrink-0 overflow-y-auto max-h-[50vh]">
                <div className="p-3 md:p-4 space-y-3">
                  {/* Calculs détaillés */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs md:text-sm">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span className="font-mono">{subtotal.toLocaleString()} GNF</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs md:text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        TVA
                        <Badge variant={taxEnabled ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                          {taxEnabled ? 'ON' : 'OFF'}
                        </Badge>
                      </span>
                      <span className="font-mono">{tax.toLocaleString()} GNF</span>
                    </div>

                    {/* Bouton Remise */}
                    <div className="flex justify-between items-center text-xs md:text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Remise
                        <Badge variant={discount > 0 ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">
                          {discount}%
                        </Badge>
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDiscount(Math.max(0, discount - 5))}
                          disabled={discount <= 0}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-14 h-6 text-xs text-center font-mono"
                          min={0}
                          max={100}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDiscount(Math.min(100, discount + 5))}
                          disabled={discount >= 100}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <Separator className="my-1" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm md:text-lg font-bold">TOTAL</span>
                      <span className="text-lg md:text-2xl font-bold text-primary font-mono">{total.toLocaleString()} GNF</span>
                    </div>
                  </div>

                  {/* Sélection du mode de paiement */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Mode de paiement</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('cash')}
                        className="text-xs"
                      >
                        <Euro className="h-3 w-3 mr-1" />
                        Espèces
                      </Button>
                      <Button
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('card')}
                        className="text-xs"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Carte
                      </Button>
                      <Button
                        variant={paymentMethod === 'mobile' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('mobile')}
                        className="text-xs"
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Mobile
                      </Button>
                    </div>
                  </div>

                  {/* Saisie montant reçu pour espèces avec bouton pavé numérique */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Montant reçu</label>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={numericInput || receivedAmount || ''}
                            readOnly
                            placeholder="0"
                            className="flex-1 text-right text-xl font-mono font-bold"
                          />
                          {/* Bouton pavé numérique pour montant */}
                          <Button
                            variant="outline"
                            onClick={openAmountKeypad}
                            className="h-12 w-12 p-0 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 hover:border-primary hover:bg-primary/20 transition-all shadow-md"
                          >
                            <Calculator className="h-5 w-5 text-primary" />
                          </Button>
                        </div>
                        {receivedAmount > 0 && (
                          <div className={`text-sm mt-2 px-3 py-2 rounded-lg ${
                            change >= 0 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            Rendu: <span className="font-bold">{change.toLocaleString()} GNF</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Formulaire carte bancaire */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                      <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <CreditCard className="h-4 w-4" />
                        Informations de la carte
                      </label>
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Nom sur la carte"
                          className="h-10"
                        />
                        <Input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className="h-10 font-mono text-lg tracking-wider"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="text"
                            placeholder="MM/AA"
                            maxLength={5}
                            className="h-10 font-mono"
                          />
                          <Input
                            type="text"
                            placeholder="CVV"
                            maxLength={4}
                            className="h-10 font-mono"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" />
                        Paiement sécurisé par Visa/Mastercard
                      </p>
                    </div>
                  )}

                  {/* Formulaire Mobile Money */}
                  {paymentMethod === 'mobile' && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                      <label className="text-sm font-semibold flex items-center gap-2 text-primary">
                        <Smartphone className="h-4 w-4" />
                        Paiement Mobile Money
                      </label>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-12 border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                          >
                            <span className="text-orange-500 font-bold">Orange Money</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-12 border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                          >
                            <span className="text-yellow-600 font-bold">MTN MoMo</span>
                          </Button>
                        </div>
                        <Input
                          type="tel"
                          placeholder="6XX XXX XXX"
                          maxLength={12}
                          className="h-12 text-lg font-mono tracking-wider"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Entrez le numéro du client pour recevoir la demande de paiement
                      </p>
                    </div>
                  )}

                  {/* Bouton de validation - Sans condition de montant obligatoire */}
                  <Button 
                    onClick={validateOrder}
                    className="w-full h-12 text-lg font-bold shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
                  >
                    <CheckSquare className="h-5 w-5 mr-2" />
                    Valider - {total.toLocaleString()} GNF
                  </Button>
                </div>
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
                  paymentMethod === 'card' ? 'Carte bancaire' : 'Paiement mobile'
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
              <Button onClick={processPayment} className="flex-1">
                <CheckSquare className="h-4 w-4 mr-2" />
                Confirmer
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
          setDiscount(0);
          setNumericInput('');
        }}
        orderData={{
          orderNumber: lastOrderNumber,
          items: cart,
          subtotal,
          tax,
          taxRate,
          taxEnabled,
          discount,
          total,
          paymentMethod,
          receivedAmount,
          change,
          currency: settings?.currency || 'GNF',
          companyName: settings?.company_name || 'Vista Commerce Pro',
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
    </div>
  );
}

// Export par défaut pour l'import dynamique
export default POSSystem;