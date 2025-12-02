import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TaxiMotoService } from '@/services/taxi/TaxiMotoService';
import { MapPin, Calculator, Send } from 'lucide-react';

export default function TaxiMotoRequestForm() {
  const [pickupLat, setPickupLat] = useState<string>('');
  const [pickupLng, setPickupLng] = useState<string>('');
  const [dropLat, setDropLat] = useState<string>('');
  const [dropLng, setDropLng] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRideId, setLastRideId] = useState<string | null>(null);

  const calculateFare = async () => {
    setLoading(true);
    try {
      // Simple distance estimate (replace with real geodesic)
      const d = Math.max(0.5, Math.abs(parseFloat(dropLat) - parseFloat(pickupLat)) + Math.abs(parseFloat(dropLng) - parseFloat(pickupLng)));
      setDistanceKm(d);
      const durationEstimate = Math.ceil(d * 10); // Simple: 10 min per km
      const fareResult = await TaxiMotoService.calculateFare(d, durationEstimate);
      setEstimatedPrice(fareResult.total);
    } catch (e) {
      console.warn('Fare calc error:', e);
      setEstimatedPrice(null);
    } finally {
      setLoading(false);
    }
  };

  const createRide = async () => {
    setLoading(true);
    try {
      const ride = await TaxiMotoService.createRide({
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        pickupAddress: 'Adresse de départ',
        dropoffLat: parseFloat(dropLat),
        dropoffLng: parseFloat(dropLng),
        dropoffAddress: 'Adresse d\'arrivée',
        distanceKm: distanceKm || 1,
        durationMin: Math.ceil((distanceKm || 1) * 10),
        estimatedPrice: estimatedPrice || 0
      });
      setLastRideId(ride.id);
    } catch (e) {
      console.error('Create ride error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4"/> Demande de Taxi‑Moto</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs">Départ lat</label>
            <Input value={pickupLat} onChange={e=>setPickupLat(e.target.value)} placeholder="9.5" />
          </div>
          <div className="space-y-2">
            <label className="text-xs">Départ lng</label>
            <Input value={pickupLng} onChange={e=>setPickupLng(e.target.value)} placeholder="-13.7" />
          </div>
          <div className="space-y-2">
            <label className="text-xs">Arrivée lat</label>
            <Input value={dropLat} onChange={e=>setDropLat(e.target.value)} placeholder="9.52" />
          </div>
          <div className="space-y-2">
            <label className="text-xs">Arrivée lng</label>
            <Input value={dropLng} onChange={e=>setDropLng(e.target.value)} placeholder="-13.69" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={calculateFare} disabled={loading} className="gap-2"><Calculator className="w-4 h-4"/> Estimer</Button>
          {estimatedPrice !== null && <Badge variant="outline">{estimatedPrice} GNF</Badge>}
        </div>
        <div>
          <Button onClick={createRide} disabled={loading || estimatedPrice===null} className="gap-2"><Send className="w-4 h-4"/> Créer la course</Button>
        </div>
        {lastRideId && <div className="text-xs text-muted-foreground">Course créée: {lastRideId.substring(0,8)}…</div>}
      </CardContent>
    </Card>
  );
}