/**
 * 🤖 WIDGET INSIGHTS IA - 224SOLUTIONS
 * Composant pour afficher les recommandations IA sur le dashboard PDG
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  RefreshCw,
  ExternalLink,
  BarChart3,
  Users,
  CreditCard,
  Shield
} from 'lucide-react';

interface AIInsight {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  action_required: boolean;
  metadata: any;
  created_at: string;
}

interface AIInsightsWidgetProps {
  isEnabled: boolean;
  onToggle?: () => void;
}

export const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({
  isEnabled,
  onToggle
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  // Charger les insights au montage du composant
  useEffect(() => {
    if (isEnabled) {
      loadInsights();
    }
  }, [isEnabled]);

  const loadInsights = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ai/insights');
      const data = await response.json();

      if (data.success) {
        setInsights(data.insights || []);
      } else {
        setError(data.error || 'Erreur chargement insights');
      }
    } catch (error) {
      console.error('Erreur chargement insights:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Forcer la génération d'insights
  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "🤖 Insights générés",
          description: `${data.insights_generated} nouveaux insights créés`,
        });
        loadInsights();
      } else {
        setError(data.error || 'Erreur génération insights');
      }
    } catch (error) {
      console.error('Erreur génération insights:', error);
      setError('Erreur de génération');
    } finally {
      setIsLoading(false);
    }
  };

  // Obtenir l'icône selon la catégorie
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial':
        return <TrendingUp className="w-4 h-4" />;
      case 'users':
        return <Users className="w-4 h-4" />;
      case 'payments':
        return <CreditCard className="w-4 h-4" />;
      case 'vendors':
        return <BarChart3 className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  // Obtenir la couleur selon la priorité
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-white';
      case 'low':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Obtenir l'icône selon la priorité
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'high':
        return <TrendingDown className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  // Filtrer les insights par catégorie
  const filteredInsights = selectedCategory === 'all' 
    ? insights 
    : insights.filter(insight => insight.category === selectedCategory);

  // Obtenir les catégories uniques
  const categories = ['all', ...Array.from(new Set(insights.map(i => i.category)))];

  if (!isEnabled) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Brain className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Module Insights IA
          </h3>
          <p className="text-gray-500 text-center mb-4">
            Activez le module Insights IA pour recevoir des recommandations intelligentes
          </p>
          <Button onClick={onToggle} variant="outline">
            <Brain className="w-4 h-4 mr-2" />
            Activer les Insights IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Insights IA
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={generateInsights}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onToggle}
            >
              Désactiver
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtres par catégorie */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'Toutes' : category}
            </Button>
          ))}
        </div>

        {/* État de chargement */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Analyse en cours...</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Liste des insights */}
        {!isLoading && !error && (
          <div className="space-y-3">
            {filteredInsights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun insight disponible</p>
                <p className="text-sm">Les insights sont générés automatiquement toutes les 6 heures</p>
              </div>
            ) : (
              filteredInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(insight.category)}
                      <h4 className="font-semibold">{insight.title}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(insight.priority)}>
                        {getPriorityIcon(insight.priority)}
                        <span className="ml-1">{insight.priority}</span>
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(insight.confidence * 100)}%
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600">{insight.description}</p>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-1">Recommandation :</h5>
                    <p className="text-sm text-blue-800">{insight.recommendation}</p>
                  </div>

                  {insight.action_required && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Prendre action
                      </Button>
                      <Button size="sm" variant="outline">
                        <Clock className="w-4 h-4 mr-2" />
                        Planifier
                      </Button>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Généré le {new Date(insight.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
