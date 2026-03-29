/**
 * COMPOSANT DASHBOARD - SURVEILLANCE LOGIQUE GLOBALE
 * Interface PDG pour monitoring et correction des anomalies
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Zap,
  RefreshCw,
  Download,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  LogOut,
  Play,
  Shield
} from 'lucide-react';
import { useSurveillanceLogic } from '@/hooks/useSurveillanceLogic';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SystemTestDemo from './SystemTestDemo';

interface AnomalyDetails {
  anomaly_id: string;
  rule_id: string;
  domain: string;
}

export default function SurveillanceLogiqueDashboard() {
  const {
    anomalies,
    anomaliesByDomain,
    anomaliesBySeverity,
    systemHealth,
    stats,
    loading,
    isConnected,
    isPDG,
    detectAnomalies,
    applyCorrection,
    loadAnomalies,
  } = useSurveillanceLogic();

  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyDetails | null>(
    null
  );
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSystemTest, setShowSystemTest] = useState(false);

  // Auto-refresh toutes les 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadAnomalies();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, loadAnomalies]);

  // VÃ©rifier les permissions
  if (!isPDG) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>AccÃ¨s RefusÃ©</AlertTitle>
          <AlertDescription>
            Seul le PDG peut accÃ©der au systÃ¨me de surveillance logique.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleApplyAutoCorrection = async (anomalyId: string) => {
    try {
      setIsApplying(true);
      const correctionId = await applyCorrection(
        anomalyId,
        'AUTO',
        { corrected: true },
        'Auto-correction appliquÃ©e'
      );

      if (correctionId) {
        toast.success('âœ… Correction auto appliquÃ©e');
        setShowCorrectionModal(false);
        setSelectedAnomaly(null);
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyManualCorrection = async (anomalyId: string) => {
    if (!correctionReason.trim()) {
      toast.error('Veuillez entrer une raison');
      return;
    }

    try {
      setIsApplying(true);
      const correctionId = await applyCorrection(
        anomalyId,
        'MANUAL_APPROVED',
        { corrected: true, reason: correctionReason },
        correctionReason
      );

      if (correctionId) {
        toast.success('âœ… Correction manuelle appliquÃ©e');
        setShowCorrectionModal(false);
        setSelectedAnomaly(null);
        setCorrectionReason('');
      }
    } finally {
      setIsApplying(false);
    }
  };

  const exportAnalysis = async () => {
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        systemHealth,
        stats,
        anomalies,
        anomaliesByDomain,
        anomaliesBySeverity,
      };

      const dataStr = JSON.stringify(analysis, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `surveillance-analysis-${new Date().toISOString()}.json`;
      link.click();

      toast.success('ðŸ“Š Analyse exportÃ©e');
    } catch (error) {
      toast.error('Erreur export');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-primary-orange-100 text-primary-orange-800 border-primary-orange-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="w-4 h-4" />;
      case 'HIGH':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            ðŸŽ¯ Surveillance Logique Globale
          </h1>
          <p className="text-slate-600 mt-1">
            Monitoring temps rÃ©el de 100% des fonctionnalitÃ©s du systÃ¨me
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <Badge className="bg-gradient-to-br from-primary-blue-500 to-primary-orange-500 flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              En ligne
            </Badge>
          )}
          {!isConnected && (
            <Badge variant="outline" className="text-orange-600">
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Status Global */}
      {systemHealth && (
        <Card className="border-2 border-slate-200 bg-white shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              {systemHealth.overall_status === 'OK' ? (
                <CheckCircle2 className="w-5 h-5 text-primary-orange-600" />
              ) : systemHealth.overall_status === 'CRITICAL' ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              SantÃ© du SystÃ¨me
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 font-medium">RÃ¨gles actives</p>
                <p className="text-2xl font-bold text-blue-900">
                  {systemHealth.total_rules}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-medium">Total anomalies</p>
                <p className="text-2xl font-bold text-purple-900">
                  {systemHealth.total_anomalies}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 font-medium">ðŸš¨ CRITIQUES</p>
                <p className="text-2xl font-bold text-red-900">
                  {systemHealth.critical_anomalies}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-600 font-medium">24h derniÃ¨res</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {systemHealth.recent_anomalies_24h}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 rounded-lg border border-primary-orange-200">
                <p className="text-sm text-primary-orange-600 font-medium">Taux rÃ©solution</p>
                <p className="text-2xl font-bold text-primary-orange-900">
                  {systemHealth.resolution_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Bouton Test SystÃ¨me - Ultra Professionnel */}
        <Button
          onClick={() => setShowSystemTest(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/40 border-0"
        >
          <Shield className="w-4 h-4 mr-2" />
          <Play className="w-3 h-3 mr-1" />
          Tester le SystÃ¨me
        </Button>

        <Button
          onClick={() => detectAnomalies()}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {loading ? 'DÃ©tection...' : 'DÃ©tecter anomalies'}
        </Button>
        <Button
          onClick={exportAnalysis}
          variant="outline"
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-2" />
          Exporter analyse
        </Button>
        <Button
          onClick={() => setAutoRefresh(!autoRefresh)}
          variant={autoRefresh ? 'default' : 'outline'}
          className={autoRefresh ? 'bg-primary-orange-600 hover:bg-primary-orange-700' : ''}
        >
          <Zap className="w-4 h-4 mr-2" />
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </Button>
      </div>

      {/* Modal Test SystÃ¨me */}
      <SystemTestDemo open={showSystemTest} onOpenChange={setShowSystemTest} />

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 bg-white border">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Par domaine
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            DÃ©tails ({stats.unresolved})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Audit
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-red-600 font-medium">CRITIQUES</p>
                  <p className="text-3xl font-bold text-red-900">
                    {anomaliesBySeverity['CRITICAL'] || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-orange-600 font-medium">HAUTES</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {anomaliesBySeverity['HIGH'] || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm text-yellow-600 font-medium">NON RESOLUES</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {stats.unresolved}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 border-primary-orange-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="w-8 h-8 text-primary-orange-600 mx-auto mb-2" />
                  <p className="text-sm text-primary-orange-600 font-medium">RESOLUES</p>
                  <p className="text-3xl font-bold text-primary-orange-900">{stats.resolved}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.critical > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Anomalies critiques dÃ©tectÃ©es!</AlertTitle>
              <AlertDescription>
                {stats.critical} anomalie(s) critique(s) nÃ©cessitent une attention
                immÃ©diate.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Par Domaine */}
        <TabsContent value="domains" className="space-y-4">
          {Object.entries(anomaliesByDomain).map(([domain, domainAnomalies]) => (
            <Card key={domain}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{domain}</span>
                  <Badge>{domainAnomalies.length} anomalies</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {domainAnomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className={`p-3 rounded-lg border-2 ${getSeverityColor(
                        anomaly.severity
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(anomaly.severity)}
                          <span className="font-medium">{anomaly.rule_id}</span>
                        </div>
                        {!anomaly.resolved_at && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAnomaly({
                                anomaly_id: anomaly.id,
                                rule_id: anomaly.rule_id,
                                domain: anomaly.domain,
                              });
                              setShowCorrectionModal(true);
                            }}
                          >
                            Corriger
                          </Button>
                        )}
                        {anomaly.resolved_at && (
                          <Badge className="bg-primary-orange-600">âœ“ RÃ©solue</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* DÃ©tails */}
        <TabsContent value="details" className="space-y-4">
          {anomalies
            .filter((a) => !a.resolved_at)
            .map((anomaly) => (
              <Card key={anomaly.id} id={`anomaly-${anomaly.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(anomaly.severity)}
                      {anomaly.rule_id}
                    </div>
                    <Badge className={getSeverityColor(anomaly.severity)}>
                      {anomaly.severity}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {new Date(anomaly.detected_at).toLocaleString('fr-FR')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        Valeur attendue
                      </p>
                      <pre className="text-xs text-blue-800 overflow-auto bg-blue-100 p-2 rounded">
                        {JSON.stringify(anomaly.expected_value, null, 2)}
                      </pre>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        Valeur rÃ©elle
                      </p>
                      <pre className="text-xs text-red-800 overflow-auto bg-red-100 p-2 rounded">
                        {JSON.stringify(anomaly.actual_value, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        handleApplyAutoCorrection(anomaly.id)
                      }
                      className="bg-primary-orange-600 hover:bg-primary-orange-700"
                      disabled={isApplying}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Correction auto
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedAnomaly({
                          anomaly_id: anomaly.id,
                          rule_id: anomaly.rule_id,
                          domain: anomaly.domain,
                        });
                        setShowCorrectionModal(true);
                      }}
                      variant="outline"
                    >
                      âš™ï¸ Correction manuelle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des corrections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-slate-600 py-8">
                <LogOut className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Historique audit sera affichÃ© ici</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Correction */}
      <Dialog open={showCorrectionModal} onOpenChange={setShowCorrectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appliquer une correction</DialogTitle>
            <DialogDescription>
              {selectedAnomaly?.rule_id} - {selectedAnomaly?.domain}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">Raison</label>
              <Input
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Expliquez pourquoi cette correction est nÃ©cessaire"
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCorrectionModal(false);
                setCorrectionReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() =>
                selectedAnomaly &&
                handleApplyManualCorrection(selectedAnomaly.anomaly_id)
              }
              disabled={isApplying || !correctionReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isApplying ? 'Application...' : 'Appliquer correction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
