/**
 * MARKETPLACE CATEGORY BADGES - Badges Catégories Premium
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
      "px-2 sm:px-4 py-2 sm:py-2.5 border-b border-border/50 bg-card/50",
      className
    )}>
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {categories.map((category, index) => {
          const isSelected = selectedCategory === category.id;
          
          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer whitespace-nowrap shrink-0 transition-all duration-200",
                  "px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium rounded-full",
                  "border border-transparent",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg" 
                    : "bg-secondary/80 text-secondary-foreground hover:bg-secondary hover:border-primary/30 hover:shadow-sm"
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
