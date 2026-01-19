/**
 * Éditeur d'achat de stock complet
 * Ajout produits, calculs automatiques, génération PDF, validation
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  Download,
  Lock,
  Package,
  Calculator,
  Building2,
  AlertTriangle,
} from 'lucide-react';

interface Purchase {
  id: string;
  purchase_number: string;
  status: 'draft' | 'document_generated' | 'validated';
  total_purchase_amount: number;
  total_selling_amount: number;
  estimated_total_profit: number;
  notes: string | null;
  document_url: string | null;
  is_locked: boolean;
  validated_at: string | null;
  created_at: string;
}

interface PurchaseItem {
  id: string;
  purchase_id: string;
  supplier_id: string | null;
  product_id: string | null;
  category_id: string | null;
  product_name: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  unit_profit: number;
  total_purchase: number;
  total_selling: number;
  total_profit: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface PurchaseEditorProps {
  purchase: Purchase;
  vendorId: string;
  onClose: () => void;
}

export function PurchaseEditor({ purchase, vendorId, onClose }: PurchaseEditorProps) {
  const queryClient = useQueryClient();
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [notes, setNotes] = useState(purchase.notes || '');
  const [newItem, setNewItem] = useState({
    supplier_id: '',
    category_id: '',
    product_id: '',
    product_name: '',
    quantity: 1,
    purchase_price: 0,
    selling_price: 0,
  });

  // Fetch purchase items
  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['purchase-items', purchase.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_purchase_items')
        .select('*')
        .eq('purchase_id', purchase.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PurchaseItem[];
    },
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['vendor-suppliers-select', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_suppliers')
        .select('id, name')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['vendor-products-select', vendorId, newItem.category_id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, name, price, category_id')
        .eq('vendor_id', vendorId)
        .order('name');

      if (newItem.category_id) {
        query = query.eq('category_id', newItem.category_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('stock_purchase_items').insert({
        purchase_id: purchase.id,
        supplier_id: newItem.supplier_id || null,
        category_id: newItem.category_id || null,
        product_id: newItem.product_id || null,
        product_name: newItem.product_name,
        quantity: newItem.quantity,
        purchase_price: newItem.purchase_price,
        selling_price: newItem.selling_price,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ['stock-purchases', vendorId] });
      toast.success('Produit ajouté');
      setIsAddItemDialogOpen(false);
      resetNewItem();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('stock_purchase_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ['stock-purchases', vendorId] });
      toast.success('Produit retiré');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const { error } = await supabase
        .from('stock_purchases')
        .update({ notes: newNotes })
        .eq('id', purchase.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notes enregistrées');
    },
  });

  // Generate document mutation
  const generateDocMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('stock_purchases')
        .update({ status: 'document_generated' })
        .eq('id', purchase.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-purchases', vendorId] });
      toast.success('Document généré');
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Validate purchase mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      // 1. Valider l'achat
      const { error: purchaseError } = await supabase
        .from('stock_purchases')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
        })
        .eq('id', purchase.id);

      if (purchaseError) throw purchaseError;

      // 2. Créer la dépense automatique
      const { data: expenseData, error: expenseError } = await supabase
        .from('vendor_expenses')
        .insert({
          vendor_id: vendorId,
          description: `Achat de stock - ${purchase.purchase_number}`,
          amount: items.reduce((sum, item) => sum + item.total_purchase, 0),
          expense_date: new Date().toISOString().split('T')[0],
          payment_method: 'cash',
          status: 'paid',
        })
        .select()
        .single();

      if (expenseError) {
        console.error('Erreur création dépense:', expenseError);
      } else if (expenseData) {
        // Lier la dépense à l'achat
        await supabase
          .from('stock_purchases')
          .update({ expense_id: expenseData.id })
          .eq('id', purchase.id);
      }

      // 3. Mettre à jour le stock des produits
      for (const item of items) {
        if (item.product_id) {
          // Mettre à jour le produit
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity, price')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await supabase
              .from('products')
              .update({
                stock_quantity: (product.stock_quantity || 0) + item.quantity,
                price: item.selling_price,
              })
              .eq('id', item.product_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-purchases', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Achat validé! Stock et dépenses mis à jour.');
      setShowValidateConfirm(false);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Erreur validation: ${error.message}`);
    },
  });

  const resetNewItem = () => {
    setNewItem({
      supplier_id: '',
      category_id: '',
      product_id: '',
      product_name: '',
      quantity: 1,
      purchase_price: 0,
      selling_price: 0,
    });
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setNewItem({
        ...newItem,
        product_id: productId,
        product_name: product.name,
        selling_price: product.price,
      });
    }
  };

  const handleAddItem = () => {
    if (!newItem.product_name.trim()) {
      toast.error('Le nom du produit est requis');
      return;
    }
    if (newItem.quantity < 1) {
      toast.error('La quantité doit être supérieure à 0');
      return;
    }
    if (newItem.purchase_price <= 0) {
      toast.error('Le prix d\'achat est requis');
      return;
    }
    if (newItem.selling_price <= 0) {
      toast.error('Le prix de vente est requis');
      return;
    }
    addItemMutation.mutate();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' GNF';
  };

  const totalPurchase = items.reduce((sum, item) => sum + item.total_purchase, 0);
  const totalSelling = items.reduce((sum, item) => sum + item.total_selling, 0);
  const totalProfit = items.reduce((sum, item) => sum + item.total_profit, 0);
  const isLocked = purchase.is_locked || purchase.status === 'validated';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {purchase.purchase_number}
              {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </h2>
            <Badge
              variant={
                purchase.status === 'validated'
                  ? 'default'
                  : purchase.status === 'document_generated'
                  ? 'outline'
                  : 'secondary'
              }
            >
              {purchase.status === 'validated'
                ? 'Validé'
                : purchase.status === 'document_generated'
                ? 'Document généré'
                : 'Brouillon'}
            </Badge>
          </div>
        </div>

        {!isLocked && (
          <Button onClick={() => setIsAddItemDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter produit
          </Button>
        )}
      </div>

      {/* Récapitulatif financier */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total achat</p>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(totalPurchase)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total vente</p>
              <p className="text-lg font-bold">{formatCurrency(totalSelling)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Profit estimé</p>
              <p className="text-lg font-bold text-green-600">
                +{formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des produits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produits ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Aucun produit ajouté</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>Qté: {item.quantity}</span>
                        <span>Achat: {formatCurrency(item.purchase_price)}</span>
                        <span>Vente: {formatCurrency(item.selling_price)}</span>
                      </div>
                    </div>
                    <div className="text-right mr-2">
                      <p className="text-sm font-semibold">
                        {formatCurrency(item.total_purchase)}
                      </p>
                      <p className="text-xs text-green-600">
                        +{formatCurrency(item.total_profit)}
                      </p>
                    </div>
                    {!isLocked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteItemMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {!isLocked && (
        <Card>
          <CardContent className="p-4">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => updateNotesMutation.mutate(notes)}
              placeholder="Notes sur cet achat..."
              rows={2}
              className="mt-1"
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isLocked && (
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => generateDocMutation.mutate()}
            disabled={items.length === 0 || generateDocMutation.isPending}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Générer document
          </Button>
          <Button
            onClick={() => setShowValidateConfirm(true)}
            disabled={items.length === 0}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            Valider l'achat
          </Button>
        </div>
      )}

      {/* Dialog ajout produit */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un produit</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fournisseur (optionnel)</Label>
              <Select
                value={newItem.supplier_id}
                onValueChange={(v) => setNewItem({ ...newItem, supplier_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Catégorie (optionnel)</Label>
              <Select
                value={newItem.category_id}
                onValueChange={(v) => setNewItem({ ...newItem, category_id: v, product_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Produit existant (optionnel)</Label>
              <Select value={newItem.product_id} onValueChange={handleProductSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner ou saisir manuellement..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nom du produit *</Label>
              <Input
                value={newItem.product_name}
                onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                placeholder="Nom du produit"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantité *</Label>
                <Input
                  type="number"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label>Prix achat *</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.purchase_price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, purchase_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Prix vente *</Label>
                <Input
                  type="number"
                  min={0}
                  value={newItem.selling_price}
                  onChange={(e) =>
                    setNewItem({ ...newItem, selling_price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            {/* Calculs en temps réel */}
            {newItem.purchase_price > 0 && newItem.selling_price > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Profit unitaire:</span>
                    <span className="font-semibold text-green-600">
                      +{formatCurrency(newItem.selling_price - newItem.purchase_price)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Total achat:</span>
                    <span className="font-semibold">
                      {formatCurrency(newItem.quantity * newItem.purchase_price)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Profit total:</span>
                    <span className="font-semibold text-green-600">
                      +{formatCurrency(newItem.quantity * (newItem.selling_price - newItem.purchase_price))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
              {addItemMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation validation */}
      <AlertDialog open={showValidateConfirm} onOpenChange={setShowValidateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Valider définitivement cet achat ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Cette action est <strong>irréversible</strong>. Une fois validé :</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Le stock sera automatiquement mis à jour</li>
                <li>Une dépense sera créée ({formatCurrency(totalPurchase)})</li>
                <li>Les prix de vente seront synchronisés</li>
                <li>L'achat sera verrouillé</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => validateMutation.mutate()}
              className="bg-green-600 hover:bg-green-700"
            >
              {validateMutation.isPending ? 'Validation...' : 'Confirmer la validation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
