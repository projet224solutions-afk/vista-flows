/**
 * Sélecteur de mode de vente ultra professionnel
 * Inspiré de ClickBank, ShareASale, CJ Affiliate
 */

import { 
  Store, 
  Link2, 
  ChevronRight, 
  Users, 
  TrendingUp,
  Globe,
  ShieldCheck,
  Wallet,
  FileText,
  Zap,
  BarChart3,
  Percent,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    gradient: 'from-emerald-500 to-teal-600',
    badgeText: 'Recommandé',
    description: 'Créez et vendez vos propres produits numériques : formations, eBooks, templates, logiciels...',
    features: [
      { icon: Wallet, text: 'Recevez 100% des revenus' },
      { icon: ShieldCheck, text: 'Contrôle total sur vos produits' },
      { icon: Users, text: 'Créez votre propre clientèle' },
      { icon: FileText, text: 'Gérez vos fichiers et accès' }
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
    gradient: 'from-purple-500 to-indigo-600',
    badgeText: 'Commission élevée',
    description: 'Gagnez des commissions en promouvant des produits de partenaires comme Amazon, Booking, Systeme.io...',
    features: [
      { icon: Percent, text: 'Commissions jusqu\'à 75%' },
      { icon: Zap, text: 'Pas de création de produit' },
      { icon: Globe, text: 'Accès à des milliers de produits' },
      { icon: TrendingUp, text: 'Tracking automatique' }
    ],
    requirements: [
      'Lien d\'affiliation valide',
      'Compte affilié sur la plateforme',
      'Respect des conditions du partenaire'
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
    <div className="space-y-4">
      {/* Header informatif */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold text-foreground mb-1">
          Choisissez votre modèle de vente
        </h2>
        <p className="text-sm text-muted-foreground">
          Sélectionnez le mode qui correspond à votre stratégie commerciale
        </p>
      </div>

      {/* Cartes de sélection - CLIQUABLES */}
      <div className="grid gap-4">
        {(Object.keys(salesModes) as SalesMode[]).map((modeKey) => {
          const mode = salesModes[modeKey];
          const isSelected = value === modeKey;
          const Icon = mode.icon;

          return (
            <button
              key={modeKey}
              type="button"
              disabled={disabled}
              onClick={() => onChange(modeKey)}
              className={cn(
                'w-full text-left rounded-xl border-2 p-4 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20' 
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-md',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icône */}
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
                  `bg-gradient-to-br ${mode.gradient} text-white`
                )}>
                  <Icon className="w-7 h-7" />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-foreground text-base">
                      {mode.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isSelected ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {mode.badgeText}
                      </Badge>
                      {/* Indicateur de sélection */}
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                        isSelected 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground/30'
                      )}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">
                    {mode.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3">
                    {mode.description}
                  </p>

                  {/* Features en grille */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {mode.features.map((feature, idx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 text-xs text-foreground"
                        >
                          <FeatureIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{feature.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Commission info pour affiliation */}
                  {mode.commissionInfo && (
                    <div className="bg-muted/50 rounded-lg p-2.5 mb-2">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {mode.commissionInfo.label}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {mode.commissionInfo.ranges.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{item.platform}</span>
                            <span className="font-semibold text-primary">{item.rate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Prérequis
                    </p>
                    {mode.requirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ChevronRight className="w-2.5 h-2.5 text-primary" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info complémentaire */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
        <p className="text-xs text-foreground text-center font-medium">
          {value === 'direct' ? (
            <>
              <Store className="w-3.5 h-3.5 inline mr-1 text-primary" />
              Vente Directe : Vous gérez tout (produit, livraison, support)
            </>
          ) : (
            <>
              <ExternalLink className="w-3.5 h-3.5 inline mr-1 text-primary" />
              Affiliation : Les clients seront redirigés vers le partenaire
            </>
          )}
        </p>
      </div>
    </div>
  );
}
