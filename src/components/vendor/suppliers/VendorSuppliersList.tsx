/**
 * Liste des fournisseurs du vendeur
 * CRUD complet avec protection des fournisseurs liés à des achats validés
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Building2,
  Plus,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Lock,
  Search,
  Tag,
} from 'lucide-react';
import { SupplierFormDialog, SupplierFormData } from './SupplierFormDialog';

interface VendorSuppliersListProps {
  vendorId: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  category: string | null;
  is_active: boolean;
  has_validated_purchases: boolean;
  created_at: string;
}

export function VendorSuppliersList({ vendorId }: VendorSuppliersListProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['vendor-suppliers', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_suppliers')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!vendorId,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      // Save supplier
      let supplierId = data.id;
      
      if (data.id) {
        const { error } = await supabase
          .from('vendor_suppliers')
          .update({
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            notes: data.notes || null,
            category: data.category || null,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: newSupplier, error } = await supabase
          .from('vendor_suppliers')
          .insert({
            vendor_id: vendorId,
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            notes: data.notes || null,
            category: data.category || null,
          })
          .select('id')
          .single();
        if (error) throw error;
        supplierId = newSupplier.id;
      }

      // Create new products if any
      for (const lp of data.linkedProducts) {
        if (lp.isNew && lp.productName) {
          const { error } = await supabase
            .from('products')
            .insert({
              vendor_id: vendorId,
              name: lp.productName,
              category_id: lp.categoryId || null,
              price: 0,
              stock_quantity: 0,
              is_active: true,
            });
          if (error) {
            console.error('Error creating product:', error);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-suppliers', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-stats', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-products-for-supplier', vendorId] });
      toast.success(editingSupplier ? 'Fournisseur modifié' : 'Fournisseur créé');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendor_suppliers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-suppliers', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-stats', vendorId] });
      toast.success('Fournisseur supprimé');
      setDeleteSupplier(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleSave = (data: SupplierFormData) => {
    saveMutation.mutate(data);
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.includes(searchTerm) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8">Chargement des fournisseurs...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau fournisseur
        </Button>
      </div>

      {/* Liste des fournisseurs */}
      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm
            ? 'Aucun fournisseur trouvé'
            : 'Aucun fournisseur. Créez-en un pour commencer.'}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {supplier.name}
                        {supplier.has_validated_purchases && (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={supplier.is_active ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {supplier.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                        {supplier.category && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Tag className="h-3 w-3" />
                            {supplier.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!supplier.has_validated_purchases && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteSupplier(supplier)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="line-clamp-1">{supplier.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog création/édition */}
      <SupplierFormDialog
        vendorId={vendorId}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        editingSupplier={editingSupplier}
      />

      {/* Alert suppression */}
      <AlertDialog
        open={!!deleteSupplier}
        onOpenChange={() => setDeleteSupplier(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fournisseur "{deleteSupplier?.name}" sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSupplier && deleteMutation.mutate(deleteSupplier.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}