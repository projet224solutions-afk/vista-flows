import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { supabase } from "@/integrations/supabase/client";
import QuickFooter from "@/components/QuickFooter";
import UserIdDisplay from "@/components/UserIdDisplay";
import UserProfileCard from "@/components/UserProfileCard";
import VirtualCardButton from "@/components/VirtualCardButton";
import WalletTransactionHistory from "@/components/WalletTransactionHistory";
import MultiCurrencyTransfer from "@/components/wallet/MultiCurrencyTransfer";

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

export default function ClientDashboard() {
  const { user, profile, signOut, ensureUserSetup } = useAuth();
  const navigate = useNavigate();

  // ================= ÉTATS PRINCIPAUX =================
  const [activeTab, setActiveTab] = useState('home');
  const [walletBalance, setWalletBalance] = useState(567890);
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLevel, setUserLevel] = useState('Gold');
  const [isFixingAccount, setIsFixingAccount] = useState(false);

  // ================= FONCTION DE RÉPARATION COMPTE =================
  const repareCompteClient = async () => {
    if (!user) return;

    setIsFixingAccount(true);
    toast.info('🔧 Réparation du compte en cours...');

    try {
      // Appeler la fonction de setup automatique
      await ensureUserSetup();

      // Recharger les données
      const [walletData, userIdData, cardData] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', user.id).single(),
        supabase.from('user_ids').select('*').eq('user_id', user.id).single(),
        supabase.from('virtual_cards').select('*').eq('user_id', user.id).single()
      ]);

      // Mettre à jour le solde affiché
      if (walletData.data) {
        setWalletBalance(walletData.data.balance);
      }

      toast.success('✅ Compte réparé ! ID, Wallet et Carte virtuelle créés.');

      // Rafraîchir la page pour afficher les nouvelles données
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Erreur réparation:', error);
      toast.error('❌ Erreur lors de la réparation du compte');
    } finally {
      setIsFixingAccount(false);
    }
  };
  const [membershipProgress, setMembershipProgress] = useState(75);
  const [showMultiCurrencyTransfer, setShowMultiCurrencyTransfer] = useState(false);

  // ================= DONNÉES MOCKÉES STYLE ALIBABA =================
  const categories: Category[] = [
    { id: 'electronics', name: 'Électronique', icon: Smartphone, color: 'bg-blue-500', itemCount: 15234 },
    { id: 'fashion', name: 'Mode & Style', icon: Shirt, color: 'bg-pink-500', itemCount: 23456 },
    { id: 'home', name: 'Maison & Jardin', icon: Building2, color: 'bg-green-500', itemCount: 8934 },
    { id: 'sports', name: 'Sports & Loisirs', icon: Dumbbell, color: 'bg-orange-500', itemCount: 5678 },
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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // Fonction pour gérer les clics sur les catégories
  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveTab('categories');
    toast.info(`Catégorie ${categoryId} sélectionnée`);
  }, []);

  // Fonction pour gérer la navigation
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    toast.info(`Navigation vers ${tab}`);
  }, []);

  // Fonction pour gérer la recherche
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      toast.success(`Recherche pour: ${searchQuery}`);
    } else {
      toast.info('Entrez un terme de recherche');
    }
  }, [searchQuery]);

  // Fonction pour ajouter aux favoris
  const addToFavorites = useCallback((productId: string) => {
    toast.success('Produit ajouté aux favoris');
  }, []);

  // Fonction pour voir les détails d'un produit
  const viewProductDetails = useCallback((productId: string) => {
    toast.info(`Affichage des détails du produit ${productId}`);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Style Alibaba */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">224</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">224SOLUTIONS</h1>
                <p className="text-xs text-gray-500">Style Alibaba</p>
              </div>
            </div>

            {/* Barre de recherche */}
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
                  onClick={handleSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-orange-500 hover:bg-orange-600 rounded-full h-8 px-4"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Actions utilisateur */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => handleTabChange('cart')}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-orange-500">
                    {cartItems.length}
                  </Badge>
                )}
              </Button>

              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-orange-400 to-red-500 text-white">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>

              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-2">
          <ScrollArea className="w-full">
            <div className="flex space-x-1 min-w-max">
              <Button
                variant={activeTab === 'home' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('home')}
                className={activeTab === 'home' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </Button>
              <Button
                variant={activeTab === 'categories' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('categories')}
                className={activeTab === 'categories' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Catégories
              </Button>
              <Button
                variant={activeTab === 'cart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('cart')}
                className={activeTab === 'cart' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Panier ({cartItems.length})
              </Button>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="px-4 py-6 max-w-7xl mx-auto">
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Carte de bienvenue */}
            <Card className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        Salut <UserIdDisplay className="inline" showBadge={false} /> ! 👋
                      </h2>
                      <UserIdDisplay layout="vertical" className="mb-2" />
                      <p className="opacity-90">Interface style Alibaba activée !</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-yellow-400 text-yellow-900 font-bold">
                          ⭐ {userLevel} Member
                        </Badge>
                      </div>
                      <p className="text-sm opacity-80">Solde Wallet</p>
                      <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-red-500/80 hover:bg-red-600/80 text-white"
                          onClick={repareCompteClient}
                          disabled={isFixingAccount}
                        >
                          {isFixingAccount ? 'Réparation...' : 'Réparer Compte'}
                        </Button>
                        <VirtualCardButton
                          size="sm"
                          variant="outline"
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                        />
                      </div>
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
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profil utilisateur avec ID et wallet */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <UserProfileCard />
              </div>
              <div className="lg:col-span-2">
                <WalletTransactionHistory />
              </div>
            </div>

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  Actions Rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <VirtualCardButton className="w-full" />
                  <Button
                    onClick={() => setShowMultiCurrencyTransfer(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Transfert Multi-Devises
                  </Button>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600">
                    ✅ <strong>Wallet créé automatiquement</strong><br />
                    💡 Votre ID apparaît sous votre nom<br />
                    🎯 Système 100% opérationnel
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => toast.info('Affichage des commandes actives')}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">3</p>
                  <p className="text-sm text-gray-600">Commandes actives</p>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleTabChange('cart')}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{cartItems.length}</p>
                  <p className="text-sm text-gray-600">Dans le panier</p>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => toast.info('Affichage des favoris')}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">87</p>
                  <p className="text-sm text-gray-600">Favoris</p>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => toast.info('Affichage des points fidélité')}
              >
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map(category => {
                    const IconComponent = category.icon;
                    return (
                      <div
                        key={category.id}
                        className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleCategoryClick(category.id)}
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

            {/* Produits tendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  🔥 Tendances & Meilleures ventes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hotProducts.map(product => (
                    <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md">
                      <CardContent className="p-0">
                        <div className="relative">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300"
                          />

                          {product.isHot && (
                            <Badge className="absolute top-2 left-2 bg-red-500 text-xs">🔥 HOT</Badge>
                          )}
                          {product.isNew && (
                            <Badge className="absolute top-2 right-2 bg-green-500 text-xs">🆕 NEW</Badge>
                          )}
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] mb-2">{product.name}</h3>
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
                              <span className="text-lg font-bold text-red-600">
                                {formatPrice(product.price)}
                              </span>
                              {product.originalPrice && (
                                <span className="text-sm line-through text-gray-400 ml-2">
                                  {formatPrice(product.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-orange-500 hover:bg-orange-600"
                              size="sm"
                              onClick={() => addToCart(product)}
                            >
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Ajouter
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addToFavorites(product.id)}
                              className="px-3"
                            >
                              <Heart className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewProductDetails(product.id)}
                              className="px-3"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-2">🏪 Toutes les Catégories</h2>
                <p className="opacity-90">Explorez notre vaste sélection de produits et services</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map(category => {
                const IconComponent = category.icon;
                return (
                  <Card key={category.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer">
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
          </div>
        )}

        {activeTab === 'cart' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">🛒 Mon Panier</h2>
                    <p className="opacity-90">{cartItems.length} article(s) sélectionné(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {cartItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-16 h-16 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Votre panier est vide</h3>
                  <p className="text-gray-600 mb-6">Découvrez nos produits populaires et ajoutez-les à votre panier</p>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => handleTabChange('home')}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Continuer mes achats
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {cartItems.map(item => (
                  <Card key={item.id}>
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
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-red-600">
                              {formatPrice(item.price)}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCartItems(prev => prev.filter(p => p.id !== item.id))}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Transfert Multi-Devises */}
      {showMultiCurrencyTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">💸 Transfert Multi-Devises</h2>
              <Button
                variant="ghost"
                onClick={() => setShowMultiCurrencyTransfer(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4">
              <MultiCurrencyTransfer />
            </div>
          </div>
        </div>
      )}

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}