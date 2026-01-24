/**
 * MARKETPLACE HEADER - Header Premium Ultra-Professionnel
 * 224Solutions - Design E-Commerce International
 */

import { ShoppingCart as ShoppingCartIcon, Menu, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SearchBar from "@/components/SearchBar";
import { CurrencyIndicator } from "./CurrencyIndicator";
import { ShareButton } from "@/components/shared/ShareButton";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface MarketplaceHeaderProps {
  vendorName?: string | null;
  vendorSlug?: string | null;
  vendorId?: string;
  itemCount?: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterToggle: () => void;
  onCameraCapture: (file: File) => void;
  isMobile?: boolean;
}

export function MarketplaceHeader({
  vendorName,
  vendorSlug,
  vendorId,
  itemCount = 0,
  searchQuery,
  onSearchChange,
  onFilterToggle,
  onCameraCapture,
  isMobile = false
}: MarketplaceHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getCartCount } = useCart();
  const { t } = useTranslation();

  return (
    <header className="bg-gradient-to-b from-card to-card/95 border-b border-border/50 sticky top-0 z-40 backdrop-blur-xl shadow-sm">
      {/* Top Bar - Logo & Actions */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left - Logo/Back + Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {vendorId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/marketplace')}
                className="h-8 w-8 shrink-0 rounded-full hover:bg-primary/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className={cn(
                "font-poppins font-bold text-foreground truncate",
                vendorName ? "text-base sm:text-lg" : "text-lg sm:text-xl"
              )}>
                {vendorName || (
                  <span className="bg-gradient-to-r from-primary via-primary to-blue-600 bg-clip-text text-transparent">
                    Marketplace 224
                  </span>
                )}
              </h1>
              {vendorName && itemCount > 0 && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {itemCount} article{itemCount > 1 ? 's' : ''} disponible{itemCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <CurrencyIndicator variant="compact" />
            
            {vendorId && vendorSlug && (
              <ShareButton
                title={vendorName || 'Boutique'}
                text={`Découvrez la boutique ${vendorName} sur 224 Solutions`}
                url={`${window.location.origin}/boutique/${vendorSlug || vendorId}`}
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10"
                resourceType="shop"
                resourceId={vendorId}
                useShortUrl={true}
              />
            )}
            
            {user && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10"
                onClick={() => navigate('/cart')}
              >
                <ShoppingCartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                {getCartCount() > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[9px] sm:text-[10px] bg-destructive border-2 border-card">
                    {getCartCount() > 99 ? '99+' : getCartCount()}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mt-2.5 sm:mt-3">
          <div className="relative">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={t('marketplace.searchProducts')}
              showFilter
              onFilter={onFilterToggle}
              showCamera
              onCameraCapture={onCameraCapture}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default MarketplaceHeader;
