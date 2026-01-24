/**
 * MARKETPLACE CATEGORY BADGES - Badges Ultra-Compacts Mobile
 * 224Solutions - Design E-Commerce International
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Category {
  id: string;
  name: string;
  image_url?: string;
  is_active: boolean;
}

interface MarketplaceCategoryBadgesProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export function MarketplaceCategoryBadges({
  categories,
  selectedCategory,
  onCategoryChange,
  className
}: MarketplaceCategoryBadgesProps) {
  if (categories.length === 0) return null;

  return (
    <section className={cn(
      "px-2 py-1.5 sm:px-4 sm:py-2 border-b border-border/40 bg-muted/20",
      className
    )}>
      <div className="flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
        {categories.map((category, index) => {
          const isSelected = selectedCategory === category.id;
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02 }}
            >
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer whitespace-nowrap shrink-0 transition-all duration-150",
                  "px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-medium rounded-full",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-secondary/60 hover:bg-secondary"
                )}
                onClick={() => onCategoryChange(category.id)}
              >
                {category.name}
              </Badge>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default MarketplaceCategoryBadges;
