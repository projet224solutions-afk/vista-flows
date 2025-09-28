import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, Plus, Search, Filter, Edit, Trash2, Star, 
  Eye, ShoppingCart, TrendingUp, Camera, Save, X
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  cost_price?: number;
  sku?: string;
  barcode?: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category_id?: string;
  images?: string[];
  tags?: string[];
  weight?: number;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  is_active: boolean;
}

export default function ProductManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    compare_price: '',
    cost_price: '',
    sku: '',
    barcode: '',
    stock_quantity: '',
    low_stock_threshold: '10',
    category_id: '',
    weight: '',
    tags: '',
    is_active: true
  });

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);

      if (categoriesError) throw categoriesError;

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données des produits.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && product.is_active) ||
      (statusFilter === 'inactive' && !product.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleSaveProduct = async () => {
    try {
      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) throw new Error('Vendor not found');

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        compare_price: formData.compare_price ? parseFloat(formData.compare_price) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        category_id: formData.category_id || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : null,
        is_active: formData.is_active,
        vendor_id: vendor.id
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? { ...p, ...productData } : p
        ));

        toast({
          title: "Produit mis à jour",
          description: "Le produit a été mis à jour avec succès."
        });
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();

        if (error) throw error;

        setProducts(prev => [data, ...prev]);

        toast({
          title: "Produit ajouté",
          description: "Le nouveau produit a été ajouté avec succès."
        });
      }

      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: `Impossible de sauvegarder le produit: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      compare_price: '',
      cost_price: '',
      sku: '',
      barcode: '',
      stock_quantity: '',
      low_stock_threshold: '10',
      category_id: '',
      weight: '',
      tags: '',
      is_active: true
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      compare_price: product.compare_price?.toString() || '',
      cost_price: product.cost_price?.toString() || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
      category_id: product.category_id || '',
      weight: product.weight?.toString() || '',
      tags: product.tags?.join(', ') || '',
      is_active: product.is_active
    });
    setShowDialog(true);
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !isActive })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_active: !isActive } : p
      ));

      toast({
        title: isActive ? "Produit désactivé" : "Produit activé",
        description: `Le produit a été ${isActive ? 'désactivé' : 'activé'} avec succès.`
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du produit.",
        variant: "destructive"
      });
    }
  };

  if (loading) return <div className="p-4">Chargement des produits...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Produits</h2>
          <p className="text-muted-foreground">Gérez votre catalogue de produits avec précision</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-vendeur-gradient hover:opacity-90" 
              onClick={() => resetForm()}
              data-testid="add-product-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Section Images */}
              <div className="space-y-3">
                <Label>Images du produit</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-6">
                  <div className="flex flex-col items-center gap-3">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Glissez vos images ici</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG jusqu'à 10MB chacune</p>
                    </div>
                    <Button type="button" variant="outline" size="sm">
                      Choisir des fichiers
                    </Button>
                  </div>
                </div>
              </div>

              {/* Informations de base */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">INFORMATIONS DE BASE</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du produit *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: iPhone 15 Pro"
                      className={!formData.name ? "border-red-300 focus:border-red-500" : ""}
                    />
                    {!formData.name && <p className="text-xs text-red-500">Le nom est obligatoire</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">Code SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Ex: IPH15PRO"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description détaillée du produit..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Code-barres</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      placeholder="Code-barres"
                    />
                  </div>
                </div>
              </div>

              {/* Prix et coûts */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">PRIX ET COÛTS</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix de vente * (FCFA)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0"
                      className={!formData.price ? "border-red-300 focus:border-red-500" : ""}
                    />
                    {!formData.price && <p className="text-xs text-red-500">Le prix est obligatoire</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compare_price">Prix comparatif (FCFA)</Label>
                    <Input
                      id="compare_price"
                      type="number"
                      min="0"
                      value={formData.compare_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, compare_price: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Prix de revient (FCFA)</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_price: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                {formData.price && formData.compare_price && parseFloat(formData.price) > parseFloat(formData.compare_price) && (
                  <p className="text-xs text-orange-500">⚠️ Le prix de vente est supérieur au prix comparatif</p>
                )}
              </div>

              {/* Inventaire */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">INVENTAIRE</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Stock initial</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="low_stock_threshold">Seuil stock bas</Label>
                    <Input
                      id="low_stock_threshold"
                      type="number"
                      min="0"
                      value={formData.low_stock_threshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Poids (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">MÉTADONNÉES</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Ex: électronique, smartphone, apple"
                    />
                    <p className="text-xs text-muted-foreground">Utilisez des virgules pour séparer les tags</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="is_active" className="font-medium">Statut du produit</Label>
                      <p className="text-sm text-muted-foreground">
                        {formData.is_active ? 'Produit actif et visible dans la boutique' : 'Produit inactif et masqué'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="w-4 h-4 text-vendeur-primary"
                      />
                      <Label htmlFor="is_active" className="text-sm font-medium">
                        {formData.is_active ? 'Actif' : 'Inactif'}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <div className="flex gap-2">
                  {editingProduct && (
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
                          try {
                            const { error } = await supabase
                              .from('products')
                              .delete()
                              .eq('id', editingProduct.id);
                            
                            if (error) throw error;
                            
                            setProducts(prev => prev.filter(p => p.id !== editingProduct.id));
                            setShowDialog(false);
                            resetForm();
                            
                            toast({
                              title: "Produit supprimé",
                              description: "Le produit a été supprimé avec succès."
                            });
                          } catch (error: any) {
                            toast({
                              title: "Erreur",
                              description: "Impossible de supprimer le produit.",
                              variant: "destructive"
                            });
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  )}
                  <Button 
                    onClick={handleSaveProduct} 
                    disabled={!formData.name || !formData.price}
                    className="bg-vendeur-gradient hover:opacity-90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingProduct ? 'Mettre à jour' : 'Ajouter le produit'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Produits actifs</p>
                <p className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Stock bas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {products.filter(p => p.stock_quantity <= p.low_stock_threshold).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 rounded-full" />
              <div>
                <p className="text-sm text-muted-foreground">Valeur totale</p>
                <p className="text-2xl font-bold">
                  {products.reduce((acc, p) => acc + (p.price * p.stock_quantity), 0).toLocaleString()} FCFA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Tous les produits</option>
              <option value="active">Produits actifs</option>
              <option value="inactive">Produits inactifs</option>
            </select>
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.name}</h3>
                  {product.sku && (
                    <Badge variant="outline" className="mb-2">{product.sku}</Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => toggleProductStatus(product.id, product.is_active)}
                    className={product.is_active ? 'text-green-600' : 'text-gray-400'}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-vendeur-primary">
                    {product.price.toLocaleString()} FCFA
                  </span>
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {product.compare_price.toLocaleString()} FCFA
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock:</span>
                  <span className={`font-medium ${
                    product.stock_quantity <= product.low_stock_threshold 
                      ? 'text-orange-600' 
                      : 'text-green-600'
                  }`}>
                    {product.stock_quantity} unités
                  </span>
                </div>

                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  {product.stock_quantity <= product.low_stock_threshold && (
                    <Badge variant="destructive" className="text-xs">
                      Stock bas
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Aucun produit ne correspond aux critères de recherche.' 
                  : 'Commencez par ajouter votre premier produit.'}
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un produit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}