/**
 * Sélecteur de mode de vente ultra professionnel
 * Inspiré de ClickBank, ShareASale, CJ Affiliate
 */

import { useState } from 'react';
import { 
  Store, 
  Link2, 
  ChevronRight, 
  DollarSign, 
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const [hoveredMode, setHoveredMode] = useState<SalesMode | null>(null);

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

      {/* Cartes de sélection */}
      <div className="grid gap-4">
        {(Object.keys(salesModes) as SalesMode[]).map((modeKey) => {
          const mode = salesModes[modeKey];
          const isSelected = value === modeKey;
          const isHovered = hoveredMode === modeKey;
          const Icon = mode.icon;

          return (
            <Card
              key={modeKey}
              className={cn(
                'cursor-pointer transition-all duration-300 overflow-hidden',
                'border-2',
                isSelected 
                  ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/50',
                isHovered && !isSelected && 'shadow-md',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !disabled && onChange(modeKey)}
              onMouseEnter={() => setHoveredMode(modeKey)}
              onMouseLeave={() => setHoveredMode(null)}
            >
              {/* Header avec gradient */}
              <div className={cn(
                'p-4 transition-all duration-300',
                isSelected 
                  ? `bg-gradient-to-r ${mode.gradient} text-white` 
                  : 'bg-muted/50'
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      isSelected 
                        ? 'bg-white/20' 
                        : `bg-gradient-to-br ${mode.gradient} text-white`
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={cn(
                        'font-bold text-base',
                        isSelected ? 'text-white' : 'text-foreground'
                      )}>
                        {mode.title}
                      </h3>
                      <p className={cn(
                        'text-xs',
                        isSelected ? 'text-white/80' : 'text-muted-foreground'
                      )}>
                        {mode.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={isSelected ? "secondary" : "outline"}
                      className={cn(
                        'text-[10px]',
                        isSelected && 'bg-white/20 text-white border-white/30'
                      )}
                    >
                      {mode.badgeText}
                    </Badge>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contenu étendu si sélectionné ou survolé */}
              <CardContent className={cn(
                'transition-all duration-300 overflow-hidden',
                (isSelected || isHovered) ? 'p-4' : 'p-0 h-0'
              )}>
                <p className="text-sm text-muted-foreground mb-4">
                  {mode.description}
                </p>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 mb-4">
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
                  <div className="bg-muted/50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5" />
                      {mode.commissionInfo.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {mode.commissionInfo.ranges.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{item.platform}</span>
                          <span className="font-semibold text-primary">{item.rate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Prérequis
                  </p>
                  {mode.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="w-3 h-3 text-primary" />
                      <span>{req}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info complémentaire */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border">
        <p className="text-xs text-muted-foreground text-center">
          {value === 'direct' ? (
            <>
              <Store className="w-3.5 h-3.5 inline mr-1" />
              Vous gérez tout : produit, livraison et support client
            </>
          ) : (
            <>
              <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
              Les clients seront redirigés vers la plateforme partenaire
            </>
          )}
        </p>
      </div>
    </div>
  );
}
