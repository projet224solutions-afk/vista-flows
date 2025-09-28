import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTracking } from '@/hooks/useTracking';
import { useAuth } from '@/hooks/useAuth';
import { MapPin, Navigation, Play, Square, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const TrackingMap = () => {
  const { user } = useAuth();
  const { 
    trackingData, 
    currentLocation, 
    isTracking, 
    loading, 
    startTracking, 
    stopTracking, 
    getCurrentPosition,
    calculateDistance 
  } = useTracking();
  const { toast } = useToast();
  const [selectedTracking, setSelectedTracking] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    const colors = {
      waiting: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.waiting;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      waiting: <Clock className="h-4 w-4" />,
      in_progress: <RefreshCw className="h-4 w-4" />,
      delivered: <CheckCircle className="h-4 w-4" />,
      cancelled: <XCircle className="h-4 w-4" />
    };
    return icons[status as keyof typeof icons] || icons.waiting;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      waiting: 'En attente',
      in_progress: 'En cours',
      delivered: 'Livré',
      cancelled: 'Annulé'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatLocation = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'Position inconnue';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatDistance = (lat1?: number, lng1?: number, lat2?: number, lng2?: number) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    return distance > 1 ? `${distance.toFixed(1)} km` : `${(distance * 1000).toFixed(0)} m`;
  };

  const handleShareLocation = async () => {
    try {
      const position = await getCurrentPosition();
      if (position) {
        toast({
          title: "Position partagée",
          description: `Lat: ${position.latitude.toFixed(6)}, Lng: ${position.longitude.toFixed(6)}`,
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'obtenir votre position",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Contrôles de tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Suivi GPS en temps réel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {isTracking ? 'Suivi activé' : 'Suivi désactivé'}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentLocation 
                  ? `Position: ${formatLocation(currentLocation.latitude, currentLocation.longitude)}`
                  : 'Position inconnue'
                }
              </div>
            </div>
            <div className="flex gap-2">
              {!isTracking ? (
                <Button onClick={startTracking}>
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer
                </Button>
              ) : (
                <Button onClick={stopTracking} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Arrêter
                </Button>
              )}
              <Button onClick={handleShareLocation} variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Partager position
              </Button>
            </div>
          </div>

          {currentLocation && (
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Position actuelle: {formatLocation(currentLocation.latitude, currentLocation.longitude)}
                <br />
                Précision: {currentLocation.accuracy ? `${currentLocation.accuracy.toFixed(0)}m` : 'N/A'}
                <br />
                Dernière mise à jour: {new Date(currentLocation.timestamp).toLocaleTimeString('fr-FR')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Historique des positions */}
      <Card>
        <CardHeader>
          <CardTitle>Historique de tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : trackingData.length > 0 ? (
            <div className="space-y-4">
              {trackingData.map((tracking) => (
                <div
                  key={tracking.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTracking === tracking.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedTracking(selectedTracking === tracking.id ? null : tracking.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(tracking.status)}
                        <span className="font-medium">
                          Commande #{(tracking as unknown).orders?.order_number || 'N/A'}
                        </span>
                        <Badge className={getStatusColor(tracking.status)}>
                          {getStatusLabel(tracking.status)}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          Position: {formatLocation(tracking.latitude, tracking.longitude)}
                        </div>
                        <div>
                          Mis à jour: {new Date(tracking.updated_at).toLocaleTimeString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {tracking.notes && (
                          <div>Notes: {tracking.notes}</div>
                        )}
                        {currentLocation && tracking.latitude && tracking.longitude && (
                          <div>
                            Distance: {formatDistance(
                              currentLocation.latitude,
                              currentLocation.longitude,
                              tracking.latitude,
                              tracking.longitude
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTracking === tracking.id && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="text-sm">
                        <strong>Détails du tracking:</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Latitude</div>
                          <div className="font-mono">{tracking.latitude || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Longitude</div>
                          <div className="font-mono">{tracking.longitude || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Créé le</div>
                          <div>{new Date(tracking.created_at).toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Statut</div>
                          <div>{getStatusLabel(tracking.status)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <h3 className="font-medium mb-1">Aucun tracking</h3>
              <p className="text-sm">Les positions de tracking apparaîtront ici</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <Navigation className="h-4 w-4" />
        <AlertDescription>
          <strong>Comment utiliser le tracking:</strong>
          <br />
          1. Activez le suivi GPS pour partager votre position en temps réel
          <br />
          2. Votre position sera automatiquement mise à jour
          <br />
          3. Les clients peuvent suivre vos déplacements pendant la livraison
          <br />
          4. Désactivez le suivi une fois la livraison terminée
        </AlertDescription>
      </Alert>
    </div>
  );
};