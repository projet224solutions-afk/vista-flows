import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MapPin, Store, Utensils, Car, Truck, Plane, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import ServiceCard from "@/components/ServiceCard";
import QuickFooter from "@/components/QuickFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { useUniversalProducts } from "@/hooks/useUniversalProducts";
import { toast } from "sonner";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveContainer, ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";

// Types pour les données réelles
interface ServiceStats {
  id: string;
  title: string;
  icon: JSX.Element;
  count: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, getCartCount } = useCart();
  const { isMobile, isTablet } = useResponsive();
  
  // Rediriger les utilisateurs connectés vers leur dashboard approprié
  useRoleRedirect();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Utiliser le hook universel pour les produits
  const { products: universalProducts, loading: productsLoading } = useUniversalProducts({
    limit: 6,
    sortBy: 'newest',
    autoLoad: true
  });

  // Charger les statistiques des services à proximité
  useEffect(() => {
    loadServiceStats();
    
    // Mise à jour automatique toutes les 30 secondes
    const interval = setInterval(loadServiceStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Écouter les changements dans les profiles en temps réel
  useEffect(() => {
    const profilesChannel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        console.log('✅ Changement détecté dans les profiles - mise à jour...');
        loadServiceStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  // Charger les notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadServiceStats = async () => {
    try {
      // Compter les vendeurs/boutiques actifs
      const { count: vendorsCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true });

      // Compter les utilisateurs avec rôle taxi
      const { count: taxiCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'taxi');

      // Compter les utilisateurs avec rôle livreur
      const { count: livreurCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'livreur');

      console.log('📊 Stats chargées depuis la base de données:', {
        boutiques: vendorsCount,
        taxiMotos: taxiCount,
        livreurs: livreurCount
      });

      setServiceStats([
        {
          id: 'boutiques',
          title: 'Boutiques',
          icon: <Store className="w-6 h-6 text-vendeur-primary" />,
          count: `${vendorsCount || 0}`
        },
        {
          id: 'taxi',
          title: 'Taxi-Motos',
          icon: <Car className="w-6 h-6 text-taxi-primary" />,
          count: `${taxiCount || 0}`
        },
        {
          id: 'livraison',
          title: 'Livraison',
          icon: <Truck className="w-6 h-6 text-livreur-primary" />,
          count: `${livreurCount || 0}`
        }
      ]);
    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
      // Afficher des valeurs par défaut en cas d'erreur
      setServiceStats([
        {
          id: 'boutiques',
          title: 'Boutiques',
          icon: <Store className="w-6 h-6 text-vendeur-primary" />,
          count: '0'
        },
        {
          id: 'taxi',
          title: 'Taxi-Motos',
          icon: <Car className="w-6 h-6 text-taxi-primary" />,
          count: '0'
        },
        {
          id: 'livraison',
          title: 'Livraison',
          icon: <Truck className="w-6 h-6 text-livreur-primary" />,
          count: '0'
        }
      ]);
    }
  };

  const loadNotifications = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotificationCount(count || 0);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/marketplace?product=${productId}`);
  };

  const handleServiceClick = (serviceId: string) => {
    if (serviceId === 'boutiques') {
      navigate('/marketplace');
    } else if (serviceId === 'taxi') {
      navigate('/taxi-moto');
    } else if (serviceId === 'livraison') {
      // Rediriger vers l'interface livreur
      navigate('/livreur');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Responsive */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <ResponsiveContainer autoPadding>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`bg-vendeur-gradient rounded-lg flex items-center justify-center ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`}>
                <span className="text-white font-bold text-base md:text-lg">M</span>
              </div>
              <div>
                <h1 className={`font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>
                  MarketPlace
                </h1>
                <p className="text-xs text-muted-foreground flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  Conakry, Guinée
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {user && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => navigate('/cart')}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {getCartCount() > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {getCartCount()}
                    </Badge>
                  )}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => navigate('/profil')}
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs text-white flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
          
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            showFilter
          />
        </ResponsiveContainer>
      </header>

      {/* Bannière de bienvenue */}
      <section className="px-4 py-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <h2 className="text-2xl font-bold mb-2">Bienvenue sur 224Solutions</h2>
            <p className="text-sm opacity-90">Découvrez nos services à proximité et nos produits</p>
          </div>
        </Card>
      </section>

      {/* Section Créer un Service Professionnel - Hero */}
      <section className="px-4 py-6">
        <Card className="overflow-hidden border-2 border-primary shadow-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 animate-fade-in">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/20 rounded-full">
                  <Store className="w-12 h-12 text-primary" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Créez votre Service Professionnel
                </h2>
                <p className="text-muted-foreground text-base max-w-2xl mx-auto">
                  Restaurant, Boutique, Livraison, Transport, Beauté, Santé, Éducation... 
                  <br />
                  <span className="font-semibold text-foreground">15 catégories professionnelles</span> avec des outils complets inspirés des meilleurs standards internationaux
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  onClick={() => navigate('/services')}
                  size="lg"
                  className="gap-2 text-lg px-8 shadow-lg hover:scale-105 transition-transform"
                >
                  <Store className="w-5 h-5" />
                  Commencer maintenant
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/services')}
                  className="gap-2"
                >
                  Découvrir les 15 services
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <Utensils className="w-4 h-4 text-primary" />
                  <span>Restaurant</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Store className="w-4 h-4 text-primary" />
                  <span>Boutique</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Truck className="w-4 h-4 text-primary" />
                  <span>Livraison</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Car className="w-4 h-4 text-primary" />
                  <span>Transport</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Plane className="w-4 h-4 text-primary" />
                  <span>+11 autres</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Services à proximité - Responsive */}
      <section className="p-responsive">
        <h2 className="heading-responsive font-bold text-foreground mb-4">
          Services à proximité
        </h2>
        <ResponsiveGrid mobileCols={2} tabletCols={3} desktopCols={3} gap={isMobile ? "sm" : "md"}>
          {serviceStats.map((service) => (
            <Card 
              key={service.id} 
              className="text-center hover:shadow-elegant transition-all cursor-pointer"
              onClick={() => handleServiceClick(service.id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-accent rounded-full mb-2">
                    {service.icon}
                  </div>
                  <h3 className="font-medium text-sm mb-1">{service.title}</h3>
                  <p className="text-xs text-muted-foreground">{service.count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </ResponsiveGrid>
      </section>

      {/* Derniers articles - Responsive */}
      <section className="p-responsive">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading-responsive font-bold text-foreground">
            Derniers produits
          </h2>
          <Button 
            variant="ghost" 
            size={isMobile ? "sm" : "default"} 
            onClick={() => navigate('/marketplace')}
          >
            Voir tout
          </Button>
        </div>
        {productsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : universalProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun produit disponible</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/marketplace')}
            >
              Explorer la marketplace
            </Button>
          </div>
        ) : (
          <ResponsiveGrid mobileCols={1} tabletCols={2} desktopCols={3} gap={isMobile ? "sm" : "md"}>
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
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.images?.[0],
                    vendor_id: product.vendor_id,
                    vendor_name: product.vendor_name
                  });
                  toast.success('Produit ajouté au panier');
                }}
                onContact={() => navigate(`/messages?vendorId=${product.id}`)}
                isPremium={product.is_hot}
              />
            ))}
          </ResponsiveGrid>
        )}
      </section>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
};