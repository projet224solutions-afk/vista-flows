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
  StickyNote
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
    { id: '4', name: 'Riz 5kg', price: 3500, category: 'Céréales', stock: 20 }
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
  const [calculator, setCalculator] = useState('');
  const [calculatorMode, setCalculatorMode] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  
  // États pour personnalisation
  const [companyName, setCompanyName] = useState('Mon Entreprise SARL');
  const [companyLogo, setCompanyLogo] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const handleNumericInput = (input: string) => {
    if (input === 'clear') {
      setNumericInput('');
      setCalculator('');
      setPaymentAmount('');
      return;
    }
    
    if (input === 'calc') {
      setCalculatorMode(!calculatorMode);
      setNumericInput('');
      setCalculator('');
      return;
    }
    
    if (input === 'enter') {
      // Si un article est sélectionné, modifier sa quantité
      if (selectedCartItemId && numericInput) {
        const newQuantity = parseInt(numericInput);
        if (newQuantity > 0) {
          updateQuantity(selectedCartItemId, newQuantity);
          setNumericInput('');
          setSelectedCartItemId(null);
          toast.success('Quantité mise à jour');
        }
        return;
      }
      
      // Si en mode calculatrice, évaluer l'expression
      if (calculatorMode && calculator) {
        try {
          const result = eval(calculator);
          setCalculator(result.toString());
          setNumericInput(result.toString());
          toast.success(`Résultat: ${result}`);
        } catch (error) {
          toast.error('Erreur de calcul');
        }
        return;
      }
      
      // Si c'est un montant de paiement
      if (numericInput && !selectedCartItemId) {
        setPaymentAmount(numericInput);
        toast.success(`Montant saisi: ${numericInput} FCFA`);
        return;
      }
    }
    
    if (input === '+' || input === '-' || input === '*' || input === '/') {
      if (calculatorMode) {
        setCalculator(prev => prev + input);
        setNumericInput('');
      }
      return;
    }
    
    // Limiter la saisie
    const currentInput = calculatorMode ? calculator : numericInput;
    if (currentInput.length < 8) {
      if (calculatorMode) {
        setCalculator(prev => prev + input);
      } else {
        setNumericInput(prev => prev + input);
      }
    }
  };

  const selectCartItem = (itemId: string) => {
    setSelectedCartItemId(itemId);
    setNumericInput('');
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
    <div className="flex flex-col h-screen bg-background">
      {/* En-tête d'entreprise professionnel */}
      <div className="bg-card border-b border-border shadow-sm p-6">
        <div className="flex items-center justify-between">
          {/* Logo et nom d'entreprise */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <Building className="h-8 w-8 text-primary-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{companyName}</h1>
              <p className="text-muted-foreground">Système de Point de Vente</p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-3">
            {/* Bouton Bloc-note */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="default">
                  <StickyNote className="h-4 w-4 mr-2" />
                  Bloc-note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bloc-note de caisse</DialogTitle>
                </DialogHeader>
                <Textarea 
                  placeholder="Notez vos rappels, observations..."
                  className="min-h-32"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Annuler</Button>
                  <Button>Sauvegarder</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bouton Dette */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="default">
                  <UserX className="h-4 w-4 mr-2" />
                  Dette
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gestion des dettes clients</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <Input placeholder="Nom du client" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nombre de prises</label>
                    <Input type="number" placeholder="1" min="1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Montant de la dette</label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Échéance</label>
                    <Input type="date" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Note</label>
                    <Textarea placeholder="Note sur la dette..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Annuler</Button>
                  <Button>Enregistrer dette</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Bouton Paramètres */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="default">
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Paramètres POS</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Configuration Imprimante */}
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Printer className="h-4 w-4" />
                      Configuration Imprimante
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Imprimante principale</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une imprimante" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="thermal1">Imprimante Thermique 1</SelectItem>
                            <SelectItem value="thermal2">Imprimante Thermique 2</SelectItem>
                            <SelectItem value="laser1">Imprimante Laser HP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Format du reçu</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="58mm">58mm (Thermique)</SelectItem>
                            <SelectItem value="80mm">80mm (Standard)</SelectItem>
                            <SelectItem value="a4">A4 (Laser)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Configuration Entreprise */}
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Informations Entreprise
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Nom de l'entreprise</label>
                        <Input 
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Nom de votre entreprise"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Logo (URL de l'image)</label>
                        <Input 
                          value={companyLogo}
                          onChange={(e) => setCompanyLogo(e.target.value)}
                          placeholder="https://exemple.com/logo.png"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Adresse</label>
                        <Textarea placeholder="Adresse complète..." />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Téléphone</label>
                        <Input placeholder="+221 XX XXX XX XX" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Annuler</Button>
                  <Button>Sauvegarder</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Horloge en temps réel */}
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                {currentTime.toLocaleTimeString('fr-FR')}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentTime.toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
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
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' 
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
                      <div className={`w-full ${viewMode === 'grid' ? 'h-40 mb-4' : 'h-16 w-16'} bg-muted rounded-lg flex items-center justify-center`}>
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
        <div className="w-full lg:w-96 xl:w-[420px] bg-card border-l flex flex-col">
          {/* En-tête du panier */}
          <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                Panier ({cart.length})
              </h2>
              <Button variant="outline" size="default" onClick={clearCart} className="hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Vider
              </Button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Articles du panier */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <div className="p-6 bg-muted/20 rounded-2xl">
                      <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Panier vide</p>
                      <p className="text-sm">Ajoutez des produits pour commencer</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedCartItemId === item.id 
                            ? 'border-primary bg-primary/5 shadow-lg' 
                            : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                        }`}
                        onClick={() => selectCartItem(item.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base mb-1">{item.name}</h4>
                            <p className="text-primary font-bold text-lg">{item.price} FCFA</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.id, item.quantity - 1);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <div className={`min-w-[3rem] text-center py-1 px-2 rounded-md font-bold text-lg ${
                                selectedCartItemId === item.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              }`}>
                                {selectedCartItemId === item.id && numericInput ? numericInput : item.quantity}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.id, item.quantity + 1);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-lg text-primary">{item.total} FCFA</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromCart(item.id);
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Pavé numérique professionnel */}
            <div className="w-40 border-l bg-gradient-to-b from-muted/10 to-muted/30 p-3">
              <div className="text-center mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-foreground">PAVÉ</p>
                  <Button
                    variant={calculatorMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleNumericInput('calc')}
                    className="h-6 w-8 text-xs"
                  >
                    🧮
                  </Button>
                </div>
                {selectedCartItemId && (
                  <div className="bg-primary/20 rounded px-2 py-1">
                    <p className="text-xs text-primary font-medium">Article sélectionné</p>
                  </div>
                )}
                {calculatorMode && (
                  <div className="bg-blue-100 rounded px-2 py-1 mt-1">
                    <p className="text-xs text-blue-700 font-medium">Mode Calculatrice</p>
                  </div>
                )}
                {paymentAmount && (
                  <div className="bg-green-100 rounded px-2 py-1 mt-1">
                    <p className="text-xs text-green-700 font-medium">Montant: {paymentAmount} FCFA</p>
                  </div>
                )}
              </div>
              
              {/* Affichage */}
              <div className="mb-3">
                <div className="bg-card border rounded p-2 text-center font-mono text-sm min-h-[32px] flex items-center justify-center">
                  {calculatorMode ? (calculator || '0') : (numericInput || '0')}
                </div>
              </div>
              
              {/* Boutons numériques */}
              <div className="grid grid-cols-3 gap-1 mb-2">
                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
                  <Button
                    key={num}
                    variant="outline"
                    size="sm"
                    onClick={() => handleNumericInput(num.toString())}
                    className="h-8 text-sm font-bold hover:bg-primary hover:text-primary-foreground border-border/50"
                  >
                    {num}
                  </Button>
                ))}
              </div>
              
              {/* Ligne du bas avec 0 et fonctions */}
              <div className="grid grid-cols-3 gap-1 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNumericInput('clear')}
                  className="h-8 text-xs font-bold hover:bg-destructive hover:text-destructive-foreground"
                >
                  CLR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNumericInput('0')}
                  className="h-8 text-sm font-bold hover:bg-primary hover:text-primary-foreground"
                >
                  0
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleNumericInput('enter')}
                  className="h-8 text-xs font-bold bg-primary hover:bg-primary/90"
                >
                  OK
                </Button>
              </div>
              
              {/* Opérateurs pour calculatrice */}
              {calculatorMode && (
                <div className="grid grid-cols-4 gap-1 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleNumericInput('+')}
                    className="h-6 text-xs font-bold"
                  >
                    +
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleNumericInput('-')}
                    className="h-6 text-xs font-bold"
                  >
                    -
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleNumericInput('*')}
                    className="h-6 text-xs font-bold"
                  >
                    ×
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleNumericInput('/')}
                    className="h-6 text-xs font-bold"
                  >
                    ÷
                  </Button>
                </div>
              )}
              
              {/* Raccourcis rapides */}
              <div className="mt-3 space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNumericInput(total.toString())}
                  className="w-full h-6 text-xs hover:bg-accent"
                >
                  Total: {total.toFixed(0)}
                </Button>
                {paymentAmount && (
                  <div className="text-xs text-center text-muted-foreground">
                    Rendu: {(parseInt(paymentAmount) - total).toFixed(0)} FCFA
                  </div>
                )}
              </div>
            </div>
          </div>

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
    </div>
  );
}