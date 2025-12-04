/**
 * GESTION DE LA FLOTTE VTC
 * Gestion des véhicules, entretien, disponibilité
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Car, Plus, Edit, Trash2, CheckCircle, XCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color?: string;
  seats: number;
  status: 'available' | 'in_use' | 'maintenance' | 'inactive';
  driver_name?: string;
  last_maintenance?: string;
  notes?: string;
  created_at: string;
}

interface TransportVehiclesProps {
  serviceId: string;
}

export function TransportVehicles({ serviceId }: TransportVehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    license_plate: '',
    color: '',
    seats: '',
    driver_name: '',
    last_maintenance: '',
    notes: ''
  });

  useEffect(() => {
    loadVehicles();
  }, [serviceId]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('transport_vehicles')
        .select('*')
        .eq('service_id', serviceId)
        .order('make');

      if (error && error.code !== 'PGRST116') throw error;

      setVehicles(data || []);
    } catch (error) {
      console.error('Erreur chargement véhicules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const vehicleData = {
        service_id: serviceId,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        license_plate: formData.license_plate.toUpperCase(),
        color: formData.color || null,
        seats: parseInt(formData.seats),
        status: 'available' as Vehicle['status'],
        driver_name: formData.driver_name || null,
        last_maintenance: formData.last_maintenance || null,
        notes: formData.notes || null
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('transport_vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);

        if (error) throw error;
        toast.success('Véhicule mis à jour');
      } else {
        const { error } = await supabase
          .from('transport_vehicles')
          .insert(vehicleData);

        if (error) throw error;
        toast.success('Véhicule ajouté');
      }

      setShowDialog(false);
      setEditingVehicle(null);
      setFormData({
        make: '',
        model: '',
        year: '',
        license_plate: '',
        color: '',
        seats: '',
        driver_name: '',
        last_maintenance: '',
        notes: ''
      });
      loadVehicles();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year.toString(),
      license_plate: vehicle.license_plate,
      color: vehicle.color || '',
      seats: vehicle.seats.toString(),
      driver_name: vehicle.driver_name || '',
      last_maintenance: vehicle.last_maintenance || '',
      notes: vehicle.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Supprimer ce véhicule ?')) return;

    try {
      const { error } = await supabase
        .from('transport_vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Véhicule supprimé');
      loadVehicles();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const updateStatus = async (vehicleId: string, newStatus: Vehicle['status']) => {
    try {
      const { error } = await supabase
        .from('transport_vehicles')
        .update({ status: newStatus })
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Statut mis à jour');
      loadVehicles();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const getStatusColor = (status: Vehicle['status']) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-orange-100 text-orange-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: Vehicle['status']) => {
    const labels = {
      available: 'Disponible',
      in_use: 'En service',
      maintenance: 'En maintenance',
      inactive: 'Inactif'
    };
    return labels[status];
  };

  if (loading) {
    return <div className="text-center py-8">Chargement de la flotte...</div>;
  }

  // Statistiques
  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    inUse: vehicles.filter(v => v.status === 'in_use').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length
  };

  return (
    <div className="space-y-4">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total véhicules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <p className="text-sm text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.inUse}</div>
            <p className="text-sm text-muted-foreground">En service</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
            <p className="text-sm text-muted-foreground">En maintenance</p>
          </CardContent>
        </Card>
      </div>

      {/* Bouton d'ajout */}
      <div className="flex justify-end">
        <Button onClick={() => {
          setEditingVehicle(null);
          setFormData({
            make: '',
            model: '',
            year: '',
            license_plate: '',
            color: '',
            seats: '',
            driver_name: '',
            last_maintenance: '',
            notes: ''
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un véhicule
        </Button>
      </div>

      {/* Liste des véhicules */}
      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun véhicule enregistré</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier véhicule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Car className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{vehicle.make} {vehicle.model}</h3>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.year} • {vehicle.license_plate}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(vehicle.status)}>
                    {getStatusLabel(vehicle.status)}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  {vehicle.color && (
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: vehicle.color }}
                      />
                      <span className="text-muted-foreground capitalize">{vehicle.color}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Sièges:</span> {vehicle.seats}
                  </div>
                  {vehicle.driver_name && (
                    <div>
                      <span className="text-muted-foreground">Conducteur:</span> {vehicle.driver_name}
                    </div>
                  )}
                  {vehicle.last_maintenance && (
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      <span className="text-muted-foreground">
                        Maintenance: {new Date(vehicle.last_maintenance).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {vehicle.notes && (
                    <p className="text-muted-foreground italic">{vehicle.notes}</p>
                  )}
                </div>

                {/* Actions statut */}
                <div className="pt-2 border-t">
                  <Label className="text-xs">Changer le statut:</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {vehicle.status !== 'available' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(vehicle.id, 'available')}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Disponible
                      </Button>
                    )}
                    {vehicle.status !== 'maintenance' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(vehicle.id, 'maintenance')}
                      >
                        <Wrench className="w-3 h-3 mr-1" />
                        Maintenance
                      </Button>
                    )}
                    {vehicle.status !== 'inactive' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(vehicle.id, 'inactive')}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactif
                      </Button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-1"
                    onClick={() => handleEdit(vehicle)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-1"
                    onClick={() => handleDelete(vehicle.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog d'ajout/modification */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="make">Marque</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="Toyota, Renault..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Modèle</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Corolla, Clio..."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Année</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2020"
                  required
                />
              </div>
              <div>
                <Label htmlFor="seats">Sièges</Label>
                <Input
                  id="seats"
                  type="number"
                  value={formData.seats}
                  onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                  placeholder="4"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="license_plate">Plaque d'immatriculation</Label>
              <Input
                id="license_plate"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                placeholder="ABC-1234"
                required
              />
            </div>

            <div>
              <Label htmlFor="color">Couleur (optionnel)</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Blanc, Noir..."
              />
            </div>

            <div>
              <Label htmlFor="driver_name">Conducteur attitré (optionnel)</Label>
              <Input
                id="driver_name"
                value={formData.driver_name}
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="last_maintenance">Dernière maintenance (optionnel)</Label>
              <Input
                id="last_maintenance"
                type="date"
                value={formData.last_maintenance}
                onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingVehicle ? 'Mettre à jour' : 'Ajouter'}
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
