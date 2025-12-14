/**
 * PRODUCT MANAGEMENT - VERSION REFACTORISÉE & OPTIMISÉE
 * Interface professionnelle avec gestion IA améliorée
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentVendor } from "@/hooks/useCurrentVendor";
import { useProductActions } from "@/hooks/useProductActions";
import { useVendorErrorBoundary } from "@/hooks/useVendorErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PublicIdBadge } from "@/components/PublicIdBadge";
import { 
  Package, Plus, Search, Filter, Edit, Trash2,
  ShoppingCart, TrendingUp, Camera, Save, X, Copy,
  Sparkles, Loader2, ImagePlus, Tags, FolderOpen
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
  category?: { id: string; name: string } | null;
  images?: string[];
  tags?: string[];
  weight?: number;
  created_at?: string;
  // Champs carton
  sell_by_carton?: boolean;
  units_per_carton?: number;
  price_carton?: number;
  carton_sku?: string;
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing');
  const [saving, setSaving] = useState(false);

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
    is_active: true,
    // Champs carton
    sell_by_carton: false,
    units_per_carton: '',
    price_carton: '',
    carton_sku: ''
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
      .select('*, category:categories(id, name)')
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
      console.error('[Categories] Fetch error:', error);
      return;
    }
    
    console.log('[Categories] Loaded:', data?.length, 'categories', data);
    setCategories(data || []);
  };

  // Handlers
  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.stock_quantity) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      console.log('[ProductSave] Starting save...', { 
        isEditing: !!editingProduct, 
        formData,
        categoryMode,
        categoriesLoaded: categories.length
      });
      
      if (editingProduct) {
        const result = await updateProduct(
          editingProduct.id,
          formData,
          selectedImages,
          editingProduct.images || []
        );
        console.log('[ProductSave] Update result:', result);
      } else {
        const result = await createProduct(formData, selectedImages);
        console.log('[ProductSave] Create result:', result);
        if (!result.success) {
          console.error('[ProductSave] Creation failed');
        }
      }
    } catch (error: any) {
      console.error('[ProductSave] Exception:', error);
      captureError('product', 'Failed to save product', error);
      toast.error(`Erreur: ${error.message || 'Échec de la sauvegarde'}`);
    } finally {
      setSaving(false);
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
      is_active: product.is_active,
      // Champs carton
      sell_by_carton: product.sell_by_carton || false,
      units_per_carton: product.units_per_carton?.toString() || '',
      price_carton: product.price_carton?.toString() || '',
      carton_sku: product.carton_sku || ''
    });
    setCategoryMode(product.category_id ? 'existing' : 'new');
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
      is_active: true,
      // Champs carton
      sell_by_carton: false,
      units_per_carton: '',
      price_carton: '',
      carton_sku: ''
    });
    setEditingProduct(null);
    setSelectedImages([]);
    setCategoryMode('existing');
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
      toast.info('🤖 Génération IA en cours...');
      
      const categoryName = categoryMode === 'existing' && formData.category_id 
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
        toast.success('✅ Description générée par IA');
      } else if (data?.error) {
        throw new Error(data.error);
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
      toast.info('🎨 Génération image IA en cours...');
      
      const categoryName = categoryMode === 'existing' && formData.category_id 
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
        toast.success('✅ Image générée par IA');
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Erreur génération image:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGeneratingImage(false);
    }
  };

  // Generate SKU
  const handleGenerateSKU = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const sku = `SKU-${timestamp}-${random}`;
    setFormData(prev => ({ ...prev, sku }));
    toast.success('SKU généré');
  };

  // Generate Barcode (EAN-13 format)
  const handleGenerateBarcode = () => {
    // Generate a valid EAN-13 barcode
    const prefix = '224'; // Guinea country code
    const randomDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    const baseCode = prefix + randomDigits;
    
    // Calculate check digit for EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(baseCode[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    
    const barcode = baseCode + checkDigit;
    setFormData(prev => ({ ...prev, barcode }));
    toast.success('Code-barres EAN-13 généré');
  };

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && product.is_active) ||
                           (statusFilter === 'inactive' && !product.is_active);
      
      const matchesLowStock = !lowStockFilter || 
                             product.stock_quantity <= product.low_stock_threshold;

      const matchesCategory = categoryFilter === 'all' || 
                             product.category_id === categoryFilter;

      return matchesSearch && matchesStatus && matchesLowStock && matchesCategory;
    });
  }, [products, searchTerm, statusFilter, lowStockFilter, categoryFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => p.stock_quantity <= p.low_stock_threshold).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0)
  }), [products]);

  // Get unique categories used in products
  const usedCategories = useMemo(() => {
    const categoryIds = new Set(products.map(p => p.category_id).filter(Boolean));
    return categories.filter(c => categoryIds.has(c.id));
  }, [products, categories]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-3xl font-bold">
              Gestion des produits
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Gérez votre catalogue de produits
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau produit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="p-2 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Produits</CardTitle>
            <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {stats.active} actifs
            </p>
          </CardContent>
        </Card>

        <Card className="p-2 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Stock Bas</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-orange-500">{stats.lowStock}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
              Réappro. requis
            </p>
          </CardContent>
        </Card>

        <Card className="p-2 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Valeur Stock</CardTitle>
            <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="text-sm md:text-2xl font-bold truncate">
              {new Intl.NumberFormat('fr-GN', {
                maximumFractionDigits: 0
              }).format(stats.totalValue)} GNF
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
              Valeur inventaire
            </p>
          </CardContent>
        </Card>

        <Card className="p-2 md:p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Catégories</CardTitle>
            <FolderOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">{usedCategories.length}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Catégories utilisées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:pt-6 md:p-6">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 md:h-10 text-sm"
              />
            </div>
            
            {/* Filter Row */}
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[130px] h-9 text-xs md:text-sm">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs md:text-sm">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {usedCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Low Stock Filter */}
              <Button
                variant={lowStockFilter ? "default" : "outline"}
                onClick={() => setLowStockFilter(!lowStockFilter)}
                className="h-9 text-xs md:text-sm px-3"
                size="sm"
              >
                <Filter className="h-3 w-3 mr-1" />
                Stock bas
                {stats.lowStock > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {stats.lowStock}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-shadow">
            {/* Product Image */}
            <div className="aspect-square bg-muted relative">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
                </div>
              )}
              {product.public_id && (
                <div className="absolute top-1 left-1 md:top-2 md:left-2">
                  <PublicIdBadge publicId={product.public_id} variant="default" className="text-[8px] md:text-xs px-1 md:px-2" />
                </div>
              )}
              {!product.is_active && (
                <Badge className="absolute top-1 right-1 md:top-2 md:right-2 text-[10px] md:text-xs px-1 md:px-2" variant="destructive">
                  Inactif
                </Badge>
              )}
              {product.stock_quantity <= product.low_stock_threshold && (
                <Badge className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-orange-500 text-white text-[10px] md:text-xs px-1 md:px-2" variant="outline">
                  Stock bas
                </Badge>
              )}
            </div>
            
            {/* Product Info */}
            <CardHeader className="p-2 md:p-4 pb-1 md:pb-2">
              <CardTitle className="text-xs md:text-base line-clamp-2 leading-tight">{product.name}</CardTitle>
              {/* Category Badge */}
              {product.category?.name && (
                <Badge variant="secondary" className="mt-1 text-[10px] md:text-xs w-fit">
                  <FolderOpen className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                  {product.category.name}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="p-2 md:p-4 pt-0 space-y-1.5 md:space-y-3">
              {/* Price */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <span className="text-sm md:text-xl font-bold text-primary truncate">
                  {new Intl.NumberFormat('fr-GN', {
                    maximumFractionDigits: 0
                  }).format(product.price)} GNF
                </span>
                {product.compare_price && product.compare_price > product.price && (
                  <span className="text-[10px] md:text-sm line-through text-muted-foreground">
                    {new Intl.NumberFormat('fr-GN', {
                      maximumFractionDigits: 0
                    }).format(product.compare_price)} GNF
                  </span>
                )}
              </div>
              
              {/* Stock */}
              <div className="flex items-center justify-between text-[10px] md:text-sm">
                <span className="text-muted-foreground">Stock:</span>
                <span className={`font-medium ${product.stock_quantity <= product.low_stock_threshold ? 'text-orange-500' : ''}`}>
                  {product.stock_quantity} unités
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 md:gap-2 pt-1 md:pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(product)}
                  className="flex-1 h-7 md:h-9 text-[10px] md:text-sm px-1 md:px-3"
                >
                  <Edit className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Éditer</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(product.id)}
                  className="h-7 md:h-9 px-1.5 md:px-3"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(product.id)}
                  className="h-7 md:h-9 px-1.5 md:px-3"
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
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => { resetForm(); setShowDialog(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer votre premier produit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Product Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informations</TabsTrigger>
              <TabsTrigger value="pricing">Prix & Stock</TabsTrigger>
              <TabsTrigger value="media">Images</TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Info */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: T-shirt en coton premium"
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
                  rows={4}
                />
              </div>

              {/* Category Selection - Unified */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Catégorie
                </Label>
                
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={categoryMode === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCategoryMode('existing');
                      setFormData(prev => ({ ...prev, category_name: '' }));
                    }}
                  >
                    Existante
                  </Button>
                  <Button
                    type="button"
                    variant={categoryMode === 'new' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCategoryMode('new');
                      setFormData(prev => ({ ...prev, category_id: '' }));
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nouvelle
                  </Button>
                </div>

                {categoryMode === 'existing' ? (
                  <Select
                    value={formData.category_id}
                    onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    placeholder="Nom de la nouvelle catégorie..."
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Tags (séparés par virgules)
                </Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="été, promo, nouveauté"
                />
              </div>
            </TabsContent>

            {/* Tab 2: Pricing & Stock */}
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix de vente * (GNF)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compare_price">Prix barré (GNF)</Label>
                  <Input
                    id="compare_price"
                    type="number"
                    value={formData.compare_price}
                    onChange={(e) => setFormData({ ...formData, compare_price: e.target.value })}
                    placeholder="70000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Prix de revient (GNF)</Label>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sku">Code SKU</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateSKU}
                      className="h-6 px-2 text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Générer
                    </Button>
                  </div>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-001"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="barcode">Code-barres</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateBarcode}
                      className="h-6 px-2 text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Générer
                    </Button>
                  </div>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="123456789"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Produit actif et visible
                </Label>
              </div>

              {/* Section Vente par Carton */}
              <div className="border border-border/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sell_by_carton" className="text-base font-semibold cursor-pointer">
                      📦 Vente par carton
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Permet de vendre ce produit en gros par carton
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="sell_by_carton"
                    checked={formData.sell_by_carton}
                    onChange={(e) => setFormData({ ...formData, sell_by_carton: e.target.checked })}
                    className="h-5 w-5"
                  />
                </div>

                {formData.sell_by_carton && (
                  <div className="space-y-4 pt-3 border-t border-border/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="units_per_carton">Unités par carton *</Label>
                        <Input
                          id="units_per_carton"
                          type="number"
                          min="1"
                          value={formData.units_per_carton}
                          onChange={(e) => setFormData({ ...formData, units_per_carton: e.target.value })}
                          placeholder="Ex: 12, 24, 50"
                        />
                        <p className="text-xs text-muted-foreground">
                          Nombre d'unités dans un carton
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price_carton">Prix du carton (GNF) *</Label>
                        <Input
                          id="price_carton"
                          type="number"
                          value={formData.price_carton}
                          onChange={(e) => setFormData({ ...formData, price_carton: e.target.value })}
                          placeholder="Ex: 230000"
                        />
                        {formData.units_per_carton && formData.price && (
                          <p className="text-xs text-green-600">
                            Économie: {(
                              (parseFloat(formData.price) * parseInt(formData.units_per_carton || '1')) - 
                              parseFloat(formData.price_carton || '0')
                            ).toLocaleString()} GNF vs unités
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carton_sku">Code SKU Carton (optionnel)</Label>
                      <Input
                        id="carton_sku"
                        value={formData.carton_sku}
                        onChange={(e) => setFormData({ ...formData, carton_sku: e.target.value })}
                        placeholder="Ex: CART-001"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 3: Media */}
            <TabsContent value="media" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Images du produit</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 flex-col gap-2"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Importer images</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !formData.name}
                    className="h-20 flex-col gap-2"
                  >
                    {generatingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <ImagePlus className="h-6 w-6" />
                    )}
                    <span className="text-xs">
                      {generatingImage ? 'Génération...' : 'Générer avec IA'}
                    </span>
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              {/* Image Previews */}
              {(selectedImages.length > 0 || (editingProduct?.images?.length || 0) > 0) && (
                <div className="space-y-2">
                  <Label>Aperçu ({selectedImages.length} nouvelle(s))</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {/* Existing Images */}
                    {editingProduct?.images?.map((url, index) => (
                      <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={url}
                          alt={`Existing ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-1 left-1 text-[8px]" variant="secondary">
                          Existante
                        </Badge>
                      </div>
                    ))}
                    {/* New Images */}
                    {selectedImages.map((file, index) => (
                      <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-5 w-5 p-0"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Badge className="absolute bottom-1 left-1 text-[8px]" variant="default">
                          Nouvelle
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-4 border-t">
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
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingProduct ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingProduct ? 'Mettre à jour' : 'Créer le produit'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
