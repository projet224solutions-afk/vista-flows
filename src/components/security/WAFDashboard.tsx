/**
 * WAF - WEB APPLICATION FIREWALL
 * Protection applicative avec règles personnalisées
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Activity, Ban, TrendingUp, AlertCircle } from "lucide-react";
import { ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";
import { Progress } from "@/components/ui/progress";

interface WAFRule {
  id: string;
  name: string;
  type: 'sql_injection' | 'xss' | 'ddos' | 'rate_limit' | 'custom';
  status: 'active' | 'inactive';
  blockedRequests: number;
}

const wafRules: WAFRule[] = [
  {
    id: '1',
    name: 'Protection SQL Injection',
    type: 'sql_injection',
    status: 'active',
    blockedRequests: 1247
  },
  {
    id: '2',
    name: 'Protection XSS',
    type: 'xss',
    status: 'active',
    blockedRequests: 856
  },
  {
    id: '3',
    name: 'Protection DDoS Layer 7',
    type: 'ddos',
    status: 'active',
    blockedRequests: 3421
  },
  {
    id: '4',
    name: 'Rate Limiting Avancé',
    type: 'rate_limit',
    status: 'active',
    blockedRequests: 5678
  }
];

const wafStats = {
  totalRequests: 1245678,
  blockedRequests: 11202,
  legitTraffic: 99.1,
  activeRules: 47,
  customRules: 12
};

export function WAFDashboard() {
  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'sql_injection': return '🛡️';
      case 'xss': return '🔒';
      case 'ddos': return '⚡';
      case 'rate_limit': return '⏱️';
      default: return '🔧';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Web Application Firewall (WAF)
        </CardTitle>
        <CardDescription>
          Protection applicative multicouche avec règles personnalisées
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statut WAF */}
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="font-semibold">WAF actif et protégé</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {wafStats.activeRules} règles actives • {wafStats.customRules} règles personnalisées • Mise à jour automatique activée
          </p>
        </div>

        {/* Statistiques WAF */}
        <ResponsiveGrid mobileCols={2} tabletCols={4} desktopCols={4} gap="sm">
          <div className="p-4 bg-muted rounded-lg">
            <Activity className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{wafStats.totalRequests.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Requêtes analysées</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <Ban className="w-8 h-8 text-red-500 mb-2" />
            <div className="text-2xl font-bold">{wafStats.blockedRequests.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Requêtes bloquées</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{wafStats.legitTraffic}%</div>
            <div className="text-xs text-muted-foreground">Trafic légitime</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <Shield className="w-8 h-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{wafStats.activeRules}</div>
            <div className="text-xs text-muted-foreground">Règles actives</div>
          </div>
        </ResponsiveGrid>

        {/* Règles WAF */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Règles de protection actives</h4>
            <Button variant="outline" size="sm">
              Ajouter règle
            </Button>
          </div>
          {wafRules.map((rule) => (
            <div key={rule.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getRuleTypeIcon(rule.type)}</span>
                  <div>
                    <h5 className="font-medium text-sm">{rule.name}</h5>
                    <p className="text-xs text-muted-foreground">
                      {rule.blockedRequests.toLocaleString()} menaces bloquées
                    </p>
                  </div>
                </div>
                <Badge className={rule.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                  {rule.status}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Efficacité</span>
                  <span className="font-medium">
                    {((rule.blockedRequests / wafStats.blockedRequests) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={(rule.blockedRequests / wafStats.blockedRequests) * 100} 
                  className="h-1" 
                />
              </div>
            </div>
          ))}
        </div>

        {/* Alertes WAF */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h5 className="font-semibold text-sm mb-1">Mise à jour disponible</h5>
              <p className="text-sm text-muted-foreground">
                Nouvelles règles contre les vulnérabilités CVE-2024-XXXX disponibles
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Mettre à jour maintenant
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
