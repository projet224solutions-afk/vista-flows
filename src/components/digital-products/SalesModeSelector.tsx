/**
 * Sélecteur de mode de vente ultra professionnel
 * Design moderne inspiré des meilleures plateformes
 */

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
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type SalesMode = 'direct' | 'affiliate';

interface SalesModeSelectorProps {
  value: SalesMode;
  onChange: (mode: SalesMode) => void;
  disabled?: boolean;
}

const salesModes = {
  direct: {
    id: 'direct',
    title: 'Vente Directe',
    subtitle: 'Vendez vos propres produits',
    icon: Store,
    color: 'emerald',
    badgeText: 'Recommandé',
    badgeVariant: 'secondary' as const,
    description: 'Créez et vendez vos propres produits numériques : formations, eBooks, templates, logiciels...',
    features: [
      { icon: Wallet, text: 'Recevez 100% des revenus', highlight: true },
      { icon: ShieldCheck, text: 'Contrôle total sur vos produits', highlight: false },
      { icon: Users, text: 'Créez votre propre clientèle', highlight: false },
      { icon: FileText, text: 'Gérez vos fichiers et accès', highlight: false }
    ],
    requirements: [
      'Contenu original ou droits de revente',
      'Fichiers à livrer au client',
      'Support client assuré par vous'
    ],
    commissionInfo: null
  },
  affiliate: {
    id: 'affiliate',
    title: 'Marketing d\'Affiliation',
    subtitle: 'Promouvez des produits partenaires',
    icon: Link2,
    color: 'violet',
    badgeText: 'Commission élevée',
    badgeVariant: 'default' as const,
    description: 'Gagnez des commissions en promouvant des produits de partenaires comme Amazon, Booking, Systeme.io...',
    features: [
      { icon: Percent, text: 'Commissions jusqu\'à 75%', highlight: true },
      { icon: Zap, text: 'Pas de création de produit', highlight: false },
      { icon: Globe, text: 'Accès à des milliers de produits', highlight: false },
      { icon: TrendingUp, text: 'Tracking automatique', highlight: false }
    ],
    requirements: [
      'Lien d\'affiliation valide'
    ],
    commissionInfo: {
      label: 'Commission typique',
      ranges: [
        { platform: 'Amazon', rate: '1-10%' },
        { platform: 'Systeme.io', rate: '40-60%' },
        { platform: 'ClickBank', rate: '50-75%' },
        { platform: 'Booking', rate: '25-40%' }
      ]
    }
  }
};

export function SalesModeSelector({ value, onChange, disabled }: SalesModeSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Header avec effet visuel */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Étape 1</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">
          Choisissez votre modèle de vente
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Sélectionnez le mode qui correspond à votre stratégie commerciale
        </p>
      </div>

      {/* Grille de sélection */}
      <div className="grid gap-4">
        {(Object.keys(salesModes) as SalesMode[]).map((modeKey, index) => {
          const mode = salesModes[modeKey];
          const isSelected = value === modeKey;
          const Icon = mode.icon;

          return (
            <motion.button
              key={modeKey}
              type="button"
              disabled={disabled}
              onClick={() => onChange(modeKey)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected 
                  ? 'border-primary shadow-xl shadow-primary/10 bg-gradient-to-br from-background via-background to-primary/5' 
                  : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-lg',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Header de la carte */}
              <div className={cn(
                'px-5 py-4 border-b transition-colors',
                isSelected ? 'border-primary/20 bg-primary/5' : 'border-border'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icône avec gradient */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform',
                      isSelected && 'scale-105',
                      mode.color === 'emerald' 
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                        : 'bg-gradient-to-br from-violet-500 to-purple-600',
                      'text-white shadow-lg'
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Titre et sous-titre */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-lg">
                          {mode.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {mode.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Badge et indicateur de sélection */}
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={mode.badgeVariant}
                      className={cn(
                        'text-xs font-medium',
                        mode.color === 'violet' && 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0'
                      )}
                    >
                      {mode.badgeText}
                    </Badge>
                    
                    {/* Indicateur radio stylisé */}
                    <div className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                      isSelected 
                        ? 'border-primary bg-primary scale-110' 
                        : 'border-muted-foreground/30 bg-background'
                    )}>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Corps de la carte */}
              <div className="p-5 space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {mode.description}
                </p>

                {/* Features en grille 2x2 */}
                <div className="grid grid-cols-2 gap-3">
                  {mode.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          'flex items-center gap-2.5 p-2.5 rounded-lg transition-colors',
                          feature.highlight 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'bg-muted/50'
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                          feature.highlight 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-background text-primary'
                        )}>
                          <FeatureIcon className="w-4 h-4" />
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          feature.highlight ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {feature.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Commission info pour affiliation */}
                {mode.commissionInfo && (
                  <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl p-4 border border-violet-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-violet-500" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {mode.commissionInfo.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {mode.commissionInfo.ranges.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between bg-background/80 rounded-lg px-3 py-2"
                        >
                          <span className="text-xs text-muted-foreground font-medium">
                            {item.platform}
                          </span>
                          <span className={cn(
                            'text-sm font-bold',
                            item.rate.includes('75') || item.rate.includes('60') 
                              ? 'text-emerald-500' 
                              : 'text-primary'
                          )}>
                            {item.rate}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prérequis minimaliste */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium">Prérequis :</span>
                    <span>{mode.requirements[0]}</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
