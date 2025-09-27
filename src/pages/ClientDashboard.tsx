import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  ShoppingBag, 
  Heart, 
  User, 
  Package, 
  Star,
  Filter,
  Grid3X3,
  List
} from "lucide-react";

export default function ClientDashboard() {
  const categories = [
    "Électronique", "Vêtements", "Maison & Jardin", "Sport & Loisirs", 
    "Beauté & Santé", "Automobile", "Livres", "Alimentation"
  ];

  const featuredProducts = [
    { 
      id: 1, 
      name: "Smartphone Pro Max", 
      price: "899 €", 
      rating: 4.8, 
      image: "📱",
      vendor: "TechStore",
      discount: "-20%"
    },
    { 
      id: 2, 
      name: "Casque Audio Bluetooth", 
      price: "199 €", 
      rating: 4.6, 
      image: "🎧",
      vendor: "AudioPro",
      discount: null
    },
    { 
      id: 3, 
      name: "Montre Connectée", 
      price: "299 €", 
      rating: 4.7, 
      image: "⌚",
      vendor: "WearTech",
      discount: "-15%"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-client-gradient p-8 text-white">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-2">Marketplace AfriCommerce</h1>
          <p className="text-white/80 text-lg">Découvrez des milliers de produits de qualité</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search Bar */}
        <Card className="p-6 border-0 shadow-elegant mb-8">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Rechercher des produits, marques, vendeurs..." 
                className="pl-10 h-12 text-base border-0 bg-muted/50"
              />
            </div>
            <Button className="bg-client-primary hover:bg-client-primary/90 text-white h-12 px-8">
              <Search className="h-5 w-5 mr-2" />
              Rechercher
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 border-client-primary text-client-primary hover:bg-client-primary hover:text-white">
              <Filter className="h-5 w-5" />
            </Button>
          </div>
        </Card>

        {/* Categories */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">Catégories populaires</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((category, index) => (
              <Card key={index} className="p-4 text-center hover:shadow-elegant transition-all duration-300 cursor-pointer group border-0">
                <div className="w-12 h-12 bg-client-accent rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="h-6 w-6 text-client-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{category}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Featured Products */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Produits en vedette</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="border-client-primary text-client-primary hover:bg-client-primary hover:text-white">
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="border-client-primary text-client-primary hover:bg-client-primary hover:text-white">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group cursor-pointer">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-4xl">{product.image}</div>
                    {product.discount && (
                      <span className="bg-client-primary text-white px-2 py-1 text-xs rounded-full font-medium">
                        {product.discount}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-client-primary transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">({product.rating})</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">Par {product.vendor}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-client-primary">{product.price}</span>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" className="border-client-primary text-client-primary hover:bg-client-primary hover:text-white">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button className="bg-client-primary hover:bg-client-primary/90 text-white">
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Card className="p-8 text-center border-0 shadow-elegant bg-client-gradient text-white">
          <h3 className="text-2xl font-bold mb-4">Découvrez plus de 10 000 produits</h3>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            Explorez notre marketplace complète avec des milliers de vendeurs vérifiés, 
            des prix compétitifs et une livraison rapide partout en Afrique.
          </p>
          <Button size="lg" className="bg-white text-client-primary hover:bg-white/90 font-semibold">
            Explorer le catalogue complet
          </Button>
        </Card>
      </div>
    </div>
  );
}