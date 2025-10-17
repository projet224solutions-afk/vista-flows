/**
 * 📊 COMPARATEUR HISTORIQUE - 224SOLUTIONS
 * Composant pour comparer les données historiques
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Calculator,
  Target
} from 'lucide-react';
import { TemporalFilters, TemporalFiltersProps } from './TemporalFilters';

interface HistoricalData {
  period: string;
  metrics: {
    revenue: number;
    transactions: number;
    users: number;
    vendors: number;
    payments: number;
  };
  trends: {
    revenue_change: number;
    transactions_change: number;
    users_change: number;
    vendors_change: number;
    payments_change: number;
  };
}

interface HistoricalComparatorProps {
  onDataChange?: (data: HistoricalData[]) => void;
}

export const HistoricalComparator: React.FC<HistoricalComparatorProps> = ({
  onDataChange
}) => {
  const [currentData, setCurrentData] = useState<HistoricalData | null>(null);
  const [comparisonData, setComparisonData] = useState<HistoricalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  // Charger les données historiques
  const loadHistoricalData = async (filters: TemporalFilters) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/historical-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters)
      });

      const data = await response.json();

      if (data.success) {
        setCurrentData(data.current_period);
        setComparisonData(data.comparison_period);
        onDataChange?.(data.current_period ? [data.current_period, data.comparison_period].filter(Boolean) : []);
      } else {
        setError(data.error || 'Erreur chargement données historiques');
      }
    } catch (error) {
      console.error('Erreur chargement données historiques:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Exporter les données
  const exportData = async () => {
    if (!currentData || !comparisonData) return;

    try {
      const csvData = [
        ['Métrique', 'Période actuelle', 'Période de comparaison', 'Évolution (%)'],
        ['Revenus', currentData.metrics.revenue.toString(), comparisonData.metrics.revenue.toString(), currentData.trends.revenue_change.toFixed(2)],
        ['Transactions', currentData.metrics.transactions.toString(), comparisonData.metrics.transactions.toString(), currentData.trends.transactions_change.toFixed(2)],
        ['Utilisateurs', currentData.metrics.users.toString(), comparisonData.metrics.users.toString(), currentData.trends.users_change.toFixed(2)],
        ['Vendeurs', currentData.metrics.vendors.toString(), comparisonData.metrics.vendors.toString(), currentData.trends.vendors_change.toFixed(2)],
        ['Paiements', currentData.metrics.payments.toString(), comparisonData.metrics.payments.toString(), currentData.trends.payments_change.toFixed(2)]
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparaison-historique-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "📊 Données exportées",
        description: "Le fichier CSV a été téléchargé",
      });
    } catch (error) {
      console.error('Erreur export données:', error);
      setError('Erreur lors de l\'export');
    }
  };

  // Obtenir l'icône de tendance
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <BarChart3 className="w-4 h-4 text-gray-600" />;
  };

  // Obtenir la couleur de tendance
  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Formater le pourcentage
  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Filtres temporels */}
      <TemporalFilters onFiltersChange={loadHistoricalData} />

      {/* État de chargement */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données historiques...</p>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Données de comparaison */}
      {!isLoading && !error && currentData && comparisonData && (
        <div className="space-y-6">
          {/* En-tête avec actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Comparaison Historique</h3>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showDetails ? 'Masquer détails' : 'Afficher détails'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportData}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>

          {/* Métriques principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { key: 'revenue', label: 'Revenus', value: currentData.metrics.revenue, change: currentData.trends.revenue_change, format: (v: number) => `${v.toLocaleString()} GNF` },
              { key: 'transactions', label: 'Transactions', value: currentData.metrics.transactions, change: currentData.trends.transactions_change, format: (v: number) => v.toLocaleString() },
              { key: 'users', label: 'Utilisateurs', value: currentData.metrics.users, change: currentData.trends.users_change, format: (v: number) => v.toLocaleString() },
              { key: 'vendors', label: 'Vendeurs', value: currentData.metrics.vendors, change: currentData.trends.vendors_change, format: (v: number) => v.toLocaleString() },
              { key: 'payments', label: 'Paiements', value: currentData.metrics.payments, change: currentData.trends.payments_change, format: (v: number) => v.toLocaleString() }
            ].map(({ key, label, value, change, format }) => (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600">{label}</h4>
                    {getTrendIcon(change)}
                  </div>
                  <div className="text-2xl font-bold mb-1">{format(value)}</div>
                  <div className={`text-sm ${getTrendColor(change)}`}>
                    {formatPercentage(change)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Détails de comparaison */}
          {showDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Détails de la comparaison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: 'revenue', label: 'Revenus', current: currentData.metrics.revenue, comparison: comparisonData.metrics.revenue, change: currentData.trends.revenue_change },
                    { key: 'transactions', label: 'Transactions', current: currentData.metrics.transactions, comparison: comparisonData.metrics.transactions, change: currentData.trends.transactions_change },
                    { key: 'users', label: 'Utilisateurs', current: currentData.metrics.users, comparison: comparisonData.metrics.users, change: currentData.trends.users_change },
                    { key: 'vendors', label: 'Vendeurs', current: currentData.metrics.vendors, comparison: comparisonData.metrics.vendors, change: currentData.trends.vendors_change },
                    { key: 'payments', label: 'Paiements', current: currentData.metrics.payments, comparison: comparisonData.metrics.payments, change: currentData.trends.payments_change }
                  ].map(({ key, label, current, comparison, change }) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTrendIcon(change)}
                        <span className="font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Période actuelle</div>
                          <div className="font-semibold">{current.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Période de comparaison</div>
                          <div className="font-semibold">{comparison.toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Évolution</div>
                          <div className={`font-semibold ${getTrendColor(change)}`}>
                            {formatPercentage(change)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Résumé des tendances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Résumé des tendances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">Tendances positives</h4>
                  {Object.entries(currentData.trends)
                    .filter(([_, change]) => change > 0)
                    .map(([key, change]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {formatPercentage(change)}
                        </Badge>
                      </div>
                    ))}
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Tendances négatives</h4>
                  {Object.entries(currentData.trends)
                    .filter(([_, change]) => change < 0)
                    .map(([key, change]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                        <Badge variant="destructive">
                          {formatPercentage(change)}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
