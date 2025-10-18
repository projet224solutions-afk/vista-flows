// @ts-nocheck
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, Activity, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function PDGSecurity() {
  const [auditLogs, setAuditLogs] = useState<unknown[]>([]);
  const [fraudLogs, setFraudLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Charger les données réelles depuis Supabase
      const [{ data: audit }, { data: fraud }] = await Promise.all([
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('fraud_detection_logs').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      setAuditLogs(audit || []);
      setFraudLogs(fraud || []);
    } catch (error) {
      console.error('Erreur chargement sécurité:', error);
      toast.error('Erreur lors du chargement des données de sécurité');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
                <p className="text-sm text-muted-foreground">Actions Enregistrées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fraudLogs.filter(f => f.risk_level === 'critical' || f.risk_level === 'high').length}</p>
                <p className="text-sm text-muted-foreground">Alertes Critiques</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fraudLogs.filter(f => f.reviewed).length}</p>
                <p className="text-sm text-muted-foreground">Alertes Traitées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Detection Alerts */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Détection de Fraude
          </CardTitle>
          <CardDescription>Alertes de sécurité récentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fraudLogs.map((fraud, index) => (
              <div
                key={fraud.id}
                className="p-4 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/50 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className={getRiskColor(fraud.risk_level)}>
                          {fraud.risk_level}
                        </Badge>
                        <span className="text-sm font-semibold">Score: {fraud.risk_score}</span>
                        {fraud.reviewed && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            Traité
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(fraud.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {fraud.action_taken && (
                      <p className="text-sm">Action: {fraud.action_taken}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Journal d'Audit
          </CardTitle>
          <CardDescription>Historique des actions administratives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLogs.map((log, index) => (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-border/40 bg-muted/30 hover:bg-muted/50 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.target_type} - {new Date(log.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline">
                      {log.ip_address || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
