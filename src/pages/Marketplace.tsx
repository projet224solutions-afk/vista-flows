// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Grid, List, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import QuickFooter from "@/components/QuickFooter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAGE_LIMIT = 12;

interface Category {
  id: string;
  name: string;
  image_url?: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  images?: string[];
  vendor_id: string;
  vendors?: {
    business_name: string;
  };
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || "all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 0, minRating: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Charger les catégories
  useEffect(() => {
    loadCategories();
  }, []);

  // Charger les produits quand les filtres changent
  useEffect(() => {
    fetchProducts(true);
  }, [searchQuery, selectedCategory, filters, sortBy]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, image_url, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const allCategory = { id: 'all', name: 'Toutes', is_active: true };
      setCategories([allCategory, ...(data || [])]);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      setCategories([{ id: 'all', name: 'Toutes', is_active: true }]);
    }
  };

  const fetchProducts = async (reset = false) => {
    if (reset) {
      setPage(1);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const currentPage = reset ? 1 : page;

    try {
      let query = supabase
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
        `, { count: 'exact' })
        .eq('is_active', true);

      // Filtres de recherche
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      // Filtre par catégorie
      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      // Filtres de prix
      if (filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice > 0) {
        query = query.lte('price', filters.maxPrice);
      }

      // Tri
      switch (sortBy) {
        case 'price-low':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const start = (currentPage - 1) * PAGE_LIMIT;
      const end = start + PAGE_LIMIT - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) throw error;

      if (reset) {
        setProducts(data || []);
      } else {
        setProducts(prev => [...prev, ...(data || [])]);
      }
      
      setTotal(count || 0);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur lors du chargement des produits');
      if (reset) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/marketplace?product=${productId}`);
  };

  const handleProductContact = (productId: string) => {
    navigate(`/marketplace?product=${productId}`);
  };

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
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent"
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
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
                <label className="text-sm font-medium mb-2 block">Prix (GNF)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                    onChange={e => setFilters(prev => ({ ...prev, minPrice: parseInt(e.target.value) || 0 }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                    onChange={e => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Note minimum</label>
                <Select onValueChange={(val) => setFilters(prev => ({ ...prev, minRating: parseInt(val) || 0 }))}>
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
          <p className="text-sm text-muted-foreground">{products.length} / {total} résultats</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
            {products.map((product) => (
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
                onContact={() => handleProductContact(product.id)}
              />
            ))}
          </div>
        )}

        {products.length < total && !loading && (
          <div className="text-center mt-4">
            <Button 
              onClick={() => { 
                setPage(prev => prev + 1); 
                fetchProducts(); 
              }} 
              disabled={loadingMore}
            >
              {loadingMore ? 'Chargement...' : 'Voir plus'}
            </Button>
          </div>
        )}
      </section>

      {/* Footer de navigation */}
      <QuickFooter />
    </div>
  );
}