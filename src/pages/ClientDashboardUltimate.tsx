import React, { useState, useEffect, useCallback } from 'react';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
    ShoppingBag, Heart, MapPin, User, Star, Package, Search, Filter,
    CreditCard, Wallet, Bell, MessageSquare, Shield, Eye, Download,
    Plus, Minus, ShoppingCart, Truck, CheckCircle, Clock, AlertTriangle,
    Phone, Mail, Lock, Fingerprint, Camera, QrCode, FileText, BarChart3,
    Settings, HelpCircle, LogOut, Home, Gift, Percent, Navigation,
    ThumbsUp, ThumbsDown, Flag, Send, Mic, Video, Image,
    Banknote, ArrowUpDown, History, Calendar, TrendingUp, DollarSign,
    Menu, X, ChevronRight, ChevronDown, Globe, Smartphone, Headphones,
    Monitor, Shirt, Car, Building2, Gamepad2, BookOpen, Cpu, Zap,
    Store, Users, Briefcase, GraduationCap, Coffee, Pizza, Dumbbell,
    Grid3X3, Share
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import QuickFooter from "@/components/QuickFooter";

// ================= INTERFACES TYPESCRIPT =================
interface Product {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    rating: number;
    reviews: number;
    category: string;
    discount?: number;
    inStock: boolean;
    seller: string;
    brand: string;
    isHot?: boolean;
    isNew?: boolean;
    isFreeShipping?: boolean;
}

interface Category {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    itemCount: number;
}

interface Order {
    id: string;
    status: 'pending' | 'confirmed' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';
    total: number;
    items: { name: string; quantity: number; price: number; image: string }[];
    date: string;
    deliveryEstimate: string;
    trackingId?: string;
    progress: number;
}

interface WalletTransaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'cashback';
    amount: number;
    date: string;
    description: string;
    status: 'completed' | 'pending' | 'failed';
    category: string;
}

interface Notification {
    id: number;
    type: 'order' | 'promo' | 'delivery' | 'system' | 'security';
    title: string;
    message: string;
    time: string;
    read: boolean;
    priority: 'low' | 'medium' | 'high';
    actionUrl?: string;
}

