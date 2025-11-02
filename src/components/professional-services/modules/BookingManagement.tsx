import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Booking {
  id: string;
  client_id: string;
  professional_service_id: string;
  booking_type?: string;
  scheduled_date: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_amount: number;
  payment_status: string;
  created_at: string;
  client?: {
    full_name?: string;
    phone?: string;
  };
}

interface BookingManagementProps {
  serviceId: string;
}

export const BookingManagement = ({ serviceId }: BookingManagementProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pending');

  useEffect(() => {
    loadBookings();
  }, [serviceId]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select(`
          *,
          client:client_id (
            full_name,
            phone
          )
        `)
        .eq('professional_service_id', serviceId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setBookings((data || []) as Booking[]);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      const { error } = await supabase
        .from('service_bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;
      
      toast.success(`Réservation ${status === 'confirmed' ? 'confirmée' : status === 'completed' ? 'terminée' : 'annulée'}`);
      loadBookings();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusColor = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmé';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeTab === 'all') return true;
    return booking.status === activeTab;
  });

  const getBookingCount = (status: string) => {
    if (status === 'all') return bookings.length;
    return bookings.filter(b => b.status === status).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold">Gestion des Réservations</h3>
        <p className="text-sm text-muted-foreground">
          Suivez et gérez vos rendez-vous clients
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            Tous ({getBookingCount('all')})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En attente ({getBookingCount('pending')})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmés ({getBookingCount('confirmed')})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminés ({getBookingCount('completed')})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Annulés ({getBookingCount('cancelled')})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucune réservation {activeTab !== 'all' ? getStatusLabel(activeTab as Booking['status']).toLowerCase() : ''} pour le moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">
                                {booking.client?.full_name || 'Client'}
                              </h4>
                              {booking.client?.phone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {booking.client.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={getStatusColor(booking.status)}>
                            {getStatusLabel(booking.status)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {format(new Date(booking.scheduled_date), 'PPP', { locale: fr })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">
                              {booking.total_amount.toLocaleString()} GNF
                            </span>
                          </div>
                        </div>

                        {booking.booking_type && (
                          <div>
                            <Badge variant="outline">{booking.booking_type}</Badge>
                          </div>
                        )}

                        {booking.notes && (
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                            {booking.notes}
                          </p>
                        )}

                        {booking.status === 'pending' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              className="gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Confirmer
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                              className="gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Annuler
                            </Button>
                          </div>
                        )}

                        {booking.status === 'confirmed' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => updateBookingStatus(booking.id, 'completed')}
                              className="gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Marquer comme terminé
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
