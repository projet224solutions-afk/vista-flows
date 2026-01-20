/**
 * Formulaire de création/édition de fournisseur
 * Affiche les catégories produits et sélection/création de produits pour les grossistes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  X,
  Search,
  Package,
  Tag,
} from 'lucide-react';

interface SupplierFormDialogProps {
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SupplierFormData) => void;
  isSaving: boolean;
  editingSupplier?: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    category: string | null;
  } | null;
}

export interface SupplierFormData {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  category: string;
  linkedProducts: LinkedProduct[];
}

export interface LinkedProduct {
  productId: string | null;
  productName: string;
  isNew: boolean;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unitPrice?: number;
}

const SUPPLIER_CATEGORIES = [
  'Grossiste',
  'Fabricant',
  'Importateur',
  'Distributeur',
  'Détaillant',
  'Prestataire',
  'Autre',
];

export function SupplierFormDialog({
  vendorId,
  isOpen,
  onClose,
  onSave,
  isSaving,
  editingSupplier,
}: SupplierFormDialogProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    category: '',
    linkedProducts: [],
  });
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch ALL products for vendor (not filtered by category in the query)
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['vendor-products-for-supplier', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, category_id, images, price')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('name')
        .limit(500);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorId && formData.category === 'Grossiste',
  });

  // Filter products by selected category on the client side
  const products = selectedCategoryId && selectedCategoryId !== 'all'
    ? allProducts.filter(p => p.category_id === selectedCategoryId)
    : allProducts;

  // Reset form when dialog opens/closes or editingSupplier changes
  useEffect(() => {
    if (isOpen) {
      if (editingSupplier) {
        setFormData({
          id: editingSupplier.id,
          name: editingSupplier.name,
          phone: editingSupplier.phone || '',
          email: editingSupplier.email || '',
          address: editingSupplier.address || '',
          notes: editingSupplier.notes || '',
          category: editingSupplier.category || '',
          linkedProducts: [],
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          notes: '',
          category: '',
          linkedProducts: [],
        });
      }
      setProductSearch('');
      setSelectedCategoryId('');
      setShowNewProductForm(false);
      setNewProductName('');
    }
  }, [isOpen, editingSupplier]);

  const isGrossiste = formData.category === 'Grossiste';

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleAddProduct = (product: { id: string; name: string; category_id: string | null; price?: number }) => {
    const category = categories.find((c) => c.id === product.category_id);
    const quantity = productQuantities[product.id] || 1;
    setFormData({
      ...formData,
      linkedProducts: [
        ...formData.linkedProducts,
        {
          productId: product.id,
          productName: product.name,
          isNew: false,
          categoryId: product.category_id || '',
          categoryName: category?.name || 'Non catégorisé',
          quantity: quantity,
          unitPrice: product.price || 0,
        },
      ],
    });
    setProductSearch('');
    // Reset quantity for this product
    setProductQuantities(prev => {
      const updated = { ...prev };
      delete updated[product.id];
      return updated;
    });
  };

  const handleAddNewProduct = () => {
    if (!newProductName.trim() || !selectedCategoryId) return;
    const category = categories.find((c) => c.id === selectedCategoryId);
    setFormData({
      ...formData,
      linkedProducts: [
        ...formData.linkedProducts,
        {
          productId: null,
          productName: newProductName.trim(),
          isNew: true,
          categoryId: selectedCategoryId,
          categoryName: category?.name || '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
    });
    setNewProductName('');
    setShowNewProductForm(false);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const updated = [...formData.linkedProducts];
    updated[index].quantity = Math.max(1, quantity);
    setFormData({ ...formData, linkedProducts: updated });
  };

  const handleRemoveProduct = (index: number) => {
    const updated = [...formData.linkedProducts];
    updated.splice(index, 1);
    setFormData({ ...formData, linkedProducts: updated });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="text-xl font-semibold">
            {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-6 py-4 pr-2">
            {/* Section Informations de base */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Informations générales
              </h3>
              
              {/* Nom et Type sur la même ligne */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du fournisseur *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Société ABC Import"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Type de fournisseur</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner un type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Coordonnées
              </h3>
              
              {/* Téléphone et Email sur la même ligne */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: +224 620 00 00 00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: contact@fournisseur.com"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Kaloum, Conakry, Guinée"
                  className="mt-1"
                />
              </div>

            </div>

            {/* Section produits pour Grossiste */}
            {isGrossiste && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Catalogue produits
                </h3>
                
                <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Package className="h-4 w-4 text-primary" />
                    Associer des produits à ce fournisseur
                  </div>

                {/* Sélection catégorie produit */}
                <div>
                  <Label>Catégorie de produits</Label>
                  <Select
                    value={selectedCategoryId}
                    onValueChange={setSelectedCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrer par catégorie..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recherche produit existant */}
                <div>
                  <Label>Rechercher ou sélectionner un produit existant</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nom ou SKU du produit..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Liste des produits disponibles avec images */}
                  {productsLoading ? (
                    <div className="mt-3 text-sm text-muted-foreground text-center py-4">
                      Chargement des produits...
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <ScrollArea className="mt-3 h-64 border rounded-lg bg-background">
                      <div className="p-2 space-y-2">
                        {filteredProducts.slice(0, 30).map((product) => {
                          const isAlreadyAdded = formData.linkedProducts.some(
                            (lp) => lp.productId === product.id
                          );
                          const productImage = Array.isArray(product.images) && product.images.length > 0
                            ? product.images[0]
                            : null;
                          
                          const currentQty = productQuantities[product.id] || 1;
                          
                          return (
                            <div
                              key={product.id}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                isAlreadyAdded
                                  ? 'bg-primary/10 border-primary/30'
                                  : 'hover:bg-accent hover:border-primary/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Image produit */}
                                <div className="w-12 h-12 rounded-md bg-muted flex-shrink-0 overflow-hidden border">
                                  {productImage ? (
                                    <img
                                      src={productImage}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Infos produit */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-foreground line-clamp-1">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.sku}
                                  </p>
                                  {product.price != null && product.price > 0 && (
                                    <p className="text-xs font-semibold text-primary">
                                      {product.price.toLocaleString()} GNF
                                    </p>
                                  )}
                                </div>

                                {/* Bouton ajouter ou badge ajouté */}
                                {!isAlreadyAdded ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddProduct(product);
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Ajouter
                                  </Button>
                                ) : (
                                  <Badge variant="default" className="bg-primary text-primary-foreground">
                                    ✓ Ajouté
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  ) : products.length === 0 ? (
                    <div className="mt-3 p-4 border rounded-lg bg-muted/20 text-sm text-muted-foreground text-center">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Aucun produit dans cette catégorie.
                      <br />
                      Créez-en un nouveau ci-dessous.
                    </div>
                  ) : (
                    <div className="mt-3 p-4 border rounded-lg bg-muted/20 text-sm text-muted-foreground text-center">
                      Aucun produit correspondant à "{productSearch}".
                    </div>
                  )}
                </div>

                {/* Bouton ajouter nouveau produit - redirige vers la page complète */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Fermer le dialog et naviguer vers la page de création de produit
                    onClose();
                    navigate('/vendeur/products?action=new');
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer un nouveau produit
                </Button>

                {/* Liste produits liés */}
                {formData.linkedProducts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Produits liés ({formData.linkedProducts.length})</Label>
                    <div className="space-y-2">
                      {formData.linkedProducts.map((lp, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col gap-3 p-3 border rounded-lg bg-primary/5 border-primary/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground break-words">
                                  {lp.productName}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs text-muted-foreground">
                                    {lp.categoryName}
                                  </span>
                                  {lp.isNew && (
                                    <Badge variant="secondary" className="text-xs">
                                      Nouveau
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveProduct(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Champ quantité */}
                          <div className="flex items-center gap-3 ml-13">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">
                              Quantité à acheter:
                            </Label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUpdateQuantity(idx, lp.quantity - 1)}
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={lp.quantity}
                                onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                                className="h-7 w-16 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleUpdateQuantity(idx, lp.quantity + 1)}
                              >
                                +
                              </Button>
                            </div>
                            {lp.unitPrice != null && lp.unitPrice > 0 && (
                              <span className="text-xs font-medium text-primary ml-auto">
                                Total: {(lp.unitPrice * lp.quantity).toLocaleString()} GNF
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.name.trim()}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
