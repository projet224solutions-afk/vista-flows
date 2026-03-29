/**
 * SÃ©lecteur de mode de vente ultra professionnel
 * Design moderne alignÃ© horizontalement
 */

import React from 'react';
import { 
  Store, 
  Link2, 
  Check,
  Users, 
  TrendingUp,
  Globe,
  ShieldCheck,
  Wallet,
  FileText,
  Zap,
  BarChart3,
  Percent,
  Crown,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type SalesMode = 'direct' | 'affiliate';

interface SalesModeSelectorProps {
  value: SalesMode;
  onChange: (mode: SalesMode) => void;
  disabled?: boolean;
  hideDirectSale?: boolean;
}

const salesModes = {
  direct: {
    id: 'direct',
    title: 'Vente Directe',
    subtitle: 'Vendez vos propres produits',
    icon: Store,
    color: 'blue',
    badgeText: 'RecommandÃ©',
    badgeVariant: 'secondary' as const,
    description: 'CrÃ©ez et vendez vos propres produits numÃ©riques',
    features: [
      { icon: Wallet, text: '100% des revenus' },
      { icon: ShieldCheck, text: 'ContrÃ´le total' },
      { icon: Users, text: 'Votre clientÃ¨le' },
      { icon: FileText, text: 'Gestion fichiers' }
    ],
    highlight: 'Gardez 100% de vos ventes',
    commissionInfo: null
  },
  affiliate: {
    id: 'affiliate',
    title: 'Affiliation',
    subtitle: 'Promouvez des partenaires',
    icon: Link2,
    color: 'orange',
    badgeText: 'Commission Ã©levÃ©e',
    badgeVariant: 'default' as const,
    description: 'Gagnez des commissions sur les ventes',
    features: [
      { icon: Percent, text: 'Jusqu\'Ã  75%' },
      { icon: Zap, text: 'Sans crÃ©ation' },
      { icon: Globe, text: 'Milliers de produits' },
      { icon: TrendingUp, text: 'Tracking auto' }
    ],
    highlight: 'Amazon, Booking, Systeme.io...',
    commissionInfo: {
      ranges: [
        { platform: 'Amazon', rate: '1-10%' },
        { platform: 'Systeme.io', rate: '40-60%' },
        { platform: 'ClickBank', rate: '50-75%' },
        { platform: 'Booking', rate: '25-40%' }
      ]
    }
  }
};

export function SalesModeSelector({ value, onChange, disabled, hideDirectSale }: SalesModeSelectorProps) {
  // Filtrer les modes selon hideDirectSale
  const availableModes = hideDirectSale 
    ? (['affiliate'] as SalesMode[])
    : (Object.keys(salesModes) as SalesMode[]);

  // Si on cache la vente directe et que la valeur actuelle est 'direct', forcer 'affiliate'
  React.useEffect(() => {
    if (hideDirectSale && value === 'direct') {
      onChange('affiliate');
    }
  }, [hideDirectSale, value, onChange]);

  // Si seulement l'affiliation est disponible, ne pas afficher le sÃ©lecteur
  if (hideDirectSale) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full border border-primary/20">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">ModÃ¨le de vente</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Choisissez votre stratÃ©gie
        </h2>
        <p className="text-sm text-muted-foreground">
          SÃ©lectionnez le mode qui correspond Ã  vos objectifs
        </p>
      </div>

      {/* Grille horizontale */}
      <div className="grid grid-cols-2 gap-4">
        {availableModes.map((modeKey, index) => {
          const mode = salesModes[modeKey];
          const isSelected = value === modeKey;
          const Icon = mode.icon;

          return (
            <motion.button
              key={modeKey}
              type="button"
              disabled={disabled}
              onClick={() => onChange(modeKey)}
              initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'group relative text-left rounded-2xl border-2 p-4 transition-all duration-300 h-full hover:-translate-y-1',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-orange-400',
                isSelected
                  ? 'border-primary-blue-300 shadow-xl shadow-primary-blue-500/15 bg-primary-blue-50'
                  : 'border-border bg-card hover:border-primary-orange-200/70 hover:shadow-lg',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Badge en haut Ã  droite */}
              <div className="absolute top-3 right-3">
                <Badge 
                  variant={mode.badgeVariant}
                  className={cn(
                    'text-[10px] font-medium',
                    mode.color === 'orange' && 'brand-split text-white border-0'
                  )}
                >
                  {mode.badgeText}
                </Badge>
              </div>

              {/* Indicateur de sÃ©lection */}
              <div className={cn(
                'absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                isSelected
                  ? 'border-primary-blue-500 bg-primary-blue-600'
                  : 'border-muted-foreground/30'
              )}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {/* Contenu principal */}
              <div className="pt-6 space-y-3">
                {/* IcÃ´ne */}
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mx-auto',
                  mode.color === 'blue' 
                    ? 'bg-gradient-to-br bg-primary-blue-600' 
                    : 'bg-gradient-to-br bg-primary-orange-600',
                  'text-white shadow-lg transition-transform duration-300 group-hover:scale-105'
                )}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Titre */}
                <div className="text-center">
                  <h3 className="font-bold text-foreground text-base">{mode.title}</h3>
                  <p className="text-xs text-muted-foreground">{mode.subtitle}</p>
                </div>

                {/* Highlight */}
                <div className={cn(
                  'text-center py-2 px-3 rounded-lg text-xs font-medium',
                  mode.color === 'blue' 
                    ? 'bg-primary-blue-500/10 text-primary-blue-600 dark:text-primary-blue-400' 
                    : 'bg-primary-orange-500/10 text-primary-orange-600 dark:text-primary-orange-400'
                )}>
                  {mode.highlight}
                </div>

                {/* Features en liste */}
                <div className="space-y-1.5">
                  {mode.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <FeatureIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{feature.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Commission info pour affiliation */}
                {mode.commissionInfo && (
                  <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      Commissions typiques
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {mode.commissionInfo.ranges.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">{item.platform}</span>
                          <span className="font-semibold text-primary">{item.rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Call to action */}
                <div className={cn(
                  'flex items-center justify-center gap-1 pt-2 text-xs font-medium transition-colors',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}>
                  <span>{isSelected ? 'SÃ©lectionnÃ©' : 'SÃ©lectionner'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
