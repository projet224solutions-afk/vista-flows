/**
 * MARKETPLACE TYPE SELECTOR - Sélecteur Ultra-Compact Mobile
 * 224Solutions - Design E-Commerce Premium
 */

import { Briefcase, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TypeOption {
  id: 'all' | 'product' | 'professional_service' | 'digital_product';
  label: string;
  shortLabel: string;
  icon: typeof Briefcase;
  gradient: string;
  activeGradient: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    id: 'professional_service',
    label: 'Services Pro',
    shortLabel: 'Services',
    icon: Briefcase,
    gradient: 'from-blue-500 to-indigo-600',
    activeGradient: 'shadow-blue-500/30',
  },
  {
    id: 'digital_product',
    label: 'Digital',
    shortLabel: 'Digital',
    icon: Laptop,
    gradient: 'from-purple-500 to-fuchsia-600',
    activeGradient: 'shadow-purple-500/30',
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
      "px-3 py-2 sm:px-4 sm:py-3 border-b border-border/40",
      "bg-gradient-to-r from-muted/20 via-transparent to-muted/20",
      className
    )}>
      <div className="flex justify-center gap-2 sm:gap-3 max-w-xs sm:max-w-sm mx-auto">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.id;
          
          return (
            <motion.button
              key={option.id}
              onClick={() => onTypeChange(option.id)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "relative flex-1 rounded-xl overflow-hidden transition-all duration-200",
                "flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4",
                isSelected
                  ? cn(
                      "bg-gradient-to-r text-white shadow-lg",
                      option.gradient,
                      option.activeGradient
                    )
                  : "bg-card border border-border/50 hover:border-primary/30 hover:shadow-md"
              )}
            >
              {/* Subtle shimmer on selected */}
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer" />
              )}
              
              <Icon className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 shrink-0",
                isSelected ? "text-white" : "text-muted-foreground"
              )} />
              
              <span className={cn(
                "text-[11px] sm:text-xs font-semibold",
                isSelected ? "text-white" : "text-foreground"
              )}>
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default MarketplaceTypeSelector;
