/**
 * DÉTECTION DE FRAUDE ML
 * Machine Learning pour détecter les fraudes en temps réel
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Activity, AlertTriangle, TrendingDown } from "lucide-react";
import { ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";
import { Progress } from "@/components/ui/progress";

interface FraudMetrics {
  transactionsAnalyzed: number;
  fraudDetected: number;
  falsePositives: number;
  accuracy: number;
  modelVersion: string;
}

const metrics: FraudMetrics = {
  transactionsAnalyzed: 125847,
  fraudDetected: 234,
  falsePositives: 12,
  accuracy: 98.7,
  modelVersion: 'v2.3.1'
};

interface FraudPattern {
  id: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  riskLevel: 'high' | 'medium' | 'low';
}

const detectedPatterns: FraudPattern[] = [
  {
    id: '1',
    pattern: 'Transactions multiples depuis différents pays',
    confidence: 95,
    occurrences: 45,
    riskLevel: 'high'
  },
  {
    id: '2',
    pattern: 'Montants ronds répétitifs sous le seuil de vérification',
    confidence: 88,
    occurrences: 78,
    riskLevel: 'high'
  },
  {
    id: '3',
    pattern: 'Changements fréquents de coordonnées bancaires',
    confidence: 82,
    occurrences: 23,
    riskLevel: 'medium'
  }
];

export function MLFraudDetection() {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Détection de Fraude ML
        </CardTitle>
        <CardDescription>
          Intelligence artificielle pour prévenir la fraude en temps réel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métriques du modèle */}
        <ResponsiveGrid mobileCols={2} tabletCols={4} desktopCols={4} gap="sm">
          <div className="p-4 bg-muted rounded-lg">
            <Activity className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.transactionsAnalyzed.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Transactions analysées</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.fraudDetected}</div>
            <div className="text-xs text-muted-foreground">Fraudes détectées</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <TrendingDown className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.falsePositives}</div>
            <div className="text-xs text-muted-foreground">Faux positifs</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <Brain className="w-8 h-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.accuracy}%</div>
            <div className="text-xs text-muted-foreground">Précision du modèle</div>
          </div>
        </ResponsiveGrid>

        {/* Info modèle */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Modèle actif</span>
            <Badge className="bg-green-500">En production</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Version {metrics.modelVersion} • Entraîné sur {metrics.transactionsAnalyzed.toLocaleString()} transactions
          </p>
        </div>

        {/* Patterns détectés */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Patterns de fraude détectés</h4>
          {detectedPatterns.map((pattern) => (
            <div key={pattern.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getRiskColor(pattern.riskLevel)}>
                      {pattern.riskLevel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {pattern.occurrences} occurrences
                    </span>
                  </div>
                  <p className="text-sm font-medium">{pattern.pattern}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Confiance du modèle</span>
                  <span className="font-medium">{pattern.confidence}%</span>
                </div>
                <Progress value={pattern.confidence} className="h-1" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
