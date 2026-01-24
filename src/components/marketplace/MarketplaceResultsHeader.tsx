/**
 * MARKETPLACE RESULTS HEADER - En-tête Résultats
 * 224Solutions - Design E-Commerce International
 */

import { Package, Briefcase, Laptop } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MarketplaceResultsHeaderProps {
  total: number;
  selectedItemType: 'all' | 'product' | 'professional_service' | 'digital_product';
  loading?: boolean;
  className?: string;
}

export function MarketplaceResultsHeader({
  total,
  selectedItemType,
  loading = false,
  className
}: MarketplaceResultsHeaderProps) {
  const getTypeInfo = () => {
    switch (selectedItemType) {
      case 'professional_service':
        return { label: 'Services', icon: Briefcase, color: 'text-blue-600' };
      case 'digital_product':
        return { label: 'Produits numériques', icon: Laptop, color: 'text-purple-600' };
      case 'product':
        return { label: 'Produits', icon: Package, color: 'text-primary' };
      default:
        return { label: 'Articles', icon: Package, color: 'text-foreground' };
    }
  };

  const typeInfo = getTypeInfo();
  const Icon = typeInfo.icon;

  return (
    <div className={cn("flex items-center justify-between mb-3 sm:mb-4", className)}>
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-16 h-4 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              <span className="font-bold text-primary">{total.toLocaleString()}</span>
              <span className="text-muted-foreground ml-1">résultat{total > 1 ? 's' : ''}</span>
            </p>
            {selectedItemType !== 'all' && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[10px] sm:text-xs py-0.5 px-2 gap-1 font-medium",
                  typeInfo.color
                )}
              >
                <Icon className="w-3 h-3" />
                {typeInfo.label}
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MarketplaceResultsHeader;
