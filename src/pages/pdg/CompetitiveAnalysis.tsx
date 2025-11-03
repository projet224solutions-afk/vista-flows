import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, TrendingUp, Zap, Award, ArrowLeft, Loader2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PlatformScore {
  name: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  innovations?: string[];
}

interface AnalysisResult {
  platforms: PlatformScore[];
  summary: string;
  recommendations: string[];
}

export default function CompetitiveAnalysis() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const competitors = ['Amazon', 'Alibaba', 'Odoo', 'AliExpress', 'Africa Coin'];
  const criteria = ['Sécurité', 'Fiabilité', 'Fonctionnalité', 'Innovation'];

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('competitive-analysis', {
        body: { competitors, criteria }
      });

      if (error) throw error;

      if (data?.success) {
        setAnalysis(data.analysis);
        toast.success('Analyse comparative terminée');
      } else {
        throw new Error(data?.error || 'Erreur lors de l\'analyse');
      }
    } catch (error: any) {
      console.error('Error running analysis:', error);
      toast.error(error.message || 'Erreur lors de l\'analyse comparative');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCriteriaIcon = (criteria: string) => {
    switch (criteria.toLowerCase()) {
      case 'sécurité':
        return <Shield className="w-4 h-4" />;
      case 'fiabilité':
        return <Award className="w-4 h-4" />;
      case 'fonctionnalité':
        return <Zap className="w-4 h-4" />;
      case 'innovation':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Analyse Comparative IA
              </h1>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              Comparaison 224Solutions vs Grandes Plateformes
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/pdg')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
        </div>

        {/* Analysis Trigger */}
        {!analysis && (
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
                  onClick={runAnalysis}
                  disabled={loading}
                  className="w-full gap-2"
                  size="lg"
                >
                  {loading ? (
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

        {/* Results */}
        {analysis && (
          <>
            {/* Summary */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Résumé de l'Analyse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{analysis.summary}</p>
              </CardContent>
            </Card>

            {/* Platform Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.platforms.map((platform) => (
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
                    {/* Scores */}
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

                    {/* Strengths */}
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

                    {/* Weaknesses */}
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

                    {/* Innovations */}
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
            </div>

            {/* Recommendations */}
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Recommandations Stratégiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 font-bold mt-0.5">{i + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Rerun Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setAnalysis(null);
                  runAnalysis();
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
      </div>
    </div>
  );
}
