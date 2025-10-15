import { useState, useEffect } from "react";
import { Grid, List, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import QuickFooter from "@/components/QuickFooter";
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
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
    fetch(`${API_BASE}/api/categories`)
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const fetchProducts = async (reset = false) => {
    if (reset) setPage(1);
    const currentPage = reset ? 1 : page;
    const params = new URLSearchParams({
      search: searchQuery,
      category: selectedCategory !== 'all' ? selectedCategory : '',
      minPrice: String(filters.minPrice || 0),
      maxPrice: String(filters.maxPrice || 0),
      minRating: String(filters.minRating || 0),
      sort: sortBy,
      page: String(currentPage),
      limit: String(PAGE_LIMIT)
    });

    try {
      if (reset) setLoading(true); else setLoadingMore(true);
      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`);
      const data = await res.json();
      if (reset) setProducts(data.products || []); else setProducts(prev => [...prev, ...(data.products || [])]);
      setTotal(data.total || 0);
    } catch {
      if (reset) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { fetchProducts(true); }, [searchQuery, selectedCategory, filters, sortBy]);

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
          {categories.map((category: any) => (
            <Badge
              key={category.id}
              variant={selectedCategory === (category.id || category.label) ? "default" : "secondary"}
              className={`cursor-pointer whitespace-nowrap ${
                selectedCategory === (category.id || category.label)
                  ? "bg-vendeur-primary text-white" 
                  : "hover:bg-accent"
              }`}
              onClick={() => setSelectedCategory(category.id || category.label)}
            >
              {(category.name || category.label)} {(category.count ? `(${category.count})` : '')}
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
          {products.map((p: any) => (
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