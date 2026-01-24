/**
 * MARKETPLACE TYPE SELECTOR - Sélecteur de Type Ultra-Moderne
 * 224Solutions - Design E-Commerce Premium
 */

import { Briefcase, Laptop, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TypeOption {
  id: 'all' | 'product' | 'professional_service' | 'digital_product';
  label: string;
  shortLabel: string;
  icon: typeof Briefcase;
  gradient: string;
  activeGradient: string;
  iconBg: string;
  description?: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    id: 'professional_service',
    label: 'Services Professionnels',
    shortLabel: 'Services',
    icon: Briefcase,
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
    activeGradient: 'shadow-blue-500/40',
    iconBg: 'bg-blue-100 text-blue-600',
    description: 'Experts locaux'
  },
  {
    id: 'digital_product',
    label: 'Produits Numériques',
    shortLabel: 'Digital',
    icon: Laptop,
    gradient: 'from-purple-500 via-purple-600 to-fuchsia-600',
    activeGradient: 'shadow-purple-500/40',
    iconBg: 'bg-purple-100 text-purple-600',
    description: 'Logiciels & Formations'
  }
];

interface MarketplaceTypeSelectorProps {
  selectedType: 'all' | 'product' | 'professional_service' | 'digital_product';
  onTypeChange: (type: 'all' | 'product' | 'professional_service' | 'digital_product') => void;
  className?: string;
}

export function MarketplaceTypeSelector({
  selectedType,
  onTypeChange,
  className
}: MarketplaceTypeSelectorProps) {
  return (
    <section className={cn(
      "px-3 sm:px-6 py-3 sm:py-4 border-b border-border/50",
      "bg-gradient-to-r from-muted/30 via-background to-muted/30",
      className
    )}>
      <div className="flex justify-center gap-3 sm:gap-4 max-w-md mx-auto">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.id;
          
          return (
            <motion.button
              key={option.id}
              onClick={() => onTypeChange(option.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "group relative flex-1 min-w-0 rounded-2xl overflow-hidden transition-all duration-300",
                "flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-4",
                isSelected
                  ? cn(
                      "bg-gradient-to-br text-white shadow-xl",
                      option.gradient,
                      option.activeGradient
                    )
                  : "bg-card border border-border/60 hover:border-primary/40 hover:shadow-lg"
              )}
            >
              {/* Shimmer effect when selected */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}
              
              {/* Icon Container */}
              <div className={cn(
                "relative p-2 sm:p-2.5 rounded-xl transition-all duration-300",
                isSelected 
                  ? "bg-white/20 backdrop-blur-sm" 
                  : option.iconBg
              )}>
                <Icon className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300",
                  "group-hover:scale-110",
                  isSelected ? "text-white" : ""
                )} />
              </div>
              
              {/* Labels */}
              <div className="text-center min-w-0">
                <span className={cn(
                  "block text-[10px] sm:text-xs font-semibold truncate",
                  isSelected ? "text-white" : "text-foreground"
                )}>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </span>
                {option.description && (
                  <span className={cn(
                    "hidden sm:block text-[9px] mt-0.5 truncate",
                    isSelected ? "text-white/80" : "text-muted-foreground"
                  )}>
                    {option.description}
                  </span>
                )}
              </div>
              
              {/* Active Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="type-indicator"
                  className="absolute bottom-1 w-6 h-1 rounded-full bg-white/60"
                  transition={{ type: "spring", bounce: 0.3 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default MarketplaceTypeSelector;
