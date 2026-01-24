/**
 * MARKETPLACE DIGITAL CATEGORIES - Catégories Numériques Premium
 * 224Solutions - Design E-Commerce International
 */

import { Package, Plane, Monitor, GraduationCap, BookOpen, Bot, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const DIGITAL_CATEGORIES = [
  { id: 'all', name: 'Tous', shortName: 'Tous', icon: Package, gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-100' },
  { id: 'voyage', name: 'Voyages', shortName: 'Voyage', icon: Plane, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-100' },
  { id: 'logiciel', name: 'Logiciels', shortName: 'Logiciel', icon: Monitor, gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-100' },
  { id: 'formation', name: 'Formations', shortName: 'Cours', icon: GraduationCap, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-100' },
  { id: 'livre', name: 'E-Books', shortName: 'Livres', icon: BookOpen, gradient: 'from-amber-500 to-yellow-500', bg: 'bg-amber-100' },
  { id: 'ai', name: 'Intelligence Artificielle', shortName: 'IA', icon: Bot, gradient: 'from-violet-500 to-fuchsia-500', bg: 'bg-violet-100' },
  { id: 'physique_affilie', name: 'Produits Affiliés', shortName: 'Affiliés', icon: ShoppingBag, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-100' },
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
      "px-2 sm:px-4 py-2 sm:py-3 border-b border-border/50",
      "bg-gradient-to-r from-purple-500/5 via-background to-purple-500/5",
      className
    )}>
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {DIGITAL_CATEGORIES.map((cat, index) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full shrink-0",
                "transition-all duration-200 border text-[10px] sm:text-xs font-medium",
                isSelected
                  ? cn(
                      "bg-gradient-to-r text-white border-transparent shadow-md",
                      cat.gradient
                    )
                  : "bg-card border-border/60 hover:border-purple-400/50 hover:shadow-sm"
              )}
            >
              <div className={cn(
                "w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center shrink-0",
                isSelected ? "bg-white/20" : cn("bg-gradient-to-br", cat.gradient)
              )}>
                <Icon className={cn(
                  "w-3 h-3 sm:w-3.5 sm:h-3.5",
                  isSelected ? "text-white" : "text-white"
                )} />
              </div>
              <span className={cn(
                isSelected ? "text-white" : "text-foreground"
              )}>
                <span className="sm:hidden">{cat.shortName}</span>
                <span className="hidden sm:inline">{cat.name}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default MarketplaceDigitalCategories;
