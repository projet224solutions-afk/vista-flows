/**
 * Dialog de création d'un nouvel achat
 * Étape 1: sélection du fournisseur
 * Étape 2: sélection des produits à acheter avec quantités
 */

import { useState, useEffect } from 'react';
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
  Minus,
  Check,
  Phone,
  Mail,
  MapPin,
  Package,
  ArrowLeft,
  ArrowRight,
  Box,
} from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface NewPurchaseDialogProps {
  vendorId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (supplierId: string, supplierName: string, products: PurchaseProduct[]) => void;
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

interface SupplierProduct {
  id: string;
  product_id: string;
  unit_cost: number;
  default_quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    images: string[] | null;
    sku: string | null;
    sell_by_carton: boolean | null;
    units_per_carton: number | null;
    price_carton: number | null;
    cost_price: number | null;
  };
}

export interface PurchaseProduct {
  productId: string;
  productName: string;
  unitCost: number;
  quantity: number;
  imageUrl: string | null;
  sku: string | null;
  currentStock: number;
  // Carton support
  saleType: 'unit' | 'carton';
  sellByCarton: boolean;
  unitsPerCarton: number | null;
  priceCarton: number | null;
  cartonQuantity: number;
}

export function NewPurchaseDialog({
  vendorId,
  isOpen,
  onClose,
  onConfirm,
  isCreating,
}: NewPurchaseDialogProps) {
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<PurchaseProduct[]>([]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSearchTerm('');
      setProductSearchTerm('');
      setSelectedSupplier(null);
      setSelectedProducts([]);
    }
  }, [isOpen]);

  // Fetch suppliers
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
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

  // Fetch supplier products when supplier is selected
  const { data: supplierProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['supplier-products', selectedSupplier?.id],
    queryFn: async () => {
      if (!selectedSupplier?.id) return [];
      
      const { data, error } = await supabase
        .from('vendor_supplier_products')
        .select(`
          id,
          product_id,
          unit_cost,
          default_quantity,
          product:products(id, name, price, stock_quantity, images, sku, sell_by_carton, units_per_carton, price_carton, cost_price)
        `)
        .eq('supplier_id', selectedSupplier.id);

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        product: item.product,
      })) as SupplierProduct[];
    },
    enabled: !!selectedSupplier?.id && step === 2,
  });

  // Initialize selected products when supplier products load
  useEffect(() => {
    if (supplierProducts.length > 0 && selectedProducts.length === 0) {
      const initialProducts: PurchaseProduct[] = supplierProducts.map((sp) => {
        const sellByCarton = sp.product?.sell_by_carton || false;
        const unitsPerCarton = sp.product?.units_per_carton || null;
        const priceCarton = sp.product?.price_carton || null;
        
        return {
          productId: sp.product_id,
          productName: sp.product?.name || 'Produit inconnu',
          unitCost: sp.unit_cost || sp.product?.cost_price || sp.product?.price || 0,
          quantity: sp.default_quantity || 1,
          imageUrl: sp.product?.images?.[0] || null,
          sku: sp.product?.sku || null,
          currentStock: sp.product?.stock_quantity || 0,
          // Carton support
          saleType: 'unit' as const,
          sellByCarton,
          unitsPerCarton,
          priceCarton,
          cartonQuantity: 0,
        };
      });
      setSelectedProducts(initialProducts);
    }
  }, [supplierProducts, selectedProducts.length]);

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = selectedProducts.filter((p) =>
    p.productName.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedSupplier && selectedProducts.length > 0) {
      const productsWithQuantity = selectedProducts.filter(p => p.quantity > 0);
      onConfirm(selectedSupplier.id, selectedSupplier.name, productsWithQuantity);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNextStep = () => {
    if (selectedSupplier) {
      setStep(2);
    }
  };

  const handlePreviousStep = () => {
    setStep(1);
    setSelectedProducts([]);
  };

  const updateProductQuantity = (productId: string, delta: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, quantity: Math.max(0, p.quantity + delta) }
          : p
      )
    );
  };

  const setProductQuantity = (productId: string, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, quantity: Math.max(0, quantity) }
          : p
      )
    );
  };

  // Carton quantity handlers
  const updateCartonQuantity = (productId: string, delta: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, cartonQuantity: Math.max(0, p.cartonQuantity + delta) }
          : p
      )
    );
  };

  const setCartonQuantity = (productId: string, cartonQty: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, cartonQuantity: Math.max(0, cartonQty) }
          : p
      )
    );
  };

  const toggleSaleType = (productId: string, type: 'unit' | 'carton') => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, saleType: type }
          : p
      )
    );
  };

  // Calculate totals considering both units and cartons
  const calculateProductTotal = (product: PurchaseProduct): number => {
    const unitTotal = product.quantity * product.unitCost;
    const cartonTotal = product.cartonQuantity * (product.priceCarton || product.unitCost * (product.unitsPerCarton || 1));
    return unitTotal + cartonTotal;
  };

  // Calculate total units (including cartons converted to units)
  const calculateTotalUnits = (product: PurchaseProduct): number => {
    const unitCount = product.quantity;
    const cartonUnits = product.cartonQuantity * (product.unitsPerCarton || 0);
    return unitCount + cartonUnits;
  };

  const totalAmount = selectedProducts.reduce(
    (sum, p) => sum + calculateProductTotal(p),
    0
  );

  const totalItems = selectedProducts.reduce((sum, p) => sum + calculateTotalUnits(p), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
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
                {step === 1
                  ? 'Étape 1/2: Sélectionnez le fournisseur'
                  : 'Étape 2/2: Définissez les quantités à acheter'}
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={cn(
              "flex-1 h-2 rounded-full transition-colors",
              step >= 1 ? "bg-primary" : "bg-muted"
            )} />
            <div className={cn(
              "flex-1 h-2 rounded-full transition-colors",
              step >= 2 ? "bg-primary" : "bg-muted"
            )} />
          </div>
        </DialogHeader>

        {/* Step 1: Supplier Selection */}
        {step === 1 && (
          <div className="flex-1 min-h-0 p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center justify-between">
                <span>Fournisseurs disponibles</span>
                <Badge variant="secondary">{filteredSuppliers.length}</Badge>
              </Label>

              {loadingSuppliers ? (
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
                <ScrollArea className="h-80 border rounded-lg">
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
          </div>
        )}

        {/* Step 2: Product Selection with Quantities */}
        {step === 2 && (
          <div className="flex-1 min-h-0 p-6 space-y-4">
            {/* Supplier info */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Fournisseur sélectionné</p>
                <p className="font-semibold text-sm">{selectedSupplier?.name}</p>
              </div>
            </div>

            {/* Search products */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* Products list */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center justify-between">
                <span>Produits à acheter</span>
                <Badge variant="secondary">
                  {selectedProducts.filter(p => p.quantity > 0 || p.cartonQuantity > 0).length} produit(s) • {totalItems} unité(s)
                </Badge>
              </Label>

              {loadingProducts ? (
                <div className="h-80 flex items-center justify-center border rounded-lg bg-muted/20">
                  <p className="text-sm text-muted-foreground">Chargement des produits...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-80 flex flex-col items-center justify-center border rounded-lg bg-muted/20">
                  <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground text-center">
                    {supplierProducts.length === 0
                      ? "Aucun produit lié à ce fournisseur. Ajoutez des produits dans la fiche fournisseur."
                      : 'Aucun produit trouvé'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-80 border rounded-lg">
                  <div className="p-3 space-y-3">
                    {filteredProducts.map((product) => {
                      const hasQuantity = product.quantity > 0 || product.cartonQuantity > 0;
                      const productTotal = calculateProductTotal(product);
                      const cartonCost = product.priceCarton || product.unitCost * (product.unitsPerCarton || 1);
                      
                      return (
                        <div
                          key={product.productId}
                          className={cn(
                            "p-4 rounded-lg border transition-all",
                            hasQuantity
                              ? "border-primary/50 bg-primary/5"
                              : "border-transparent bg-muted/30"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            {/* Product image */}
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.productName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>

                            {/* Product info and controls */}
                            <div className="flex-1 min-w-0 space-y-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-sm truncate">{product.productName}</h4>
                                  {product.sellByCarton && (
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      <Box className="h-3 w-3 mr-1" />
                                      Carton
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {product.sku && <span>SKU: {product.sku}</span>}
                                  <span>Stock: {product.currentStock}</span>
                                </div>
                              </div>

                              {/* Quantity controls row */}
                              <div className="flex flex-wrap items-center gap-4">
                                {/* Unit quantity */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">Unités:</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateProductQuantity(product.productId, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={product.quantity}
                                    onChange={(e) => setProductQuantity(product.productId, parseInt(e.target.value) || 0)}
                                    className="w-14 h-7 text-center text-sm text-foreground bg-background border-input"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateProductQuantity(product.productId, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <span className="text-xs text-primary font-medium">
                                    × {product.unitCost.toLocaleString()} GNF
                                  </span>
                                </div>

                                {/* Carton quantity (if available) */}
                                {product.sellByCarton && product.unitsPerCarton && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                      <Box className="h-3 w-3" />
                                      Cartons:
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => updateCartonQuantity(product.productId, -1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={product.cartonQuantity}
                                      onChange={(e) => setCartonQuantity(product.productId, parseInt(e.target.value) || 0)}
                                      className="w-14 h-7 text-center text-sm text-foreground bg-background border-input"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => updateCartonQuantity(product.productId, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-xs text-secondary-foreground font-semibold bg-secondary px-1.5 py-0.5 rounded">
                                      × {cartonCost.toLocaleString()} GNF
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({product.unitsPerCarton}u/ctn)
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Line total */}
                              {hasQuantity && (
                                <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                  <span className="text-xs text-muted-foreground">
                                    Total: {calculateTotalUnits(product)} unités
                                  </span>
                                  <span className="font-semibold text-sm text-primary">
                                    {productTotal.toLocaleString()} GNF
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Total */}
            {selectedProducts.some(p => p.quantity > 0 || p.cartonQuantity > 0) && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">Total estimé de l'achat</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totalItems} unités au total
                    </p>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {totalAmount.toLocaleString()} GNF
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="p-4 border-t flex-shrink-0">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                Annuler
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedSupplier}
                className="gap-2"
              >
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handlePreviousStep} disabled={isCreating} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedProducts.some(p => p.quantity > 0 || p.cartonQuantity > 0) || isCreating}
                className="gap-2"
              >
                {isCreating ? (
                  'Création...'
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Créer l'achat ({totalAmount.toLocaleString()} GNF)
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
