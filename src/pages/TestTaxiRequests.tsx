/**
 * PAGE DE TEST - CRÉATION DE DEMANDES DE COURSES
 * Pour tester le système d'acceptation/refus des conducteurs
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, DollarSign, Clock, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function TestTaxiRequests() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pickupAddress: 'Kaloum, Conakry',
    pickupLat: 9.5092,
    pickupLng: -13.7122,
    dropoffAddress: 'Dixinn, Conakry',
    dropoffLat: 9.5370,
    dropoffLng: -13.6785,
    distanceKm: 5.2,
    durationMin: 15,
    priceTotal: 15000
  });

  const createTestRide = async () => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      // Calculer le driver_share (85% du total)
      const driverShare = Math.round(formData.priceTotal * 0.85);
      const platformFee = formData.priceTotal - driverShare;

      const { data, error } = await supabase
        .from('taxi_trips')
        .insert([
          {
            customer_id: user.id,
            pickup_address: formData.pickupAddress,
            pickup_lat: formData.pickupLat,
            pickup_lng: formData.pickupLng,
            dropoff_address: formData.dropoffAddress,
            dropoff_lat: formData.dropoffLat,
            dropoff_lng: formData.dropoffLng,
            distance_km: formData.distanceKm,
            duration_min: formData.durationMin,
            price_total: formData.priceTotal,
            driver_share: driverShare,
            platform_fee: platformFee,
            status: 'requested',
            requested_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ Demande de course créée avec succès!', {
        description: `Course ID: ${data.id}`
      });
      
      console.log('Course créée:', data);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création de la course');
    } finally {
      setLoading(false);
    }
  };

  const presetLocations = [
    {
      name: 'Kaloum → Dixinn',
      pickup: { address: 'Kaloum, Conakry', lat: 9.5092, lng: -13.7122 },
      dropoff: { address: 'Dixinn, Conakry', lat: 9.5370, lng: -13.6785 },
      distance: 5.2,
      duration: 15,
      price: 15000
    },
    {
      name: 'Ratoma → Matoto',
      pickup: { address: 'Ratoma, Conakry', lat: 9.5700, lng: -13.6400 },
      dropoff: { address: 'Matoto, Conakry', lat: 9.5800, lng: -13.5900 },
      distance: 8.5,
      duration: 20,
      price: 20000
    },
    {
      name: 'Matam → Taouyah',
      pickup: { address: 'Matam, Conakry', lat: 9.5450, lng: -13.6590 },
      dropoff: { address: 'Taouyah, Conakry', lat: 9.5200, lng: -13.6300 },
      distance: 3.8,
      duration: 10,
      price: 12000
    }
  ];

  const loadPreset = (preset: typeof presetLocations[0]) => {
    setFormData({
      pickupAddress: preset.pickup.address,
      pickupLat: preset.pickup.lat,
      pickupLng: preset.pickup.lng,
      dropoffAddress: preset.dropoff.address,
      dropoffLat: preset.dropoff.lat,
      dropoffLng: preset.dropoff.lng,
      distanceKm: preset.distance,
      durationMin: preset.duration,
      priceTotal: preset.price
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              🧪 Test - Créer une demande de course
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Presets rapides */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Trajets pré-configurés</Label>
              <div className="grid grid-cols-1 gap-2">
                {presetLocations.map((preset, index) => (
                  <Button
                    key={index}
                    onClick={() => loadPreset(preset)}
                    variant="outline"
                    className="justify-start h-auto py-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-sm text-gray-600">
                        {preset.distance}km • {preset.price.toLocaleString()} GNF
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Départ */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="w-4 h-4 text-green-600" />
                Point de départ
              </Label>
              <Input
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                placeholder="Adresse de départ"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.pickupLat}
                  onChange={(e) => setFormData({ ...formData, pickupLat: parseFloat(e.target.value) })}
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.pickupLng}
                  onChange={(e) => setFormData({ ...formData, pickupLng: parseFloat(e.target.value) })}
                  placeholder="Longitude"
                />
              </div>
            </div>

            {/* Arrivée */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="w-4 h-4 text-red-600" />
                Destination
              </Label>
              <Input
                value={formData.dropoffAddress}
                onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
                placeholder="Adresse d'arrivée"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.dropoffLat}
                  onChange={(e) => setFormData({ ...formData, dropoffLat: parseFloat(e.target.value) })}
                  placeholder="Latitude"
                />
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.dropoffLng}
                  onChange={(e) => setFormData({ ...formData, dropoffLng: parseFloat(e.target.value) })}
                  placeholder="Longitude"
                />
              </div>
            </div>

            {/* Détails de la course */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3" />
                  Distance (km)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.distanceKm}
                  onChange={(e) => setFormData({ ...formData, distanceKm: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-sm">
                  <Clock className="w-3 h-3" />
                  Durée (min)
                </Label>
                <Input
                  type="number"
                  value={formData.durationMin}
                  onChange={(e) => setFormData({ ...formData, durationMin: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1 text-sm">
                  <DollarSign className="w-3 h-3" />
                  Prix (GNF)
                </Label>
                <Input
                  type="number"
                  value={formData.priceTotal}
                  onChange={(e) => setFormData({ ...formData, priceTotal: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Informations calculées */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold mb-2 text-sm text-blue-900">Répartition des gains:</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Total client:</span>
                  <span className="font-bold">{formData.priceTotal.toLocaleString()} GNF</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Part conducteur (85%):</span>
                  <span className="font-bold">{Math.round(formData.priceTotal * 0.85).toLocaleString()} GNF</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Commission plateforme (15%):</span>
                  <span className="font-bold">{Math.round(formData.priceTotal * 0.15).toLocaleString()} GNF</span>
                </div>
              </div>
            </div>

            {/* Bouton de création */}
            <Button
              onClick={createTestRide}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg h-14"
            >
              <Send className="w-5 h-5 mr-2" />
              {loading ? 'Création en cours...' : 'Créer la demande de course'}
            </Button>

            {/* Instructions */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-900">
                <strong>📋 Instructions:</strong> Créez une demande de course ici, puis allez sur la page conducteur pour voir la notification apparaître et tester les boutons Accepter/Refuser.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}