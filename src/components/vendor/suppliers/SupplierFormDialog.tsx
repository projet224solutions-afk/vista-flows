/**
 * Formulaire de création/édition de fournisseur
 * Affiche les catégories produits et sélection/création de produits pour les grossistes
 */

import { useState, useEffect } from 'react';
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

  // Fetch products for vendor filtered by category
  const { data: products = [] } = useQuery({
    queryKey: ['vendor-products-for-supplier', vendorId, selectedCategoryId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, name, sku, category_id')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('name');

      if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!vendorId && formData.category === 'Grossiste',
  });

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

  const handleAddProduct = (product: { id: string; name: string; category_id: string | null }) => {
    const category = categories.find((c) => c.id === product.category_id);
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
        },
      ],
    });
    setProductSearch('');
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
        },
      ],
    });
    setNewProductName('');
    setShowNewProductForm(false);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-4">
            {/* Nom */}
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du fournisseur"
              />
            </div>

            {/* Catégorie fournisseur */}
            <div>
              <Label htmlFor="category">Type de fournisseur</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
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

            {/* Section produits pour Grossiste */}
            {isGrossiste && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4" />
                  Produits associés au fournisseur
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
                  <Label>Rechercher un produit existant</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nom ou SKU du produit..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {productSearch && filteredProducts.length > 0 && (
                    <div className="mt-2 border rounded-md max-h-40 overflow-auto">
                      {filteredProducts.slice(0, 10).map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleAddProduct(product)}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center"
                        >
                          <span>{product.name}</span>
                          <span className="text-xs text-muted-foreground">{product.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {productSearch && filteredProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Aucun produit trouvé. Vous pouvez en créer un nouveau.
                    </p>
                  )}
                </div>

                {/* Bouton ajouter nouveau produit */}
                {!showNewProductForm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewProductForm(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un nouveau produit
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 border rounded-lg bg-background">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Nouveau produit</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowNewProductForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Label>Nom du produit *</Label>
                      <Input
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Nom du nouveau produit"
                      />
                    </div>
                    <div>
                      <Label>Catégorie *</Label>
                      <Select
                        value={selectedCategoryId}
                        onValueChange={setSelectedCategoryId}
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
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewProduct}
                      disabled={!newProductName.trim() || !selectedCategoryId}
                    >
                      Ajouter ce produit
                    </Button>
                  </div>
                )}

                {/* Liste produits liés */}
                {formData.linkedProducts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Produits liés ({formData.linkedProducts.length})</Label>
                    <div className="space-y-2">
                      {formData.linkedProducts.map((lp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 border rounded-md bg-background"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">{lp.productName}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {lp.categoryName}
                                </span>
                                {lp.isNew && (
                                  <Badge variant="secondary" className="text-xs ml-1">
                                    Nouveau
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveProduct(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Téléphone */}
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Numéro de téléphone"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email (optionnel)"
              />
            </div>

            {/* Adresse */}
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse"
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes internes..."
                rows={3}
              />
            </div>
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
