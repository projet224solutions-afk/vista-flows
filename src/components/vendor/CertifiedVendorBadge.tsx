/**
 * CERTIFIED VENDOR BADGE
 * Badge visuel "Vendeur certifié ✅"
 * Affichage sur profil, boutique, produits
 * 224SOLUTIONS
 */

import React from 'react';
import { Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { VendorCertificationStatus, getCertificationStatusLabel } from '@/types/vendorCertification';
import { cn } from '@/lib/utils';

interface CertifiedVendorBadgeProps {
  status: VendorCertificationStatus;
  verifiedAt?: string | null;
  variant?: 'default' | 'compact' | 'detailed';
  showTooltip?: boolean;
  className?: string;
}

export function CertifiedVendorBadge({ 
  status, 
  verifiedAt,
  variant = 'default',
  showTooltip = true,
  className 
}: CertifiedVendorBadgeProps) {
  
  // Ne rien afficher si non certifié (pour les vues publiques)
  if (status === 'NON_CERTIFIE' && variant !== 'detailed') {
    return null;
  }

  const getBadgeConfig = () => {
    switch (status) {
      case 'CERTIFIE':
        return {
          icon: CheckCircle2,
          label: 'Vendeur certifié',
          color: 'bg-green-500 text-white border-green-600',
          iconColor: 'text-white',
          tooltipText: verifiedAt 
            ? `Vendeur certifié le ${new Date(verifiedAt).toLocaleDateString('fr-FR')}`
            : 'Vendeur certifié par 224Solutions'
        };
      case 'SUSPENDU':
        return {
          icon: AlertTriangle,
          label: 'Suspendu',
          color: 'bg-red-500 text-white border-red-600',
          iconColor: 'text-white',
          tooltipText: 'Certification suspendue temporairement'
        };
      case 'NON_CERTIFIE':
      default:
        return {
          icon: XCircle,
          label: 'Non certifié',
          color: 'bg-gray-400 text-white border-gray-500',
          iconColor: 'text-white',
          tooltipText: 'Vendeur non certifié - KYC requis'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  // Variante compacte (juste icône)
  if (variant === 'compact') {
    const badge = (
      <div className={cn(
        "inline-flex items-center justify-center rounded-full p-1",
        config.color,
        className
      )}>
        <Icon className="w-3 h-3" />
      </div>
    );

    if (!showTooltip) return badge;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{config.tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Variante détaillée (avec statut et date)
  if (variant === 'detailed') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        config.color,
        className
      )}>
        <Icon className="w-4 h-4" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{config.label}</span>
          {verifiedAt && status === 'CERTIFIE' && (
            <span className="text-xs opacity-90">
              Depuis {new Date(verifiedAt).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Variante par défaut
  const badge = (
    <Badge 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 font-semibold shadow-sm",
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{config.label}</span>
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Export d'un composant simplifié pour icône seule
export function CertifiedIcon({ 
  status, 
  className 
}: { 
  status: VendorCertificationStatus; 
  className?: string;
}) {
  if (status !== 'CERTIFIE') return null;

  return (
    <CheckCircle2 
      className={cn("text-green-500", className)} 
      aria-label="Vendeur certifié"
    />
  );
}

// Export d'un shield icon pour grandes tailles
export function CertificationShield({
  status,
  size = 'md',
  className
}: {
  status: VendorCertificationStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  if (status !== 'CERTIFIE') return null;

  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }[size];

  return (
    <div className={cn(
      "relative inline-flex items-center justify-center",
      className
    )}>
      <Shield className={cn(
        "text-green-500 fill-green-50",
        sizeClass
      )} />
      <CheckCircle2 className={cn(
        "absolute text-green-600",
        size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'
      )} />
    </div>
  );
}
