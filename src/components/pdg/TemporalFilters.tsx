/**
 * 📅 FILTRES TEMPORELS - 224SOLUTIONS
 * Composant pour les filtres temporels et comparaison historique
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Clock,
  RefreshCw,
  Filter
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface TemporalFilters {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: Date;
  endDate: Date;
  compareWith: 'previous' | 'last_year' | 'none';
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface TemporalFiltersProps {
  onFiltersChange: (filters: TemporalFilters) => void;
  initialFilters?: TemporalFilters;
}

const PRESET_PERIODS = [
  { key: 'today', label: 'Aujourd\'hui', period: 'day' as const, getDate: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { key: 'yesterday', label: 'Hier', period: 'day' as const, getDate: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
  { key: 'last_7_days', label: '7 derniers jours', period: 'week' as const, getDate: () => ({ start: startOfDay(subDays(new Date(), 7)), end: endOfDay(new Date()) }) },
  { key: 'last_30_days', label: '30 derniers jours', period: 'month' as const, getDate: () => ({ start: startOfDay(subDays(new Date(), 30)), end: endOfDay(new Date()) }) },
  { key: 'last_90_days', label: '90 derniers jours', period: 'quarter' as const, getDate: () => ({ start: startOfDay(subDays(new Date(), 90)), end: endOfDay(new Date()) }) },
  { key: 'this_month', label: 'Ce mois', period: 'month' as const, getDate: () => ({ start: startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), end: endOfDay(new Date()) }) },
  { key: 'last_month', label: 'Mois dernier', period: 'month' as const, getDate: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { start: startOfDay(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)), end: endOfDay(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)) };
  }},
  { key: 'this_year', label: 'Cette année', period: 'year' as const, getDate: () => ({ start: startOfDay(new Date(new Date().getFullYear(), 0, 1)), end: endOfDay(new Date()) }) },
  { key: 'last_year', label: 'Année dernière', period: 'year' as const, getDate: () => {
    const lastYear = new Date().getFullYear() - 1;
    return { start: startOfDay(new Date(lastYear, 0, 1)), end: endOfDay(new Date(lastYear, 11, 31)) };
  }}
];

export const TemporalFilters: React.FC<TemporalFiltersProps> = ({
  onFiltersChange,
  initialFilters
}) => {
  const [filters, setFilters] = useState<TemporalFilters>(initialFilters || {
    period: 'month',
    startDate: startOfDay(subDays(new Date(), 30)),
    endDate: endOfDay(new Date()),
    compareWith: 'previous',
    granularity: 'day'
  });
  
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { toast } = useToast();

  // Appliquer les filtres au changement
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const applyPresetPeriod = (preset: typeof PRESET_PERIODS[0]) => {
    const { start, end } = preset.getDate();
    setFilters(prev => ({
      ...prev,
      period: 'custom',
      startDate: start,
      endDate: end
    }));
  };

  // Appliquer une période personnalisée
  const applyCustomPeriod = (start: Date, end: Date) => {
    setFilters(prev => ({
      ...prev,
      period: 'custom',
      startDate: start,
      endDate: end
    }));
    setIsCustomDateOpen(false);
  };

  // Appliquer la comparaison
  const applyComparison = (compareWith: 'previous' | 'last_year' | 'none') => {
    setFilters(prev => ({
      ...prev,
      compareWith
    }));
    setIsCompareOpen(false);
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    const defaultFilters: TemporalFilters = {
      period: 'last_30_days',
      startDate: startOfDay(subDays(new Date(), 30)),
      endDate: endOfDay(new Date()),
      compareWith: 'previous',
      granularity: 'day'
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    toast({
      title: "🔄 Filtres réinitialisés",
      description: "Les filtres ont été remis à zéro",
    });
  };

  // Obtenir la période de comparaison
  const getComparisonPeriod = () => {
    if (filters.compareWith === 'none') return null;
    
    const duration = filters.endDate.getTime() - filters.startDate.getTime();
    
    if (filters.compareWith === 'previous') {
      return {
        start: new Date(filters.startDate.getTime() - duration),
        end: new Date(filters.endDate.getTime() - duration)
      };
    } else if (filters.compareWith === 'last_year') {
      return {
        start: new Date(filters.startDate.getFullYear() - 1, filters.startDate.getMonth(), filters.startDate.getDate()),
        end: new Date(filters.endDate.getFullYear() - 1, filters.endDate.getMonth(), filters.endDate.getDate())
      };
    }
    
    return null;
  };

  const comparisonPeriod = getComparisonPeriod();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Filtres Temporels
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Périodes prédéfinies */}
        <div>
          <h4 className="font-medium mb-2">Périodes rapides</h4>
          <div className="flex flex-wrap gap-2">
            {PRESET_PERIODS.map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant={filters.period === preset.period ? 'default' : 'outline'}
                onClick={() => applyPresetPeriod(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Période personnalisée */}
        <div>
          <h4 className="font-medium mb-2">Période personnalisée</h4>
          <div className="flex items-center gap-2">
            <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(filters.startDate, 'dd/MM/yyyy', { locale: fr })} - {format(filters.endDate, 'dd/MM/yyyy', { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={{ from: filters.startDate, to: filters.endDate }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      applyCustomPeriod(startOfDay(range.from), endOfDay(range.to));
                    }
                  }}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Comparaison */}
        <div>
          <h4 className="font-medium mb-2">Comparaison</h4>
          <div className="flex items-center gap-2">
            <Popover open={isCompareOpen} onOpenChange={setIsCompareOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Compare className="w-4 h-4" />
                  {filters.compareWith === 'none' ? 'Aucune comparaison' : 
                   filters.compareWith === 'previous' ? 'Période précédente' : 
                   'Même période année dernière'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <Button
                    variant={filters.compareWith === 'none' ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => applyComparison('none')}
                  >
                    Aucune comparaison
                  </Button>
                  <Button
                    variant={filters.compareWith === 'previous' ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => applyComparison('previous')}
                  >
                    Période précédente
                  </Button>
                  <Button
                    variant={filters.compareWith === 'last_year' ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => applyComparison('last_year')}
                  >
                    Même période année dernière
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Granularité */}
        <div>
          <h4 className="font-medium mb-2">Granularité</h4>
          <div className="flex gap-2">
            {[
              { key: 'hour', label: 'Heure', icon: Clock },
              { key: 'day', label: 'Jour', icon: CalendarIcon },
              { key: 'week', label: 'Semaine', icon: BarChart3 },
              { key: 'month', label: 'Mois', icon: TrendingUp }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                size="sm"
                variant={filters.granularity === key ? 'default' : 'outline'}
                onClick={() => setFilters(prev => ({ ...prev, granularity: key as any }))}
                className="flex items-center gap-1"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Période de comparaison */}
        {comparisonPeriod && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-1">Période de comparaison :</h5>
            <p className="text-sm text-blue-800">
              {format(comparisonPeriod.start, 'dd/MM/yyyy', { locale: fr })} - {format(comparisonPeriod.end, 'dd/MM/yyyy', { locale: fr })}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Réinitialiser
          </Button>
          <Badge variant="secondary" className="ml-auto">
            <Filter className="w-3 h-3 mr-1" />
            Filtres actifs
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
