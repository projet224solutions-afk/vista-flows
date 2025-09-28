import { useState } from "react";
import { Grid, List, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";

const categories = [
  { id: 'all', label: 'Tout', count: 1250 },
  { id: 'electronics', label: 'Électronique', count: 340 },
  { id: 'fashion', label: 'Mode', count: 280 },
  { id: 'food', label: 'Alimentation', count: 190 },
  { id: 'home', label: 'Maison', count: 150 },
  { id: 'services', label: 'Services', count: 290 }
];

const products = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    title: 'Casque Audio Bluetooth Premium avec Réduction de Bruit',
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
    title: 'Chaussures de Sport Nike Air Max',
    price: 85000,
    vendor: 'SportWorld',
    rating: 4.6,
    reviewCount: 189
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&h=300&fit=crop',
    title: 'Montre Connectée Samsung Galaxy Watch',
    price: 125000,
    vendor: 'ElectroPlus',
    rating: 4.7,
    reviewCount: 156,
    isPremium: true
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop',
    title: 'Sac à Main en Cuir Véritable',
    price: 35000,
    originalPrice: 45000,
    vendor: 'Fashion Boutique',
    rating: 4.4,
    reviewCount: 98
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=300&h=300&fit=crop',
    title: 'Ensemble de Casseroles Antiadhésives',
    price: 28000,
    vendor: 'Kitchen Pro',
    rating: 4.5,
    reviewCount: 145
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop',
    title: 'Lunettes de Soleil Ray-Ban',
    price: 65000,
    vendor: 'Optical Center',
    rating: 4.9,
    reviewCount: 312,
    isPremium: true
  }
];

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    // Add category filtering logic here
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">Marketplace</h1>
          <SearchBar 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher des produits..."
            showFilter
            onFilter={() => setShowFilters(!showFilters)}
          />
        </div>
      </header>

      {/* Categories */}
      <section className="px-4 py-4 border-b border-border">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "secondary"}
              className={`cursor-pointer whitespace-nowrap ${
                selectedCategory === category.id 
                  ? "bg-vendeur-primary text-white" 
                  : "hover:bg-accent"
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label} ({category.count})
            </Badge>
          ))}
        </div>
      </section>

      {/* Filters & View Controls */}
      <section className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Popularité</SelectItem>
                <SelectItem value="price-low">Prix croissant</SelectItem>
                <SelectItem value="price-high">Prix décroissant</SelectItem>
                <SelectItem value="rating">Mieux notés</SelectItem>
                <SelectItem value="newest">Plus récents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 bg-accent rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 p-0"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-accent rounded-lg animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Prix (FCFA)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Note minimum</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4+ étoiles</SelectItem>
                    <SelectItem value="3">3+ étoiles</SelectItem>
                    <SelectItem value="2">2+ étoiles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} résultats trouvés
          </p>
        </div>

        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        }>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onBuy={() => console.log('Buy', product.id)}
              onContact={() => console.log('Contact', product.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}