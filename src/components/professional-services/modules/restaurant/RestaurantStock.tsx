/**
 * GESTION DU STOCK RESTAURANT
 * Suivi des ingrédients et alertes de stock faible
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { Package, Plus, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  category: string;
  last_updated: string;
}

interface RestaurantStockProps {
  serviceId: string;
}

export function RestaurantStock({ serviceId }: RestaurantStockProps) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    min_quantity: '',
    category: 'légumes'
  });

  const categories = ['légumes', 'viandes', 'poissons', 'épices', 'boissons', 'divers'];
  const units = ['kg', 'g', 'L', 'mL', 'pièce(s)', 'sachet(s)'];

  useEffect(() => {
    loadStock();
  }, [serviceId]);

  const loadStock = async () => {
    try {
      // Utiliser une table dédiée pour le stock (à créer)
      const { data, error } = await supabase
        .from('restaurant_stock')
        .select('*')
        .eq('service_id', serviceId)
        .order('category', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;
      
      setItems(data || []);
    } catch (error) {
      console.error('Erreur chargement stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const itemData = {
        service_id: serviceId,
        name: formData.name,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        min_quantity: parseFloat(formData.min_quantity),
        category: formData.category,
        last_updated: new Date().toISOString()
      };

      if (editingItem) {
        const { error } = await supabase
          .from('restaurant_stock')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Article mis à jour');
      } else {
        const { error } = await supabase
          .from('restaurant_stock')
          .insert(itemData);

        if (error) throw error;
        toast.success('Article ajouté au stock');
      }

      setShowDialog(false);
      setEditingItem(null);
      setFormData({ name: '', quantity: '', unit: 'kg', min_quantity: '', category: 'légumes' });
      loadStock();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      min_quantity: item.min_quantity.toString(),
      category: item.category
    });
    setShowDialog(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Supprimer cet article du stock ?')) return;

    try {
      const { error } = await supabase
        .from('restaurant_stock')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Article supprimé');
      loadStock();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getLowStockItems = () => items.filter(item => item.quantity <= item.min_quantity);

  if (loading) {
    return <div className="text-center py-8">Chargement du stock...</div>;
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec alerte */}
      <div className="flex items-center justify-between">
        <div>
          {getLowStockItems().length > 0 && (
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                {getLowStockItems().length} article(s) en stock faible
              </span>
            </div>
          )}
        </div>
        <Button onClick={() => {
          setEditingItem(null);
          setFormData({ name: '', quantity: '', unit: 'kg', min_quantity: '', category: 'légumes' });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un article
        </Button>
      </div>

      {/* Liste par catégorie */}
      {categories.map((category) => {
        const categoryItems = items.filter(item => item.category === category);
        if (categoryItems.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Package className={`w-5 h-5 ${
                        item.quantity <= item.min_quantity ? 'text-orange-500' : 'text-green-500'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>
                            {item.quantity} {item.unit}
                          </span>
                          {item.quantity <= item.min_quantity && (
                            <Badge variant="destructive" className="text-xs">
                              Stock faible
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun article en stock</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier article
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'ajout/modification */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier l\'article' : 'Ajouter un article'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom de l'article</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Tomates"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Unité</Label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="min_quantity">Quantité minimale (alerte)</Label>
              <Input
                id="min_quantity"
                type="number"
                step="0.01"
                value={formData.min_quantity}
                onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Catégorie</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat} className="capitalize">{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingItem ? 'Mettre à jour' : 'Ajouter'}
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
