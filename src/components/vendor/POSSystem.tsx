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
  // États principaux
  const [products] = useState<Product[]>([
    { id: '1', name: 'Coca Cola 33cl', price: 1000, category: 'Boissons', stock: 50, barcode: '1234567890' },
    { id: '2', name: 'Pain de Mie', price: 500, category: 'Boulangerie', stock: 30 },
    { id: '3', name: 'Lait 1L', price: 800, category: 'Produits Laitiers', stock: 25 },
    { id: '4', name: 'Riz 5kg', price: 3500, category: 'Céréales', stock: 20 },
    { id: '5', name: 'Huile 1L', price: 1200, category: 'Condiments', stock: 40 },
    { id: '6', name: 'Sucre 1kg', price: 900, category: 'Épicerie', stock: 35 }
  ]);
  
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

  // Calculs automatiques
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.18; // 18% TVA
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
        toast.success(`Montant saisi: ${numericInput} FCFA`);
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

  const processPayment = () => {
    if (paymentMethod === 'cash' && receivedAmount < total) {
      toast.error('Montant insuffisant');
      return;
    }

    toast.success('Paiement effectué avec succès!', {
      description: `Commande de ${total.toFixed(0)} FCFA validée`
    });
    
    clearCart();
    setShowOrderSummary(false);
    setReceivedAmount(0);
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
                {companyName}
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

            <Button variant="outline" className="shadow-md">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Button>
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
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product.id} 
                      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 border-border/30 hover:border-primary/40 bg-gradient-to-br from-card via-card/95 to-card/90"
                    >
                      <CardContent className="p-4 text-center space-y-3">
                        <div className="w-full h-32 bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 rounded-lg flex items-center justify-center group-hover:from-primary/10 group-hover:to-primary/5 transition-all duration-300">
                          <Smartphone className="h-14 w-14 text-muted-foreground/60 group-hover:text-primary/60 transition-colors" />
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-sm mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-2xl font-bold text-primary mb-3">{product.price.toLocaleString()} FCFA</p>
                          
                          <Badge 
                            variant={product.stock > 10 ? 'default' : 'destructive'} 
                            className="mb-3 w-full justify-center"
                          >
                            Stock: {product.stock}
                          </Badge>
                          
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Section Panier - Interface professionnelle */}
        <div className="w-96 flex flex-col space-y-4">
          {/* Panier */}
          <Card className="flex-1 shadow-lg border-0 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Panier ({cart.length})
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearCart}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Section Ajouter produit */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold">Ajouter des produits</h3>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {filteredProducts.slice(0, 6).map(product => (
                    <Button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto p-2 text-left"
                      disabled={product.stock <= 0}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.price.toLocaleString()} FCFA</div>
                      </div>
                      <Plus className="h-3 w-3 ml-1 flex-shrink-0" />
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {cart.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/30" />
                    <div>
                      <p className="font-medium text-muted-foreground">Panier vide</p>
                      <p className="text-sm text-muted-foreground/70">Ajoutez des produits pour commencer</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-3">
                      {cart.map(item => (
                        <Card key={item.id} className="p-4 border-border/50 hover:border-primary/30 transition-colors">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm">{item.name}</h4>
                                <p className="text-xs text-muted-foreground">{item.price.toLocaleString()} FCFA / unité</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.id)}
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <div className="w-12 text-center py-1 bg-muted rounded font-bold text-sm">
                                  {item.quantity}
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="text-right">
                                <p className="font-bold text-primary">{item.total.toLocaleString()} FCFA</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Résumé et total */}
                  <div className="space-y-4 pt-4 border-t border-border/50">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sous-total:</span>
                        <span className="font-semibold">{subtotal.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA (18%):</span>
                        <span className="font-semibold">{tax.toFixed(0)} FCFA</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold text-primary">
                        <span>TOTAL:</span>
                        <span>{total.toFixed(0)} FCFA</span>
                      </div>
                    </div>

                    {/* Bouton de validation */}
                    <Button 
                      onClick={validateOrder}
                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
                      size="lg"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Valider la Commande
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de résumé de commande */}
      <Dialog open={showOrderSummary} onOpenChange={setShowOrderSummary}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-6 w-6 text-primary" />
              Résumé de la Commande
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Articles */}
            <div className="space-y-3">
              <h3 className="font-semibold">Articles commandés:</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × {item.price.toLocaleString()} FCFA
                      </p>
                    </div>
                    <p className="font-bold text-primary">{item.total.toLocaleString()} FCFA</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totaux */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{subtotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA (18%):</span>
                <span>{tax.toFixed(0)} FCFA</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>TOTAL À PAYER:</span>
                <span>{total.toFixed(0)} FCFA</span>
              </div>
            </div>

            {/* Paiement */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Mode de paiement:</label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte bancaire</SelectItem>
                    <SelectItem value="mobile">Paiement mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Montant reçu:</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={receivedAmount || ''}
                      onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => setReceivedAmount(total)}
                      className="whitespace-nowrap"
                    >
                      Montant exact
                    </Button>
                  </div>
                  {receivedAmount > 0 && (
                    <div className="mt-2 p-2 bg-muted/30 rounded">
                      <p className="text-sm">
                        Monnaie à rendre: <span className="font-bold text-primary">
                          {change.toFixed(0)} FCFA
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowOrderSummary(false)}
                className="flex-1"
              >
                Modifier
              </Button>
              <Button 
                onClick={processPayment}
                className="flex-1 bg-gradient-to-r from-primary to-primary/90"
                disabled={paymentMethod === 'cash' && receivedAmount < total}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Confirmer Paiement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}