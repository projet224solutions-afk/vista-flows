/**
 * MARKETPLACE FILTERS BAR - Barre de Filtres Premium
 * 224Solutions - Design E-Commerce International
 */

import { ArrowUpDown, MapPin, Globe, Grid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MarketplaceFiltersBarProps {
  // Sort
  sortBy: string;
  onSortChange: (value: string) => void;
  
  // Location
  countries: string[];
  selectedCountry: string;
  onCountryChange: (value: string) => void;
  cities: string[];
  selectedCity: string;
  onCityChange: (value: string) => void;
  
  // View
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  
  // Advanced Filters
  showFilters: boolean;
  onToggleFilters: () => void;
  filters: { minPrice: number; maxPrice: number; minRating: number };
  onFiltersChange: (filters: { minPrice: number; maxPrice: number; minRating: number }) => void;
  
  isMobile?: boolean;
  className?: string;
}

export function MarketplaceFiltersBar({
  sortBy,
  onSortChange,
  countries,
  selectedCountry,
  onCountryChange,
  cities,
  selectedCity,
  onCityChange,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  filters,
  onFiltersChange,
  isMobile = false,
  className
}: MarketplaceFiltersBarProps) {
  return (
    <section className={cn("px-2 sm:px-4 py-2 sm:py-2.5 border-b border-border/50 bg-background", className)}>
      {/* Main Filters Row */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className={cn(
            "h-8 sm:h-9 shrink-0 w-auto min-w-[90px] sm:min-w-[130px] text-[10px] sm:text-xs rounded-full",
            "border-border/60 bg-card hover:border-primary/40 hover:bg-card/80 transition-all"
          )}>
            <ArrowUpDown className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
            <span className="truncate"><SelectValue /></span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Plus récents</SelectItem>
            <SelectItem value="popular">Populaires</SelectItem>
            <SelectItem value="price_asc">Prix croissant</SelectItem>
            <SelectItem value="price_desc">Prix décroissant</SelectItem>
            <SelectItem value="rating">Mieux notés</SelectItem>
          </SelectContent>
        </Select>

        {/* Country Filter */}
        <Select value={selectedCountry} onValueChange={onCountryChange}>
          <SelectTrigger className={cn(
            "h-8 sm:h-9 shrink-0 w-auto min-w-[85px] sm:min-w-[130px] text-[10px] sm:text-xs rounded-full",
            "border-border/60 bg-card hover:border-primary/40 hover:bg-card/80 transition-all"
          )}>
            <Globe className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              {selectedCountry === 'all' ? (
                <span className="hidden sm:inline">Tous pays</span>
              ) : (
                <span className="truncate max-w-[60px] sm:max-w-[80px]">{selectedCountry}</span>
              )}
              <span className="sm:hidden">{selectedCountry === 'all' ? 'Pays' : selectedCountry.slice(0, 6)}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City Filter */}
        <Select value={selectedCity} onValueChange={onCityChange}>
          <SelectTrigger className={cn(
            "h-8 sm:h-9 shrink-0 w-auto min-w-[85px] sm:min-w-[130px] text-[10px] sm:text-xs rounded-full",
            "border-border/60 bg-card hover:border-primary/40 hover:bg-card/80 transition-all"
          )}>
            <MapPin className="w-3 h-3 mr-1.5 text-muted-foreground shrink-0" />
            <span className="truncate">
              {selectedCity === 'all' ? (
                <span className="hidden sm:inline">Toutes villes</span>
              ) : (
                <span className="truncate max-w-[60px] sm:max-w-[80px]">{selectedCity}</span>
              )}
              <span className="sm:hidden">{selectedCity === 'all' ? 'Ville' : selectedCity.slice(0, 6)}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Toggle - Desktop Only */}
        {!isMobile && (
          <div className="flex items-center gap-0.5 bg-muted/60 rounded-full p-0.5 shrink-0 ml-auto">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full",
                viewMode === 'grid' && "shadow-sm"
              )}
            >
              <Grid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full",
                viewMode === 'list' && "shadow-sm"
              )}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mt-3 p-3 sm:p-4 bg-muted/30 rounded-xl border border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-medium mb-2 block text-foreground">Prix (GNF)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className={cn(
                    "flex-1 px-3 py-2 border border-border rounded-lg text-xs bg-card",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  )}
                  value={filters.minPrice || ''}
                  onChange={e => onFiltersChange({ ...filters, minPrice: parseInt(e.target.value) || 0 })}
                />
                <span className="self-center text-muted-foreground">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  className={cn(
                    "flex-1 px-3 py-2 border border-border rounded-lg text-xs bg-card",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  )}
                  value={filters.maxPrice || ''}
                  onChange={e => onFiltersChange({ ...filters, maxPrice: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block text-foreground">Note minimum</label>
              <Select 
                value={filters.minRating?.toString() || ''} 
                onValueChange={(val) => onFiltersChange({ ...filters, minRating: parseInt(val) || 0 })}
              >
                <SelectTrigger className="h-9 text-xs w-full rounded-lg">
                  <SelectValue placeholder="Toutes notes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Toutes notes</SelectItem>
                  <SelectItem value="4">4+ étoiles ⭐⭐⭐⭐</SelectItem>
                  <SelectItem value="3">3+ étoiles ⭐⭐⭐</SelectItem>
                  <SelectItem value="2">2+ étoiles ⭐⭐</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MarketplaceFiltersBar;
