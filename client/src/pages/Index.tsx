import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import QuickFooter from "@/components/QuickFooter";
import {
  Search,
  Grid3X3,
  MessageSquare,
  Truck,
  Users,
  Star,
  Crown,
  Shield,
  Zap,
  Globe,
  Clock,
  ShoppingBag,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const mainServices = [
  {
    id: 'categories',
    title: 'Explorer par catégories',
    description: 'Découvrez nos produits par catégorie',
    icon: Grid3X3,
    color: 'bg-gradient-to-br from-purple-500 to-purple-700',
    path: '/marketplace',
    stats: '2,500+ produits'
  },
  {
    id: 'devis',
    title: 'Demander un devis',
    description: 'Obtenez des devis personnalisés',
    icon: MessageSquare,
    color: 'bg-gradient-to-br from-blue-500 to-blue-700',
    path: '/devis',
    stats: 'Réponse 24h'
  },
  {
    id: 'proximite',
    title: 'Services de proximité',
    description: 'Trouvez des services près de vous',
    icon: Truck,
    color: 'bg-gradient-to-br from-green-500 to-green-700',
    path: '/services-proximite',
    stats: '500+ services'
  },
  {
    id: 'vendeur',
    title: 'Devenir vendeur',
    description: 'Rejoignez notre marketplace',
    icon: Users,
    color: 'bg-gradient-to-br from-orange-500 to-orange-700',
    path: '/auth',
    stats: '1,200+ vendeurs'
  }
];

const popularCategories = [
  {
    name: 'Électronique',
    icon: '📱',
    count: '850+ produits',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=250&fit=crop'
  },
  {
    name: 'Mode & Beauté',
    icon: '👗',
    count: '1,200+ produits',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=250&fit=crop'
  },
  {
    name: 'Maison & Jardin',
    icon: '🏠',
    count: '650+ produits',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=250&fit=crop'
  },
  {
    name: 'Alimentation',
    icon: '🍎',
    count: '400+ produits',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=250&fit=crop'
  },
  {
    name: 'Automobile',
    icon: '🚗',
    count: '300+ produits',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=250&fit=crop'
  },
  {
    name: 'Services',
    icon: '🔧',
    count: '200+ services',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop'
  }
];

const trendingProducts = [
  {
    id: 1,
    name: 'Smartphone Samsung Galaxy A54',
    price: '285,000 FCFA',
    originalPrice: '320,000 FCFA',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    rating: 4.5,
    reviews: 128,
    badge: 'Bestseller'
  },
  {
    id: 2,
    name: 'Ordinateur Portable HP',
    price: '450,000 FCFA',
    originalPrice: '500,000 FCFA',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
    rating: 4.8,
    reviews: 89,
    badge: 'Promo'
  },
  {
    id: 3,
    name: 'Robe Africaine Traditionnelle',
    price: '45,000 FCFA',
    originalPrice: '60,000 FCFA',
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop',
    rating: 4.7,
    reviews: 156,
    badge: 'Nouveau'
  },
  {
    id: 4,
    name: 'Casque Audio Bluetooth',
    price: '35,000 FCFA',
    originalPrice: '45,000 FCFA',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    rating: 4.6,
    reviews: 203,
    badge: 'Top vente'
  }
];

export default function IndexAlibaba() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleServiceClick = (service: typeof mainServices[0]) => {
    if (service.id === 'vendeur') {
      navigate('/auth');
    } else {
      navigate(service.path);
    }
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/marketplace?category=${encodeURIComponent(category)}`);
  };

  const handleProductClick = (productId: number) => {
    navigate(`/marketplace/product/${productId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header moderne avec ombre */}
      <header className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                224SOLUTIONS
              </h1>
              <div className="hidden md:flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                  onClick={() => navigate('/marketplace')}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Marketplace
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                  onClick={() => navigate('/services')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Services
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-gray-700 hover:text-purple-600 hover:bg-purple-50"
                  onClick={() => navigate('/about')}
                >
                  À propos
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {profile ? (
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                  onClick={() => navigate(`/${profile.role}`)}
                >
                  Mon Espace
                </Button>
              ) : (
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
                  onClick={() => navigate('/auth')}
                >
                  Se connecter
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section moderne */}
      <section className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm">
              🎉 Bienvenue sur 224Solutions
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              Votre Marketplace
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                Multi-Services
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 opacity-95 leading-relaxed">
              Découvrez des milliers de produits et services de qualité.
              <br className="hidden md:block" />
              Achetez, vendez et connectez-vous avec notre communauté.
            </p>

            {/* Barre de recherche améliorée */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="flex bg-white rounded-2xl p-3 shadow-2xl backdrop-blur-lg">
                <Input
                  type="text"
                  placeholder="Rechercher des produits, services, vendeurs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-0 bg-transparent text-gray-800 placeholder-gray-500 focus-visible:ring-0 text-lg"
                  data-testid="input-search"
                />
                <Button
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl px-10 shadow-lg"
                  onClick={() => navigate(`/marketplace?search=${encodeURIComponent(searchQuery)}`)}
                  data-testid="button-search"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Chercher
                </Button>
              </div>
            </div>

            {/* Stats modernes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {[
                { value: '2,500+', label: 'Produits' },
                { value: '1,200+', label: 'Vendeurs' },
                { value: '500+', label: 'Services' },
                { value: '15,000+', label: 'Clients' }
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                  <div className="text-4xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm opacity-90">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interface PDG - Section moderne */}
      <section className="py-12 bg-gradient-to-r from-purple-700 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:30px_30px]"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-3 mb-6">
              <Crown className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl md:text-4xl font-bold">Interface PDG - Gestion Complète</h2>
            </div>
            <p className="text-lg mb-8 opacity-90">
              Accédez à votre tableau de bord de gestion principal avec tous les outils nécessaires
            </p>
            <Button
              onClick={() => navigate('/pdg')}
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100 font-bold text-lg px-10 py-6 shadow-2xl rounded-xl"
              data-testid="button-pdg-interface"
            >
              <Crown className="w-6 h-6 mr-3" />
              Accéder à l'Interface PDG
            </Button>
          </div>
        </div>
      </section>

      {/* Nos Services - Cards modernes */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 px-4 py-2">
              Nos Services
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Découvrez nos solutions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une gamme complète de services pour répondre à tous vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {mainServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.id}
                  className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-purple-200 bg-white overflow-hidden"
                  onClick={() => handleServiceClick(service)}
                  data-testid={`card-service-${service.id}`}
                >
                  <CardContent className="p-8 text-center">
                    <div className={`w-24 h-24 ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-5 leading-relaxed">
                      {service.description}
                    </p>
                    <Badge className="bg-purple-100 text-purple-700 px-4 py-1">
                      {service.stats}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Catégories populaires - Design amélioré */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Catégories populaires</h2>
              <p className="text-gray-600">Explorez nos meilleures catégories</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace')}
              className="hidden md:flex border-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              Voir tout
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {popularCategories.map((category) => (
              <Card
                key={category.name}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-purple-200"
                onClick={() => handleCategoryClick(category.name)}
                data-testid={`card-category-${category.name}`}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute top-3 left-3 text-3xl drop-shadow-lg">
                    {category.icon}
                  </div>
                </div>
                <CardContent className="p-5 text-center bg-white">
                  <h3 className="font-bold text-gray-900 mb-1 text-lg">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {category.count}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Produits tendance - Design premium */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <Badge className="mb-3 bg-red-100 text-red-700 px-4 py-2">
                🔥 Tendances
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Produits tendance</h2>
              <p className="text-gray-600">Les produits les plus populaires du moment</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace')}
              className="hidden md:flex border-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              Voir tout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {trendingProducts.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-purple-200"
                onClick={() => handleProductClick(product.id)}
                data-testid={`card-product-${product.id}`}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <Badge className="absolute top-3 left-3 bg-red-600 text-white shadow-lg px-3 py-1">
                    {product.badge}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 text-lg">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-gray-700 ml-1">
                        {product.rating}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ({product.reviews} avis)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-purple-600">
                      {product.price}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {product.originalPrice}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section avantages - Design moderne */}
      <section className="py-20 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Pourquoi choisir 224Solutions ?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Des avantages qui font la différence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              { icon: Shield, title: 'Sécurisé', desc: 'Paiements sécurisés et protection des données', color: 'bg-green-500' },
              { icon: Zap, title: 'Rapide', desc: 'Livraison express et service client réactif', color: 'bg-blue-500' },
              { icon: Globe, title: 'Local', desc: 'Produits locaux et services de proximité', color: 'bg-purple-500' },
              { icon: Clock, title: '24/7', desc: 'Support client disponible à tout moment', color: 'bg-orange-500' }
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className={`w-20 h-20 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="opacity-90 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <QuickFooter />
    </div>
  );
}
