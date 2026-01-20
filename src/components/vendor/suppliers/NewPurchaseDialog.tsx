/**
 * Dialog de création d'un nouvel achat
 * Étape obligatoire: sélection du fournisseur
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Building2,
  Search,
  ShoppingCart,
  Plus,
  Check,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewPurchaseDialogProps {
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (supplierId: string, supplierName: string) => void;
  isCreating: boolean;
}

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
}

export function NewPurchaseDialog({
  vendorId,
  isOpen,
  onClose,
  onConfirm,
  isCreating,
}: NewPurchaseDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['vendor-suppliers-for-purchase', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_suppliers')
        .select('id, name, phone, email, address, category')
        .eq('vendor_id', vendorId)
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!vendorId && isOpen,
  });

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedSupplier) {
      onConfirm(selectedSupplier.id, selectedSupplier.name);
    }
  };

  const handleClose = () => {
    setSelectedSupplier(null);
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Nouvel achat de stock
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Sélectionnez le fournisseur pour cet achat
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 p-6 space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un fournisseur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {/* Liste des fournisseurs */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center justify-between">
              <span>Fournisseurs disponibles</span>
              <Badge variant="secondary">{filteredSuppliers.length}</Badge>
            </Label>

            {isLoading ? (
              <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border rounded-lg bg-muted/20">
                <Building2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground text-center">
                  {suppliers.length === 0
                    ? "Aucun fournisseur. Créez-en un d'abord dans l'onglet Fournisseurs."
                    : 'Aucun fournisseur trouvé'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-2">
                  {filteredSuppliers.map((supplier) => {
                    const isSelected = selectedSupplier?.id === supplier.id;

                    return (
                      <div
                        key={supplier.id}
                        onClick={() => setSelectedSupplier(supplier)}
                        className={cn(
                          "p-4 rounded-lg border-2 cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/30 hover:bg-accent hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            {isSelected ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{supplier.name}</h4>
                              {supplier.category && (
                                <Badge variant="outline" className="text-xs">
                                  {supplier.category}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {supplier.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {supplier.phone}
                                </span>
                              )}
                              {supplier.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {supplier.email}
                                </span>
                              )}
                              {supplier.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {supplier.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Fournisseur sélectionné */}
          {selectedSupplier && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Fournisseur sélectionné</p>
                  <p className="text-sm text-primary font-semibold">
                    {selectedSupplier.name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSupplier || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              'Création...'
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Créer l'achat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
