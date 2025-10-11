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
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { usePOSSettings } from '@/hooks/usePOSSettings';
import { useProducts } from '@/hooks/useSupabaseQuery';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
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
  const { user } = useAuth();
  
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
  
  // Charger tous les produits actifs du marketplace (sans filtrer par vendor)
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useProducts();
  
  // Transformer les données des produits pour le format POS
  const products = productsData?.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category_id || 'Divers',
    stock: p.stock_quantity || 0,
    barcode: p.barcode,
    images: p.images
  })) || [];
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [numericInput, setNumericInput] = useState('');
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  
  // États pour personnalisation
  const [companyName] = useState('Vista Commerce Pro');
  const [currentTime, setCurrentTime] = useState(new Date());

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculs automatiques avec TVA dynamique
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxRate = settings?.tax_rate || 0.18;
  const taxEnabled = settings?.tax_enabled ?? true;
  const tax = taxEnabled ? subtotal * taxRate : 0;
  const total = subtotal + tax;
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

    try {
      // 1) Créer la commande
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          vendor_id: vendorId,
          total_amount: total,
          payment_status: 'paid',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      if (orderErr) throw orderErr;

      // 2) Insérer les items
      const itemsPayload = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.total
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      // 3) Décrémenter le stock (priorité: table inventory, sinon products)
      for (const item of cart) {
        // a) Essayer sur inventory.quantity (si schéma inventaire est utilisé)
        try {
          const { data: invRow, error: invSelErr } = await supabase
            .from('inventory')
            .select('id, quantity')
            .eq('product_id', item.id)
            .limit(1)
            .maybeSingle();
          if (!invSelErr && invRow) {
            const nextQty = Math.max(0, Number(invRow.quantity || 0) - item.quantity);
            const { error: invUpdErr } = await supabase
              .from('inventory')
              .update({ quantity: nextQty })
              .eq('id', invRow.id);
            if (invUpdErr) throw invUpdErr;
            continue; // inventory géré, passe au suivant
          }
        } catch (_) {
          // ignore, fallback to products
        }

        // b) Fallback: products.stock_quantity
        const { data: prod } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();
        const current = Number((prod as any)?.stock_quantity || 0);
        const next = Math.max(0, current - item.quantity);
        const { error: upErr } = await supabase
          .from('products')
          .update({ stock_quantity: next, updated_at: new Date().toISOString() })
          .eq('id', item.id);
        if (upErr) throw upErr;
      }

      toast.success('Paiement effectué avec succès!', {
        description: `Commande de ${total.toFixed(0)} FCFA validée`
      });

      clearCart();
      setShowOrderSummary(false);
      setReceivedAmount(0);
      // Recharger la liste des produits pour refléter le stock
      await refetchProducts?.();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'enregistrement de la vente');
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
                        <strong>Devise:</strong> {settings?.currency || 'FCFA'}
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
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    {category === 'all' ? 'Tous les produits' : category}
                  </Button>
                ))}
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
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(product => (
                      <Card 
                        key={product.id} 
                        className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 border-border/30 hover:border-primary/40 bg-gradient-to-br from-card via-card/95 to-card/90"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4 text-center space-y-3">
                          <div className="w-full h-32 bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 rounded-lg flex items-center justify-center group-hover:from-primary/10 group-hover:to-primary/5 transition-all duration-300">
                            <Smartphone className="h-14 w-14 text-muted-foreground/60 group-hover:text-primary/60 transition-colors" />
                          </div>
                          
                          <div>
                            <h3 className="font-bold text-sm mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                              {product.name}
                            </h3>
                            <p className="text-2xl font-bold text-primary mb-3">{product.price.toLocaleString()} GNF</p>
                            
                            <Badge 
                              variant={product.stock > 10 ? 'default' : 'destructive'} 
                              className="mb-3 w-full justify-center"
                            >
                              Stock: {product.stock}
                            </Badge>
                            
                            <div className="flex justify-between items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(product.id, (cart.find(item => item.id === product.id)?.quantity || 0) - 1);
                                }}
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              
                              <span className="font-mono font-bold text-lg px-2">
                                {cart.find(item => item.id === product.id)?.quantity || 0}
                              </span>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
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
                              <p className="text-xs text-muted-foreground mb-2">{item.price.toLocaleString()} FCFA × {item.quantity}</p>
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
                              {item.total.toLocaleString()} FCFA
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
                      <span className="font-mono">{subtotal.toLocaleString()} FCFA</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        TVA {taxEnabled && `(${(taxRate * 100).toFixed(1)}%)`}
                        <Badge variant={taxEnabled ? 'default' : 'secondary'} className="text-xs px-1.5 py-0.5">
                          {taxEnabled ? 'ON' : 'OFF'}
                        </Badge>
                      </span>
                      <span className="font-mono">{tax.toLocaleString()} FCFA</span>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">TOTAL</span>
                      <span className="text-2xl font-bold text-primary font-mono">{total.toLocaleString()} FCFA</span>
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

                  {/* Saisie montant reçu pour espèces */}
                  {paymentMethod === 'cash' && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Montant reçu</label>
                      <Input
                        type="number"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="mb-2"
                      />
                      {receivedAmount > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Rendu: <span className={change >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {change.toLocaleString()} FCFA
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bouton de validation */}
                  <Button 
                    onClick={validateOrder}
                    className="w-full h-12 text-lg font-bold shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
                    disabled={paymentMethod === 'cash' && receivedAmount < total}
                  >
                    <CheckSquare className="h-5 w-5 mr-2" />
                    Valider la commande
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
                    <span>{item.total.toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
              
              <Separator className="my-3" />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{subtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA ({taxEnabled ? `${(taxRate * 100).toFixed(1)}%` : 'désactivée'})</span>
                  <span>{tax.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                  <span>TOTAL</span>
                  <span className="text-primary">{total.toLocaleString()} FCFA</span>
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
                  <strong>Montant reçu:</strong> {receivedAmount.toLocaleString()} FCFA<br/>
                  <strong>Rendu:</strong> {change.toLocaleString()} FCFA
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