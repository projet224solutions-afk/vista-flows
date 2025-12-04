/**
 * GESTION DES RENDEZ-VOUS BEAUTÉ
 * Calendrier et gestion des rendez-vous clients
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabaseClient';
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

interface BeautyAppointmentsProps {
  serviceId: string;
}

export function BeautyAppointments({ serviceId }: BeautyAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    service_name: '',
    appointment_time: '',
    duration: '',
    price: '',
    notes: ''
  });

  useEffect(() => {
    loadAppointments();
    
    // Realtime subscription
    const channel = supabase
      .channel('beauty_appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beauty_appointments',
          filter: `service_id=eq.${serviceId}`
        },
        () => loadAppointments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId]);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('beauty_appointments')
        .select('*')
        .eq('service_id', serviceId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      setAppointments(data || []);
    } catch (error) {
      console.error('Erreur chargement rendez-vous:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    try {
      const { error } = await supabase
        .from('beauty_appointments')
        .insert({
          service_id: serviceId,
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          service_name: formData.service_name,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: formData.appointment_time,
          duration: parseInt(formData.duration),
          price: parseFloat(formData.price),
          status: 'pending',
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success('Rendez-vous créé');
      setShowDialog(false);
      setFormData({
        customer_name: '',
        customer_phone: '',
        service_name: '',
        appointment_time: '',
        duration: '',
        price: '',
        notes: ''
      });
      loadAppointments();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('beauty_appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      loadAppointments();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: Appointment['status']) => {
    const labels = {
      pending: 'En attente',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé'
    };
    return labels[status];
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des rendez-vous...</div>;
  }

  // Filtrer les rendez-vous par date sélectionnée
  const appointmentsForDate = appointments.filter(apt => {
    if (!selectedDate) return false;
    return apt.appointment_date === format(selectedDate, 'yyyy-MM-dd');
  });

  // Statistiques
  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    today: appointments.filter(a => a.appointment_date === format(new Date(), 'yyyy-MM-dd')).length
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total rendez-vous</p>
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
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            <p className="text-sm text-muted-foreground">Confirmés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.today}</div>
            <p className="text-sm text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendrier */}
        <Card>
          <CardHeader>
            <CardTitle>Calendrier</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              className="rounded-md border"
            />
            <Button onClick={() => setShowDialog(true)} className="w-full mt-4">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Nouveau rendez-vous
            </Button>
          </CardContent>
        </Card>

        {/* Rendez-vous du jour */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {appointmentsForDate.length} rendez-vous
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {appointmentsForDate.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun rendez-vous pour cette date
                </div>
              ) : (
                appointmentsForDate.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{apt.appointment_time}</span>
                            <Badge className={getStatusColor(apt.status)}>
                              {getStatusLabel(apt.status)}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-4 h-4 text-muted-foreground" />
                              {apt.customer_name}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              {apt.customer_phone}
                            </div>
                            <div className="text-sm font-medium text-primary">
                              {apt.service_name} - {apt.duration} min
                            </div>
                            <div className="text-sm font-bold">
                              {apt.price.toLocaleString()} FCFA
                            </div>
                            {apt.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                {apt.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions rapides */}
                      {apt.status === 'pending' && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatus(apt.id, 'confirmed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirmer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatus(apt.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Annuler
                          </Button>
                        </div>
                      )}
                      {apt.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => updateStatus(apt.id, 'completed')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Marquer terminé
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de création */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau rendez-vous</DialogTitle>
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
              <Label htmlFor="service_name">Service</Label>
              <Input
                id="service_name"
                value={formData.service_name}
                onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                placeholder="Ex: Coupe + Brushing"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointment_time">Heure</Label>
                <Input
                  id="appointment_time"
                  type="time"
                  value={formData.appointment_time}
                  onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Durée (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
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
                placeholder="Informations supplémentaires..."
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Créer le rendez-vous
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
