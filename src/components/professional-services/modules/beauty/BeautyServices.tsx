/**
 * GESTION DES SERVICES BEAUTÉ
 * Catalogue des services proposés (coiffure, ongles, soins, maquillage)
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
import { Scissors, Plus, Edit, Trash2, Eye, EyeOff, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface BeautyService {
  id: string;
  name: string;
  description?: string;
  duration: number; // en minutes
  price: number;
  category: 'coiffure' | 'ongles' | 'soins' | 'maquillage' | 'epilation' | 'massage';
  is_active: boolean;
  created_at: string;
}

interface BeautyServicesProps {
  serviceId: string;
}

export function BeautyServices({ serviceId }: BeautyServicesProps) {
  const [services, setServices] = useState<BeautyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<BeautyService | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '',
    price: '',
    category: 'coiffure' as BeautyService['category']
  });

  const categories = [
    { value: 'coiffure', label: 'Coiffure', icon: '✂️' },
    { value: 'ongles', label: 'Ongles', icon: '💅' },
    { value: 'soins', label: 'Soins visage', icon: '🧖' },
    { value: 'maquillage', label: 'Maquillage', icon: '💄' },
    { value: 'epilation', label: 'Épilation', icon: '🪒' },
    { value: 'massage', label: 'Massage', icon: '💆' }
  ];

  useEffect(() => {
    loadServices();
  }, [serviceId]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('beauty_services')
        .select('*')
        .eq('service_id', serviceId)
        .order('category', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;

      setServices(data || []);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const serviceData = {
        service_id: serviceId,
        name: formData.name,
        description: formData.description || null,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        category: formData.category,
        is_active: true
      };

      if (editingService) {
        const { error } = await supabase
          .from('beauty_services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Service mis à jour');
      } else {
        const { error } = await supabase
          .from('beauty_services')
          .insert(serviceData);

        if (error) throw error;
        toast.success('Service ajouté');
      }

      setShowDialog(false);
      setEditingService(null);
      setFormData({ name: '', description: '', duration: '', price: '', category: 'coiffure' });
      loadServices();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (service: BeautyService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration: service.duration.toString(),
      price: service.price.toString(),
      category: service.category
    });
    setShowDialog(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Supprimer ce service ?')) return;

    try {
      const { error } = await supabase
        .from('beauty_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast.success('Service supprimé');
      loadServices();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleActive = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('beauty_services')
        .update({ is_active: !currentStatus })
        .eq('id', serviceId);

      if (error) throw error;

      toast.success(currentStatus ? 'Service désactivé' : 'Service activé');
      loadServices();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des services...</div>;
  }

  // Grouper par catégorie
  const servicesByCategory = categories.map(cat => ({
    ...cat,
    services: services.filter(s => s.category === cat.value)
  }));

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {services.length} service(s) • {services.filter(s => s.is_active).length} actif(s)
          </p>
        </div>
        <Button onClick={() => {
          setEditingService(null);
          setFormData({ name: '', description: '', duration: '', price: '', category: 'coiffure' });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un service
        </Button>
      </div>

      {/* Services par catégorie */}
      {servicesByCategory.map((category) => {
        if (category.services.length === 0) return null;

        return (
          <Card key={category.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{category.icon}</span>
                {category.label} ({category.services.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.services.map((service) => (
                  <Card key={service.id} className={`hover:shadow-md transition-shadow ${
                    !service.is_active ? 'opacity-60' : ''
                  }`}>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{service.name}</h3>
                          {!service.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactif</Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {service.duration} min
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {service.price.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleActive(service.id, service.is_active)}
                        >
                          {service.is_active ? (
                            <><EyeOff className="w-4 h-4 mr-1" /> Désactiver</>
                          ) : (
                            <><Eye className="w-4 h-4 mr-1" /> Activer</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {services.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Scissors className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun service disponible</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'ajout/modification */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifier le service' : 'Ajouter un service'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du service</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Coupe + Brushing"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez le service..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="category">Catégorie</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as BeautyService['category'] })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Durée (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="30"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Prix (FCFA)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingService ? 'Mettre à jour' : 'Ajouter'}
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
