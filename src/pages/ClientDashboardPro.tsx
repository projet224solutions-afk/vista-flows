import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    ShoppingBag, Heart, MapPin, User, Star, Package, Search, Filter,
    CreditCard, Wallet, Bell, MessageSquare, Shield, Eye, Download,
    Plus, Minus, ShoppingCart, Truck, CheckCircle, Clock, AlertTriangle,
    Phone, Mail, Lock, Fingerprint, Camera, QrCode, FileText, BarChart3,
    Settings, HelpCircle, LogOut, Home, Gift, Percent, Navigation,
    ThumbsUp, ThumbsDown, Flag, Send, Mic, Video, Image,
    Banknote, ArrowUpDown, History, Calendar, TrendingUp, DollarSign,
    CameraIcon, ScanLine, Users, Store, MapPinIcon, RefreshCw, ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import QuickFooter from "@/components/QuickFooter";

// Types pour l'interface client
interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    rating: number;
    reviews: number;
    category: string;
    discount?: number;
    inStock: boolean;
    seller: string;
}

interface Order {
    id: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';
    total: number;
    items: { name: string; quantity: number; price: number }[];
    date: string;
    deliveryEstimate: string;
    trackingId?: string;
}

interface WalletTransaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
    amount: number;
    date: string;
    description: string;
    status: 'completed' | 'pending' | 'failed';
}

