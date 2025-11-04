/**
 * PROGRAMME BUG BOUNTY
 * Gestion du programme de chasse aux vulnérabilités
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, DollarSign, Users, TrendingUp } from "lucide-react";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveGrid } from "@/components/responsive/ResponsiveContainer";

interface BountyReport {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  reporter: string;
  reward: number;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  submittedAt: string;
}

const mockReports: BountyReport[] = [
  {
    id: '1',
    severity: 'high',
    title: 'SQL Injection in payment endpoint',
    reporter: 'security_hunter',
    reward: 5000,
    status: 'resolved',
    submittedAt: '2024-01-15'
  },
  {
    id: '2',
    severity: 'medium',
    title: 'XSS vulnerability in user profile',
    reporter: 'bug_finder',
    reward: 2000,
    status: 'in_review',
    submittedAt: '2024-01-20'
  }
];

const stats = {
  totalReports: 47,
  resolvedVulnerabilities: 38,
  totalRewards: 125000,
  activeHunters: 156
};

export function BugBountyProgram() {
  const { isMobile } = useResponsive();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          Programme Bug Bounty
        </CardTitle>
        <CardDescription>
          Communauté de chercheurs en sécurité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques */}
        <ResponsiveGrid mobileCols={2} tabletCols={4} desktopCols={4} gap="sm">
          <div className="p-4 bg-muted rounded-lg">
            <Bug className="w-8 h-8 text-primary mb-2" />
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <div className="text-xs text-muted-foreground">Rapports totaux</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats.resolvedVulnerabilities}</div>
            <div className="text-xs text-muted-foreground">Vulnérabilités corrigées</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <DollarSign className="w-8 h-8 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold">{stats.totalRewards.toLocaleString()} GNF</div>
            <div className="text-xs text-muted-foreground">Récompenses versées</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <Users className="w-8 h-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats.activeHunters}</div>
            <div className="text-xs text-muted-foreground">Chasseurs actifs</div>
          </div>
        </ResponsiveGrid>

        {/* Rapports récents */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Rapports récents</h4>
          {mockReports.map((report) => (
            <div key={report.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getSeverityColor(report.severity)}>
                      {report.severity}
                    </Badge>
                    <Badge variant="outline">{report.status}</Badge>
                  </div>
                  <h5 className="font-medium text-sm truncate">{report.title}</h5>
                  <p className="text-xs text-muted-foreground">
                    Par {report.reporter} • {new Date(report.submittedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{report.reward.toLocaleString()} GNF</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full">
          Voir tous les rapports
        </Button>
      </CardContent>
    </Card>
  );
}
