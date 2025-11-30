import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TaxiMotoService } from '@/services/taxi/TaxiMotoService';
import { TaxiMotoRealtimeService } from '@/services/taxi/TaxiMotoRealtimeService';
import { MapPin, Check, X, RefreshCw, Bike, Activity } from 'lucide-react';

interface RideRequestItem {
  id: string;
  ride_code?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  price_total?: number;
  distance_km?: number;
  status?: string;
}

export default function TaxiMotoDriverDashboard({ driverId }: { driverId: string }) {
  const [incoming, setIncoming] = useState<RideRequestItem[]>([]);
  const [currentRide, setCurrentRide] = useState<RideRequestItem | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<Array<{ lat: number; lng: number; ts: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubNew = TaxiMotoRealtimeService.subscribeToNewRides((ride) => {
      setIncoming((prev) => [{
        id: ride.id,
        ride_code: ride.ride_code,
        pickup_lat: ride.pickup_lat,
        pickup_lng: ride.pickup_lng,
        dropoff_lat: ride.dropoff_lat,
        dropoff_lng: ride.dropoff_lng,
        price_total: ride.price_total,
        distance_km: ride.distance_km,
        status: ride.status
      }, ...prev]);
    });

    return () => {
      TaxiMotoRealtimeService.unsubscribe('new-ride-requests');
    };
  }, []);

  const acceptRide = async (rideId: string) => {
    setLoading(true);
    try {
      await TaxiMotoService.acceptRide(rideId, driverId);
      const picked = incoming.find(r => r.id === rideId) || null;
      setCurrentRide(picked);
      setIncoming(prev => prev.filter(r => r.id !== rideId));
      // Subscribe tracking
      TaxiMotoRealtimeService.subscribeToRideTracking(rideId, (pt) => {
        setTrackingPoints(prev => [{ lat: pt.latitude, lng: pt.longitude, ts: pt.timestamp }, ...prev].slice(0, 50));
      });
    } catch (e) {
      console.error('Accept ride error:', e);
    } finally {
      setLoading(false);
    }
  };

  const refuseRide = async (rideId: string) => {
    setLoading(true);
    try {
      await TaxiMotoService.refuseRide(rideId, driverId);
      setIncoming(prev => prev.filter(r => r.id !== rideId));
    } catch (e) {
      console.error('Refuse ride error:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshDriverRides = async () => {
    setLoading(true);
    try {
      const rides = await TaxiMotoService.getDriverRides(driverId, 20);
      setIncoming(rides.filter(r => r.status === 'requested'));
      const active = rides.find(r => ['accepted','in_progress'].includes(r.status as any)) as any;
      setCurrentRide(active || null);
    } catch (e) {
      console.warn('Refresh driver rides error:', e);
    } finally {
      setLoading(false);
    }
  };

  const publishLocation = async () => {
    try {
      // Example: publish a dummy location (should be device GPS in real app)
      await TaxiMotoRealtimeService.publishDriverLocation(driverId, {
        latitude: 9.509,
        longitude: -13.712,
        heading: 90,
        speed: 12,
        is_available: !currentRide
      });
    } catch (e) {
      console.warn('Publish location error:', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bike className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Dashboard Chauffeur Taxi‑Moto</h2>
        <Button onClick={refreshDriverRides} variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw className={"w-4 h-4 "+(loading?'animate-spin':'')} /> Rafraîchir
        </Button>
        <Button onClick={publishLocation} variant="secondary" className="gap-2">
          <MapPin className="w-4 h-4" /> Publier position
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4" /> Demandes reçues</h3>
          {incoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune demande pour le moment.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incoming.map(req => (
              <div key={req.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">Course {req.ride_code || req.id.substring(0,8)} — {Math.round((req.distance_km||0)*10)/10} km</div>
                  <Badge variant="outline">{req.price_total ? `${req.price_total} GNF` : 'Tarif N/A'}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" className="gap-2" onClick={() => acceptRide(req.id)} disabled={loading}><Check className="w-3 h-3"/> Accepter</Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => refuseRide(req.id)} disabled={loading}><X className="w-3 h-3"/> Refuser</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Course en cours</h3>
          {!currentRide && (
            <p className="text-sm text-muted-foreground">Aucune course active.</p>
          )}
          {currentRide && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">{currentRide.ride_code || currentRide.id.substring(0,8)}</div>
                <Badge variant="outline">{currentRide.price_total || 0} GNF</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Points de suivi: {trackingPoints.length}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}