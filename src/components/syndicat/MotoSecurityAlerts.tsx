import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAlert {
  id: string;
  plate_number: string;
  serial_number: string;
  brand: string;
  model: string;
  owner_name: string;
  owner_phone: string;
  reported_bureau_name: string;
  reported_location: string;
  description: string;
  status: string;
  created_at: string;
}

interface Props {
  bureauId: string;
}

export default function MotoSecurityAlerts({ bureauId }: Props) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      
      // CENTRALISÉ: Charger depuis vehicles + vehicle_security_log
      // Véhicules actuellement volés (is_stolen = true ou stolen_status = 'stolen')
      const { data: stolenVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          id,
          serial_number,
          license_plate,
          brand,
          model,
          is_stolen,
          stolen_status,
          stolen_declared_at,
          stolen_reason,
          stolen_location,
          bureau_id,
          bureaus:bureau_id (
            commune,
            prefecture
          ),
          members:owner_member_id (
            first_name,
            last_name,
            phone
          )
        `)
        .or('is_stolen.eq.true,stolen_status.eq.stolen')
        .order('stolen_declared_at', { ascending: false });

      if (vehiclesError) {
        console.error('Erreur Supabase:', vehiclesError);
        throw vehiclesError;
      }
      
      // Transformer en format d'alerte pour compatibilité
      const transformedAlerts: SecurityAlert[] = (stolenVehicles || []).map((v: any) => ({
        id: v.id,
        plate_number: v.license_plate || v.serial_number,
        serial_number: v.serial_number,
        brand: v.brand || 'Non spécifié',
        model: v.model || '',
        owner_name: v.members ? `${v.members.first_name || ''} ${v.members.last_name || ''}`.trim() : 'Non assigné',
        owner_phone: v.members?.phone || '',
        reported_bureau_name: v.bureaus?.commune || 'Bureau inconnu',
        reported_location: v.stolen_location || v.bureaus?.prefecture || '',
        description: v.stolen_reason || 'Vol déclaré',
        status: 'active',
        created_at: v.stolen_declared_at || new Date().toISOString()
      }));
      
      console.log('✅ Alertes centralisées chargées:', transformedAlerts.length);
      setAlerts(transformedAlerts);
    } catch (error: any) {
      console.error('❌ Erreur chargement alertes sécurité:', error);
      toast.error('Erreur lors du chargement des données', {
        description: error.message || 'Impossible de charger les alertes de sécurité'
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // CENTRALISÉ: Subscribe to real-time updates sur vehicles (stolen changes)
    const channel = supabase
      .channel('stolen_vehicles_alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
          filter: 'is_stolen=eq.true'
        },
        (payload: any) => {
          console.log('🔔 Alerte vol temps réel:', payload);
          loadAlerts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_security_log'
        },
        (payload: any) => {
          console.log('🔔 Nouveau log sécurité:', payload);
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bureauId]);

  const handleResolve = async (alertId: string) => {
    try {
      // CENTRALISÉ: Utilise le RPC declare_vehicle_recovered
      const { data, error } = await supabase.rpc('declare_vehicle_recovered', {
        p_vehicle_id: alertId,
        p_bureau_id: bureauId,
        p_recovered_by: null as any, // Sera rempli côté serveur si possible
        p_recovery_notes: 'Résolu via interface alertes',
        p_recovery_location: null,
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (error) throw error;
      
      toast.success('Véhicule marqué comme récupéré avec succès');
      loadAlerts();
    } catch (error: any) {
      console.error('Erreur résolution alerte:', error);
      toast.error(error.message || 'Erreur lors de la résolution');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      'active': { label: 'Active', className: 'bg-red-500 text-white' },
      'resolved': { label: 'Résolue', className: 'bg-green-500 text-white' },
      'investigating': { label: 'En cours', className: 'bg-yellow-500 text-white' }
    };

    const config = variants[status] || { label: status, className: 'bg-gray-500 text-white' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alertes de Sécurité
          </CardTitle>
          <CardDescription>
            {alerts.length} alerte(s) de sécurité détectée(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>Aucune alerte de sécurité active</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Alert key={alert.id} variant="destructive" className="bg-red-50 dark:bg-red-950">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>MOTO VOLÉE DÉTECTÉE</span>
                    {getStatusBadge(alert.status)}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <strong>Plaque:</strong> {alert.plate_number}
                        </div>
                        <div>
                          <strong>Châssis:</strong> {alert.serial_number}
                        </div>
                        <div>
                          <strong>Marque:</strong> {alert.brand} {alert.model}
                        </div>
                        <div>
                          <strong>Propriétaire:</strong> {alert.owner_name}
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>Signalée par: {alert.reported_bureau_name} ({alert.reported_location})</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(alert.created_at).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>

                      {alert.description && (
                        <div className="pt-2">
                          <strong>Description:</strong>
                          <p className="mt-1">{alert.description}</p>
                        </div>
                      )}

                      {alert.status === 'active' && (
                        <div className="pt-3 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                            className="flex-1"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marquer comme Résolue
                          </Button>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
