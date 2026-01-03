/**
 * Indicateur de Devise avec Toggle - Marketplace
 * Affiche la devise actuelle et permet de basculer entre locale/GNF
 */

import { useState, useEffect } from 'react';
import { Globe, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePriceConverter } from '@/hooks/usePriceConverter';
import { useTranslation } from '@/hooks/useTranslation';
import { getCurrencyByCode } from '@/data/currencies';

interface CurrencyIndicatorProps {
  variant?: 'default' | 'compact';
  showToggle?: boolean;
}

const CURRENCY_STORAGE_KEY = 'marketplace_display_currency';

export function CurrencyIndicator({ 
  variant = 'default',
  showToggle = true 
}: CurrencyIndicatorProps) {
  const { userCurrency, userCountry, loading, lastUpdated, refreshRates } = usePriceConverter();
  const { t } = useTranslation();
  
  // État local pour la devise d'affichage (peut être différente de la devise détectée)
  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return stored || userCurrency;
  });

  // Synchroniser avec la devise détectée
  useEffect(() => {
    if (!localStorage.getItem(CURRENCY_STORAGE_KEY) && userCurrency) {
      setDisplayCurrency(userCurrency);
    }
  }, [userCurrency]);

  const handleToggleCurrency = () => {
    const newCurrency = displayCurrency === 'GNF' ? userCurrency : 'GNF';
    setDisplayCurrency(newCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    
    // Déclencher un événement personnalisé pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('currencyChanged', { 
      detail: { currency: newCurrency } 
    }));
  };

  const handleSelectCurrency = (currency: string) => {
    setDisplayCurrency(currency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    window.dispatchEvent(new CustomEvent('currencyChanged', { 
      detail: { currency } 
    }));
  };

  const currency = getCurrencyByCode(displayCurrency);
  const detectedCurrency = getCurrencyByCode(userCurrency);

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        {variant === 'compact' ? '...' : t('common.loading') || 'Chargement...'}
      </Badge>
    );
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className="cursor-pointer hover:bg-primary/10"
              onClick={showToggle ? handleToggleCurrency : undefined}
            >
              <Globe className="w-3 h-3 mr-1" />
              {currency?.flag} {displayCurrency}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-semibold">
                {t('marketplace.pricesIn') || 'Prix affichés en'}
              </p>
              <p>{currency?.name || displayCurrency}</p>
              {displayCurrency !== userCurrency && (
                <p className="text-muted-foreground">
                  {t('marketplace.convertedFrom') || 'Converti depuis'} {detectedCurrency?.name}
                </p>
              )}
              {showToggle && (
                <p className="text-primary font-medium mt-2">
                  {t('common.clickToToggle') || 'Cliquez pour basculer'}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">
            {t('marketplace.pricesIn') || 'Prix en'}:
          </span>
          <Badge variant="secondary" className="ml-1">
            {currency?.flag} {displayCurrency}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          {t('marketplace.selectCurrency') || 'Sélectionner la devise'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Devise locale détectée */}
        {userCurrency !== 'GNF' && (
          <DropdownMenuItem
            onClick={() => handleSelectCurrency(userCurrency)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span>{detectedCurrency?.flag}</span>
              <div>
                <p className="font-medium">{detectedCurrency?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('marketplace.yourLocalCurrency') || 'Votre devise locale'} ({userCountry})
                </p>
              </div>
            </div>
            {displayCurrency === userCurrency && (
              <span className="text-primary">✓</span>
            )}
          </DropdownMenuItem>
        )}

        {/* GNF (devise d'origine) */}
        <DropdownMenuItem
          onClick={() => handleSelectCurrency('GNF')}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span>🇬🇳</span>
            <div>
              <p className="font-medium">Franc Guinéen (GNF)</p>
              <p className="text-xs text-muted-foreground">
                {t('marketplace.originalCurrency') || 'Devise d\'origine'}
              </p>
            </div>
          </div>
          {displayCurrency === 'GNF' && (
            <span className="text-primary">✓</span>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Informations sur le taux de change */}
        {displayCurrency !== 'GNF' && lastUpdated && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            <p className="flex items-center justify-between">
              <span>{t('marketplace.exchangeRate') || 'Taux de change'}:</span>
              <span className="font-mono">
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
              onClick={() => refreshRates()}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              {t('common.refresh') || 'Actualiser'}
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook pour écouter les changements de devise
export function useDisplayCurrency() {
  const { userCurrency } = usePriceConverter();
  const [displayCurrency, setDisplayCurrency] = useState<string>(() => {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) || userCurrency;
  });

  useEffect(() => {
    const handleCurrencyChange = (event: any) => {
      setDisplayCurrency(event.detail.currency);
    };

    window.addEventListener('currencyChanged', handleCurrencyChange);
    return () => window.removeEventListener('currencyChanged', handleCurrencyChange);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(CURRENCY_STORAGE_KEY) && userCurrency) {
      setDisplayCurrency(userCurrency);
    }
  }, [userCurrency]);

  return { displayCurrency, isLocal: displayCurrency !== 'GNF' };
}
