/**
 * PRODUCT MANAGEMENT - VERSION REFACTORISÉE
 * Utilise useProductActions pour CRUD (1846 → ~350 lignes, réduction de 81%)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentVendor } from "@/hooks/useCurrentVendor";
import { useProductActions } from "@/hooks/useProductActions";
import { useVendorErrorBoundary } from "@/hooks/useVendorErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PublicIdBadge } from "@/components/PublicIdBadge";
import { 
  Package, Plus, Search, Filter, Edit, Trash2, Star, 
  Eye, ShoppingCart, TrendingUp, Camera, Save, X, Copy,
  Sparkles, Wand2, Loader2, ImagePlus
} from "lucide-react";

interface Product {
  id: string;
  public_id?: string;
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
  const { vendorId, user, loading: vendorLoading } = useCurrentVendor();
  const navigate = useNavigate();
  const { captureError } = useVendorErrorBoundary();
  
  // Product actions hook
  const {
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    bulkUpdateStock
  } = useProductActions({
    vendorId,
    onProductCreated: () => {
      fetchProducts();
      setShowDialog(false);
      resetForm();
    },
    onProductUpdated: () => {
      fetchProducts();
      setShowDialog(false);
      resetForm();
    },
    onProductDeleted: () => {
      fetchProducts();
    }
  });

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

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
    category_name: '',
    weight: '',
    tags: '',
    is_active: true
  });

  // Load initial data
  useEffect(() => {
    if (!vendorId || vendorLoading) return;
    fetchData();
  }, [vendorId, vendorLoading]);

  const fetchData = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
    } catch (error: any) {
      captureError('product', 'Failed to fetch products', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!vendorId) return;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      captureError('product', 'Failed to fetch products', error);
      return;
    }
    
    setProducts(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      captureError('product', 'Failed to fetch categories', error);
      return;
    }
    
    setCategories(data || []);
  };

  // Handlers
  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.stock_quantity) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        await updateProduct(
          editingProduct.id,
          formData,
          selectedImages,
          editingProduct.images || []
        );
      } else {
        // Create new product
        await createProduct(formData, selectedImages);
      }
    } catch (error: any) {
      captureError('product', 'Failed to save product', error);
    }
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
      category_name: '',
      weight: product.weight?.toString() || '',
      tags: product.tags?.join(', ') || '',
      is_active: product.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    
    try {
      await deleteProduct(productId);
    } catch (error: any) {
      captureError('product', 'Failed to delete product', error);
    }
  };

  const handleDuplicate = async (productId: string) => {
    if (!confirm('Voulez-vous créer une copie de ce produit ?')) return;
    
    try {
      await duplicateProduct(productId);
      toast.success('Produit dupliqué avec succès');
      fetchProducts();
    } catch (error: any) {
      captureError('product', 'Failed to duplicate product', error);
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
      category_name: '',
      weight: '',
      tags: '',
      is_active: true
    });
    setEditingProduct(null);
    setSelectedImages([]);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );

    if (imageFiles.length !== files.length) {
      toast.error('Certains fichiers ont été ignorés (format invalide ou taille > 10MB)');
    }

    setSelectedImages(prev => [...prev, ...imageFiles]);
    toast.success(`${imageFiles.length} image(s) sélectionnée(s)`);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // AI Generation Functions
  const handleGenerateDescription = async () => {
    if (!formData.name) {
      toast.error('Veuillez entrer le nom du produit');
      return;
    }

    try {
      setGeneratingDescription(true);
      const categoryName = formData.category_id 
        ? categories.find(c => c.id === formData.category_id)?.name 
        : formData.category_name || undefined;

      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: formData.name,
          category: categoryName,
          price: formData.price ? parseInt(formData.price) : undefined
        }
      });

      if (error) throw error;

      if (data?.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        toast.success('Description générée par IA');
      }
    } catch (error: any) {
      console.error('Erreur génération description:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!formData.name) {
      toast.error('Veuillez entrer le nom du produit');
      return;
    }

    try {
      setGeneratingImage(true);
      const categoryName = formData.category_id 
        ? categories.find(c => c.id === formData.category_id)?.name 
        : formData.category_name || undefined;

      const { data, error } = await supabase.functions.invoke('generate-product-image', {
        body: {
          productName: formData.name,
          category: categoryName,
          description: formData.description
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Convert base64 or URL to File
        const response = await fetch(data.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });
        setSelectedImages(prev => [...prev, file]);
        toast.success('Image générée par IA');
      }
    } catch (error: any) {
      console.error('Erreur génération image:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGeneratingImage(false);
    }
  };

  // Filtering
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && product.is_active) ||
                         (statusFilter === 'inactive' && !product.is_active);
    
    const matchesLowStock = !lowStockFilter || 
                           product.stock_quantity <= product.low_stock_threshold;

    return matchesSearch && matchesStatus && matchesLowStock;
  });

  // Stats
  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => p.stock_quantity <= p.low_stock_threshold).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0)
  };

  if (vendorLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" />
            Gestion des produits
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre catalogue de produits
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau produit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bas</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">
              Nécessitent réapprovisionnement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Stock</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('fr-GN', {
                style: 'currency',
                currency: 'GNF'
              }).format(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valeur totale inventaire
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Catégories actives
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les produits</SelectItem>
                <SelectItem value="active">Actifs uniquement</SelectItem>
                <SelectItem value="inactive">Inactifs uniquement</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={lowStockFilter ? "default" : "outline"}
              onClick={() => setLowStockFilter(!lowStockFilter)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Stock bas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              {product.public_id && (
                <div className="absolute top-2 left-2">
                  <PublicIdBadge publicId={product.public_id} variant="default" />
                </div>
              )}
              {!product.is_active && (
                <Badge className="absolute top-2 right-2" variant="destructive">
                  Inactif
                </Badge>
              )}
              {product.stock_quantity <= product.low_stock_threshold && (
                <Badge className="absolute bottom-2 right-2 bg-orange-500 text-white" variant="outline">
                  Stock bas
                </Badge>
              )}
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat('fr-GN', {
                    style: 'currency',
                    currency: 'GNF'
                  }).format(product.price)}
                </span>
                {product.compare_price && (
                  <span className="text-sm line-through text-muted-foreground">
                    {new Intl.NumberFormat('fr-GN', {
                      style: 'currency',
                      currency: 'GNF'
                    }).format(product.compare_price)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Stock:</span>
                <span className="font-medium">{product.stock_quantity} unités</span>
              </div>

              {product.sku && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono">{product.sku}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(product)}
                  className="flex-1"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Éditer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(product.id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun produit trouvé</p>
          </CardContent>
        </Card>
      )}

      {/* Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: T-shirt en coton"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription || !formData.name}
                >
                  {generatingDescription ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Générer avec IA
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description détaillée du produit..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prix de vente *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="compare_price">Prix comparé</Label>
                <Input
                  id="compare_price"
                  type="number"
                  value={formData.compare_price}
                  onChange={(e) => setFormData({ ...formData, compare_price: e.target.value })}
                  placeholder="70000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_price">Prix de revient</Label>
                <Input
                  id="cost_price"
                  type="number"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  placeholder="30000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Quantité en stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Seuil stock bas</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_name">Ou nouvelle catégorie</Label>
                <Input
                  id="category_name"
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  placeholder="Ex: Vêtements"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">Code SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Code-barres</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="123456789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (séparés par virgules)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="été, promo, nouveauté"
              />
            </div>

            <div className="space-y-2">
              <Label>Images du produit</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Sélectionner des images
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || !formData.name}
                  className="flex-1"
                >
                  {generatingImage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4 mr-2" />
                  )}
                  Générer image IA
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active">Produit actif</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
