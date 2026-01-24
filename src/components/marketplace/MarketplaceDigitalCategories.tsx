/**
 * MARKETPLACE DIGITAL CATEGORIES - Catégories Ultra-Compactes Mobile
 * 224Solutions - Design E-Commerce International
 */

import { Package, Plane, Monitor, GraduationCap, BookOpen, Bot, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const DIGITAL_CATEGORIES = [
  { id: 'all', name: 'Tous', icon: Package, color: 'bg-slate-500' },
  { id: 'voyage', name: 'Voyage', icon: Plane, color: 'bg-blue-500' },
  { id: 'logiciel', name: 'Apps', icon: Monitor, color: 'bg-purple-500' },
  { id: 'formation', name: 'Cours', icon: GraduationCap, color: 'bg-green-500' },
  { id: 'livre', name: 'E-Books', icon: BookOpen, color: 'bg-amber-500' },
  { id: 'ai', name: 'IA', icon: Bot, color: 'bg-violet-500' },
  { id: 'physique_affilie', name: 'Affiliés', icon: ShoppingBag, color: 'bg-orange-500' },
] as const;

interface MarketplaceDigitalCategoriesProps {
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

export function MarketplaceDigitalCategories({
  selectedCategory,
  onCategoryChange,
  className
}: MarketplaceDigitalCategoriesProps) {
  return (
    <section className={cn(
      "px-2 py-1.5 sm:px-4 sm:py-2 border-b border-border/40",
      "bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5",
      className
    )}>
      <div className="flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide">
        {DIGITAL_CATEGORIES.map((cat, index) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full shrink-0",
                "transition-all duration-150 text-[9px] sm:text-[10px] font-medium",
                isSelected
                  ? cn("text-white shadow-md", cat.color)
                  : "bg-card border border-border/50 hover:border-purple-400/40"
              )}
            >
              <Icon className={cn(
                "w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0",
                isSelected ? "text-white" : "text-muted-foreground"
              )} />
              <span className={isSelected ? "text-white" : "text-foreground"}>
                {cat.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default MarketplaceDigitalCategories;
