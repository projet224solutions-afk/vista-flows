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
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  category: string;
  categoryId?: string | null;
  stock: number;
  barcode?: string;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
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
          categories(id, name)
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
        images: p.images || []
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
  
  // États pour personnalisation
  const [companyName] = useState('Vista Commerce Pro');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculs automatiques avec TVA dynamique
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxRate = settings?.tax_rate || 0.18;
  const taxEnabled = settings?.tax_enabled ?? true;
  const tax = taxEnabled ? subtotal * taxRate : 0;
  const totalBeforeDiscount = subtotal + tax;
  const total = Math.max(0, totalBeforeDiscount - (totalBeforeDiscount * (discount || 0)) / 100);
  const change = receivedAmount - total;

  // Fonction d'ajout au panier avec calcul automatique
  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) {
      toast.error('Produit en rupture de stock');
      return;
    }

    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          toast.error('Stock insuffisant');
          return prev;
        }
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
            : item
        );
      }
      return [...prev, { ...product, quantity, total: product.price * quantity }];
    });
    
    toast.success(`${product.name} ajouté au panier`);
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

  // Fonctions du pavé numérique
  const handleNumericInput = (input: string) => {
    if (input === 'clear') {
      setNumericInput('');
      setReceivedAmount(0);
      toast.info('Montant effacé');
      return;
    }
    
    if (input === 'enter') {
      if (numericInput) {
        setReceivedAmount(parseFloat(numericInput));
        toast.success(`Montant saisi: ${numericInput} GNF`);
        setNumericInput('');
      }
      return;
    }
    
    setNumericInput(prev => prev + input);
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
    if (paymentMethod === 'cash' && receivedAmount < total) {
      toast.error('Montant insuffisant');
      return;
    }

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
          notes: `Paiement POS - ${paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'card' ? 'Carte' : 'Mobile'}`
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

      toast.success('Paiement effectué avec succès!', {
        description: `Commande ${order.order_number || '#' + order.id.substring(0, 8)} de ${total.toFixed(0)} ${settings?.currency || 'GNF'} validée`
      });

      clearCart();
      setShowOrderSummary(false);
      setReceivedAmount(0);
      setDiscount(0);
      setNumericInput('');
      
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* En-tête professionnel */}
      <div className="bg-gradient-to-r from-primary/5 via-card to-primary/5 border-b border-border/50 shadow-lg">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Building className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {settings?.company_name || companyName}
              </h1>
              <p className="text-muted-foreground font-medium">Système Point de Vente Professionnel</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Statistiques temps réel */}
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-md">
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
                <Button variant="outline" className="shadow-md">
                  <Settings className="h-4 w-4 mr-2" />
                  TVA & Config
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
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

      <div className="flex flex-1 min-h-0 gap-4 p-4">
        {/* Section Produits - Design moderne */}
        <div className="flex-1 flex flex-col space-y-4">
          {/* Barre de recherche améliorée */}
          <Card className="shadow-lg border-0 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 text-base border-2 border-border/50 focus:border-primary/50 bg-background/80"
                  />
                </div>
                
                <Input
                  placeholder="Scanner code-barres"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="lg:w-56 h-12 text-base border-2 border-border/50 focus:border-primary/50 bg-background/80"
                />
                
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setViewMode('grid')}
                    className="shadow-md"
                  >
                    <Grid3X3 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setViewMode('list')}
                    className="shadow-md"
                  >
                    <List className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              {/* Filtres par catégorie */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {categoriesLoading ? (
                  <div className="text-sm text-muted-foreground">Chargement des catégories...</div>
                ) : (
                  <>
                    <Button
                      variant={selectedCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                      className="shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      Tous les produits
                    </Button>
                    {categories.map(category => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className="shadow-sm transition-all duration-200 hover:shadow-md"
                      >
                        {category.name}
                      </Button>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grille de produits professionnelle */}
          <Card className="flex-1 shadow-lg border-0 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
            <CardContent className="p-6 h-full">
              <ScrollArea className="h-full">
                {productsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <div className="text-muted-foreground">Chargement des produits du marketplace...</div>
                    </div>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-muted-foreground mb-2">Aucun produit disponible</div>
                      <div className="text-sm text-muted-foreground">
                        {searchTerm || selectedCategory !== 'all' 
                          ? 'Essayez de modifier vos critères de recherche' 
                          : 'Les produits du marketplace apparaîtront ici'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                    {filteredProducts.map(product => (
                      <Card 
                        key={product.id} 
                        className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-2xl border-2 border-border/50 hover:border-primary/40 bg-card/95 backdrop-blur-sm hover:-translate-y-1"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-0">
                          {/* Image produit moderne */}
                          <div className="relative w-full h-40 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden border-b-2 border-border/30">
                            {/* Badge stock flottant */}
                            <div className="absolute top-2 right-2 z-10">
                              <Badge 
                                variant={product.stock > 10 ? 'default' : product.stock > 0 ? 'secondary' : 'destructive'} 
                                className="shadow-lg font-bold text-xs px-2.5 py-0.5"
                              >
                                {product.stock}
                              </Badge>
                            </div>

                            {/* Image du produit ou icône */}
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors duration-500" />
                                  <Package className="relative h-16 w-16 text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-300" />
                                </div>
                              </div>
                            )}

                            {/* Overlay gradient au survol */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          
                          {/* Contenu compact et professionnel */}
                          <div className="p-4 space-y-3">
                            {/* Catégorie compacte */}
                            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                              {product.category}
                            </Badge>

                            {/* Nom du produit */}
                            <h3 className="font-bold text-base leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors duration-200">
                              {product.name}
                            </h3>
                            
                            {/* Prix prominent */}
                            <div className="flex items-baseline gap-1.5 justify-between">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-primary">
                                  {product.price.toLocaleString()}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground">
                                  GNF
                                </span>
                              </div>
                              
                              {/* Quantité dans le panier */}
                              {cart.find(item => item.id === product.id) && (
                                <Badge variant="secondary" className="font-mono font-bold">
                                  ×{cart.find(item => item.id === product.id)?.quantity}
                                </Badge>
                              )}
                            </div>
                            
                            <Separator className="my-2" />

                            {/* Actions compactes */}
                            <div className="grid grid-cols-5 gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(product.id, (cart.find(item => item.id === product.id)?.quantity || 0) - 1);
                                }}
                                disabled={!cart.find(item => item.id === product.id)}
                                className="h-9 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                className="col-span-3 h-9 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg font-semibold"
                              >
                                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                                Ajouter
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                className="h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                              >
                                <Plus className="h-4 w-4" />
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
          </Card>
        </div>

        {/* Section Panier - Interface professionnelle */}
        <div className="w-96 flex flex-col space-y-4">
          {/* Panier Ultra Professionnel */}
          <Card className="flex-1 shadow-2xl border-0 bg-gradient-to-br from-card via-card/95 to-background/90 backdrop-blur-lg">
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

            <CardContent className="p-4 flex-1">
              <ScrollArea className="h-96">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mb-4" />
                    <p className="text-muted-foreground font-medium">Panier vide</p>
                    <p className="text-sm text-muted-foreground/80">Ajoutez des produits pour commencer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <Card key={item.id} className="bg-gradient-to-r from-background/80 to-background/60 border border-border/50 transition-all duration-200 hover:shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm line-clamp-2 mb-1">{item.name}</h4>
                              <p className="text-xs text-muted-foreground mb-2">{item.price.toLocaleString()} GNF × {item.quantity}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeFromCart(item.id)}
                              className="text-muted-foreground hover:text-destructive ml-2 h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center bg-muted/30 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="mx-2 font-mono font-bold text-sm min-w-[2rem] text-center">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => addToCart(item)}
                                className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="font-bold text-primary text-right">
                              {item.total.toLocaleString()} GNF
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>

            {/* Section totaux et paiement */}
            {cart.length > 0 && (
              <div className="border-t border-border/30 bg-gradient-to-r from-primary/5 via-background/90 to-secondary/5 backdrop-blur-sm">
                <div className="p-6 space-y-4">
                  {/* Calculs détaillés */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span className="font-mono">{subtotal.toLocaleString()} GNF</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        TVA {taxEnabled && `(${(taxRate * 100).toFixed(1)}%)`}
                        <Badge variant={taxEnabled ? 'default' : 'secondary'} className="text-xs px-1.5 py-0.5">
                          {taxEnabled ? 'ON' : 'OFF'}
                        </Badge>
                      </span>
                      <span className="font-mono">{tax.toLocaleString()} GNF</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">TOTAL</span>
                      <span className="text-2xl font-bold text-primary font-mono">{total.toLocaleString()} GNF</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-sm text-muted-foreground">Remise (%)</label>
                      <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-24" />
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

                  {/* Saisie montant reçu pour espèces avec pavé numérique */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Montant reçu</label>
                        <Input
                          type="text"
                          value={numericInput || receivedAmount || ''}
                          readOnly
                          placeholder="0"
                          className="mb-2 text-right text-xl font-mono font-bold"
                        />
                        {receivedAmount > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Rendu: <span className={change >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {change.toLocaleString()} GNF
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Pavé numérique (Calculatrice) */}
                      <div className="bg-muted/20 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Pavé numérique
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', '.'].map((num) => (
                            <Button
                              key={num}
                              variant="outline"
                              size="sm"
                              onClick={() => handleNumericInput(num)}
                              className="h-10 text-base font-bold hover:bg-primary/10"
                            >
                              {num}
                            </Button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleNumericInput('clear')}
                            className="h-10 text-destructive hover:bg-destructive/10"
                          >
                            Effacer
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleNumericInput('enter')}
                            className="h-10 bg-primary"
                          >
                            Valider
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bouton de validation */}
                  <Button 
                    onClick={validateOrder}
                    className="w-full h-12 text-lg font-bold shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
                    disabled={paymentMethod === 'cash' && receivedAmount < total}
                  >
                    <CheckSquare className="h-5 w-5 mr-2" />
                    Valider la commande - {total.toLocaleString()} GNF
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
    </div>
  );
}

// Export par défaut pour l'import dynamique
export default POSSystem;