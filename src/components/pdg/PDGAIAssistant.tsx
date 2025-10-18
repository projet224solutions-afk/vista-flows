/**
 * 🤖 ASSISTANT IA PDG AVANCÉ - 224SOLUTIONS
 * Interface d'assistant IA intelligent avec Tiny LLM/Phi-3 Mini
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { usePDGAIAssistant } from '@/hooks/usePDGAIAssistant';
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  BarChart3,
  DollarSign,
  Users,
  Settings,
  Lightbulb,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';

interface PDGAIAssistantProps {
  mfaVerified: boolean;
}

export default function PDGAIAssistant({ mfaVerified }: PDGAIAssistantProps) {
  const {
    isAnalyzing,
    insights,
    recommendations,
    aiActive,
    performFullAnalysis,
    resetAnalysis
  } = usePDGAIAssistant();

  const [selectedTab, setSelectedTab] = useState('insights');
  const [autoAnalysis, setAutoAnalysis] = useState(false);

  // Auto-analyse toutes les 5 minutes si activée
  useEffect(() => {
    if (!autoAnalysis || !mfaVerified) return;

    const interval = setInterval(() => {
      performFullAnalysis();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoAnalysis, mfaVerified, performFullAnalysis]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-green-500/10 text-green-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      case 'low': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header avec contrôles IA */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Assistant IA PDG</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Analyse intelligente et recommandations automatiques
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiActive && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <Zap className="w-3 h-3 mr-1" />
                  IA Active
                </Badge>
              )}
              <Button
                onClick={() => setAutoAnalysis(!autoAnalysis)}
                variant={autoAnalysis ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                {autoAnalysis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoAnalysis ? 'Auto-IA ON' : 'Auto-IA OFF'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={performFullAnalysis}
              disabled={isAnalyzing || !mfaVerified}
              className="gap-2"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              {isAnalyzing ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
            </Button>
            <Button
              onClick={resetAnalysis}
              variant="outline"
              size="sm"
            >
              Réinitialiser
            </Button>
            {isAnalyzing && (
              <div className="flex items-center gap-2">
                <Progress value={66} className="w-32" />
                <span className="text-sm text-muted-foreground">Analyse...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contenu principal */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Insights ({insights.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Recommandations ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <Settings className="w-4 h-4" />
            Dashboard IA
          </TabsTrigger>
        </TabsList>

        {/* Onglet Insights */}
        <TabsContent value="insights" className="space-y-4">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun insight disponible</h3>
                <p className="text-muted-foreground mb-4">
                  Lancez une analyse IA pour obtenir des insights sur votre plateforme
                </p>
                <Button onClick={performFullAnalysis} disabled={isAnalyzing || !mfaVerified}>
                  <Brain className="w-4 h-4 mr-2" />
                  Lancer l'analyse
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {insights.map((insight, index) => (
                <Card key={index} className={`border-l-4 ${getPriorityColor(insight.priority)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getPriorityIcon(insight.priority)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge variant="outline" className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        {insight.action && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Action suggérée:</span>
                            <span className="text-xs font-medium">{insight.action}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet Recommandations */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucune recommandation disponible</h3>
                <p className="text-muted-foreground mb-4">
                  Les recommandations apparaîtront après l'analyse des insights
                </p>
                <Button onClick={performFullAnalysis} disabled={isAnalyzing || !mfaVerified}>
                  <Brain className="w-4 h-4 mr-2" />
                  Générer des recommandations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{rec.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {rec.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Impact:</span>
                            <Badge variant="outline" className={getImpactColor(rec.impact)}>
                              {rec.impact}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Effort:</span>
                            <Badge variant="outline">
                              {rec.effort}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Timeline:</span>
                            <span className="font-medium">{rec.timeline}</span>
                          </div>
                        </div>
                        {rec.benefits.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground">Bénéfices:</span>
                            <ul className="text-xs mt-1">
                              {rec.benefits.map((benefit, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Onglet Dashboard IA */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{insights.length}</p>
                    <p className="text-sm text-muted-foreground">Insights générés</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{recommendations.length}</p>
                    <p className="text-sm text-muted-foreground">Recommandations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{aiActive ? 'ON' : 'OFF'}</p>
                    <p className="text-sm text-muted-foreground">Statut IA</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuration de l'Assistant IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-analyse</h4>
                  <p className="text-sm text-muted-foreground">
                    Analyse automatique toutes les 5 minutes
                  </p>
                </div>
                <Button
                  onClick={() => setAutoAnalysis(!autoAnalysis)}
                  variant={autoAnalysis ? "default" : "outline"}
                  size="sm"
                >
                  {autoAnalysis ? 'Activé' : 'Désactivé'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notifications IA</h4>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des alertes pour les insights critiques
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configurer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
