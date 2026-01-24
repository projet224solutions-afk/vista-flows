/**
 * MARKETPLACE HEADER - Header Premium Ultra-Professionnel Mobile-First
 * 224Solutions - Design E-Commerce International
 */

import { ShoppingCart as ShoppingCartIcon, ChevronLeft, Sparkles } from "lucide-react";
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
import { motion } from "framer-motion";

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
  const cartCount = getCartCount();

  return (
    <header className="bg-card/95 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 shadow-sm">
      {/* Compact Top Bar */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left - Back/Logo */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {vendorId ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/marketplace')}
                className="h-7 w-7 shrink-0 rounded-full hover:bg-primary/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            ) : null}
            
            <div className="min-w-0 flex-1">
              {vendorName ? (
                <div>
                  <h1 className="text-sm sm:text-base font-bold text-foreground truncate max-w-[140px] sm:max-w-none">
                    {vendorName}
                  </h1>
                  {itemCount > 0 && (
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                      {itemCount} article{itemCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ) : (
                <motion.div 
                  className="flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <h1 className="text-sm sm:text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Marketplace
                  </h1>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right - Compact Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <CurrencyIndicator variant="compact" />
            
            {vendorId && vendorSlug && (
              <ShareButton
                title={vendorName || 'Boutique'}
                text={`Découvrez ${vendorName}`}
                url={`${window.location.origin}/boutique/${vendorSlug || vendorId}`}
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                resourceType="shop"
                resourceId={vendorId}
                useShortUrl={true}
              />
            )}
            
            {user && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10"
                onClick={() => navigate('/cart')}
              >
                <ShoppingCartIcon className="w-4 h-4" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[8px] bg-destructive border-[1.5px] border-card font-bold">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-2">
          <SearchBar
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={isMobile ? "Rechercher..." : t('marketplace.searchProducts')}
            showFilter
            onFilter={onFilterToggle}
            showCamera
            onCameraCapture={onCameraCapture}
          />
        </div>
      </div>
    </header>
  );
}

export default MarketplaceHeader;
