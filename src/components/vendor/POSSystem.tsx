import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  CheckSquare
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
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Coca Cola 33cl', price: 150, category: 'Boissons', stock: 50, barcode: '1234567890' },
    { id: '2', name: 'Pain de Mie', price: 500, category: 'Boulangerie', stock: 30 },
    { id: '3', name: 'Lait 1L', price: 800, category: 'Produits Laitiers', stock: 25 },
    { id: '4', name: 'Riz 5kg', price: 3500, category: 'Céréales', stock: 20 },
    { id: '5', name: 'Huile 1L', price: 1200, category: 'Condiments', stock: 15 },
    { id: '6', name: 'Savon', price: 250, category: 'Hygiène', stock: 40 }
  ]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState('');

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.18; // 18% TVA
  const total = subtotal + tax;
  const change = receivedAmount - total;

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Produit en rupture de stock');
      return;
    }

    setCart(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          toast.error('Stock insuffisant');
          return prev;
        }
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, total: product.price }];
    });
  };

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
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setReceivedAmount(0);
  };

  const processPayment = () => {
    if (cart.length === 0) {
      toast.error('Panier vide');
      return;
    }

    if (paymentMethod === 'cash' && receivedAmount < total) {
      toast.error('Montant insuffisant');
      return;
    }

    // Simuler le traitement du paiement
    toast.success('Paiement effectué avec succès');
    
    // Mettre à jour le stock
    setProducts(prev =>
      prev.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        return cartItem
          ? { ...product, stock: product.stock - cartItem.quantity }
          : product;
      })
    );

    // Imprimer le reçu (simulation)
    printReceipt();
    
    clearCart();
  };

  const printReceipt = () => {
    const receiptContent = `
      REÇU DE VENTE
      ${new Date().toLocaleString()}
      
      ${cart.map(item => `${item.name} x${item.quantity} - ${item.total} FCFA`).join('\n')}
      
      Sous-total: ${subtotal} FCFA
      TVA (18%): ${tax.toFixed(0)} FCFA
      TOTAL: ${total.toFixed(0)} FCFA
      
      ${paymentMethod === 'cash' ? `Reçu: ${receivedAmount} FCFA\nMonnaie: ${change.toFixed(0)} FCFA` : ''}
      
      Merci de votre visite !
    `;
    console.log(receiptContent);
    toast.success('Reçu généré');
  };

  const handleBarcodeSearch = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      toast.success(`${product.name} ajouté au panier`);
    } else {
      toast.error('Produit non trouvé');
    }
  };

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
    <div className="flex h-screen bg-background">
      {/* Section Produits - Gauche */}
      <div className="flex-[6] flex flex-col p-2 space-y-3">
        {/* Barre de recherche et filtres */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col xl:flex-row gap-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit ou scanner un code-barres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base"
                />
              </div>
              
              <Input
                placeholder="Code-barres"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="xl:w-64 h-12 text-base"
              />
              
              <div className="flex gap-3">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-5 w-5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Catégories */}
            <div className="flex gap-3 mt-6 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="default"
                  onClick={() => setSelectedCategory(category)}
                  className="text-sm px-6"
                >
                  {category === 'all' ? 'Tout' : category}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grille/Liste des produits */}
        <ScrollArea className="flex-1">
          <div className={`grid gap-6 p-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10' 
              : 'grid-cols-1'
          }`}>
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-primary/50"
                onClick={() => addToCart(product)}
              >
                <CardContent className={`p-6 ${viewMode === 'list' ? 'flex items-center gap-4' : ''}`}>
                  <div className={`${viewMode === 'grid' ? 'text-center' : 'flex-1'}`}>
                    <div className={`w-full ${viewMode === 'grid' ? 'h-32 mb-4' : 'h-16 w-16'} bg-muted rounded-lg flex items-center justify-center`}>
                      <Smartphone className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-xl font-bold text-primary mb-2">{product.price} FCFA</p>
                    <Badge variant={product.stock > 10 ? 'default' : 'destructive'} className="text-xs">
                      Stock: {product.stock}
                    </Badge>
                  </div>
                  {viewMode === 'list' && (
                    <Button size="default" className="px-6">
                      <Plus className="h-5 w-5" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Section Panier et Paiement - Droite */}
      <div className="w-full lg:w-56 xl:w-48 bg-card border-l flex flex-col">
        {/* En-tête du panier */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Panier ({cart.length})
            </h2>
            <Button variant="outline" size="sm" onClick={clearCart}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Articles du panier */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Panier vide</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-primary font-semibold">{item.price} FCFA</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{item.total} FCFA</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Section Paiement */}
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-4">
            {/* Résumé */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total:</span>
                <span>{subtotal.toFixed(0)} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>TVA (18%):</span>
                <span>{tax.toFixed(0)} FCFA</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-primary">{total.toFixed(0)} FCFA</span>
              </div>
            </div>

            {/* Méthodes de paiement */}
            <div className="space-y-3">
              <h3 className="font-medium">Mode de paiement</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('cash')}
                >
                  Espèces
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Carte
                </Button>
                <Button
                  variant={paymentMethod === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod('mobile')}
                >
                  Mobile
                </Button>
              </div>
            </div>

            {/* Montant reçu (pour espèces) */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant reçu</label>
                <Input
                  type="number"
                  value={receivedAmount || ''}
                  onChange={(e) => setReceivedAmount(Number(e.target.value))}
                  placeholder="0"
                />
                {receivedAmount > 0 && change >= 0 && (
                  <p className="text-sm text-muted-foreground">
                    Monnaie: <span className="font-bold text-foreground">{change.toFixed(0)} FCFA</span>
                  </p>
                )}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="space-y-2">
              <Button onClick={processPayment} className="w-full" size="lg">
                <CheckSquare className="h-4 w-4 mr-2" />
                Finaliser la vente
              </Button>
              <Button variant="outline" onClick={printReceipt} className="w-full">
                <Receipt className="h-4 w-4 mr-2" />
                Imprimer reçu
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}