/**
 * 💼 MODAL DÉTAILS API - 224SOLUTIONS
 * Affiche les informations complètes d'une API avec logs et graphiques
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Key, Activity, AlertTriangle, TrendingUp, 
  Clock, MapPin, Globe, Shield, XCircle, CheckCircle2
} from 'lucide-react';
import { ApiConnection, ApiUsageLog, ApiMonitoringService } from '@/services/apiMonitoring';
import { maskApiKey } from '@/services/apiEncryption';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface ApiDetailsModalProps {
  api: ApiConnection | null;
  open: boolean;
  onClose: () => void;
}

export default function ApiDetailsModal({ api, open, onClose }: ApiDetailsModalProps) {
  const [logs, setLogs] = useState<ApiUsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (api && open) {
      loadLogs();
    }
  }, [api, open]);

  const loadLogs = async () => {
    if (!api) return;
    
    setLoading(true);
    const logsData = await ApiMonitoringService.getApiUsageLogs(api.id, 100);
    setLogs(logsData);
    setLoading(false);
  };

  const runAnalysis = async () => {
    if (!api) return;
    
    setAnalyzing(true);
    try {
      await ApiMonitoringService.detect224GuardAnomalies(api.id);
      toast.success('✅ Analyse 224Guard terminée');
    } catch (error) {
      toast.error('Erreur lors de l\'analyse');
    }
    setAnalyzing(false);
  };

  const suspendApi = async () => {
    if (!api) return;
    
    const success = await ApiMonitoringService.updateApiConnection(api.id, { status: 'suspended' });
    if (success) {
      toast.success('API suspendue');
      onClose();
    }
  };

  if (!api) return null;

  // Données pour le graphique d'utilisation
  const usageData = logs.slice(0, 20).reverse().map((log, index) => ({
    time: new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    tokens: log.tokens_consumed,
    responseTime: log.response_time_ms || 0
  }));

  const statusColor = {
    active: 'bg-green-500',
    suspended: 'bg-yellow-500',
    expired: 'bg-red-500',
    error: 'bg-orange-500'
  }[api.status];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl text-white flex items-center gap-3">
                <Key className="h-6 w-6 text-blue-500" />
                {api.api_name}
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                {api.api_provider} • {api.api_type}
              </DialogDescription>
            </div>
            <Badge className={`${statusColor} text-white`}>
              {api.status.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Clé API</CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-slate-300 text-sm font-mono">
                    {maskApiKey(api.api_key_encrypted)}
                  </code>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">URL de base</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 text-sm">{api.base_url || 'Non spécifiée'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Statistiques tokens */}
            {api.tokens_limit && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Utilisation des tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Utilisés</span>
                      <span className="text-white font-bold">{api.tokens_used.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Limite</span>
                      <span className="text-white font-bold">{api.tokens_limit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Restants</span>
                      <span className="text-green-500 font-bold">
                        {(api.tokens_remaining || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                        style={{ width: `${(api.tokens_used / api.tokens_limit) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Graphique d'utilisation */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="time" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="tokens" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={runAnalysis}
                disabled={analyzing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                {analyzing ? 'Analyse en cours...' : 'Lancer 224Guard'}
              </Button>
              <Button
                onClick={suspendApi}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Suspendre l'API
              </Button>
            </div>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs" className="space-y-2">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {loading ? (
                <p className="text-slate-400 text-center py-8">Chargement des logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Aucun log disponible</p>
              ) : (
                logs.map((log) => (
                  <Card key={log.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={log.status_code && log.status_code < 400 ? 'bg-green-600' : 'bg-red-600'}>
                              {log.status_code || 'N/A'}
                            </Badge>
                            <span className="text-white font-mono text-sm">{log.method}</span>
                            <span className="text-slate-400 text-sm">{log.endpoint}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(log.created_at).toLocaleString('fr-FR')}
                            </span>
                            {log.response_time_ms && (
                              <span>{log.response_time_ms}ms</span>
                            )}
                            <span>{log.tokens_consumed} tokens</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Sécurité */}
          <TabsContent value="security" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  État de sécurité
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <span className="text-slate-300">Chiffrement AES-256</span>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <span className="text-slate-300">Monitoring 224Guard</span>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <span className="text-slate-300">Logs activés</span>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                {api.expires_at && (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <span className="text-slate-300">Expiration</span>
                    <span className="text-yellow-500">
                      {new Date(api.expires_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Métadonnées</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-slate-300 text-xs bg-slate-700 p-3 rounded overflow-x-auto">
                  {JSON.stringify(api.metadata || {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
