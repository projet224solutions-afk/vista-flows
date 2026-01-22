/**
 * Dialog de création d'un nouvel achat
 * Étape 1: sélection du fournisseur
 * Étape 2: sélection manuelle des produits à acheter avec quantités
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Filter,
  Trash2,
  RefreshCw,
} from 'lucide-react';
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
    category_id: string | null;
  };
}

interface Category {
  id: string;
  name: string;
}

export interface PurchaseProduct {
  productId: string;
  productName: string;
  unitCost: number;
  unitCostCurrency: string;
  sellingPrice: number; // Prix de vente du produit
  quantity: number;
  imageUrl: string | null;
  sku: string | null;
  currentStock: number;
  saleType: 'unit' | 'carton';
  sellByCarton: boolean;
  unitsPerCarton: number | null;
  priceCarton: number | null;
  cartonQuantity: number;
  categoryId: string | null;
}

const CURRENCIES = [
  { code: 'GNF', label: 'GNF' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
  { code: 'XOF', label: 'XOF' },
  { code: 'CNY', label: 'CNY' },
];

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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSearchTerm('');
      setProductSearchTerm('');
      setSelectedSupplier(null);
      setSelectedProducts([]);
      setSelectedCategoryFilter('all');
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

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['vendor-categories', vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!vendorId && isOpen && step === 2,
  });

  // Fetch supplier products when supplier is selected (products linked to this supplier)
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
          product:products(id, name, price, stock_quantity, images, sku, sell_by_carton, units_per_carton, price_carton, cost_price, category_id)
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

  // Filter supplier products by category and search
  const filteredSupplierProducts = supplierProducts.filter((sp) => {
    const matchesSearch = sp.product?.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      sp.product?.sku?.toLowerCase().includes(productSearchTerm.toLowerCase());
    
    const matchesCategory = selectedCategoryFilter === 'all' || 
      sp.product?.category_id === selectedCategoryFilter;
    
    // Don't show already selected products
    const notAlreadySelected = !selectedProducts.some(p => p.productId === sp.product_id);
    
    return matchesSearch && matchesCategory && notAlreadySelected;
  });

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add product to selection
  const addProductToSelection = (sp: SupplierProduct) => {
    const sellByCarton = sp.product?.sell_by_carton || false;
    const unitsPerCarton = sp.product?.units_per_carton || null;
    const priceCarton = sp.product?.price_carton || null;
    
    const newProduct: PurchaseProduct = {
      productId: sp.product_id,
      productName: sp.product?.name || 'Produit inconnu',
      unitCost: 0,
      unitCostCurrency: 'GNF',
      sellingPrice: sp.product?.price || 0, // Prix de vente actuel du produit
      quantity: sp.default_quantity || 1,
      imageUrl: sp.product?.images?.[0] || null,
      sku: sp.product?.sku || null,
      currentStock: sp.product?.stock_quantity || 0,
      saleType: 'unit' as const,
      sellByCarton,
      unitsPerCarton,
      priceCarton,
      cartonQuantity: 0,
      categoryId: sp.product?.category_id || null,
    };
    
    setSelectedProducts(prev => [...prev, newProduct]);
  };

  // Remove product from selection
  const removeProductFromSelection = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const handleConfirm = () => {
    if (selectedSupplier && selectedProducts.length > 0) {
      const productsWithQuantity = selectedProducts.filter(p => p.quantity > 0 || p.cartonQuantity > 0);
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
    setSelectedCategoryFilter('all');
    setProductSearchTerm('');
  };

  // Change supplier in step 2 - keep selected products
  const handleChangeSupplier = () => {
    setStep(1);
    setSelectedSupplier(null);
    // Ne pas effacer les produits sélectionnés pour permettre d'acheter chez plusieurs fournisseurs
    setSelectedCategoryFilter('all');
    setProductSearchTerm('');
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

  const setProductUnitCost = (productId: string, unitCost: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, unitCost: Math.max(0, unitCost) }
          : p
      )
    );
  };

  const setProductCurrency = (productId: string, currency: string) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.productId === productId
          ? { ...p, unitCostCurrency: currency }
          : p
      )
    );
  };

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

  const calculateProductTotal = (product: PurchaseProduct): number => {
    const unitTotal = product.quantity * product.unitCost;
    const cartonTotal = product.cartonQuantity * (product.priceCarton || product.unitCost * (product.unitsPerCarton || 1));
    return unitTotal + cartonTotal;
  };

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

  // Get unique categories from supplier products for the filter
  const availableCategories = categories.filter(cat => 
    supplierProducts.some(sp => sp.product?.category_id === cat.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-3 sm:p-6 pb-3 sm:pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base sm:text-xl font-semibold">
                Nouvel achat de stock
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                {step === 1
                  ? 'Étape 1/2: Sélectionnez le fournisseur'
                  : 'Étape 2/2: Sélectionnez les produits'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            <div className={cn(
              "flex-1 h-1.5 sm:h-2 rounded-full transition-colors",
              step >= 1 ? "bg-primary" : "bg-muted"
            )} />
            <div className={cn(
              "flex-1 h-1.5 sm:h-2 rounded-full transition-colors",
              step >= 2 ? "bg-primary" : "bg-muted"
            )} />
          </div>
        </DialogHeader>

        {/* Step 1: Supplier Selection */}
        {step === 1 && (
          <div className="flex-1 min-h-0 p-3 sm:p-6 space-y-3 sm:space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-11 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm font-medium flex items-center justify-between">
                <span>Fournisseurs disponibles</span>
                <Badge variant="secondary" className="text-xs">{filteredSuppliers.length}</Badge>
              </Label>

              {loadingSuppliers ? (
                <div className="h-48 sm:h-64 flex items-center justify-center border rounded-lg bg-muted/20">
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="h-48 sm:h-64 flex flex-col items-center justify-center border rounded-lg bg-muted/20 px-4">
                  <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/40 mb-2 sm:mb-3" />
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    {suppliers.length === 0
                      ? "Aucun fournisseur. Créez-en un d'abord."
                      : 'Aucun fournisseur trouvé'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[45vh] sm:h-80 border rounded-lg">
                  <div className="p-2 space-y-2">
                    {filteredSuppliers.map((supplier) => {
                      const isSelected = selectedSupplier?.id === supplier.id;

                      return (
                        <div
                          key={supplier.id}
                          onClick={() => setSelectedSupplier(supplier)}
                          className={cn(
                            "p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-transparent bg-muted/30 hover:bg-accent active:bg-accent/80"
                          )}
                        >
                          <div className="flex items-start gap-2.5 sm:gap-4">
                            <div className={cn(
                              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              {isSelected ? (
                                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                              ) : (
                                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                <h4 className="font-semibold text-sm truncate">{supplier.name}</h4>
                                {supplier.category && (
                                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                                    {supplier.category}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
                                {supplier.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    <span className="truncate max-w-[100px]">{supplier.phone}</span>
                                  </span>
                                )}
                                {supplier.email && (
                                  <span className="hidden sm:flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{supplier.email}</span>
                                  </span>
                                )}
                                {supplier.address && (
                                  <span className="hidden sm:flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{supplier.address}</span>
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

        {/* Step 2: Product Selection */}
        {step === 2 && (
          <div className="flex-1 min-h-0 p-3 sm:p-6 space-y-3 sm:space-y-4 overflow-hidden flex flex-col">
            {/* Supplier info with change button */}
            <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Fournisseur</p>
                  <p className="font-semibold text-xs sm:text-sm truncate">{selectedSupplier?.name}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleChangeSupplier}
                className="text-[10px] sm:text-xs gap-1 px-2 h-7 sm:h-8 flex-shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="hidden xs:inline">Changer</span>
              </Button>
            </div>

            {/* Filters: Search + Category */}
            <div className="flex gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Recherche..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm"
                />
              </div>
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="w-[130px] sm:w-48 h-9 sm:h-10 text-xs sm:text-sm">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">
                    <SelectValue placeholder="Catégorie" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Two columns on desktop, stacked tabs on mobile */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 min-h-0">
              {/* Available products to add */}
              <div className="flex flex-col min-h-0 border rounded-lg">
                <div className="p-2 sm:p-3 border-b bg-muted/30">
                  <Label className="text-xs sm:text-sm font-medium flex items-center justify-between">
                    <span>Produits disponibles</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">{filteredSupplierProducts.length}</Badge>
                  </Label>
                </div>
                
                {loadingProducts ? (
                  <div className="flex-1 flex items-center justify-center min-h-[120px] sm:min-h-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Chargement...</p>
                  </div>
                ) : filteredSupplierProducts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-3 min-h-[120px] sm:min-h-0">
                    <Package className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                      {supplierProducts.length === 0
                        ? "Aucun produit lié"
                        : selectedProducts.length === supplierProducts.length
                        ? "Tous ajoutés"
                        : 'Aucun trouvé'}
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 max-h-[25vh] sm:max-h-none">
                    <div className="p-1.5 sm:p-2 space-y-1.5 sm:space-y-2">
                      {filteredSupplierProducts.map((sp) => {
                        return (
                          <div
                          key={sp.id}
                          className="p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 active:bg-accent transition-all cursor-pointer"
                          onClick={() => addProductToSelection(sp)}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {sp.product?.images?.[0] ? (
                                <img
                                  src={sp.product.images[0]}
                                  alt={sp.product?.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs sm:text-sm truncate">{sp.product?.name}</p>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">Stock: {sp.product?.stock_quantity || 0}</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Selected products with quantities */}
              <div className="flex flex-col min-h-0 border rounded-lg border-primary/30">
                <div className="p-2 sm:p-3 border-b bg-primary/5">
                  <Label className="text-xs sm:text-sm font-medium flex items-center justify-between">
                    <span className="text-primary">Sélectionnés</span>
                    <Badge className="bg-primary text-[10px] sm:text-xs">{selectedProducts.length} produit(s)</Badge>
                  </Label>
                </div>
                
                {selectedProducts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-3 min-h-[120px] sm:min-h-0">
                    <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                      Cliquez sur un produit pour l'ajouter
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 max-h-[25vh] sm:max-h-none">
                    <div className="p-1.5 sm:p-2 space-y-1.5 sm:space-y-2">
                      {selectedProducts.map((product) => {
                        const productTotal = calculateProductTotal(product);
                        
                        return (
                          <div
                            key={product.productId}
                            className="p-2 sm:p-3 rounded-lg border bg-card"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.productName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[11px] sm:text-xs truncate">{product.productName}</p>
                              </div>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5 sm:h-6 sm:w-6 text-destructive hover:text-destructive"
                                onClick={() => removeProductFromSelection(product.productId)}
                              >
                                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </Button>
                            </div>

                            {/* Prix d'achat */}
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 p-1.5 sm:p-2 rounded bg-muted/50">
                              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">Prix:</span>
                              <Input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                placeholder=""
                                value={product.unitCost === 0 ? '' : product.unitCost}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setProductUnitCost(
                                    product.productId,
                                    raw === '' ? 0 : Number.parseFloat(raw) || 0
                                  );
                                }}
                                className="w-16 sm:w-20 h-6 sm:h-7 text-center text-[10px] sm:text-xs"
                              />
                              <Select 
                                value={product.unitCostCurrency} 
                                onValueChange={(val) => setProductCurrency(product.productId, val)}
                              >
                                <SelectTrigger className="w-16 sm:w-20 h-6 sm:h-7 text-[10px] sm:text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CURRENCIES.map(c => (
                                    <SelectItem key={c.code} value={c.code} className="text-xs">
                                      {c.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Quantity controls */}
                            <div className="space-y-1.5 sm:space-y-2">
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-[10px] sm:text-xs text-muted-foreground w-10 sm:w-12">Unités:</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 sm:h-6 sm:w-6"
                                  onClick={() => updateProductQuantity(product.productId, -1)}
                                >
                                  <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  value={product.quantity}
                                  onChange={(e) => setProductQuantity(product.productId, parseInt(e.target.value) || 0)}
                                  className="w-10 sm:w-12 h-5 sm:h-6 text-center text-[10px] sm:text-xs"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 sm:h-6 sm:w-6"
                                  onClick={() => updateProductQuantity(product.productId, 1)}
                                >
                                  <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                </Button>
                              </div>

                              {product.sellByCarton && product.unitsPerCarton && (
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <span className="text-[10px] sm:text-xs text-muted-foreground w-10 sm:w-12 flex items-center gap-0.5 sm:gap-1">
                                    <Box className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    Ctn:
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-5 w-5 sm:h-6 sm:w-6"
                                    onClick={() => updateCartonQuantity(product.productId, -1)}
                                  >
                                    <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    value={product.cartonQuantity}
                                    onChange={(e) => setCartonQuantity(product.productId, parseInt(e.target.value) || 0)}
                                    className="w-10 sm:w-12 h-5 sm:h-6 text-center text-[10px] sm:text-xs"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-5 w-5 sm:h-6 sm:w-6"
                                    onClick={() => updateCartonQuantity(product.productId, 1)}
                                  >
                                    <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  </Button>
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                                    ({product.unitsPerCarton}u)
                                  </span>
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-1 border-t border-dashed text-[10px] sm:text-xs">
                                <span className="text-muted-foreground">
                                  {calculateTotalUnits(product)} unités
                                </span>
                                <span className="font-semibold text-primary">
                                  {productTotal.toLocaleString()} GNF
                                </span>
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

            {/* Total */}
            {selectedProducts.length > 0 && (
              <div className="p-2.5 sm:p-4 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-xs sm:text-base">Total estimé</span>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                      {selectedProducts.length} produit(s) • {totalItems} unités
                    </p>
                  </div>
                  <span className="text-base sm:text-xl font-bold text-primary flex-shrink-0">
                    {totalAmount.toLocaleString()} GNF
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="p-3 sm:p-4 border-t flex-shrink-0 gap-2 sm:gap-0">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isCreating} size="sm" className="text-xs sm:text-sm h-9 sm:h-10">
                Annuler
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!selectedSupplier}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-none"
              >
                Suivant
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handlePreviousStep} disabled={isCreating} className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10">
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Retour
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedProducts.some(p => p.quantity > 0 || p.cartonQuantity > 0) || isCreating}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10 flex-1 sm:flex-none"
              >
                {isCreating ? (
                  'Création...'
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="truncate">Créer ({totalAmount.toLocaleString()} GNF)</span>
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
