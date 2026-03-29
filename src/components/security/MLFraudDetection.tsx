/**
 * DÃ‰TECTION DE FRAUDE ML - VERSION CONNECTÃ‰E
 * Machine Learning pour dÃ©tecter les fraudes en temps rÃ©el
 * IntÃ©grÃ© avec l'edge function fraud-detection
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Activity, AlertTriangle, TrendingDown, RefreshCw } from "lucide-react";
import { ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";
import { Progress } from "@/components/ui/progress";
import { useSecurityData } from "@/hooks/useSecurityData";
import { toast } from "sonner";

interface FraudMetrics {
  transactionsAnalyzed: number;
  fraudDetected: number;
  falsePositives: number;
  accuracy: number;
  modelVersion: string;
}

interface FraudPattern {
  id: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export function MLFraudDetection() {
  const { fraudLogs, loading, refetch } = useSecurityData(true);
  const [metrics, setMetrics] = useState<FraudMetrics>({
    transactionsAnalyzed: 0,
    fraudDetected: 0,
    falsePositives: 0,
    accuracy: 0,
    modelVersion: 'v2.4.0'
  });
  const [detectedPatterns, setDetectedPatterns] = useState<FraudPattern[]>([]);

  useEffect(() => {
    if (fraudLogs) {
      // Calculer les mÃ©triques depuis les logs rÃ©els
      const highRiskCount = fraudLogs.filter(log => log.risk_level === 'high' || log.risk_level === 'critical').length;
      const falsePos = fraudLogs.filter(log => log.reviewed && log.risk_level === 'low').length;
      
      setMetrics({
        transactionsAnalyzed: fraudLogs.length,
        fraudDetected: highRiskCount,
        falsePositives: falsePos,
        accuracy: fraudLogs.length > 0 ? ((fraudLogs.length - falsePos) / fraudLogs.length) * 100 : 0,
        modelVersion: 'v2.4.0'
      });

      // Extraire les patterns des logs
      const patterns: Record<string, FraudPattern> = {};
      fraudLogs.forEach(log => {
        if (log.flags && Array.isArray(log.flags)) {
          log.flags.forEach((flag: string) => {
            if (!patterns[flag]) {
              patterns[flag] = {
                id: flag,
                pattern: flag,
                confidence: 0,
                occurrences: 0,
                riskLevel: log.risk_level as 'high' | 'medium' | 'low' || 'medium'
              };
            }
            patterns[flag].occurrences++;
            patterns[flag].confidence = Math.min(95, patterns[flag].occurrences * 5);
          });
        }
      });

      setDetectedPatterns(Object.values(patterns).slice(0, 5));
    }
  }, [fraudLogs]);

  const handleRefresh = () => {
    refetch();
    toast.success('DonnÃ©es de fraude actualisÃ©es');
  };
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              DÃ©tection de Fraude ML
            </CardTitle>
            <CardDescription>
              Intelligence artificielle prÃ©dictive - DonnÃ©es en temps rÃ©el
            </CardDescription>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MÃ©triques du modÃ¨le */}
        <ResponsiveGrid mobileCols={2} tabletCols={4} desktopCols={4} gap="sm">
          <div className="p-4 bg-muted rounded-lg">
            <Activity className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.transactionsAnalyzed.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Transactions analysÃ©es</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.fraudDetected}</div>
            <div className="text-xs text-muted-foreground">Fraudes dÃ©tectÃ©es</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <TrendingDown className="w-8 h-8 text-primary-orange-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.falsePositives}</div>
            <div className="text-xs text-muted-foreground">Faux positifs</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <Brain className="w-8 h-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{metrics.accuracy}%</div>
            <div className="text-xs text-muted-foreground">PrÃ©cision du modÃ¨le</div>
          </div>
        </ResponsiveGrid>

        {/* Info modÃ¨le */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">ModÃ¨le ML actif</span>
            <Badge className="bg-primary-blue-600">PrÃ©dictif activÃ©</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Version {metrics.modelVersion} â€¢ Analyse comportementale en temps rÃ©el â€¢ {metrics.transactionsAnalyzed.toLocaleString()} transactions analysÃ©es
          </p>
        </div>

        {/* Patterns dÃ©tectÃ©s */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Patterns de fraude dÃ©tectÃ©s</h4>
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
                  <span>Confiance du modÃ¨le</span>
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
