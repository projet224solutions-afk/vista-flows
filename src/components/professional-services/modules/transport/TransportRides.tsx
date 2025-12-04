/**
 * GESTION DES COURSES VTC
 * Gestion des courses, statuts, et suivi en temps réel
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Car, MapPin, Clock, DollarSign, Plus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Ride {
  id: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_time: string;
  distance_km?: number;
  price: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  driver_name?: string;
  vehicle_id?: string;
  notes?: string;
  created_at: string;
}

interface TransportRidesProps {
  serviceId: string;
}

export function TransportRides({ serviceId }: TransportRidesProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    pickup_location: '',
    dropoff_location: '',
    pickup_time: '',
    distance_km: '',
    price: '',
    notes: ''
  });

  useEffect(() => {
    loadRides();
    
    // Realtime subscription
    const channel = supabase
      .channel('transport_rides_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transport_rides',
          filter: `service_id=eq.${serviceId}`
        },
        (payload) => {
          console.log('Course mise à jour:', payload);
          loadRides();
          
          if (payload.eventType === 'INSERT') {
            toast.info('Nouvelle course demandée');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId]);

  const loadRides = async () => {
    try {
      const { data, error } = await supabase
        .from('transport_rides')
        .select('*')
        .eq('service_id', serviceId)
        .order('pickup_time', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;

      setRides(data || []);
    } catch (error) {
      console.error('Erreur chargement courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('transport_rides')
        .insert({
          service_id: serviceId,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          pickup_location: formData.pickup_location,
          dropoff_location: formData.dropoff_location,
          pickup_time: formData.pickup_time,
          distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
          price: parseFloat(formData.price),
          status: 'pending',
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success('Course créée');
      setShowDialog(false);
      setFormData({
        customer_name: '',
        customer_phone: '',
        pickup_location: '',
        dropoff_location: '',
        pickup_time: '',
        distance_km: '',
        price: '',
        notes: ''
      });
      loadRides();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    }
  };

  const updateStatus = async (rideId: string, newStatus: Ride['status']) => {
    try {
      const { error } = await supabase
        .from('transport_rides')
        .update({ status: newStatus })
        .eq('id', rideId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      loadRides();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusColor = (status: Ride['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: Ride['status']) => {
    const labels = {
      pending: 'En attente',
      accepted: 'Acceptée',
      in_progress: 'En cours',
      completed: 'Terminée',
      cancelled: 'Annulée'
    };
    return labels[status];
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des courses...</div>;
  }

  // Statistiques
  const stats = {
    total: rides.length,
    pending: rides.filter(r => r.status === 'pending').length,
    inProgress: rides.filter(r => r.status === 'in_progress').length,
    completed: rides.filter(r => r.status === 'completed').length,
    revenue: rides.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.price, 0)
  };

  // Grouper par statut
  const ridesByStatus = [
    { status: 'pending' as const, label: 'En attente', rides: rides.filter(r => r.status === 'pending') },
    { status: 'accepted' as const, label: 'Acceptées', rides: rides.filter(r => r.status === 'accepted') },
    { status: 'in_progress' as const, label: 'En cours', rides: rides.filter(r => r.status === 'in_progress') },
    { status: 'completed' as const, label: 'Terminées', rides: rides.filter(r => r.status === 'completed') }
  ];

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.inProgress}</div>
            <p className="text-sm text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-sm text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.revenue.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">FCFA générés</p>
          </CardContent>
        </Card>
      </div>

      {/* Bouton d'ajout */}
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle course
        </Button>
      </div>

      {/* Courses par statut */}
      {ridesByStatus.map((group) => {
        if (group.rides.length === 0) return null;

        return (
          <Card key={group.status}>
            <CardHeader>
              <CardTitle>{group.label} ({group.rides.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.rides.map((ride) => (
                  <Card key={ride.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(ride.status)}>
                              {getStatusLabel(ride.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(ride.pickup_time), 'PPp', { locale: fr })}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">Départ</div>
                                <div className="text-sm text-muted-foreground">{ride.pickup_location}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium">Arrivée</div>
                                <div className="text-sm text-muted-foreground">{ride.dropoff_location}</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Car className="w-4 h-4 text-muted-foreground" />
                              {ride.customer_name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              {ride.customer_phone}
                            </div>
                            {ride.distance_km && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                {ride.distance_km} km
                              </div>
                            )}
                          </div>

                          {ride.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              {ride.notes}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">
                            {ride.price.toLocaleString()} FCFA
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {ride.status === 'pending' && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatus(ride.id, 'accepted')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatus(ride.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      )}
                      {ride.status === 'accepted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => updateStatus(ride.id, 'in_progress')}
                        >
                          <Car className="w-4 h-4 mr-1" />
                          Démarrer la course
                        </Button>
                      )}
                      {ride.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => updateStatus(ride.id, 'completed')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Terminer la course
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {rides.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune course enregistrée</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Créer la première course
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de création */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="customer_name">Nom du client</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="customer_phone">Téléphone</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="+224 XXX XX XX XX"
                required
              />
            </div>

            <div>
              <Label htmlFor="pickup_location">Lieu de départ</Label>
              <Input
                id="pickup_location"
                value={formData.pickup_location}
                onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                placeholder="Adresse complète"
                required
              />
            </div>

            <div>
              <Label htmlFor="dropoff_location">Destination</Label>
              <Input
                id="dropoff_location"
                value={formData.dropoff_location}
                onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })}
                placeholder="Adresse complète"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_time">Date et heure</Label>
                <Input
                  id="pickup_time"
                  type="datetime-local"
                  value={formData.pickup_time}
                  onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="distance_km">Distance (km)</Label>
                <Input
                  id="distance_km"
                  type="number"
                  step="0.1"
                  value={formData.distance_km}
                  onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="price">Prix (FCFA)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Instructions particulières..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Créer la course
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
