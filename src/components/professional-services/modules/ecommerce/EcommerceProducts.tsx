/**
 * GESTION DES PRODUITS E-COMMERCE
 * Catalogue de produits avec variantes et stock
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
import { Package, Plus, Edit, Trash2, Eye, EyeOff, Image } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  category: string;
  stock_quantity: number;
  sku: string;
  images: string[];
  is_active: boolean;
  variants?: ProductVariant[];
  created_at: string;
}

interface ProductVariant {
  id: string;
  name: string;
  price_adjustment: number;
  stock: number;
}

interface EcommerceProductsProps {
  serviceId: string;
}

export function EcommerceProducts({ serviceId }: EcommerceProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compare_at_price: '',
    category: '',
    stock_quantity: '',
    sku: ''
  });

  const categories = [
    'Vêtements', 'Chaussures', 'Accessoires', 'Électronique',
    'Maison', 'Beauté', 'Sport', 'Alimentation', 'Autre'
  ];

  useEffect(() => {
    loadProducts();
  }, [serviceId]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('service_products')
        .select('*')
        .eq('professional_service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData = {
        professional_service_id: serviceId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity),
        sku: formData.sku || `SKU-${Date.now()}`,
        is_active: true
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('service_products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produit mis à jour');
      } else {
        const { error } = await supabase
          .from('service_products')
          .insert(productData);

        if (error) throw error;
        toast.success('Produit ajouté au catalogue');
      }

      setShowDialog(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', compare_at_price: '', category: '', stock_quantity: '', sku: '' });
      loadProducts();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error(error.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      compare_at_price: product.compare_at_price?.toString() || '',
      category: product.category || '',
      stock_quantity: product.stock_quantity?.toString() || '0',
      sku: product.sku || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Supprimer ce produit ?')) return;

    try {
      const { error } = await supabase
        .from('service_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast.success('Produit supprimé');
      loadProducts();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('service_products')
        .update({ is_active: !currentStatus })
        .eq('id', productId);

      if (error) throw error;

      toast.success(currentStatus ? 'Produit masqué' : 'Produit visible');
      loadProducts();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des produits...</div>;
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {products.length} produit(s) • {products.filter(p => p.is_active).length} visible(s)
          </p>
        </div>
        <Button onClick={() => {
          setEditingProduct(null);
          setFormData({ name: '', description: '', price: '', compare_at_price: '', category: '', stock_quantity: '', sku: '' });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un produit
        </Button>
      </div>

      {/* Grille de produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <Card key={product.id} className={`hover:shadow-lg transition-shadow ${
            !product.is_active ? 'opacity-60' : ''
          }`}>
            <CardHeader className="p-0">
              <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center">
                <Image className="w-16 h-16 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                  {!product.is_active && (
                    <Badge variant="secondary" className="text-xs">Masqué</Badge>
                  )}
                </div>
                {product.category && (
                  <Badge variant="outline" className="mt-1">{product.category}</Badge>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {product.price?.toLocaleString()} FCFA
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.compare_at_price.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Stock: {product.stock_quantity || 0} unité(s)
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => toggleActive(product.id, product.is_active)}
                >
                  {product.is_active ? (
                    <><EyeOff className="w-4 h-4 mr-1" /> Masquer</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-1" /> Afficher</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(product)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun produit dans le catalogue</p>
            <Button onClick={() => setShowDialog(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier produit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog d'ajout/modification */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du produit</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: T-shirt Premium"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez le produit..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label htmlFor="compare_at_price">Prix barré (optionnel)</Label>
                <Input
                  id="compare_at_price"
                  type="number"
                  step="0.01"
                  value={formData.compare_at_price}
                  onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Catégorie</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  required
                >
                  <option value="">Sélectionner...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="stock_quantity">Quantité en stock</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sku">SKU (optionnel)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Code produit unique"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingProduct ? 'Mettre à jour' : 'Ajouter'}
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
