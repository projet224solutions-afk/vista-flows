/**
 * Liste et gestion des achats de stock
 * Workflow complet: Brouillon → Document généré → Validé
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
  Plus,
  Search,
  FileText,
  CheckCircle,
  Clock,
  Lock,
  Eye,
  Trash2,
  ShoppingCart,
  Building2,
  Pencil,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PurchaseEditor } from './PurchaseEditor';
import { NewPurchaseDialog, PurchaseProduct } from './NewPurchaseDialog';
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

interface PurchasesListProps {
  vendorId: string;
}

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
  updated_at: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
}

const STATUS_CONFIG = {
  draft: {
    label: 'Brouillon',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-orange-500',
  },
  document_generated: {
    label: 'Document généré',
    icon: FileText,
    variant: 'outline' as const,
    color: 'text-blue-500',
  },
  validated: {
    label: 'Validé',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-500',
  },
};

export function PurchasesList({ vendorId }: PurchasesListProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletePurchase, setDeletePurchase] = useState<Purchase | null>(null);
  const [isNewPurchaseDialogOpen, setIsNewPurchaseDialogOpen] = useState(false);

  // Fetch only validated purchases for main list
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['stock-purchases-validated', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_purchases')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('status', 'validated')
        .order('validated_at', { ascending: false });

      if (error) throw error;
      return data as Purchase[];
    },
    enabled: !!vendorId,
  });

  // Create new purchase with supplier and products
  const createMutation = useMutation({
    mutationFn: async ({ 
      supplierId, 
      supplierName, 
      products 
    }: { 
      supplierId: string; 
      supplierName: string;
      products: PurchaseProduct[];
    }) => {
      // Generate purchase number
      const purchaseNumber = `ACH-${Date.now().toString(36).toUpperCase()}`;
      
      // Create the purchase (supplier_id is stored in purchase items, not in purchase header)
      const { data: purchase, error: purchaseError } = await supabase
        .from('stock_purchases')
        .insert([{ 
          vendor_id: vendorId,
          purchase_number: purchaseNumber,
          notes: `Fournisseur: ${supplierName}`,
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Insert purchase items with supplier_id
      if (products.length > 0) {
        const items = products.filter(p => p.quantity > 0).map(p => ({
          purchase_id: purchase.id,
          supplier_id: supplierId,
          product_id: p.productId,
          product_name: p.productName,
          quantity: p.quantity,
          purchase_price: p.unitCost,
          selling_price: p.sellingPrice, // Prix de vente réel du produit
        }));

        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from('stock_purchase_items')
            .insert(items);

          if (itemsError) {
            console.error('Error inserting purchase items:', itemsError);
          }
        }
      }

      return purchase as Purchase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-purchases', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-stats', vendorId] });
      setSelectedPurchase(data);
      setIsEditorOpen(true);
      setIsNewPurchaseDialogOpen(false);
      toast.success('Nouvel achat créé avec les produits');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleCreatePurchase = (supplierId: string, supplierName: string, products: PurchaseProduct[]) => {
    createMutation.mutate({ supplierId, supplierName, products });
  };

  // Delete purchase
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stock_purchases')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-purchases', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-purchase-stats', vendorId] });
      toast.success('Achat supprimé');
      setDeletePurchase(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleOpenPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedPurchase(null);
    queryClient.invalidateQueries({ queryKey: ['stock-purchases', vendorId] });
    queryClient.invalidateQueries({ queryKey: ['supplier-purchase-stats', vendorId] });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-GN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' GNF';
  };

  const filteredPurchases = purchases.filter((p) =>
    p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isEditorOpen && selectedPurchase) {
    return (
      <PurchaseEditor
        purchase={selectedPurchase}
        vendorId={vendorId}
        onClose={handleCloseEditor}
      />
    );
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement des achats...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un achat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => setIsNewPurchaseDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel achat
        </Button>
      </div>

      {/* Liste des achats */}
      {filteredPurchases.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {searchTerm
              ? 'Aucun achat trouvé'
              : 'Aucun achat. Créez-en un pour commencer.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPurchases.map((purchase) => {
            const config = STATUS_CONFIG[purchase.status];
            const StatusIcon = config.icon;

            return (
              <Card
                key={purchase.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOpenPurchase(purchase)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{purchase.purchase_number}</h3>
                          {purchase.is_locked && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(purchase.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(purchase.total_purchase_amount)}
                        </p>
                        <p className="text-xs text-primary">
                          +{formatCurrency(purchase.estimated_total_profit)} profit
                        </p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" title="Voir les détails">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!purchase.is_locked && purchase.status !== 'validated' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier l'achat"
                            onClick={() => handleOpenPurchase(purchase)}
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {purchase.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer l'achat"
                            onClick={() => setDeletePurchase(purchase)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Alert suppression */}
      <AlertDialog
        open={!!deletePurchase}
        onOpenChange={() => setDeletePurchase(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'achat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'achat "{deletePurchase?.purchase_number}"
              sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePurchase && deleteMutation.mutate(deletePurchase.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog nouvel achat */}
      <NewPurchaseDialog
        vendorId={vendorId}
        isOpen={isNewPurchaseDialogOpen}
        onClose={() => setIsNewPurchaseDialogOpen(false)}
        onConfirm={handleCreatePurchase}
        isCreating={createMutation.isPending}
      />
    </div>
  );
}
