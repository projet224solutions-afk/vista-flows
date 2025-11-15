// @ts-nocheck
import { useState, useEffect } from "react";
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

export default function Marketplace() {
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 0, minRating: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      setCategories([]);
    }
  };

  const fetchProducts = async (reset = false) => {
    if (reset) setPage(1);
    const currentPage = reset ? 1 : page;

    try {
      if (reset) setLoading(true); else setLoadingMore(true);
      
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      // Filtrer par catégorie
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      // Recherche textuelle
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Filtrer par prix
      if (filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice > 0) {
        query = query.lte('price', filters.maxPrice);
      }

      // Tri
      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('rating', { ascending: false });
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_LIMIT;
      const to = from + PAGE_LIMIT - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      if (reset) {
        setProducts(data || []);
      } else {
        setProducts(prev => [...prev, ...(data || [])]);
      }
      setTotal(count || 0);
      
      toast.success(`${data?.length || 0} produits chargés depuis Supabase`);
    } catch (error: any) {
      console.error('Erreur chargement produits:', error);
      toast.error('Impossible de charger les produits');
      if (reset) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { 
    fetchProducts(true); 
  }, [searchQuery, selectedCategory, filters, sortBy]);

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

      <section className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="default" className="bg-green-500">
            ✅ Connecté à Supabase - Données Réelles
          </Badge>
          <Badge variant="outline">{total} produits</Badge>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <Badge
            variant={selectedCategory === 'all' ? "default" : "secondary"}
            className={`cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all' ? "bg-vendeur-primary text-white" : "hover:bg-accent"
            }`}
            onClick={() => setSelectedCategory('all')}
          >
            Tous les produits
          </Badge>
          {categories.map((category: any) => (
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

        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {products.map((p: unknown) => (
            <ProductCard key={p.id} {...p} onBuy={() => {}} onContact={() => {}} />
          ))}
        </div>

        {products.length < total && !loading && (
          <div className="text-center mt-4">
            <Button onClick={() => { setPage(prev => prev + 1); fetchProducts(); }} disabled={loadingMore}>
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