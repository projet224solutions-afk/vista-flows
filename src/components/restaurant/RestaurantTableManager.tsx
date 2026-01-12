/**
 * Gestionnaire de tables restaurant
 * Plan de salle visuel avec statuts
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Users, MapPin, Square, Circle,
  Check, Clock, Sparkles, Trash2, Edit2
} from 'lucide-react';
import { useRestaurantTables, RestaurantTable } from '@/hooks/useRestaurantTables';
import { toast } from 'sonner';

interface RestaurantTableManagerProps {
  serviceId: string;
}

const STATUS_CONFIG = {
  available: { label: 'Libre', color: 'bg-green-500', icon: Check },
  occupied: { label: 'Occupée', color: 'bg-red-500', icon: Users },
  reserved: { label: 'Réservée', color: 'bg-blue-500', icon: Clock },
  cleaning: { label: 'Nettoyage', color: 'bg-yellow-500', icon: Sparkles },
};

const LOCATIONS = [
  { value: 'interieur', label: '🏠 Intérieur' },
  { value: 'terrasse', label: '☀️ Terrasse' },
  { value: 'salon_prive', label: '🚪 Salon privé' },
  { value: 'bar', label: '🍸 Bar' },
];

export function RestaurantTableManager({ serviceId }: RestaurantTableManagerProps) {
  const {
    tables,
    loading,
    error,
    createTable,
    updateTable,
    updateTableStatus,
    deleteTable,
    getTableStats,
    refresh,
  } = useRestaurantTables(serviceId);

  const [showDialog, setShowDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableForm, setTableForm] = useState({
    table_number: '',
    capacity: '4',
    location: 'interieur',
    shape: 'rectangle',
  });

  const stats = getTableStats();

  const resetForm = () => {
    setTableForm({
      table_number: '',
      capacity: '4',
      location: 'interieur',
      shape: 'rectangle',
    });
    setEditingTable(null);
  };

  const handleSave = async () => {
    if (!tableForm.table_number) {
      toast.error('Numéro de table requis');
      return;
    }

    try {
      if (editingTable) {
        await updateTable(editingTable.id, {
          table_number: tableForm.table_number,
          capacity: parseInt(tableForm.capacity),
          location: tableForm.location,
          shape: tableForm.shape,
        });
        toast.success('Table mise à jour');
      } else {
        await createTable({
          table_number: tableForm.table_number,
          capacity: parseInt(tableForm.capacity),
          location: tableForm.location,
          shape: tableForm.shape,
        });
        toast.success('Table ajoutée');
      }
      setShowDialog(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableForm({
      table_number: table.table_number,
      capacity: table.capacity.toString(),
      location: table.location || 'interieur',
      shape: table.shape || 'rectangle',
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette table ?')) return;
    try {
      await deleteTable(id);
      toast.success('Table supprimée');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (id: string, status: RestaurantTable['status']) => {
    try {
      await updateTableStatus(id, status);
      toast.success('Statut mis à jour');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-sm text-green-700">Tables libres</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.occupied}</div>
            <div className="text-sm text-red-700">Occupées</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.reserved}</div>
            <div className="text-sm text-blue-700">Réservées</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.occupiedCapacity}/{stats.totalCapacity}</div>
            <div className="text-sm text-muted-foreground">Couverts occupés</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Plan de salle</h3>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une table
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTable ? 'Modifier la table' : 'Nouvelle table'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Numéro de table *</Label>
                  <Input
                    value={tableForm.table_number}
                    onChange={(e) => setTableForm(prev => ({ ...prev, table_number: e.target.value }))}
                    placeholder="Ex: T1, A2..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacité (places)</Label>
                  <Input
                    type="number"
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm(prev => ({ ...prev, capacity: e.target.value }))}
                    min="1"
                    max="20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emplacement</Label>
                  <Select
                    value={tableForm.location}
                    onValueChange={(v) => setTableForm(prev => ({ ...prev, location: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map(loc => (
                        <SelectItem key={loc.value} value={loc.value}>
                          {loc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Forme</Label>
                  <Select
                    value={tableForm.shape}
                    onValueChange={(v) => setTableForm(prev => ({ ...prev, shape: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectangle">◻️ Rectangle</SelectItem>
                      <SelectItem value="round">⬤ Ronde</SelectItem>
                      <SelectItem value="square">▪️ Carrée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingTable ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grille des tables */}
      {tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucune table configurée
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map(table => {
            const statusConfig = STATUS_CONFIG[table.status];
            const StatusIcon = statusConfig.icon;
            const location = LOCATIONS.find(l => l.value === table.location);

            return (
              <Card 
                key={table.id} 
                className={`relative cursor-pointer transition-all hover:shadow-md ${
                  table.status === 'occupied' ? 'ring-2 ring-red-400' : ''
                }`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 ${statusConfig.color}`} />
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1">
                      {table.shape === 'round' ? (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-bold text-lg">{table.table_number}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {table.capacity}
                    </Badge>
                  </div>

                  {location && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {location.label}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mb-3">
                    <StatusIcon className={`w-3 h-3 ${
                      table.status === 'available' ? 'text-green-600' :
                      table.status === 'occupied' ? 'text-red-600' :
                      table.status === 'reserved' ? 'text-blue-600' : 'text-yellow-600'
                    }`} />
                    <span className="text-xs">{statusConfig.label}</span>
                  </div>

                  {/* Actions rapides de statut */}
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <Button
                        key={key}
                        variant={table.status === key ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleStatusChange(table.id, key as RestaurantTable['status'])}
                      >
                        {config.label.slice(0, 4)}
                      </Button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-1 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(table)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(table.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RestaurantTableManager;
