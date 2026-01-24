/**
 * MARKETPLACE FILTERS BAR - Barre de Filtres Ultra-Compacte Mobile
 * 224Solutions - Design E-Commerce International
 */

import { ArrowUpDown, MapPin, Globe, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MarketplaceFiltersBarProps {
  sortBy: string;
  onSortChange: (value: string) => void;
  countries: string[];
  selectedCountry: string;
  onCountryChange: (value: string) => void;
  cities: string[];
  selectedCity: string;
  onCityChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  filters: { minPrice: number; maxPrice: number; minRating: number };
  onFiltersChange: (filters: { minPrice: number; maxPrice: number; minRating: number }) => void;
  isMobile?: boolean;
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Récents', shortLabel: 'Récents' },
  { value: 'popular', label: 'Populaires', shortLabel: 'Pop.' },
  { value: 'price_asc', label: 'Prix ↑', shortLabel: 'Prix↑' },
  { value: 'price_desc', label: 'Prix ↓', shortLabel: 'Prix↓' },
  { value: 'rating', label: 'Top notes', shortLabel: 'Notes' },
];

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
    <section className={cn("px-2 py-1.5 sm:px-4 sm:py-2 border-b border-border/40 bg-background/80", className)}>
      {/* Ultra-Compact Filter Row */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
        {/* Sort - Compact Chip Style */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className={cn(
            "h-7 sm:h-8 shrink-0 w-auto min-w-[70px] sm:min-w-[100px] text-[10px] sm:text-xs rounded-full",
            "border-border/50 bg-muted/50 hover:bg-muted px-2 sm:px-3 gap-1"
          )}>
            <ArrowUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Country - Icon-first compact */}
        <Select value={selectedCountry} onValueChange={onCountryChange}>
          <SelectTrigger className={cn(
            "h-7 sm:h-8 shrink-0 w-auto min-w-[60px] sm:min-w-[100px] text-[10px] sm:text-xs rounded-full",
            "border-border/50 bg-muted/50 hover:bg-muted px-2 sm:px-3 gap-1"
          )}>
            <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[40px] sm:max-w-[60px]">
              {selectedCountry === 'all' ? 'Pays' : selectedCountry.slice(0, 8)}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Tous pays</SelectItem>
            {countries.map((country) => (
              <SelectItem key={country} value={country} className="text-xs">{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* City - Icon-first compact */}
        <Select value={selectedCity} onValueChange={onCityChange}>
          <SelectTrigger className={cn(
            "h-7 sm:h-8 shrink-0 w-auto min-w-[60px] sm:min-w-[100px] text-[10px] sm:text-xs rounded-full",
            "border-border/50 bg-muted/50 hover:bg-muted px-2 sm:px-3 gap-1"
          )}>
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[40px] sm:max-w-[60px]">
              {selectedCity === 'all' ? 'Ville' : selectedCity.slice(0, 8)}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Toutes villes</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city} className="text-xs">{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Mode - Desktop Only */}
        {!isMobile && (
          <div className="flex items-center bg-muted/50 rounded-full p-0.5 shrink-0">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className={cn("h-6 w-6 p-0 rounded-full", viewMode === 'grid' && "shadow-sm")}
            >
              <Grid className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={cn("h-6 w-6 p-0 rounded-full", viewMode === 'list' && "shadow-sm")}
            >
              <List className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Filters Panel - Compact */}
      {showFilters && (
        <div className="mt-2 p-2.5 sm:p-3 bg-muted/30 rounded-xl border border-border/40">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="text-[10px] sm:text-xs font-medium mb-1 block">Prix min</label>
              <input
                type="number"
                placeholder="0"
                className="w-full px-2 py-1.5 border border-border rounded-lg text-[10px] sm:text-xs bg-card focus:ring-1 focus:ring-primary/30"
                value={filters.minPrice || ''}
                onChange={e => onFiltersChange({ ...filters, minPrice: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-[10px] sm:text-xs font-medium mb-1 block">Prix max</label>
              <input
                type="number"
                placeholder="Max"
                className="w-full px-2 py-1.5 border border-border rounded-lg text-[10px] sm:text-xs bg-card focus:ring-1 focus:ring-primary/30"
                value={filters.maxPrice || ''}
                onChange={e => onFiltersChange({ ...filters, maxPrice: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MarketplaceFiltersBar;
