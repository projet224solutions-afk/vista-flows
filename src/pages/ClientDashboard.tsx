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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useClientData } from "@/hooks/useClientData";
import UserProfileCard from "@/components/UserProfileCard";
import UniversalCommunicationHub from "@/components/communication/UniversalCommunicationHub";
import CopiloteChat from "@/components/copilot/CopiloteChat";
import UniversalWalletTransactions from "@/components/wallet/UniversalWalletTransactions";
import { WalletBalanceWidget } from "@/components/wallet/WalletBalanceWidget";
import { QuickTransferButton } from "@/components/wallet/QuickTransferButton";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { IdSystemIndicator } from "@/components/IdSystemIndicator";

export default function ClientDashboard() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    products,
    orders,
    cartItems,
    favorites,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
    createOrder,
    toggleFavorite,
    searchProducts,
  } = useClientData();

  const [filteredProducts, setFilteredProducts] = useState(products);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' GNF';
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }
    const results = await searchProducts(searchQuery);
    setFilteredProducts(results);
    toast.success(`${results.length} produit(s) trouvé(s)`);
    setActiveTab('products');
  };

  const handleCheckout = async () => {
    if (!user?.id) {
      toast.error('Veuillez vous connecter');
      return;
    }
    await createOrder(user.id);
    setActiveTab('orders');
  };

  // Mettre à jour les produits filtrés quand les produits changent
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');

  return (
    <div className="min-h-screen bg-background">
      {/* Header Premium */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-client-gradient flex items-center justify-center shadow-elegant">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground">224SOLUTIONS</h1>
                  <UserIdDisplay layout="horizontal" showBadge={true} className="text-xs" />
                </div>
                <p className="text-xs text-muted-foreground">Marketplace</p>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des produits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9 border-border focus-visible:ring-client-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <WalletBalanceWidget className="max-w-[250px]" showTransferButton={false} />
            </div>
            <QuickTransferButton variant="ghost" size="icon" showText={false} />
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setActiveTab('cart')}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItems.length > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-client-primary text-xs">
                  {cartItems.length}
                </Badge>
              )}
            </Button>

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid bg-muted/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-client-primary data-[state=active]:text-white">
              <Home className="w-4 h-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-client-primary data-[state=active]:text-white">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Produits
            </TabsTrigger>
            <TabsTrigger value="cart" className="data-[state=active]:bg-client-primary data-[state=active]:text-white">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Panier
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-client-primary data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="communication" className="data-[state=active]:bg-client-primary data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="copilot" className="data-[state=active]:bg-client-primary data-[state=active]:text-white">
              <Bot className="w-4 h-4 mr-2" />
              Assistant IA
            </TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-6 animate-fade-in">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Profil utilisateur */}
              <div className="lg:col-span-2">
                <UserProfileCard showWalletDetails={false} />
              </div>

              {/* Système d'ID */}
              <div>
                <IdSystemIndicator />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Wallet et transactions */}
              <div className="lg:col-span-2">
                <UniversalWalletTransactions />
              </div>
              {/* Statistiques rapides */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-lg">Statistiques</CardTitle>
                  <CardDescription>Votre activité</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-client-accent rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-client-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-client-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Commandes</p>
                        <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">En cours</p>
                        <p className="text-2xl font-bold text-foreground">{activeOrders.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-purple-600" />
                      </div>
                       <div>
                        <p className="text-sm text-muted-foreground">Favoris</p>
                        <p className="text-2xl font-bold text-foreground">{favorites.length}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                    {products.slice(0, 6).map((product) => (
                      <Card key={product.id} className="min-w-[250px] hover:shadow-glow transition-all">
                        <CardContent className="p-4 space-y-3">
                          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm line-clamp-2">{product.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs ml-1">4.5</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">En stock</Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <p className="text-lg font-bold text-client-primary">{formatPrice(product.price)}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => addToCart(product)} 
                                className="flex-1 border-client-primary text-client-primary hover:bg-client-primary hover:text-white"
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Panier
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  addToCart(product);
                                  handleCheckout();
                                }}
                                className="flex-1 bg-client-primary hover:bg-client-primary/90"
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Acheter
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full"
                              onClick={() => {
                                toast.info('Fonctionnalité de contact en cours de développement');
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Contacter
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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
                {loading ? (
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
                    {filteredProducts.map((product) => (
                      <Card key={product.id} className="hover:shadow-glow transition-all group">
                        <CardContent className="p-4 space-y-3">
                          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                            <ShoppingBag className="w-16 h-16 text-muted-foreground" />
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => toggleFavorite(product.id)}
                            >
                              <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                            </Button>
                          </div>
                          <div>
                            <h4 className="font-semibold line-clamp-2 group-hover:text-client-primary transition-colors">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs ml-1">4.5</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {product.inStock ? 'En stock' : 'Rupture'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <p className="text-xl font-bold text-client-primary">{formatPrice(product.price)}</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addToCart(product)}
                                disabled={!product.inStock}
                                className="border-client-primary text-client-primary hover:bg-client-primary hover:text-white"
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Panier
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  addToCart(product);
                                  handleCheckout();
                                }}
                                disabled={!product.inStock}
                                className="bg-client-primary hover:bg-client-primary/90"
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Acheter
                              </Button>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full mt-2"
                            onClick={() => {
                              toast.info('Fonctionnalité de contact en cours de développement');
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Contacter le vendeur
                          </Button>
                        </CardContent>
                      </Card>
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
                <CardDescription>Suivez l'état de vos commandes</CardDescription>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune commande</h3>
                    <p className="text-muted-foreground">Vos commandes apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id} className="hover:shadow-glow transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold">Commande #{order.id.slice(0, 8)}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.date).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <Badge className={
                              order.status === 'completed' ? 'bg-client-primary' :
                              order.status === 'processing' ? 'bg-orange-500' :
                              'bg-muted'
                            }>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-client-primary">
                              {formatPrice(order.total)}
                            </p>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              Détails
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication */}
          <TabsContent value="communication" className="animate-fade-in">
            <UniversalCommunicationHub />
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
    </div>
  );
}
