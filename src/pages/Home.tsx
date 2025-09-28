import { useState } from "react";
import { Bell, MapPin, Store, Utensils, Car, Truck, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import ServiceCard from "@/components/ServiceCard";
import NavigationFooter from "@/components/NavigationFooter";

const promotions = [
  {
    id: 1,
    title: "Livraison gratuite",
    description: "Pour toute commande supérieure à 25 000 FCFA",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=300&fit=crop",
    color: "bg-vendeur-gradient"
  },
  {
    id: 2,
    title: "Nouveaux vendeurs -20%",
    description: "Découvrez nos nouveaux partenaires",
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=300&fit=crop",
    color: "bg-client-gradient"
  }
];

const nearbyServices = [
  {
    id: 'boutiques',
    title: 'Boutiques',
    icon: <Store className="w-6 h-6 text-vendeur-primary" />,
    count: '2.5k+'
  },
  {
    id: 'restaurants',
    title: 'Restaurants',
    icon: <Utensils className="w-6 h-6 text-livreur-primary" />,
    count: '850+'
  },
  {
    id: 'taxi',
    title: 'Taxi-Motos',
    icon: <Car className="w-6 h-6 text-taxi-primary" />,
    count: '450+'
  },
  {
    id: 'livraison',
    title: 'Livraison',
    icon: <Truck className="w-6 h-6 text-livreur-primary" />,
    count: '200+'
  },
  {
    id: 'international',
    title: 'International',
    icon: <Plane className="w-6 h-6 text-transitaire-primary" />,
    count: '50+'
  }
];

const recentProducts = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    title: 'Casque Audio Bluetooth Premium',
    price: 45000,
    originalPrice: 55000,
    vendor: 'TechStore Dakar',
    rating: 4.8,
    reviewCount: 234,
    isPremium: true
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop',
    title: 'Chaussures de Sport Nike',
    price: 85000,
    vendor: 'SportWorld',
    rating: 4.6,
    reviewCount: 189
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&h=300&fit=crop',
    title: 'Montre Connectée Samsung',
    price: 125000,
    vendor: 'ElectroPlus',
    rating: 4.7,
    reviewCount: 156,
    isPremium: true
  }
];

const recommendedServices = [
  {
    id: '1',
    icon: <Truck className="w-6 h-6 text-livreur-primary" />,
    title: 'Livraison Express',
    description: 'Livraison en moins de 2h dans Dakar',
    provider: 'FastDelivery',
    rating: 4.9,
    reviewCount: 1250,
    distance: '2.5 km',
    estimatedTime: '30 min',
    price: '2 500 FCFA'
  },
  {
    id: '2',
    icon: <Car className="w-6 h-6 text-taxi-primary" />,
    title: 'Course Taxi-Moto',
    description: 'Transport rapide et sécurisé',
    provider: 'MotoExpress',
    rating: 4.7,
    reviewCount: 890,
    distance: '1.2 km',
    estimatedTime: '15 min',
    price: '1 800 FCFA'
  }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPromo, setCurrentPromo] = useState(0);

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
                  Dakar, Sénégal
                </p>
              </div>
            </div>
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs text-white flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
          
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            showFilter
          />
        </div>
      </header>

      {/* Promotions Carousel */}
      <section className="px-4 py-6">
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {promotions.map((promo, index) => (
              <Card key={promo.id} className="min-w-[300px] overflow-hidden">
                <div className={`h-32 ${promo.color} p-4 flex flex-col justify-center text-white relative`}>
                  <h3 className="text-lg font-bold mb-1">{promo.title}</h3>
                  <p className="text-sm opacity-90">{promo.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services à proximité */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Services à proximité</h2>
        <div className="grid grid-cols-3 gap-4">
          {nearbyServices.map((service) => (
            <Card key={service.id} className="text-center hover:shadow-elegant transition-all">
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
          <h2 className="text-xl font-bold text-foreground">Derniers articles</h2>
          <Button variant="ghost" size="sm">Voir tout</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onBuy={() => console.log('Buy', product.id)}
              onContact={() => console.log('Contact', product.id)}
            />
          ))}
        </div>
      </section>

      {/* Services recommandés */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Services recommandés</h2>
        <div className="space-y-4">
          {recommendedServices.map((service) => (
            <ServiceCard
              key={service.id}
              {...service}
              onBook={() => console.log('Book', service.id)}
            />
          ))}
        </div>
      </section>

      <NavigationFooter />
    </div>
  );
}