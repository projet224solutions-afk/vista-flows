/**
 * GESTION DES CONSULTATIONS SANTÉ
 * Gestion des rendez-vous médicaux et consultations
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabaseClient';
import { Stethoscope, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Consultation {
  id: string;
  patient_name: string;
  patient_phone: string;
  consultation_type: string;
  consultation_date: string;
  consultation_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  price: number;
  notes?: string;
  created_at: string;
}

interface HealthConsultationsProps {
  serviceId: string;
}

export function HealthConsultations({ serviceId }: HealthConsultationsProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_phone: '',
    consultation_type: '',
    consultation_time: '',
    symptoms: '',
    price: '',
    notes: ''
  });

  const consultationTypes = [
    'Consultation générale',
    'Consultation spécialisée',
    'Urgence',
    'Suivi',
    'Vaccination',
    'Dépistage',
    'Autre'
  ];

  useEffect(() => {
    loadConsultations();
    
    // Realtime subscription
    const channel = supabase
      .channel('health_consultations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_consultations',
          filter: `service_id=eq.${serviceId}`
        },
        () => {
          loadConsultations();
          toast.info('Nouvelle consultation');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId]);

  const loadConsultations = async () => {
    try {
      const { data, error } = await supabase
        .from('health_consultations')
        .select('*')
        .eq('service_id', serviceId)
        .order('consultation_date', { ascending: false })
        .order('consultation_time', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;

      setConsultations(data || []);
    } catch (error) {
      console.error('Erreur chargement consultations:', error);
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
        .from('health_consultations')
        .insert({
          service_id: serviceId,
          patient_name: formData.patient_name,
          patient_phone: formData.patient_phone,
          consultation_type: formData.consultation_type,
          consultation_date: format(selectedDate, 'yyyy-MM-dd'),
          consultation_time: formData.consultation_time,
          status: 'scheduled',
          symptoms: formData.symptoms || null,
          price: parseFloat(formData.price),
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success('Consultation planifiée');
      setShowDialog(false);
      setFormData({
        patient_name: '',
        patient_phone: '',
        consultation_type: '',
        consultation_time: '',
        symptoms: '',
        price: '',
        notes: ''
      });
      loadConsultations();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de la création');
    }
  };

  const updateStatus = async (consultationId: string, newStatus: Consultation['status']) => {
    try {
      const { error } = await supabase
        .from('health_consultations')
        .update({ status: newStatus })
        .eq('id', consultationId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      loadConsultations();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusColor = (status: Consultation['status']) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: Consultation['status']) => {
    const labels = {
      scheduled: 'Planifiée',
      completed: 'Terminée',
      cancelled: 'Annulée'
    };
    return labels[status];
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des consultations...</div>;
  }

  // Statistiques
  const stats = {
    total: consultations.length,
    scheduled: consultations.filter(c => c.status === 'scheduled').length,
    completed: consultations.filter(c => c.status === 'completed').length,
    today: consultations.filter(c => c.consultation_date === format(new Date(), 'yyyy-MM-dd')).length
  };

  // Filtrer par date sélectionnée
  const consultationsForDate = consultations.filter(c => {
    if (!selectedDate) return false;
    return c.consultation_date === format(selectedDate, 'yyyy-MM-dd');
  });

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total consultations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <p className="text-sm text-muted-foreground">Planifiées</p>
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
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle consultation
            </Button>
          </CardContent>
        </Card>

        {/* Consultations du jour */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {consultationsForDate.length} consultation(s)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {consultationsForDate.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune consultation pour cette date
                </div>
              ) : (
                consultationsForDate.map((consultation) => (
                  <Card key={consultation.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{consultation.consultation_time}</span>
                            <Badge className={getStatusColor(consultation.status)}>
                              {getStatusLabel(consultation.status)}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="font-medium">{consultation.patient_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {consultation.patient_phone}
                            </div>
                            <div className="text-sm font-medium text-primary">
                              {consultation.consultation_type}
                            </div>
                            {consultation.symptoms && (
                              <div className="text-sm">
                                <span className="font-medium">Symptômes:</span> {consultation.symptoms}
                              </div>
                            )}
                            {consultation.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                {consultation.notes}
                              </p>
                            )}
                          </div>

                          <div className="text-sm font-bold">
                            {consultation.price.toLocaleString()} FCFA
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {consultation.status === 'scheduled' && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatus(consultation.id, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Terminer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => updateStatus(consultation.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Annuler
                          </Button>
                        </div>
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
            <DialogTitle>Nouvelle consultation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="patient_name">Nom du patient</Label>
              <Input
                id="patient_name"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="patient_phone">Téléphone</Label>
              <Input
                id="patient_phone"
                value={formData.patient_phone}
                onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                placeholder="+224 XXX XX XX XX"
                required
              />
            </div>

            <div>
              <Label htmlFor="consultation_type">Type de consultation</Label>
              <select
                id="consultation_type"
                value={formData.consultation_type}
                onChange={(e) => setFormData({ ...formData, consultation_type: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                required
              >
                <option value="">Sélectionner...</option>
                {consultationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="consultation_time">Heure</Label>
              <Input
                id="consultation_time"
                type="time"
                value={formData.consultation_time}
                onChange={(e) => setFormData({ ...formData, consultation_time: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="symptoms">Symptômes (optionnel)</Label>
              <Textarea
                id="symptoms"
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                rows={2}
                placeholder="Décrire les symptômes..."
              />
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
                Planifier
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
