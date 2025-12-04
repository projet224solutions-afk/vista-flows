/**
 * GESTION DES RÉSERVATIONS RESTAURANT
 * Système de réservation de tables
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabaseClient';
import { Clock, Users, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  number_of_people: number;
  reservation_date: string;
  reservation_time: string;
  table_number?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  created_at: string;
}

interface RestaurantReservationsProps {
  serviceId: string;
}

export function RestaurantReservations({ serviceId }: RestaurantReservationsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    loadReservations();
  }, [serviceId, selectedDate]);

  const loadReservations = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('professional_service_id', serviceId)
        .gte('booking_date', dateStr)
        .lt('booking_date', new Date(selectedDate.getTime() + 86400000).toISOString().split('T')[0])
        .order('booking_time', { ascending: true });

      if (error) throw error;

      setReservations(data || []);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReservationStatus = async (reservationId: string, newStatus: Reservation['status']) => {
    try {
      const { error } = await supabase
        .from('service_bookings')
        .update({ status: newStatus })
        .eq('id', reservationId);

      if (error) throw error;

      toast.success('Réservation mise à jour');
      loadReservations();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status: Reservation['status']) => {
    const config = {
      pending: { label: 'En attente', color: 'bg-yellow-500' },
      confirmed: { label: 'Confirmée', color: 'bg-green-500' },
      cancelled: { label: 'Annulée', color: 'bg-red-500' },
      completed: { label: 'Terminée', color: 'bg-gray-500' }
    };

    const { label, color } = config[status];
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des réservations...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendrier */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Calendrier</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium">
              {reservations.length} réservation(s)
            </div>
            <div className="text-xs text-muted-foreground">
              {reservations.filter(r => r.status === 'confirmed').length} confirmée(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des réservations */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              Réservations du {selectedDate.toLocaleDateString('fr-FR')}
            </CardTitle>
          </CardHeader>
        </Card>

        {reservations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucune réservation pour cette date
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => (
              <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {reservation.customer_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {reservation.reservation_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {reservation.number_of_people} personne(s)
                          </div>
                          {reservation.table_number && (
                            <div>Table {reservation.table_number}</div>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{reservation.customer_phone}</span>
                      </div>
                      {reservation.customer_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{reservation.customer_email}</span>
                        </div>
                      )}
                    </div>

                    {reservation.special_requests && (
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium mb-1">Demandes spéciales:</p>
                        <p className="text-muted-foreground">
                          {reservation.special_requests}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {reservation.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                          className="flex-1"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirmer
                        </Button>
                        <Button
                          onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Annuler
                        </Button>
                      </div>
                    )}

                    {reservation.status === 'confirmed' && (
                      <Button
                        onClick={() => updateReservationStatus(reservation.id, 'completed')}
                        className="w-full"
                        size="sm"
                        variant="outline"
                      >
                        Marquer comme terminée
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
