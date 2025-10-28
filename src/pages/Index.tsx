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
  Store,
  Star,
  Shield,
  Zap,
  Globe,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoleRedirect } from "@/hooks/useRoleRedirect";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useHomeProducts } from "@/hooks/useHomeProducts";
import { useHomeCategories } from "@/hooks/useHomeCategories";

// Services principaux avec données dynamiques
const getMainServices = (stats: any) => [
  {
    id: 'categories',
    title: 'Explorer par catégories',
    description: 'Découvrez nos produits par catégorie',
    icon: Grid3X3,
    color: 'bg-purple-600',
    path: '/marketplace',
    stats: `${stats.totalProducts}+ produits`
  },
  {
    id: 'devis',
    title: 'Demander un devis',
    description: 'Obtenez des devis personnalisés',
    icon: MessageSquare,
    color: 'bg-purple-600',
    path: '/devis',
    stats: 'Réponse 24h'
  },
  {
    id: 'proximite',
    title: 'Services de proximité',
    description: 'Trouvez des services près de vous',
    icon: Truck,
    color: 'bg-purple-600',
    path: '/services-proximite',
    stats: `${stats.totalServices}+ services`
  },
  {
    id: 'vendeur',
    title: 'Devenir vendeur',
    description: 'Rejoignez notre marketplace',
    icon: Users,
    color: 'bg-purple-600',
    path: '/auth',
    stats: `${stats.totalVendors}+ vendeurs`
  }
];

// Mapping des catégories avec leurs icônes et images (par défaut)
const getCategoryMapping = (categoryName: string): { icon: string; image: string } => {
  const mappings: Record<string, { icon: string; image: string }> = {
    'Électronique': { 
      icon: '📱', 
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=200&fit=crop'
    },
    'Mode & Beauté': { 
      icon: '👗', 
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=200&fit=crop'
    },
    'Maison & Jardin': { 
      icon: '🏠', 
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop'
    },
    'Alimentation': { 
      icon: '🍎', 
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=200&fit=crop'
    },
    'Automobile': { 
      icon: '🚗', 
      image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=300&h=200&fit=crop'
    },
    'Services': { 
      icon: '🔧', 
      image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=200&fit=crop'
    },
  };
  
  return mappings[categoryName] || { 
    icon: '📦', 
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=200&fit=crop'
  };
};

// Helper pour formater le prix
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-GN', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(price) + ' GNF';
};

export default function IndexAlibaba() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  useRoleRedirect();
  const { profile } = useAuth();
  
  // Chargement des données réelles depuis Supabase
  const { stats, loading: statsLoading } = useHomeStats();
  const { products, loading: productsLoading } = useHomeProducts(4);
  const { categories, loading: categoriesLoading } = useHomeCategories();

  const mainServices = getMainServices(stats);

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

  const handleProductClick = (productId: string) => {
    navigate(`/marketplace/product/${productId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header moderne */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-purple-600">224SOLUTIONS</h1>
              <div className="hidden md:flex items-center gap-6">
                <Button variant="ghost" onClick={() => navigate('/marketplace')}>
                  Marketplace
                </Button>
                <Button variant="ghost" onClick={() => navigate('/services')}>
                  Services
                </Button>
                <Button variant="ghost" onClick={() => navigate('/about')}>
                  À propos
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {profile ? (
                <Button onClick={() => navigate(`/${profile.role}`)}>
                  Mon Espace
                </Button>
              ) : (
                <Button onClick={() => navigate('/auth')}>
                  Se connecter
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section avec recherche */}
      <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Votre Marketplace <br />
            <span className="text-yellow-300">Multi-Services</span>
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Découvrez des milliers de produits et services de qualité.
            Achetez, vendez et connectez-vous avec notre communauté.
          </p>

          {/* Barre de recherche */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex bg-white rounded-full p-2 shadow-lg">
              <Input
                type="text"
                placeholder="Rechercher des produits, services, vendeurs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-0 bg-transparent text-gray-800 placeholder-gray-500 focus:ring-0"
              />
              <Button
                className="bg-purple-600 hover:bg-purple-700 rounded-full px-8"
                onClick={() => navigate(`/marketplace?search=${encodeURIComponent(searchQuery)}`)}
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Stats rapides - Données réelles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold">
                {statsLoading ? '...' : `${stats.totalProducts}+`}
              </div>
              <div className="text-sm opacity-80">Produits</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {statsLoading ? '...' : `${stats.totalVendors}+`}
              </div>
              <div className="text-sm opacity-80">Vendeurs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {statsLoading ? '...' : `${stats.totalServices}+`}
              </div>
              <div className="text-sm opacity-80">Services</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">
                {statsLoading ? '...' : `${stats.totalClients}+`}
              </div>
              <div className="text-sm opacity-80">Clients</div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos Services - Section principale comme dans l'image */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Nos services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Découvrez notre gamme complète de services pour répondre à tous vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {getMainServices(stats).map((service) => {
              const Icon = service.icon;
              return (
                <Card
                  key={service.id}
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50"
                  onClick={() => handleServiceClick(service)}
                >
                  <CardContent className="p-8 text-center">
                    <div className={`w-20 h-20 ${service.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                      {service.description}
                    </p>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {service.stats}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Catégories populaires */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-bold text-gray-800">Catégories populaires</h2>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace')}
              className="hidden md:flex"
            >
              Voir tout
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categoriesLoading ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">Chargement des catégories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">Aucune catégorie disponible</p>
              </div>
            ) : (
              categories.map((category) => {
                const mapping = getCategoryMapping(category.name);
                return (
                  <Card
                    key={category.name}
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <div className="relative">
                      <img
                        src={mapping.image}
                        alt={category.name}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                      <div className="absolute top-2 left-2 text-2xl">
                        {mapping.icon}
                      </div>
                    </div>
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {category.count}+ produits
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Produits tendance */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Produits tendance</h2>
              <p className="text-gray-600">Les produits les plus populaires du moment</p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/marketplace')}
              className="hidden md:flex"
            >
              Voir tout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsLoading ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">Chargement des produits...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">Aucun produit disponible</p>
              </div>
            ) : (
              products.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden"
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="relative">
                    <img
                      src={product.images?.[0] || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=300&fit=crop'}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                      Nouveau
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600 ml-1">
                          {product.rating || 4.5} ({product.reviews_count || 0})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-purple-600">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Section avantages */}
      <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Pourquoi choisir 224Solutions ?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurisé</h3>
              <p className="text-gray-600">Paiements sécurisés et protection des données</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Rapide</h3>
              <p className="text-gray-600">Livraison express et service client réactif</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Local</h3>
              <p className="text-gray-600">Produits locaux et services de proximité</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7</h3>
              <p className="text-gray-600">Support client disponible à tout moment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}
