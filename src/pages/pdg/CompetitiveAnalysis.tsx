import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, TrendingUp, Zap, Award, ArrowLeft, Loader2, BarChart3, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useResponsive } from '@/hooks/useResponsive';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/responsive/ResponsiveContainer';

interface PlatformScore {
  name: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  innovations?: string[];
  overall_score?: number;
  recommendations?: string[];
}

interface AnalysisResult {
  platforms: PlatformScore[];
  summary: string;
  recommendations: string[];
  ranking?: string[];
  solutions_224_priorities?: Array<{
    priority: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }>;
}

export default function CompetitiveAnalysis() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [loadingCompetitive, setLoadingCompetitive] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [competitiveAnalysis, setCompetitiveAnalysis] = useState<AnalysisResult | null>(null);
  const [securityAnalysis, setSecurityAnalysis] = useState<AnalysisResult | null>(null);

  const competitors = ['Amazon', 'Alibaba', 'Odoo', 'AliExpress', 'Africa Coin'];
  const criteria = ['Sécurité', 'Fiabilité', 'Fonctionnalité', 'Innovation'];

  const runCompetitiveAnalysis = async () => {
    setLoadingCompetitive(true);
    try {
      const { data, error } = await supabase.functions.invoke('competitive-analysis', {
        body: { competitors, criteria }
      });

      if (error) throw error;

      if (data?.success) {
        setCompetitiveAnalysis(data.analysis);
        toast.success('Analyse comparative terminée');
      } else {
        throw new Error(data?.error || 'Erreur lors de l\'analyse');
      }
    } catch (error: any) {
      console.error('Error running analysis:', error);
      toast.error(error.message || 'Erreur lors de l\'analyse comparative');
    } finally {
      setLoadingCompetitive(false);
    }
  };

  const runSecurityAnalysis = async () => {
    setLoadingSecurity(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-analysis');
      
      if (error) throw error;
      
      if (data?.analysis) {
        setSecurityAnalysis(data.analysis);
        toast.success('Analyse de sécurité terminée');
      }
    } catch (error: any) {
      console.error('Security analysis error:', error);
      toast.error('Erreur lors de l\'analyse de sécurité: ' + error.message);
    } finally {
      setLoadingSecurity(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80 || score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 60 || score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'destructive';
    if (impact === 'medium') return 'default';
    return 'secondary';
  };

  const getEffortColor = (effort: string) => {
    if (effort === 'low') return 'default';
    if (effort === 'medium') return 'secondary';
    return 'outline';
  };

  const getCriteriaIcon = (criteria: string) => {
    switch (criteria.toLowerCase()) {
      case 'sécurité':
      case 'authentication':
      case 'encryption':
        return <Shield className="w-4 h-4" />;
      case 'fiabilité':
      case 'monitoring':
        return <Award className="w-4 h-4" />;
      case 'fonctionnalité':
      case 'infrastructure':
        return <Zap className="w-4 h-4" />;
      case 'innovation':
      case 'fraud_detection':
      case 'compliance':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-responsive">
      <ResponsiveContainer>
        <div className="space-y-4 md:space-y-6">
          {/* Header Responsive */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <BarChart3 className={`text-primary ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                <h1 className={`font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent ${isMobile ? 'text-xl' : 'text-3xl'}`}>
                  Analyse Comparative IA
                </h1>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                Comparaison 224Solutions vs Grandes Plateformes
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/pdg')}
              className="gap-2"
              size={isMobile ? "sm" : "default"}
            >
              <ArrowLeft className="w-4 h-4" />
              {!isMobile && 'Retour'}
            </Button>
          </div>

          <Tabs defaultValue="competitive" className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="competitive" className="text-xs md:text-sm">
                {isMobile ? 'Concurrentiel' : 'Analyse Concurrentielle'}
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs md:text-sm">
                {isMobile ? 'Sécurité' : 'Analyse de Sécurité'}
              </TabsTrigger>
            </TabsList>

          <TabsContent value="competitive" className="space-y-6">
            {!competitiveAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Lancer l'Analyse Comparative</CardTitle>
                  <CardDescription>
                    Analyse IA de 224Solutions vs {competitors.join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Plateformes comparées:</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default">224Solutions</Badge>
                        {competitors.map(c => (
                          <Badge key={c} variant="secondary">{c}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Critères d'analyse:</h4>
                      <div className="flex flex-wrap gap-2">
                        {criteria.map(c => (
                          <Badge key={c} variant="outline" className="gap-1">
                            {getCriteriaIcon(c)}
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={runCompetitiveAnalysis}
                      disabled={loadingCompetitive}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {loadingCompetitive ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          Lancer l'Analyse IA
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {competitiveAnalysis && (
              <>
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Résumé de l'Analyse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{competitiveAnalysis.summary}</p>
                  </CardContent>
                </Card>

                <ResponsiveGrid 
                  mobileCols={1} 
                  tabletCols={2} 
                  desktopCols={3} 
                  gap={isMobile ? "sm" : "md"}
                >
                  {competitiveAnalysis.platforms.map((platform) => (
                    <Card key={platform.name} className={platform.name === '224Solutions' ? 'border-primary/50 shadow-lg' : ''}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{platform.name}</span>
                          {platform.name === '224Solutions' && (
                            <Badge variant="default">Notre Plateforme</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {Object.entries(platform.scores).map(([criterion, score]) => (
                            <div key={criterion}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="flex items-center gap-1">
                                  {getCriteriaIcon(criterion)}
                                  {criterion}
                                </span>
                                <span className={`font-bold ${getScoreColor(score)}`}>
                                  {score}/10
                                </span>
                              </div>
                              <Progress value={score * 10} className="h-2" />
                            </div>
                          ))}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-green-600 mb-2">Forces</h4>
                          <ul className="space-y-1 text-xs">
                            {platform.strengths.map((strength, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-green-600 mt-0.5">✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-orange-600 mb-2">Faiblesses</h4>
                          <ul className="space-y-1 text-xs">
                            {platform.weaknesses.map((weakness, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-orange-600 mt-0.5">!</span>
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {platform.innovations && platform.innovations.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 mb-2">Innovations</h4>
                            <ul className="space-y-1 text-xs">
                              {platform.innovations.map((innovation, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-blue-600 mt-0.5">★</span>
                                  <span>{innovation}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </ResponsiveGrid>

                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-blue-600" />
                      Recommandations Stratégiques
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {competitiveAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 font-bold mt-0.5">{i + 1}.</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      setCompetitiveAnalysis(null);
                      runCompetitiveAnalysis();
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Relancer l'Analyse
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-6 h-6 text-primary" />
                  Analyse de Sécurité Complète
                </CardTitle>
                <CardDescription>
                  Évaluation détaillée de la sécurité de 224Solutions vs Amazon, Alibaba, Odoo et Africa Coin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={runSecurityAnalysis} 
                  disabled={loadingSecurity}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {loadingSecurity ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Lancer l'analyse de sécurité
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {securityAnalysis && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Résumé Exécutif</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{securityAnalysis.summary}</p>
                  </CardContent>
                </Card>

                {securityAnalysis.ranking && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Classement par Sécurité</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {securityAnalysis.ranking.map((platform: string, index: number) => (
                          <li key={platform} className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                              {index + 1}
                            </span>
                            <span className="text-lg font-medium">{platform}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-6">
                  {securityAnalysis.platforms.map((platform) => (
                    <Card key={platform.name} className={platform.name === '224Solutions' ? 'border-primary' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            {platform.name}
                          </CardTitle>
                          {platform.overall_score && (
                            <span className={`text-3xl font-bold ${getScoreColor(platform.overall_score)}`}>
                              {platform.overall_score}/100
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold">Scores Détaillés</h4>
                          {Object.entries(platform.scores).map(([key, value]: [string, any]) => (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize flex items-center gap-1">
                                  {getCriteriaIcon(key)}
                                  {key.replace('_', ' ')}
                                </span>
                                <span className="font-medium">{value}/{key === 'authentication' || key === 'encryption' ? '20' : '15'}</span>
                              </div>
                              <Progress 
                                value={(value / (key === 'authentication' || key === 'encryption' ? 20 : 15)) * 100} 
                                className="h-2"
                              />
                            </div>
                          ))}
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            Points Forts
                          </h4>
                          <ul className="space-y-1">
                            {platform.strengths.map((strength: string, idx: number) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-green-600 mt-1">✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-red-600" />
                            Faiblesses
                          </h4>
                          <ul className="space-y-1">
                            {platform.weaknesses.map((weakness: string, idx: number) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-red-600 mt-1">⚠</span>
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {platform.recommendations && (
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Zap className="w-4 h-4 text-blue-600" />
                              Recommandations
                            </h4>
                            <ul className="space-y-1">
                              {platform.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-blue-600 mt-1">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {securityAnalysis.solutions_224_priorities && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-6 h-6 text-primary" />
                        Priorités pour 224Solutions
                      </CardTitle>
                      <CardDescription>
                        Plan d'action pour atteindre le niveau des leaders du marché
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {securityAnalysis.solutions_224_priorities.map((priority, idx) => (
                          <div key={idx} className="p-4 border rounded-lg space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="font-semibold">{priority.priority}</h4>
                              <div className="flex gap-2">
                                <Badge variant={getImpactColor(priority.impact)}>
                                  Impact: {priority.impact}
                                </Badge>
                                <Badge variant={getEffortColor(priority.effort)}>
                                  Effort: {priority.effort}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{priority.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            </TabsContent>
          </Tabs>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