// ================= COMPOSANT PRINCIPAL =================
export default function ClientDashboardUltimate() {
    const { user, profile, signOut, ensureUserSetup } = useAuth();
    const navigate = useNavigate();

    // ================= ÉTATS PRINCIPAUX =================
    const [activeTab, setActiveTab] = useState('home');
    const [walletBalance, setWalletBalance] = useState(0);
    const [cartItems, setCartItems] = useState<Product[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [userLevel, setUserLevel] = useState('Gold');
    const [membershipProgress, setMembershipProgress] = useState(0);

    // ================= DONNÉES MOCKÉES STYLE ALIBABA =================
    const categories: Category[] = [
        { id: 'electronics', name: 'Électronique', icon: Smartphone, color: 'bg-blue-500', itemCount: 15234 },
        { id: 'fashion', name: 'Mode & Style', icon: Shirt, color: 'bg-pink-500', itemCount: 23456 },
        { id: 'home', name: 'Maison & Jardin', icon: Building2, color: 'bg-green-500', itemCount: 8934 },
        { id: 'sports', name: 'Sports & Loisirs', icon: Dumbbell, color: 'bg-orange-500', itemCount: 5678 },
        { id: 'auto', name: 'Auto & Moto', icon: Car, color: 'bg-red-500', itemCount: 3456 },
        { id: 'books', name: 'Livres & Médias', icon: BookOpen, color: 'bg-purple-500', itemCount: 12345 },
        { id: 'gaming', name: 'Gaming & Tech', icon: Gamepad2, color: 'bg-indigo-500', itemCount: 6789 },
        { id: 'food', name: 'Alimentation', icon: Pizza, color: 'bg-yellow-500', itemCount: 9876 }
    ];

    const hotProducts: Product[] = [
        {
            id: 'P001',
            name: 'iPhone 15 Pro Max 1TB Titanium',
            price: 1200000,
            originalPrice: 1350000,
            image: 'https://images.unsplash.com/photo-1592910119559-e9e8d9c9b0ee?w=400',
            rating: 4.9,
            reviews: 2847,
            category: 'electronics',
            discount: 11,
            inStock: true,
            seller: 'Apple Store Officiel',
            brand: 'Apple',
            isHot: true,
            isNew: true,
            isFreeShipping: true
        },
        {
            id: 'P002',
            name: 'MacBook Pro M3 16" 1TB SSD',
            price: 1800000,
            originalPrice: 2000000,
            image: 'https://images.unsplash.com/photo-1541807084-5b52b7fd0be2?w=400',
            rating: 4.8,
            reviews: 1567,
            category: 'electronics',
            discount: 10,
            inStock: true,
            seller: 'TechWorld Pro',
            brand: 'Apple',
            isHot: true,
            isFreeShipping: true
        },
        {
            id: 'P003',
            name: 'Samsung Galaxy S24 Ultra 512GB',
            price: 950000,
            originalPrice: 1100000,
            image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
            rating: 4.7,
            reviews: 3421,
            category: 'electronics',
            discount: 14,
            inStock: true,
            seller: 'Samsung Official',
            brand: 'Samsung',
            isHot: true,
            isFreeShipping: true
        },
        {
            id: 'P004',
            name: 'Nike Air Max 2024 Limited Edition',
            price: 185000,
            originalPrice: 220000,
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
            rating: 4.6,
            reviews: 892,
            category: 'fashion',
            discount: 16,
            inStock: true,
            seller: 'Nike Store',
            brand: 'Nike',
            isNew: true,
            isFreeShipping: true
        }
    ];

    const mockOrders: Order[] = [
        {
            id: 'ALI240001',
            status: 'shipping',
            total: 385000,
            items: [
                { name: 'iPhone 15 Pro', quantity: 1, price: 1200000, image: 'https://images.unsplash.com/photo-1592910119559-e9e8d9c9b0ee?w=100' },
                { name: 'AirPods Pro 2', quantity: 1, price: 185000, image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=100' }
            ],
            date: '2024-10-01',
            deliveryEstimate: 'Aujourd\'hui 14h-16h',
            trackingId: 'TRK224789456123',
            progress: 75
        },
        {
            id: 'ALI240002',
            status: 'delivered',
            total: 125000,
            items: [
                { name: 'Nike Air Max', quantity: 1, price: 125000, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100' }
            ],
            date: '2024-09-28',
            deliveryEstimate: 'Livré le 30/09',
            progress: 100
        }
    ];

    const mockTransactions: WalletTransaction[] = [
        {
            id: 'TXN240001',
            type: 'deposit',
            amount: 500000,
            date: '2024-10-01',
            description: 'Dépôt Mobile Money Orange',
            status: 'completed',
            category: 'Recharge'
        },
        {
            id: 'TXN240002',
            type: 'payment',
            amount: -385000,
            date: '2024-10-01',
            description: 'Achat iPhone 15 Pro + AirPods',
            status: 'completed',
            category: 'Shopping'
        },
        {
            id: 'TXN240003',
            type: 'cashback',
            amount: 15000,
            date: '2024-09-30',
            description: 'Cashback Gold Member 3%',
            status: 'completed',
            category: 'Bonus'
        }
    ];

    const notifications: Notification[] = [
        {
            id: 1,
            type: 'delivery',
            title: 'Livraison en cours',
            message: 'Votre iPhone 15 Pro arrive dans 2h. Préparez-vous!',
            time: '5 min',
            read: false,
            priority: 'high',
            actionUrl: '/tracking'
        },
        {
            id: 2,
            type: 'promo',
            title: 'Flash Sale 70% OFF',
            message: 'Mega promotion sur Samsung Galaxy - Plus que 3h!',
            time: '15 min',
            read: false,
            priority: 'medium'
        },
        {
            id: 3,
            type: 'order',
            title: 'Commande confirmée',
            message: 'Votre commande #ALI240001 est confirmée et en préparation',
            time: '1h',
            read: true,
            priority: 'medium'
        },
        {
            id: 4,
            type: 'security',
            title: 'Nouvelle connexion',
            message: 'Connexion depuis un nouvel appareil détectée',
            time: '2h',
            read: false,
            priority: 'high'
        }
    ];

    // ================= VÉRIFICATION SETUP UTILISATEUR =================
    useEffect(() => {
        if (user) {
            ensureUserSetup();
        }
    }, [user, ensureUserSetup]);

    // ================= FONCTIONS UTILITAIRES =================
    const formatPrice = useCallback((price: number) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    }, []);

    const getStatusColor = useCallback((status: string) => {
        const colors = {
            'delivered': 'bg-green-500',
            'shipping': 'bg-blue-500',
            'preparing': 'bg-orange-500',
            'confirmed': 'bg-purple-500',
            'pending': 'bg-yellow-500',
            'cancelled': 'bg-red-500'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-500';
    }, []);

    const getStatusText = useCallback((status: string) => {
        const texts = {
            'delivered': 'Livré',
            'shipping': 'En livraison',
            'preparing': 'En préparation',
            'confirmed': 'Confirmé',
            'pending': 'En attente',
            'cancelled': 'Annulé'
        };
        return texts[status as keyof typeof texts] || status;
    }, []);

    const addToCart = useCallback((product: Product) => {
        setCartItems(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) {
                toast.info('Produit déjà dans le panier');
                return prev;
            }
            toast.success(`${product.name} ajouté au panier`, {
                description: `Prix: ${formatPrice(product.price)}`,
                action: {
                    label: "Voir panier",
                    onClick: () => setActiveTab('cart')
                }
            });
            return [...prev, product];
        });
    }, [formatPrice]);

    const removeFromCart = useCallback((productId: string) => {
        setCartItems(prev => prev.filter(item => item.id !== productId));
        toast.success('Produit retiré du panier');
    }, []);

    const getNotificationIcon = useCallback((type: string) => {
        const icons = {
            'order': Package,
            'delivery': Truck,
            'promo': Gift,
            'security': Shield,
            'system': Settings
        };
        return icons[type as keyof typeof icons] || Bell;
    }, []);

    const markNotificationAsRead = useCallback((notificationId: number) => {
        // Logique pour marquer comme lu
        toast.success('Notification marquée comme lue');
    }, []);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    // ================= COMPOSANTS D'INTERFACE =================

    // Header Style Alibaba
    const AlibabaHeader = () => (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo et Menu Mobile */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="md:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">224</span>
                            </div>
                            <div className="hidden md:block">
                                <h1 className="text-xl font-bold text-gray-900">224SOLUTIONS</h1>
                                <p className="text-xs text-gray-500">Votre marketplace de confiance</p>
                            </div>
                        </div>
                    </div>

                    {/* Barre de recherche centrale */}
                    <div className="flex-1 max-w-2xl mx-4 relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Rechercher des millions de produits..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-20 h-10 border-2 border-orange-200 focus:border-orange-400 rounded-full"
                            />
                            <Button
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-orange-500 hover:bg-orange-600 rounded-full h-8 px-4"
                            >
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Actions utilisateur */}
                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="sm" className="relative">
                                    <Bell className="w-5 h-5" />
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-red-500">
                                            {notifications.filter(n => !n.read).length}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Notifications</SheetTitle>
                                    <SheetDescription>
                                        Vous avez {notifications.filter(n => !n.read).length} nouvelles notifications
                                    </SheetDescription>
                                </SheetHeader>
                                <ScrollArea className="h-full mt-4">
                                    <div className="space-y-4">
                                        {notifications.map(notification => {
                                            const IconComponent = getNotificationIcon(notification.type);
                                            return (
                                                <div
                                                    key={notification.id}
                                                    className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                                                        }`}
                                                    onClick={() => markNotificationAsRead(notification.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-2 rounded-full ${notification.priority === 'high' ? 'bg-red-100 text-red-600' :
                                                                notification.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                                                                    'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            <IconComponent className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-sm">{notification.title}</h4>
                                                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                                            <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                                                        </div>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>

                        {/* Panier */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="relative"
                            onClick={() => setActiveTab('cart')}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {cartItems.length > 0 && (
                                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-orange-500">
                                    {cartItems.length}
                                </Badge>
                            )}
                        </Button>

                        {/* Profil utilisateur */}
                        <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-r from-orange-400 to-red-500 text-white">
                                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden md:block">
                                <p className="text-sm font-semibold">{profile?.first_name}</p>
                                <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                        {userLevel}
                                    </Badge>
                                    <span className="text-xs text-gray-500">Niveau {membershipProgress}%</span>
                                </div>
                            </div>
                        </div>

                        <Button variant="ghost" size="sm" onClick={handleSignOut}>
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );

    // Navigation principale style Alibaba
    const AlibabaNavigation = () => (
        <div className="bg-white border-b border-gray-200">
            <div className="px-4 py-2">
                <ScrollArea className="w-full">
                    <div className="flex space-x-1 min-w-max">
                        <Button
                            variant={activeTab === 'home' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('home')}
                            className={activeTab === 'home' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                            <Home className="w-4 h-4 mr-2" />
                            Accueil
                        </Button>
                        <Button
                            variant={activeTab === 'categories' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('categories')}
                            className={activeTab === 'categories' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                            <Grid3X3 className="w-4 h-4 mr-2" />
                            Catégories
                        </Button>
                        <Button
                            variant={activeTab === 'cart' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('cart')}
                            className={activeTab === 'cart' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Panier ({cartItems.length})
                        </Button>
                        <Button
                            variant={activeTab === 'orders' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('orders')}
                            className={activeTab === 'orders' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                            <Package className="w-4 h-4 mr-2" />
                            Commandes
                        </Button>
                        <Button
                            variant={activeTab === 'wallet' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('wallet')}
                            className={activeTab === 'wallet' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                            <Wallet className="w-4 h-4 mr-2" />
                            Wallet
                        </Button>
                        <Button
                            variant={activeTab === 'messages' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('messages')}
                            className={activeTab === 'messages' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Messages
                        </Button>
                        <Button
                            variant={activeTab === 'profile' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setActiveTab('profile')}
                            className={activeTab === 'profile' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        >
                            <User className="w-4 h-4 mr-2" />
                            Profil
                        </Button>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );

    // Page d'accueil style Alibaba
    const HomeView = () => (
        <div className="space-y-6">
            {/* Carte de bienvenue et membership */}
            <Card className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white overflow-hidden">
                <CardContent className="p-6 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-8 -translate-x-8"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Salut {profile?.first_name || 'Client'} ! 👋</h2>
                                <p className="opacity-90">Prêt pour une nouvelle session shopping ?</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className="bg-yellow-400 text-yellow-900 font-bold">
                                        ⭐ {userLevel} Member
                                    </Badge>
                                </div>
                                <p className="text-sm opacity-80">Solde Wallet</p>
                                <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm">Progression vers Platinum</span>
                                    <span className="text-sm font-bold">{membershipProgress}%</span>
                                </div>
                                <Progress value={membershipProgress} className="h-2 bg-white/20">
                                    <div className="h-full bg-yellow-300 transition-all duration-500" style={{ width: `${membershipProgress}%` }}></div>
                                </Progress>
                                <p className="text-xs mt-1 opacity-80">
                                    Plus que {formatPrice(250000 - (membershipProgress * 2500))} d'achats pour Platinum
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                                    onClick={() => setActiveTab('wallet')}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Recharger
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('orders')}>
                    <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{mockOrders.length}</p>
                        <p className="text-sm text-gray-600">Commandes actives</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('cart')}>
                    <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                            <ShoppingCart className="w-6 h-6 text-orange-600" />
                        </div>
                        <p className="text-2xl font-bold text-orange-600">{cartItems.length}</p>
                        <p className="text-sm text-gray-600">Dans le panier</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
                            <Heart className="w-6 h-6 text-red-600" />
                        </div>
                        <p className="text-2xl font-bold text-red-600">87</p>
                        <p className="text-sm text-gray-600">Favoris</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-green-600">15K</p>
                        <p className="text-sm text-gray-600">Points fidélité</p>
                    </CardContent>
                </Card>
            </div>

            {/* Catégories populaires */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-500" />
                        Catégories Populaires
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                        {categories.map(category => {
                            const IconComponent = category.icon;
                            return (
                                <div
                                    key={category.id}
                                    className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedCategory(category.id);
                                        setActiveTab('categories');
                                    }}
                                >
                                    <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center mb-2`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-xs font-medium text-center">{category.name}</span>
                                    <span className="text-xs text-gray-500">{category.itemCount.toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Produits tendance avec style Alibaba */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-red-500" />
                            🔥 Tendances & Meilleures ventes
                        </CardTitle>
                        <Button variant="outline" size="sm">
                            Voir tout
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {hotProducts.map(product => (
                            <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md">
                                <CardContent className="p-0">
                                    <div className="relative">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                                        />

                                        {/* Badges */}
                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            {product.isHot && (
                                                <Badge className="bg-red-500 text-xs">🔥 HOT</Badge>
                                            )}
                                            {product.isNew && (
                                                <Badge className="bg-green-500 text-xs">🆕 NEW</Badge>
                                            )}
                                            {product.discount && (
                                                <Badge className="bg-orange-500 text-xs">-{product.discount}%</Badge>
                                            )}
                                        </div>

                                        {/* Actions rapides */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="secondary" size="sm" className="w-8 h-8 p-0 bg-white/90 hover:bg-white">
                                                <Heart className="w-4 h-4" />
                                            </Button>
                                            <Button variant="secondary" size="sm" className="w-8 h-8 p-0 bg-white/90 hover:bg-white">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {/* Livraison gratuite */}
                                        {product.isFreeShipping && (
                                            <div className="absolute bottom-2 left-2">
                                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                                    🚚 Livraison gratuite
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <div className="mb-2">
                                            <Badge variant="outline" className="text-xs mb-2">
                                                {product.brand}
                                            </Badge>
                                            <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                                        </div>

                                        <p className="text-xs text-gray-600 mb-2">{product.seller}</p>

                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3 h-3 ${i < Math.floor(product.rating)
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-gray-300'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500">({product.reviews.toLocaleString()})</span>
                                        </div>

                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-red-600">
                                                        {formatPrice(product.price)}
                                                    </span>
                                                    {product.originalPrice && (
                                                        <span className="text-sm line-through text-gray-400">
                                                            {formatPrice(product.originalPrice)}
                                                        </span>
                                                    )}
                                                </div>
                                                {product.discount && (
                                                    <span className="text-xs text-green-600 font-medium">
                                                        Économisez {formatPrice(product.originalPrice! - product.price)}
                                                    </span>
                                                )}
                                            </div>
                                            <Badge variant={product.inStock ? "default" : "destructive"} className="text-xs">
                                                {product.inStock ? "En stock" : "Rupture"}
                                            </Badge>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1 bg-orange-500 hover:bg-orange-600"
                                                size="sm"
                                                onClick={() => addToCart(product)}
                                                disabled={!product.inStock}
                                            >
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Ajouter
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="px-3"
                                            >
                                                <Zap className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Commandes récentes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Vos commandes récentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {mockOrders.slice(0, 2).map(order => (
                            <div key={order.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full ${getStatusColor(order.status)}`}></div>
                                    <div className="flex -space-x-2">
                                        {order.items.slice(0, 3).map((item, index) => (
                                            <img
                                                key={index}
                                                src={item.image}
                                                alt={item.name}
                                                className="w-10 h-10 rounded-full border-2 border-white object-cover"
                                            />
                                        ))}
                                        {order.items.length > 3 && (
                                            <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium">
                                                +{order.items.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold">{order.id}</h3>
                                        <span className="text-lg font-bold text-orange-600">{formatPrice(order.total)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{order.deliveryEstimate}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Progress value={order.progress} className="flex-1 h-2" />
                                        <span className="text-xs text-gray-500">{order.progress}%</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Badge className={getStatusColor(order.status)}>
                                        {getStatusText(order.status)}
                                    </Badge>
                                    {order.trackingId && (
                                        <Button variant="outline" size="sm">
                                            <Navigation className="w-4 h-4 mr-2" />
                                            Suivre
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActiveTab('orders')}
                        >
                            Voir toutes les commandes
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // Vue Catégories style Alibaba
    const CategoriesView = () => (
        <div className="space-y-6">
            {/* Header Catégories */}
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-2">🏪 Toutes les Catégories</h2>
                    <p className="opacity-90">Explorez notre vaste sélection de produits et services</p>
                </CardContent>
            </Card>

            {/* Filtres et recherche */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Rechercher dans les catégories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="w-4 h-4 mr-2" />
                            Filtres
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Grille des catégories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories.map(category => {
                    const IconComponent = category.icon;
                    return (
                        <Card
                            key={category.id}
                            className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-md"
                            onClick={() => {
                                setSelectedCategory(category.id);
                                toast.success(`Catégorie ${category.name} sélectionnée`);
                            }}
                        >
                            <CardContent className="p-6 text-center">
                                <div className={`w-20 h-20 ${category.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <IconComponent className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{category.name}</h3>
                                <p className="text-sm text-gray-600 mb-3">{category.itemCount.toLocaleString()} produits</p>
                                <Button className="w-full bg-gray-900 hover:bg-gray-800">
                                    Explorer
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Catégories populaires */}
            <Card>
                <CardHeader>
                    <CardTitle>🔥 Catégories les plus populaires</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {categories.slice(0, 4).map(category => {
                            const IconComponent = category.icon;
                            return (
                                <div key={category.id} className="text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                                    <div className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                    </div>
                                    <p className="font-medium text-sm">{category.name}</p>
                                    <p className="text-xs text-gray-500">+{Math.floor(Math.random() * 50 + 10)}% cette semaine</p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const CartView = () => {
        const cartTotal = cartItems.reduce((total, item) => total + item.price, 0);
        const estimatedDelivery = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');

        return (
            <div className="space-y-6">
                {/* Header du panier */}
                <Card className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">🛒 Mon Panier</h2>
                                <p className="opacity-90">{cartItems.length} article(s) sélectionné(s)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm opacity-80">Total estimé</p>
                                <p className="text-3xl font-bold">{formatPrice(cartTotal)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {cartItems.length === 0 ? (
                    // Panier vide
                    <Card>
                        <CardContent className="p-12 text-center">
                            <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                                <ShoppingCart className="w-16 h-16 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Votre panier est vide</h3>
                            <p className="text-gray-600 mb-6">Découvrez nos produits populaires et ajoutez-les à votre panier</p>
                            <Button
                                className="bg-orange-500 hover:bg-orange-600"
                                onClick={() => setActiveTab('home')}
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Continuer mes achats
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Liste des produits */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map(item => (
                                <Card key={item.id} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex gap-4">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-24 h-24 object-cover rounded-lg"
                                            />
                                            <div className="flex-1">
                                                <h3 className="font-semibold mb-1">{item.name}</h3>
                                                <p className="text-sm text-gray-600 mb-2">{item.seller}</p>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="flex items-center">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-3 h-3 ${i < Math.floor(item.rating)
                                                                    ? 'fill-yellow-400 text-yellow-400'
                                                                    : 'text-gray-300'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-gray-500">({item.reviews})</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-lg font-bold text-red-600">
                                                            {formatPrice(item.price)}
                                                        </span>
                                                        {item.originalPrice && (
                                                            <span className="text-sm line-through text-gray-400 ml-2">
                                                                {formatPrice(item.originalPrice)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm">
                                                            <Heart className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => removeFromCart(item.id)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Résumé de commande */}
                        <div className="space-y-4">
                            <Card className="sticky top-4">
                                <CardHeader>
                                    <CardTitle>Résumé de la commande</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Sous-total ({cartItems.length} articles)</span>
                                            <span className="font-semibold">{formatPrice(cartTotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Livraison</span>
                                            <span className="text-green-600 font-semibold">Gratuite</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>TVA (18%)</span>
                                            <span>{formatPrice(cartTotal * 0.18)}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Total</span>
                                            <span className="text-red-600">{formatPrice(cartTotal * 1.18)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <Truck className="w-4 h-4" />
                                            <span className="text-sm">Livraison gratuite</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-sm">Livraison estimée: {estimatedDelivery}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-purple-600">
                                            <Shield className="w-4 h-4" />
                                            <span className="text-sm">Protection acheteur incluse</span>
                                        </div>
                                    </div>

                                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-lg py-6">
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        Passer la commande
                                    </Button>

                                    <div className="space-y-2">
                                        <Button variant="outline" className="w-full">
                                            <Heart className="w-4 h-4 mr-2" />
                                            Sauvegarder pour plus tard
                                        </Button>
                                        <Button variant="outline" className="w-full">
                                            <Share className="w-4 h-4 mr-2" />
                                            Partager le panier
                                        </Button>
                                    </div>

                                    {/* Moyens de paiement acceptés */}
                                    <div className="pt-4 border-t">
                                        <p className="text-sm text-gray-600 mb-2">Paiements sécurisés</p>
                                        <div className="flex gap-2">
                                            <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">VISA</div>
                                            <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center">MC</div>
                                            <div className="w-8 h-5 bg-green-600 rounded text-white text-xs flex items-center justify-center">OM</div>
                                            <div className="w-8 h-5 bg-yellow-600 rounded text-white text-xs flex items-center justify-center">MW</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Produits recommandés */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Vous aimerez aussi</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {hotProducts.slice(0, 2).map(product => (
                                            <div key={product.id} className="flex gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                                                    <p className="text-sm text-red-600 font-bold">{formatPrice(product.price)}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => addToCart(product)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const OrdersView = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Commandes - En cours de développement</h2>
        </div>
    );

    const WalletView = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Wallet - En cours de développement</h2>
        </div>
    );

    const MessagesView = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Messages - En cours de développement</h2>
        </div>
    );

    const ProfileView = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Profil - En cours de développement</h2>
        </div>
    );

    // ================= RENDU PRINCIPAL =================
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AlibabaHeader />
            <AlibabaNavigation />

            {/* Contenu principal */}
            <main className="px-4 py-6 max-w-7xl mx-auto">
                {activeTab === 'home' && <HomeView />}
                {activeTab === 'categories' && <CategoriesView />}
                {activeTab === 'cart' && <CartView />}
                {activeTab === 'orders' && <OrdersView />}
                {activeTab === 'wallet' && <WalletView />}
                {activeTab === 'messages' && <MessagesView />}
                {activeTab === 'profile' && <ProfileView />}
            </main>

            {/* Footer de navigation */}
            <QuickFooter />
        </div>
    );
}
