import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MapPin, Store, Utensils, Car, Truck, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import ServiceCard from "@/components/ServiceCard";
import QuickFooter from "@/components/QuickFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Types pour les données réelles
interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  images?: string[] | null;
  vendor_id: string;
  vendors?: {
    business_name?: string;
  };
}

interface ServiceStats {
  id: string;
  title: string;
  icon: JSX.Element;
  count: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Charger les statistiques des services à proximité
  useEffect(() => {
    loadServiceStats();
  }, []);

  // Charger les produits récents
  useEffect(() => {
    loadRecentProducts();
  }, []);

  // Charger les notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadServiceStats = async () => {
    try {
      // Compter les vendeurs/boutiques
      const { count: vendorsCount } = await supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true });

      // Compter les conducteurs de taxi-moto
      const { count: driversCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_type', 'moto');

      // Compter les livreurs
      const { count: deliveryDriversCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_type', 'truck');

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
          count: `${driversCount || 0}`
        },
        {
          id: 'livraison',
          title: 'Livraison',
          icon: <Truck className="w-6 h-6 text-livreur-primary" />,
          count: `${deliveryDriversCount || 0}`
        }
      ]);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const loadRecentProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          description,
          images,
          vendor_id,
          vendors (
            business_name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setRecentProducts(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
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
      navigate('/tracking');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-vendeur-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">MarketPlace</h1>
                <p className="text-xs text-muted-foreground flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  Conakry, Guinée
                </p>
              </div>
            </div>
            
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
          
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            showFilter
          />
        </div>
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

      {/* Services à proximité */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Services à proximité</h2>
        <div className="grid grid-cols-3 gap-4">
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
        </div>
      </section>

      {/* Derniers articles */}
      <section className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Derniers produits</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/marketplace')}>
            Voir tout
          </Button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : recentProducts.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                image={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop'}
                title={product.name}
                price={product.price}
                vendor={product.vendors?.business_name || 'Vendeur'}
                rating={0}
                reviewCount={0}
                onBuy={() => handleProductClick(product.id)}
                onContact={() => navigate(`/marketplace?product=${product.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
};