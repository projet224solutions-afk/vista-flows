import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingBag, Heart, Package, Search, CreditCard, MessageSquare,
  LogOut, Home, Grid3X3, ShoppingCart, TrendingUp, Star, Eye,
  Plus, Truck, Bot, User
} from 'lucide-react';
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useClientData } from "@/hooks/useClientData";
import { useUniversalProducts } from "@/hooks/useUniversalProducts";
import ProductCard from "@/components/ProductCard";
import UserProfileCard from "@/components/UserProfileCard";
import UniversalCommunicationHub from "@/components/communication/UniversalCommunicationHub";
import CopiloteChat from "@/components/copilot/CopiloteChat";
import UniversalWalletTransactions from "@/components/wallet/UniversalWalletTransactions";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { IdSystemIndicator } from "@/components/IdSystemIndicator";
import ProductPaymentModal from "@/components/ecommerce/ProductPaymentModal";
import ClientOrdersList from "@/components/client/ClientOrdersList";
import { supabase } from "@/lib/supabaseClient";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveGrid, ResponsiveStack } from "@/components/responsive/ResponsiveContainer";
import ProductDetailModal from "@/components/marketplace/ProductDetailModal";
import { useCart } from "@/contexts/CartContext";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useClientErrorBoundary } from "@/hooks/useClientErrorBoundary";

