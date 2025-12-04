/**
 * Dashboard Bureau Syndicat pour gestion alertes SOS
 * Affichage temps réel des alertes d'urgence
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Phone, Map, Navigation, CheckCircle } from 'lucide-react';
import { taxiMotoSOSService } from '@/services/taxi/TaxiMotoSOSService';
import type { SOSAlert } from '@/types/sos.types';
import { toast } from 'sonner';

interface BureauSyndicatSOSDashboardProps {
  bureauId: string;
}

export function BureauSyndicatSOSDashboard({ bureauId }: BureauSyndicatSOSDashboardProps) {
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Charger les alertes
  const loadSOSAlerts = async () => {
    try {
      const alerts = await taxiMotoSOSService.getActiveSOSAlerts();
      setSosAlerts(alerts);
    } catch (error) {
      console.error('Erreur chargement SOS:', error);
      toast.error('Erreur de chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadSOSAlerts();
  }, []);

  // Auto-refresh toutes les 3 secondes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadSOSAlerts();
    }, 3000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Écouter les nouveaux SOS via BroadcastChannel
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;

    const channel = new BroadcastChannel('taxi-sos-alerts');
    
    channel.onmessage = (event) => {
      if (event.data.type === 'NEW_SOS') {
        toast.error('🚨 NOUVELLE ALERTE SOS!', {
          description: `${event.data.alert.driver_name} a déclenché un SOS`,
          duration: 10000
        });
        loadSOSAlerts();
      }
    };

    return () => channel.close();
  }, []);

  const handleCallDriver = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleOpenMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const handleStartIntervention = async (sosId: string) => {
    const success = await taxiMotoSOSService.updateSOSStatus(sosId, 'EN_INTERVENTION');
    if (success) {
      loadSOSAlerts();
      toast.success('Intervention démarrée');
    }
  };

  const handleResolveSOS = async (sosId: string) => {
    const success = await taxiMotoSOSService.updateSOSStatus(sosId, 'RESOLU', bureauId);
    if (success) {
      loadSOSAlerts();
      toast.success('SOS résolu avec succès');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DANGER':
        return (
          <Badge className="bg-red-600 text-white animate-pulse">
            🚨 DANGER ACTIF
          </Badge>
        );
      case 'EN_INTERVENTION':
        return (
          <Badge className="bg-orange-500 text-white">
            🚑 EN INTERVENTION
          </Badge>
        );
      case 'RESOLU':
        return (
          <Badge className="bg-green-600 text-white">
            ✅ RÉSOLU
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatTimeSince = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins === 1) return 'Il y a 1 min';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Il y a 1 heure';
    if (diffHours < 24) return `Il y a ${diffHours} heures`;
    
    return then.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="text-slate-600">Chargement des alertes SOS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            Alertes SOS
          </h2>
          <p className="text-slate-600 mt-1">
            Gestion des alertes d'urgence en temps réel
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Auto-refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSOSAlerts}
          >
            🔄 Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-red-600">
                {sosAlerts.filter(a => a.status === 'DANGER').length}
              </div>
              <div className="text-sm text-slate-600 mt-1">SOS Actifs</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600">
                {sosAlerts.filter(a => a.status === 'EN_INTERVENTION').length}
              </div>
              <div className="text-sm text-slate-600 mt-1">En Intervention</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-slate-600">Auto-refresh</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {autoRefresh ? 'ON (3s)' : 'OFF'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des alertes */}
      {sosAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-600">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Aucune alerte SOS active</p>
              <p className="text-sm mt-2">Tous les conducteurs sont en sécurité</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sosAlerts.map((sos) => (
            <Card key={sos.id} className="border-2 border-red-200 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      {sos.driver_name}
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                      ID: {sos.taxi_driver_id}
                    </p>
                  </div>
                  {getStatusBadge(sos.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Informations */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">📞 Téléphone:</span>
                    <p className="text-slate-700">{sos.driver_phone}</p>
                  </div>
                  <div>
                    <span className="font-medium">⏱️ Déclenché:</span>
                    <p className="text-slate-700">{formatTimeSince(sos.triggered_at)}</p>
                  </div>
                  <div>
                    <span className="font-medium">📍 Position:</span>
                    <p className="text-slate-700 font-mono text-xs">
                      {sos.latitude.toFixed(6)}, {sos.longitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">🎯 Précision:</span>
                    <p className="text-slate-700">
                      {sos.accuracy ? `${Math.round(sos.accuracy)}m` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Historique GPS */}
                {sos.gps_history && sos.gps_history.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-medium text-sm mb-2">📍 Historique GPS ({sos.gps_history.length} points):</p>
                    <div className="flex flex-wrap gap-2">
                      {sos.gps_history.slice(0, 5).map((point, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {sos.description && (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <p className="text-sm text-slate-700">{sos.description}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCallDriver(sos.driver_phone)}
                    className="flex-1 min-w-[150px]"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenMap(sos.latitude, sos.longitude)}
                    className="flex-1 min-w-[150px]"
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Voir carte
                  </Button>

                  {sos.status === 'DANGER' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartIntervention(sos.id)}
                      className="flex-1 min-w-[150px] bg-orange-600 hover:bg-orange-700"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Intervenir
                    </Button>
                  )}

                  {(sos.status === 'DANGER' || sos.status === 'EN_INTERVENTION') && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleResolveSOS(sos.id)}
                      className="flex-1 min-w-[150px] bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Résoudre
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
