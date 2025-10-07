/**
 * 🏪 SYSTÈME POS SIMPLIFIÉ - 224SOLUTIONS
 * Version simplifiée et robuste du système de point de vente
 * Garantit un affichage correct même en cas de problème avec la version complète
 */

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
    Calculator,
    Smartphone,
    Building,
    Clock,
    CheckSquare,
    Euro,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    stock: number;
}

interface CartItem extends Product {
    quantity: number;
    total: number;
}

export default function POSSystemSimple() {
    const { user } = useAuth();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
    const [receivedAmount, setReceivedAmount] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Produits de démonstration
    const demoProducts: Product[] = [
        { id: '1', name: 'Smartphone Samsung Galaxy A54', price: 250000, category: 'Électronique', stock: 15 },
        { id: '2', name: 'Casque Bluetooth Sony', price: 45000, category: 'Audio', stock: 8 },
        { id: '3', name: 'Montre connectée Apple Watch', price: 180000, category: 'Accessoires', stock: 5 },
        { id: '4', name: 'Tablette iPad Air', price: 320000, category: 'Électronique', stock: 3 },
        { id: '5', name: 'Chargeur USB-C Rapide', price: 15000, category: 'Accessoires', stock: 25 },
        { id: '6', name: 'Écouteurs AirPods Pro', price: 120000, category: 'Audio', stock: 12 },
    ];

    const filteredProducts = demoProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculs
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0.18;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const change = receivedAmount - total;

    // Fonctions du panier
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

    const updateQuantity = (productId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        const product = demoProducts.find(p => p.id === productId);
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
        setReceivedAmount(0);
        toast.info('Panier vidé');
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

        toast.success('Paiement effectué avec succès!', {
            description: `Commande de ${total.toLocaleString()} FCFA validée`
        });

        clearCart();
    };

    // Mise à jour de l'horloge
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-primary/5 via-card to-primary/5 border-b border-border/50 shadow-lg">
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                            <Building className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                224Solutions POS
                            </h1>
                            <p className="text-muted-foreground font-medium">Système Point de Vente Professionnel</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-md">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-primary" />
                                <div>
                                    <div className="font-mono font-bold">{currentTime.toLocaleTimeString('fr-FR')}</div>
                                    <div className="text-xs text-muted-foreground">{currentTime.toLocaleDateString('fr-FR')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 gap-4 p-4">
                {/* Section Produits */}
                <div className="flex-1 flex flex-col space-y-4">
                    {/* Barre de recherche */}
                    <Card className="shadow-lg border-0 bg-gradient-to-r from-card/80 to-card/60 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher un produit..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-11 h-12 text-base border-2 border-border/50 focus:border-primary/50 bg-background/80"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Grille de produits */}
                    <Card className="flex-1 shadow-lg border-0 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-sm">
                        <CardContent className="p-6 h-full">
                            <ScrollArea className="h-full">
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
                                                    <p className="text-2xl font-bold text-primary mb-3">{product.price.toLocaleString()} FCFA</p>

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
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Section Panier */}
                <div className="w-96 flex flex-col space-y-4">
                    <Card className="flex-1 shadow-2xl border-0 bg-gradient-to-br from-card via-card/95 to-background/90 backdrop-blur-lg">
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
                                        <ShoppingCart className="h-16 w-16 text-muted-foreground/40 mb-4" />
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
                                                TVA (18%)
                                                <Badge variant="default" className="text-xs px-1.5 py-0.5">ON</Badge>
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
                                        onClick={processPayment}
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
        </div>
    );
}