import { useClientStats } from "@/hooks/useClientStats";

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const responsive = useResponsive();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Gestion des erreurs centralisée
  const { error, captureError, clearError } = useClientErrorBoundary();
  
  // Stats optimisées avec SQL
  const { stats: clientStats, loading: statsLoading } = useClientStats();

  // Utiliser le hook universel pour les produits
  const { products: universalProducts, loading: productsLoading } = useUniversalProducts({
    limit: 50,
    sortBy: 'newest',
    autoLoad: true,
    searchQuery
  });

  const {
    orders,
    cartItems,
    favorites,
    addToCart,
    removeFromCart,
    clearCart,
    createOrder,
    toggleFavorite,
    contactVendor,
    loadAllData
  } = useClientData();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [communicationRefresh, setCommunicationRefresh] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const { addToCart: addToCartContext } = useCart();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('common.signOutSuccess'));
      navigate('/');
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' GNF';
  };

  // Charger le customer_id
  useEffect(() => {
    const loadCustomerId = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setCustomerId(data.id);
      }
    };
    
    loadCustomerId();
  }, [user?.id]);

  const handleCheckout = async () => {
    if (!user?.id) {
      toast.error(t('client.connectionRequired'));
      return;
    }
    
    if (cartItems.length === 0) {
      toast.error(t('client.emptyCart'));
      return;
    }
    
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    clearCart();
    loadAllData(user?.id);
    setActiveTab('orders');
    toast.success('Commande créée avec succès');
  };

  // Ouvrir le modal de détails du produit
  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setShowProductModal(true);
  };

  // Contacter le vendeur via modal ou direct
  const handleContactVendor = async (product: any) => {
    if (!product.vendor_user_id) {
      toast.error('Informations du vendeur non disponibles');
      return;
    }

    try {
      if (!user) {
        toast.error('Veuillez vous connecter');
        return;
      }

      const initialMessage = `Bonjour, je suis intéressé par votre produit "${product.name}". Pouvez-vous me donner plus d'informations ?`;
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: product.vendor_user_id,
          content: initialMessage,
          type: 'text'
        });

      if (error) throw error;

      toast.success('Message envoyé au vendeur!');
      setActiveTab('communication');
      setCommunicationRefresh(prev => prev + 1);
    } catch (error) {
      console.error('Erreur contact vendeur:', error);
      toast.error('Impossible de contacter le vendeur');
    }
  };

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Premium - Responsive */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className={`container flex ${responsive.isMobile ? 'h-14' : 'h-16'} items-center justify-between ${responsive.isMobile ? 'px-3' : 'px-4'}`}>
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className={`${responsive.isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg bg-client-gradient flex items-center justify-center shadow-elegant`}>
                <ShoppingBag className={`${responsive.isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-white`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 md:gap-2">
                  <h1 className={`${responsive.isMobile ? 'text-sm' : 'text-lg'} font-bold text-foreground truncate`}>
                    {responsive.isMobile ? '224SOL' : '224SOLUTIONS'}
                  </h1>
                  {!responsive.isMobile && (
                    <>
                      <UserIdDisplay layout="horizontal" showBadge={true} className="text-xs" />
                      
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">Marketplace</p>
              </div>
            </div>
          </div>

          {/* Barre de recherche - Cachée sur mobile, visible sur tablette+ */}
          {!responsive.isMobile && (
            <div className="flex-1 max-w-md mx-4 lg:mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-border focus-visible:ring-client-primary"
                />
              </div>
            </div>
          )}

          {/* Actions - Responsive */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {!responsive.isMobile && (
              <div className="hidden lg:block">
                <WalletBalanceWidget className="max-w-[250px]" showTransferButton={false} />
              </div>
            )}
            <QuickTransferButton 
              variant="ghost" 
              size={responsive.isMobile ? 'icon' : 'icon'} 
              showText={false} 
            />
            <Button
              variant="ghost"
              size={responsive.isMobile ? 'icon' : 'icon'}
              className="relative"
              onClick={() => setActiveTab('cart')}
            >
              <ShoppingCart className={responsive.isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
              {cartItems.length > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-client-primary text-xs">
                  {cartItems.length}
                </Badge>
              )}
            </Button>

            {!responsive.isMobile && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveTab('profile')}
                >
                  <User className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </>
            )}
            
            {/* Menu mobile */}
            {responsive.isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Barre de recherche mobile */}
        {responsive.isMobile && (
          <div className="px-3 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des produits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`container ${responsive.isMobile ? 'px-3 py-4' : 'px-4 py-6'}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          {/* Navigation par onglets - Responsive */}
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
            <TabsList className={`${responsive.isMobile ? 'inline-flex w-max' : 'grid w-full grid-cols-6 lg:w-auto lg:inline-grid'} bg-muted/50 min-w-full md:min-w-0`}>
              <TabsTrigger 
                value="overview" 
                className={`data-[state=active]:bg-client-primary data-[state=active]:text-white ${responsive.isMobile ? 'text-xs px-3' : ''}`}
              >
                <Home className={`${responsive.isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1 md:mr-2`} />
                <span className={responsive.isMobile ? 'hidden' : ''}>Vue d'ensemble</span>
                <span className={responsive.isMobile ? '' : 'hidden'}>Vue</span>
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className={`data-[state=active]:bg-client-primary data-[state=active]:text-white ${responsive.isMobile ? 'text-xs px-3' : ''}`}
              >
                <Grid3X3 className={`${responsive.isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1 md:mr-2`} />
                Produits
              </TabsTrigger>
              <TabsTrigger 
                value="cart" 
                className={`data-[state=active]:bg-client-primary data-[state=active]:text-white ${responsive.isMobile ? 'text-xs px-3' : ''}`}
              >
                <ShoppingCart className={`${responsive.isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1 md:mr-2`} />
                Panier
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className={`data-[state=active]:bg-client-primary data-[state=active]:text-white ${responsive.isMobile ? 'text-xs px-3' : ''}`}
              >
                <Package className={`${responsive.isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1 md:mr-2`} />
                <span className={responsive.isMobile ? 'hidden' : ''}>Commandes</span>
                <span className={responsive.isMobile ? '' : 'hidden'}>Cmd</span>
              </TabsTrigger>
              <TabsTrigger 
                value="communication" 
                className={`data-[state=active]:bg-client-primary data-[state=active]:text-white ${responsive.isMobile ? 'text-xs px-3' : ''}`}
              >
                <MessageSquare className={`${responsive.isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1 md:mr-2`} />
                <span className={responsive.isMobile ? 'hidden' : ''}>Messages</span>
                <span className={responsive.isMobile ? '' : 'hidden'}>Msg</span>
              </TabsTrigger>
              <TabsTrigger 
                value="copilot" 
                className={`data-[state=active]:bg-client-primary data-[state=active]:text-white ${responsive.isMobile ? 'text-xs px-3' : ''}`}
              >
                <Bot className={`${responsive.isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-1 md:mr-2`} />
                <span className={responsive.isMobile ? 'hidden' : ''}>Assistant IA</span>
                <span className={responsive.isMobile ? '' : 'hidden'}>IA</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-4 md:space-y-6 animate-fade-in">
            <ResponsiveGrid mobileCols={1} tabletCols={2} desktopCols={3} gap="md">
              {/* Profil utilisateur */}
              <div className="lg:col-span-2">
                <UserProfileCard showWalletDetails={false} />
              </div>

              {/* Système d'ID */}
              <div>
                <IdSystemIndicator />
              </div>
            </ResponsiveGrid>

            <ResponsiveGrid mobileCols={1} tabletCols={2} desktopCols={3} gap="md">
              {/* Wallet et transactions */}
              <div className="lg:col-span-2">
                <UniversalWalletTransactions />
              </div>
              {/* Statistiques rapides - SQL optimisées */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className={responsive.isMobile ? 'text-base' : 'text-lg'}>Statistiques</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Votre activité</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  {statsLoading ? (
                    <div className="text-center py-4 text-muted-foreground">Chargement...</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-3 bg-client-accent rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`${responsive.isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-client-primary/10 flex items-center justify-center`}>
                            <Package className={`${responsive.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-client-primary`} />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-muted-foreground">Commandes</p>
                            <p className={`${responsive.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                              {clientStats?.total_orders || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`${responsive.isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center`}>
                            <TrendingUp className={`${responsive.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-orange-600`} />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-muted-foreground">En cours</p>
                            <p className={`${responsive.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                              {clientStats?.active_orders || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`${responsive.isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center`}>
                            <Heart className={`${responsive.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-purple-600`} />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-muted-foreground">Favoris</p>
                            <p className={`${responsive.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground`}>
                              {clientStats?.favorites_count || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`${responsive.isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center`}>
                            <CreditCard className={`${responsive.isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-green-600`} />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm text-muted-foreground">Total dépensé</p>
                            <p className={`${responsive.isMobile ? 'text-base' : 'text-lg'} font-bold text-foreground`}>
                              {formatPrice(clientStats?.total_spent || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </ResponsiveGrid>

            {/* Produits recommandés */}
            <Card className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Produits populaires</CardTitle>
                    <CardDescription>Découvrez nos meilleures ventes</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('products')}>
                    Voir tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="flex gap-4 pb-4">
                    {universalProducts.slice(0, 6).map((product) => (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        image={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop'}
                        title={product.name}
                        price={product.price}
                        vendor={product.vendor_name}
                        rating={product.rating}
                        reviewCount={product.reviews_count}
                        onBuy={() => handleProductClick(product.id)}
                        onAddToCart={() => {
                          addToCartContext({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.images?.[0],
                            vendor_id: product.vendor_id,
                            vendor_name: product.vendor_name
                          });
                          toast.success('Produit ajouté au panier');
                        }}
                        onContact={() => handleContactVendor(product)}
                        isPremium={product.is_hot}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Produits */}
          <TabsContent value="products" className="space-y-6 animate-fade-in">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Catalogue de produits</CardTitle>
                <CardDescription>Parcourez notre sélection complète</CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4 space-y-3">
                          <div className="aspect-square bg-muted rounded-lg" />
                          <div className="h-4 bg-muted rounded" />
                          <div className="h-4 bg-muted rounded w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {universalProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        image={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop'}
                        title={product.name}
                        price={product.price}
                        vendor={product.vendor_name}
                        rating={product.rating}
                        reviewCount={product.reviews_count}
                        onBuy={() => handleProductClick(product.id)}
                        onAddToCart={() => {
                          addToCartContext({
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.images?.[0],
                            vendor_id: product.vendor_id,
                            vendor_name: product.vendor_name
                          });
                          toast.success('Produit ajouté au panier');
                        }}
                        onContact={() => handleContactVendor(product)}
                        isPremium={product.is_hot}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Panier */}
          <TabsContent value="cart" className="space-y-6 animate-fade-in">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Mon panier</CardTitle>
                <CardDescription>
                  {cartItems.length} article{cartItems.length > 1 ? 's' : ''} dans votre panier
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Votre panier est vide</h3>
                    <p className="text-muted-foreground mb-6">Ajoutez des produits pour commencer vos achats</p>
                    <Button onClick={() => setActiveTab('products')} className="bg-client-primary hover:bg-client-primary/90">
                      Parcourir les produits
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">Prix unitaire: {formatPrice(item.price)}</p>
                            <p className="text-lg font-bold text-client-primary mt-1">
                              {formatPrice(item.price)}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <LogOut className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    <Card className="bg-client-accent">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-semibold">Total</span>
                          <span className="text-2xl font-bold text-client-primary">
                            {formatPrice(cartItems.reduce((sum, item) => sum + item.price, 0))}
                          </span>
                        </div>
                        <Button 
                          className="w-full bg-client-primary hover:bg-client-primary/90" 
                          size="lg"
                          onClick={handleCheckout}
                        >
                          <CreditCard className="w-5 h-5 mr-2" />
                          Procéder au paiement
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commandes */}
          <TabsContent value="orders" className="space-y-6 animate-fade-in">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Mes commandes</CardTitle>
                <CardDescription>Suivez l'état de vos commandes et confirmez les livraisons</CardDescription>
              </CardHeader>
              <CardContent>
                <ClientOrdersList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication */}
          <TabsContent value="communication" className="animate-fade-in">
            <UniversalCommunicationHub 
              selectedConversationId={selectedConversationId}
              refreshTrigger={communicationRefresh}
            />
          </TabsContent>

          {/* Copilote */}
          <TabsContent value="copilot" className="animate-fade-in">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Assistant IA</CardTitle>
                <CardDescription>Votre copilote intelligent pour vos achats</CardDescription>
              </CardHeader>
              <CardContent>
                <CopiloteChat />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal de paiement */}
      {user?.id && customerId && (
        <ProductPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          cartItems={cartItems}
          totalAmount={cartItems.reduce((sum, item) => sum + item.price, 0)}
          onPaymentSuccess={handlePaymentSuccess}
          userId={user.id}
          customerId={customerId}
        />
      )}
      
      {/* Modal de détails du produit */}
      <ProductDetailModal
        productId={selectedProductId}
        open={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setSelectedProductId(null);
        }}
      />

      {/* Note: CommunicationWidget et QuickFooter sont rendus globalement dans App.tsx */}
    </div>
  );
}
