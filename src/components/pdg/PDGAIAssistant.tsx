import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePDGAIAssistant } from '@/hooks/usePDGAIAssistant';

interface PDGAIAssistantProps {
  mfaVerified: boolean;
}

export default function PDGAIAssistant({ mfaVerified }: PDGAIAssistantProps) {
  const { aiActive, insights, loading, refreshInsights, toggleAI } = usePDGAIAssistant();
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshInsights();
      toast.success('Analyse IA terminée');
    } catch (error) {
      toast.error('Erreur lors de l\'analyse IA');
    } finally {
      setAnalyzing(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
    }
  };

  const getInsightBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-500">Priorité Haute</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Priorité Moyenne</Badge>;
      default:
        return <Badge className="bg-blue-500">Priorité Basse</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-50" />
            <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold">Assistant IA Intelligent</h2>
            <p className="text-muted-foreground mt-1">Analyse prédictive et recommandations automatiques</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={toggleAI}>
            {aiActive ? 'Désactiver IA' : 'Activer IA'}
          </Button>
          <Button onClick={handleAnalyze} disabled={analyzing || !aiActive}>
            <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
            Analyser
          </Button>
        </div>
      </div>

      {/* Statut IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Statut de l'Assistant IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${aiActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <h3 className="font-medium">
                  {aiActive ? 'IA Activée' : 'IA Désactivée'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {aiActive
                    ? 'L\'assistant IA surveille activement la plateforme'
                    : 'L\'assistant IA est en veille'}
                </p>
              </div>
            </div>
            {aiActive && (
              <Badge className="bg-purple-500">
                <Brain className="w-3 h-3 mr-1" />
                En ligne
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights et Recommandations */}
      {aiActive && (
        <Card>
          <CardHeader>
            <CardTitle>Insights & Recommandations IA ({insights.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <p className="font-medium">{insight.message}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Détecté par l'analyse IA automatique
                        </p>
                      </div>
                    </div>
                    {getInsightBadge(insight.priority)}
                  </div>
                ))}
                {insights.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>Aucun problème détecté</p>
                    <p className="text-sm mt-2">La plateforme fonctionne normalement</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Capacités IA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Détection de Fraude</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Surveillance en temps réel des transactions suspectes
            </p>
            <div className="mt-4">
              <Badge className="bg-green-500">Actif</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Analyse Prédictive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Prévision des tendances et comportements utilisateurs
            </p>
            <div className="mt-4">
              <Badge className="bg-green-500">Actif</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Optimisation Auto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recommandations d'amélioration des performances
            </p>
            <div className="mt-4">
              <Badge className="bg-green-500">Actif</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {!mfaVerified && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <p className="text-sm text-orange-500">
                MFA non vérifié - Certaines fonctionnalités IA avancées sont limitées
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
