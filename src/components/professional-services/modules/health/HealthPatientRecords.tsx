/**
 * DOSSIERS MÉDICAUX PATIENTS
 * Gestion des dossiers et historique médical
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Plus, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PatientRecord {
  id: string;
  patient_name: string;
  patient_phone: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  chronic_conditions?: string;
  medical_history?: string;
  current_medications?: string;
  emergency_contact?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface HealthPatientRecordsProps {
  serviceId: string;
}

export function HealthPatientRecords({ serviceId }: HealthPatientRecordsProps) {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PatientRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<PatientRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_phone: '',
    date_of_birth: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    medical_history: '',
    current_medications: '',
    emergency_contact: '',
    notes: ''
  });

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    loadRecords();
  }, [serviceId]);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('health_patient_records')
        .select('*')
        .eq('service_id', serviceId)
        .order('patient_name');

      if (error && error.code !== 'PGRST116') throw error;

      setRecords(data || []);
    } catch (error) {
      console.error('Erreur chargement dossiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const recordData = {
        service_id: serviceId,
        patient_name: formData.patient_name,
        patient_phone: formData.patient_phone,
        date_of_birth: formData.date_of_birth || null,
        blood_type: formData.blood_type || null,
        allergies: formData.allergies || null,
        chronic_conditions: formData.chronic_conditions || null,
        medical_history: formData.medical_history || null,
        current_medications: formData.current_medications || null,
        emergency_contact: formData.emergency_contact || null,
        notes: formData.notes || null
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('health_patient_records')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;
        toast.success('Dossier mis à jour');
      } else {
        const { error } = await supabase
          .from('health_patient_records')
          .insert(recordData);

        if (error) throw error;
        toast.success('Dossier créé');
      }

      setShowDialog(false);
      setEditingRecord(null);
      setFormData({
        patient_name: '',
        patient_phone: '',
        date_of_birth: '',
        blood_type: '',
        allergies: '',
        chronic_conditions: '',
        medical_history: '',
        current_medications: '',
        emergency_contact: '',
        notes: ''
      });
      loadRecords();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (record: PatientRecord) => {
    setEditingRecord(record);
    setFormData({
      patient_name: record.patient_name,
      patient_phone: record.patient_phone,
      date_of_birth: record.date_of_birth || '',
      blood_type: record.blood_type || '',
      allergies: record.allergies || '',
      chronic_conditions: record.chronic_conditions || '',
      medical_history: record.medical_history || '',
      current_medications: record.current_medications || '',
      emergency_contact: record.emergency_contact || '',
      notes: record.notes || ''
    });
    setShowDialog(true);
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des dossiers...</div>;
  }

  // Filtrer les dossiers
  const filteredRecords = records.filter(record => 
    record.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.patient_phone.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Rechercher un patient..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => {
          setEditingRecord(null);
          setFormData({
            patient_name: '',
            patient_phone: '',
            date_of_birth: '',
            blood_type: '',
            allergies: '',
            chronic_conditions: '',
            medical_history: '',
            current_medications: '',
            emergency_contact: '',
            notes: ''
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau dossier
        </Button>
      </div>

      {/* Liste des dossiers */}
      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Aucun dossier trouvé' : 'Aucun dossier patient'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowDialog(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Créer le premier dossier
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{record.patient_name}</h3>
                    <p className="text-sm text-muted-foreground">{record.patient_phone}</p>
                  </div>
                  {record.blood_type && (
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      {record.blood_type}
                    </Badge>
                  )}
                </div>

                {record.date_of_birth && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Né(e) le:</span>{' '}
                    {format(new Date(record.date_of_birth), 'dd/MM/yyyy')}
                  </div>
                )}

                {record.allergies && (
                  <div className="text-sm">
                    <span className="font-medium text-red-600">⚠️ Allergies:</span>{' '}
                    <span className="text-muted-foreground">{record.allergies}</span>
                  </div>
                )}

                {record.chronic_conditions && (
                  <div className="text-sm">
                    <span className="font-medium">Conditions:</span>{' '}
                    <span className="text-muted-foreground">{record.chronic_conditions}</span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Dernière mise à jour: {format(new Date(record.updated_at || record.created_at), 'dd/MM/yyyy', { locale: fr })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewingRecord(record)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(record)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de création/édition */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Modifier le dossier' : 'Nouveau dossier patient'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date de naissance</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="blood_type">Groupe sanguin</Label>
                <select
                  id="blood_type"
                  value={formData.blood_type}
                  onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Non renseigné</option>
                  {bloodTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                rows={2}
                placeholder="Médicaments, aliments, etc."
              />
            </div>

            <div>
              <Label htmlFor="chronic_conditions">Conditions chroniques</Label>
              <Textarea
                id="chronic_conditions"
                value={formData.chronic_conditions}
                onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                rows={2}
                placeholder="Diabète, hypertension, asthme, etc."
              />
            </div>

            <div>
              <Label htmlFor="medical_history">Antécédents médicaux</Label>
              <Textarea
                id="medical_history"
                value={formData.medical_history}
                onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                rows={3}
                placeholder="Chirurgies, hospitalisations, maladies passées..."
              />
            </div>

            <div>
              <Label htmlFor="current_medications">Médicaments actuels</Label>
              <Textarea
                id="current_medications"
                value={formData.current_medications}
                onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="emergency_contact">Contact d'urgence</Label>
              <Input
                id="emergency_contact"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="Nom et téléphone"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingRecord ? 'Mettre à jour' : 'Créer'}
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

      {/* Dialog de visualisation */}
      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dossier médical</DialogTitle>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient</Label>
                  <p className="font-semibold">{viewingRecord.patient_name}</p>
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <p>{viewingRecord.patient_phone}</p>
                </div>
              </div>

              {(viewingRecord.date_of_birth || viewingRecord.blood_type) && (
                <div className="grid grid-cols-2 gap-4">
                  {viewingRecord.date_of_birth && (
                    <div>
                      <Label>Date de naissance</Label>
                      <p>{format(new Date(viewingRecord.date_of_birth), 'dd/MM/yyyy')}</p>
                    </div>
                  )}
                  {viewingRecord.blood_type && (
                    <div>
                      <Label>Groupe sanguin</Label>
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {viewingRecord.blood_type}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {viewingRecord.allergies && (
                <div>
                  <Label className="text-red-600">⚠️ Allergies</Label>
                  <p className="text-sm">{viewingRecord.allergies}</p>
                </div>
              )}

              {viewingRecord.chronic_conditions && (
                <div>
                  <Label>Conditions chroniques</Label>
                  <p className="text-sm">{viewingRecord.chronic_conditions}</p>
                </div>
              )}

              {viewingRecord.medical_history && (
                <div>
                  <Label>Antécédents médicaux</Label>
                  <p className="text-sm">{viewingRecord.medical_history}</p>
                </div>
              )}

              {viewingRecord.current_medications && (
                <div>
                  <Label>Médicaments actuels</Label>
                  <p className="text-sm">{viewingRecord.current_medications}</p>
                </div>
              )}

              {viewingRecord.emergency_contact && (
                <div>
                  <Label>Contact d'urgence</Label>
                  <p className="text-sm">{viewingRecord.emergency_contact}</p>
                </div>
              )}

              {viewingRecord.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm">{viewingRecord.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => {
                  setViewingRecord(null);
                  handleEdit(viewingRecord);
                }} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Button variant="outline" onClick={() => setViewingRecord(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
