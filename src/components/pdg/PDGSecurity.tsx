import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PDGSecurity() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [fraudLogs, setFraudLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
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

  const getRiskLevelBadge = (level: string) => {
    const colors = {
      low: 'bg-green-500/20 text-green-300 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      critical: 'bg-red-500/20 text-red-300 border-red-500/30'
    };
    return colors[level as keyof typeof colors] || 'bg-slate-500/20 text-slate-300';
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
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-100">
              Actions Auditées
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{auditLogs.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">
              Alertes Fraude
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {fraudLogs.filter(f => !f.reviewed).length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-100">
              Critiques
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {fraudLogs.filter(f => f.risk_level === 'critical' && !f.reviewed).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Detection Logs */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Détection de Fraude
          </CardTitle>
          <CardDescription>Alertes de sécurité non traitées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fraudLogs.filter(f => !f.reviewed).map((log) => (
              <div
                key={log.id}
                className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getRiskLevelBadge(log.risk_level)}>
                    {log.risk_level.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-slate-400">
                    Score: {log.risk_score}
                  </span>
                </div>
                <p className="text-white text-sm mb-2">
                  Transaction suspecte détectée
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(log.flags || {}).map(([key, value]: [string, any]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {fraudLogs.filter(f => !f.reviewed).length === 0 && (
              <p className="text-center text-slate-400 py-8">
                Aucune alerte de fraude en attente
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Journal d'Audit</CardTitle>
          <CardDescription>Actions récentes des administrateurs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLogs.slice(0, 20).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{log.action}</p>
                  <p className="text-sm text-slate-400">
                    {log.target_type && `${log.target_type}`}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