export default function ClientDashboardPro() {
    const { user, profile, signOut, ensureUserSetup } = useAuth();
    const navigate = useNavigate();

    // États principaux
    const [activeTab, setActiveTab] = useState('dashboard');
    const [walletBalance, setWalletBalance] = useState(125000);
    const [cartItems, setCartItems] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'order', message: 'Votre commande #ORD-001 a été expédiée', time: '2h', read: false },
        { id: 2, type: 'promo', message: 'Nouvelle promotion: -30% sur l\'électronique', time: '4h', read: false },
        { id: 3, type: 'delivery', message: 'Livraison prévue aujourd\'hui entre 14h-16h', time: '1h', read: true }
    ]);

    // Vérifier et créer le setup utilisateur automatiquement
    useEffect(() => {
        if (user) {
            ensureUserSetup();
        }
    }, [user, ensureUserSetup]);

    // Données simulées
    const mockProducts: Product[] = [
        {
            id: 'P001',
            name: 'iPhone 15 Pro Max 256GB',
            price: 850000,
            image: 'https://images.unsplash.com/photo-1592910119559-e9e8d9c9b0ee?w=300',
            rating: 4.8,
            reviews: 234,
            category: 'Électronique',
            discount: 10,
            inStock: true,
            seller: 'TechStore Dakar'
        },
        {
            id: 'P002',
            name: 'MacBook Pro M3 14"',
            price: 1200000,
            image: 'https://images.unsplash.com/photo-1541807084-5b52b7fd0be2?w=300',
            rating: 4.9,
            reviews: 156,
            category: 'Informatique',
            inStock: true,
            seller: 'Apple Store SN'
        },
        {
            id: 'P003',
            name: 'Samsung Galaxy S24 Ultra',
            price: 750000,
            image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300',
            rating: 4.7,
            reviews: 189,
            category: 'Téléphones',
            discount: 15,
            inStock: true,
            seller: 'Mobile Zone'
        }
    ];

    const mockOrders: Order[] = [
        {
            id: 'ORD-001',
            status: 'shipping',
            total: 125000,
            items: [{ name: 'Casque Bluetooth Sony', quantity: 1, price: 125000 }],
            date: '2024-09-25',
            deliveryEstimate: 'Aujourd\'hui 14h-16h',
            trackingId: 'TRK123456789'
        },
        {
            id: 'ORD-002',
            status: 'delivered',
            total: 85000,
            items: [{ name: 'T-shirt Nike', quantity: 2, price: 42500 }],
            date: '2024-09-20',
            deliveryEstimate: 'Livré',
        }
    ];

    const mockTransactions: WalletTransaction[] = [
        {
            id: 'TXN-001',
            type: 'deposit',
            amount: 100000,
            date: '2024-09-25',
            description: 'Dépôt Wave Money',
            status: 'completed'
        },
        {
            id: 'TXN-002',
            type: 'payment',
            amount: -125000,
            date: '2024-09-25',
            description: 'Achat Casque Bluetooth',
            status: 'completed'
        }
    ];

    // Fonctions utilitaires
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered': return 'bg-green-500';
            case 'shipping': return 'bg-blue-500';
            case 'preparing': return 'bg-orange-500';
            case 'cancelled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const addToCart = (product: Product) => {
        setCartItems(prev => [...prev, product]);
        toast.success(`${product.name} ajouté au panier`);
    };

    const removeFromCart = (productId: string) => {
        setCartItems(prev => prev.filter(item => item.id !== productId));
        toast.success('Produit retiré du panier');
    };

    // Composant Dashboard Principal
    const DashboardView = () => (
        <div className="space-y-6">
            {/* Section Bienvenue avec Wallet */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Bonjour {profile?.first_name || 'Client'} !</h2>
                            <p className="opacity-90">Bienvenue sur votre espace 224SOLUTIONS</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm opacity-80">Solde du Wallet</p>
                            <p className="text-3xl font-bold">{formatPrice(walletBalance)}</p>
                            <Button variant="secondary" size="sm" className="mt-2">
                                <Plus className="w-4 h-4 mr-2" />
                                Recharger
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPIs rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold">12</p>
                        <p className="text-sm text-muted-foreground">Commandes Actives</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Heart className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <p className="text-2xl font-bold">45</p>
                        <p className="text-sm text-muted-foreground">Favoris</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{cartItems.length}</p>
                        <p className="text-sm text-muted-foreground">Dans le Panier</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Star className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                        <p className="text-2xl font-bold">4.8</p>
                        <p className="text-sm text-muted-foreground">Satisfaction</p>
                    </CardContent>
                </Card>
            </div>

            {/* Commandes Récentes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Commandes Récentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {mockOrders.slice(0, 3).map(order => (
                            <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${getStatusColor(order.status)}`}></div>
                                    <div>
                                        <p className="font-semibold">{order.id}</p>
                                        <p className="text-sm text-muted-foreground">{order.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">{formatPrice(order.total)}</p>
                                    <Badge variant="secondary">{order.status}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Produits Recommandés */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Recommandés pour Vous
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {mockProducts.slice(0, 3).map(product => (
                            <div key={product.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                                <img src={product.image} alt={product.name} className="w-full h-32 object-cover rounded mb-3" />
                                <h3 className="font-semibold mb-2 truncate">{product.name}</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < product.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                        ))}
                                    </div>
                                    <span className="text-sm text-muted-foreground">({product.reviews})</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-lg">{formatPrice(product.price)}</p>
                                        {product.discount && (
                                            <Badge variant="destructive" className="text-xs">-{product.discount}%</Badge>
                                        )}
                                    </div>
                                    <Button size="sm" onClick={() => addToCart(product)}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // Composant Recherche et Catalogue
    const ShopView = () => (
        <div className="space-y-6">
            {/* Barre de recherche avancée */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher des produits, marques, vendeurs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="w-4 h-4 mr-2" />
                            Filtres
                        </Button>
                        <Button variant="outline">
                            <ScanLine className="w-4 h-4 mr-2" />
                            Scanner
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Catégories */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {['Électronique', 'Mode', 'Maison', 'Sport', 'Beauté', 'Auto'].map(category => (
                    <Card key={category} className="cursor-pointer hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 text-center">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-2"></div>
                            <p className="font-semibold text-sm">{category}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Grille de produits */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {mockProducts.map(product => (
                    <Card key={product.id} className="hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-0">
                            <div className="relative">
                                <img src={product.image} alt={product.name} className="w-full h-48 object-cover rounded-t-lg" />
                                {product.discount && (
                                    <Badge className="absolute top-2 left-2 bg-red-500">-{product.discount}%</Badge>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                                >
                                    <Heart className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold mb-2 truncate">{product.name}</h3>
                                <p className="text-sm text-muted-foreground mb-2">{product.seller}</p>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < product.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                        ))}
                                    </div>
                                    <span className="text-sm text-muted-foreground">({product.reviews})</span>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        {product.discount ? (
                                            <div>
                                                <p className="text-lg font-bold text-red-600">
                                                    {formatPrice(product.price * (1 - product.discount / 100))}
                                                </p>
                                                <p className="text-sm line-through text-muted-foreground">
                                                    {formatPrice(product.price)}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-lg font-bold">{formatPrice(product.price)}</p>
                                        )}
                                    </div>
                                    <Badge variant={product.inStock ? "default" : "destructive"}>
                                        {product.inStock ? "En stock" : "Rupture"}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        className="flex-1"
                                        onClick={() => addToCart(product)}
                                        disabled={!product.inStock}
                                    >
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        Ajouter
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );

    // Composant Panier et Commandes
    const CartOrdersView = () => (
        <div className="space-y-6">
            <Tabs defaultValue="cart">
                <TabsList className="w-full">
                    <TabsTrigger value="cart" className="flex-1">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Panier ({cartItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="flex-1">
                        <Package className="w-4 h-4 mr-2" />
                        Mes Commandes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cart" className="space-y-4">
                    {cartItems.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">Votre panier est vide</h3>
                                <p className="text-muted-foreground mb-4">Explorez nos produits et ajoutez vos favoris</p>
                                <Button onClick={() => setActiveTab('shop')}>
                                    Commencer les Achats
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Articles du panier */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Articles dans votre panier</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {cartItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold">{item.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{item.seller}</p>
                                                    <p className="font-bold">{formatPrice(item.price)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm">
                                                        <Minus className="w-4 h-4" />
                                                    </Button>
                                                    <span className="w-8 text-center">1</span>
                                                    <Button variant="outline" size="sm">
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <Button variant="destructive" size="sm" onClick={() => removeFromCart(item.id)}>
                                                    <span className="sr-only">Supprimer</span>
                                                    ×
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Récapitulatif commande */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Récapitulatif</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between">
                                        <span>Sous-total</span>
                                        <span>{formatPrice(cartItems.reduce((sum, item) => sum + item.price, 0))}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Livraison</span>
                                        <span>5,000 FCFA</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>{formatPrice(cartItems.reduce((sum, item) => sum + item.price, 0) + 5000)}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <Input placeholder="Code promo" />
                                        <Button variant="outline" className="w-full">
                                            <Percent className="w-4 h-4 mr-2" />
                                            Appliquer le code
                                        </Button>
                                    </div>
                                    <Button className="w-full" size="lg">
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Procéder au Paiement
                                    </Button>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                    {mockOrders.map(order => (
                        <Card key={order.id}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold">{order.id}</h3>
                                        <p className="text-sm text-muted-foreground">{order.date}</p>
                                    </div>
                                    <Badge className={getStatusColor(order.status)}>
                                        {order.status}
                                    </Badge>
                                </div>
                                <div className="space-y-2 mb-4">
                                    {order.items.map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <span>{item.name} x{item.quantity}</span>
                                            <span>{formatPrice(item.price)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold">Total: {formatPrice(order.total)}</span>
                                    <div className="flex gap-2">
                                        {order.trackingId && (
                                            <Button variant="outline" size="sm">
                                                <Navigation className="w-4 h-4 mr-2" />
                                                Suivre
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4 mr-2" />
                                            Détails
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    );

    // Composant Wallet et Paiements
    const WalletView = () => (
        <div className="space-y-6">
            {/* Solde principal */}
            <Card className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-lg opacity-90">Solde Principal</p>
                            <p className="text-4xl font-bold">{formatPrice(walletBalance)}</p>
                        </div>
                        <Wallet className="w-16 h-16 opacity-80" />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" className="flex-1">
                            <Plus className="w-4 h-4 mr-2" />
                            Recharger
                        </Button>
                        <Button variant="secondary" className="flex-1">
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            Retirer
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Carte virtuelle */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Ma Carte Virtuelle
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-sm opacity-80">224SOLUTIONS</p>
                                <p className="text-lg font-bold">CARTE VIRTUELLE</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-80">Solde</p>
                                <p className="text-lg font-bold">{formatPrice(walletBalance)}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-lg font-mono">**** **** **** 1234</p>
                            <div className="flex justify-between">
                                <span>{profile?.first_name?.toUpperCase()} {profile?.last_name?.toUpperCase()}</span>
                                <span>12/28</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button variant="outline" className="flex-1">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir Détails
                        </Button>
                        <Button variant="outline" className="flex-1">
                            <Lock className="w-4 h-4 mr-2" />
                            Bloquer
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Historique des transactions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Historique des Transactions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {mockTransactions.map(transaction => (
                            <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${transaction.type === 'deposit' ? 'bg-green-100 text-green-600' :
                                        transaction.type === 'payment' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        {transaction.type === 'deposit' ? <Plus className="w-5 h-5" /> :
                                            transaction.type === 'payment' ? <Minus className="w-5 h-5" /> :
                                                <ArrowUpDown className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{transaction.description}</p>
                                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {transaction.amount > 0 ? '+' : ''}{formatPrice(Math.abs(transaction.amount))}
                                    </p>
                                    <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                        {transaction.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter en PDF
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    // Composant Notifications et Messages
    const NotificationsView = () => (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {notifications.map(notification => (
                            <div key={notification.id} className={`p-4 border rounded-lg ${!notification.read ? 'bg-blue-50 border-blue-200' : ''}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-semibold">{notification.message}</p>
                                        <p className="text-sm text-muted-foreground">{notification.time}</p>
                                    </div>
                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Centre de messages */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Messages
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback>TS</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">TechStore Dakar</p>
                                    <p className="text-sm text-muted-foreground">Vendeur</p>
                                </div>
                                <Badge className="ml-auto">Nouveau</Badge>
                            </div>
                            <p className="text-sm">Votre commande est prête pour expédition. Merci pour votre achat !</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback>SA</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">Support 224SOLUTIONS</p>
                                    <p className="text-sm text-muted-foreground">Assistance</p>
                                </div>
                            </div>
                            <p className="text-sm">Comment pouvons-nous vous aider aujourd'hui ?</p>
                        </div>
                    </div>
                    <Button className="w-full mt-4">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Nouveau Message
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    // Composant Profil et Sécurité
    const ProfileView = () => (
        <div className="space-y-6">
            {/* Informations personnelles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Informations Personnelles
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-20 h-20">
                            <AvatarImage src={profile?.avatar_url} />
                            <AvatarFallback>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold">{profile?.first_name} {profile?.last_name}</h3>
                            <p className="text-muted-foreground">{user?.email}</p>
                            <Button variant="outline" size="sm" className="mt-2">
                                <Camera className="w-4 h-4 mr-2" />
                                Changer Photo
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Prénom</Label>
                            <Input value={profile?.first_name || ''} />
                        </div>
                        <div>
                            <Label>Nom</Label>
                            <Input value={profile?.last_name || ''} />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input value={user?.email || ''} />
                        </div>
                        <div>
                            <Label>Téléphone</Label>
                            <Input placeholder="+221 XX XXX XX XX" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sécurité */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Sécurité et Authentification
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">Authentification à deux facteurs</p>
                            <p className="text-sm text-muted-foreground">Sécurisez votre compte avec 2FA</p>
                        </div>
                        <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">Authentification biométrique</p>
                            <p className="text-sm text-muted-foreground">Empreinte digitale ou reconnaissance faciale</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">Code PIN pour paiements</p>
                            <p className="text-sm text-muted-foreground">Protégez vos transactions</p>
                        </div>
                        <Button variant="outline" size="sm">
                            <Lock className="w-4 h-4 mr-2" />
                            Modifier
                        </Button>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                            <Lock className="w-4 h-4 mr-2" />
                            Changer le Mot de Passe
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger mes Données
                        </Button>
                        <Button variant="destructive" className="w-full justify-start">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Supprimer le Compte
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header avec Notifications */}
            <header className="bg-card border-b border-border sticky top-0 z-40">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-xl font-bold">224SOLUTIONS</h1>
                                <p className="text-sm text-muted-foreground">Client Pro</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" className="relative">
                                <Bell className="w-5 h-5" />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs">
                                        {notifications.filter(n => !n.read).length}
                                    </Badge>
                                )}
                            </Button>
                            <Button variant="ghost" size="sm">
                                <MessageSquare className="w-5 h-5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleSignOut}>
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="px-4 py-4">
                <ScrollArea className="w-full">
                    <div className="flex space-x-4 min-w-max">
                        <Button
                            variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('dashboard')}
                            className="flex-shrink-0"
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                        <Button
                            variant={activeTab === 'shop' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('shop')}
                            className="flex-shrink-0"
                        >
                            <Search className="w-4 h-4 mr-2" />
                            Explorer
                        </Button>
                        <Button
                            variant={activeTab === 'cart' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('cart')}
                            className="flex-shrink-0"
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Panier
                        </Button>
                        <Button
                            variant={activeTab === 'wallet' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('wallet')}
                            className="flex-shrink-0"
                        >
                            <Wallet className="w-4 h-4 mr-2" />
                            Wallet
                        </Button>
                        <Button
                            variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('notifications')}
                            className="flex-shrink-0"
                        >
                            <Bell className="w-4 h-4 mr-2" />
                            Messages
                        </Button>
                        <Button
                            variant={activeTab === 'profile' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('profile')}
                            className="flex-shrink-0"
                        >
                            <User className="w-4 h-4 mr-2" />
                            Profil
                        </Button>
                    </div>
                </ScrollArea>
            </div>

            {/* Contenu Principal */}
            <main className="px-4 pb-4">
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'shop' && <ShopView />}
                {activeTab === 'cart' && <CartOrdersView />}
                {activeTab === 'wallet' && <WalletView />}
                {activeTab === 'notifications' && <NotificationsView />}
                {activeTab === 'profile' && <ProfileView />}
            </main>

            {/* Footer de navigation */}
            <QuickFooter />
        </div>
    );
}
