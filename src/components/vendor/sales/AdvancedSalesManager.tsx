/**
 * GESTIONNAIRE VENTES AVANCÉES
 * Ventes groupées, retours, à crédit, promotions
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentVendor } from '@/hooks/useCurrentVendor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, RotateCcw, CreditCard, Percent, Plus, 
  Package, Users, Calendar, Search, Banknote, CheckCircle
} from 'lucide-react';

// Type produit pour la sélection
interface Product {
  id: string;
  name: string;
  price: number;
  images?: string[];
  category_id?: string;
}

// Type catégorie
interface Category {
  id: string;
  name: string;
}

// ============= TYPES =============
interface GroupedSale {
  id: string;
  group_name: string;
  total: number;
  discount_value: number;
  status: string;
  created_at: string;
}

interface SaleReturn {
  id: string;
  order_id: string | null;
  return_reason: string;
  refund_amount: number;
  created_at: string;
}

interface CreditSaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  images?: string[];
}

interface CreditSale {
  id: string;
  customer_name: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: string;
  items?: CreditSaleItem[];
}

interface Promotion {
  id: string;
  name: string;
  discount_type: string;
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  applicable_products?: string[];
  applicable_categories?: string[];
}

export default function AdvancedSalesManager() {
  const { vendorId } = useCurrentVendor();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('credit');
  
  // États pour chaque section
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>([]);
  const [groupedSales, setGroupedSales] = useState<GroupedSale[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  // Dialogs
  const [isNewCreditOpen, setIsNewCreditOpen] = useState(false);
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false);
  const [isNewPromoOpen, setIsNewPromoOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState<CreditSale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Formulaires
  const [newCredit, setNewCredit] = useState({
    customer_name: '',
    total: '',
    due_date: '',
    notes: '',
    selected_category: ''
  });
  
  // Produits sélectionnés pour crédit (avec quantité)
  const [creditSelectedProducts, setCreditSelectedProducts] = useState<{id: string; name: string; price: number; quantity: number; images?: string[]}[]>([]);
  
  // Recherche produit pour crédits
  const [creditProductSearch, setCreditProductSearch] = useState('');

  const [newReturn, setNewReturn] = useState({
    order_id: '',
    return_reason: '',
    refund_amount: '',
    quantity_returned: '1',
    unit_price: '',
    selected_category: '',
    selected_product: ''
  });
  
  // Recherche produit pour retours
  const [returnProductSearch, setReturnProductSearch] = useState('');

  const [newPromo, setNewPromo] = useState({
    name: '',
    discount_type: 'percentage',
    discount_value: '',
    start_date: '',
    end_date: '',
    selected_products: [] as string[],
    selected_categories: [] as string[]
  });

  // État pour les produits et catégories
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Chargement des données
  const loadData = async () => {
    if (!vendorId) return;
    setLoading(true);
    
    try {
      // Ventes à crédit
      const { data: creditData } = await supabase
        .from('vendor_credit_sales')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      setCreditSales((creditData || []).map(c => ({
        id: c.id,
        customer_name: c.customer_name || 'Client',
        total: c.total,
        paid_amount: c.paid_amount || 0,
        remaining_amount: c.remaining_amount,
        due_date: c.due_date,
        status: c.status,
        items: (Array.isArray(c.items) ? c.items : []) as unknown as CreditSaleItem[]
      })));

      // Retours
      const { data: returnsData } = await supabase
        .from('sale_returns')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      setSaleReturns((returnsData || []).map(r => ({
        id: r.id,
        order_id: r.order_id,
        return_reason: r.return_reason,
        refund_amount: r.refund_amount,
        created_at: r.created_at
      })));

      // Ventes groupées
      const { data: groupedData } = await supabase
        .from('grouped_sales')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      setGroupedSales((groupedData || []).map(g => ({
        id: g.id,
        group_name: g.group_name || 'Groupe',
        total: g.total,
        discount_value: g.discount_value || 0,
        status: g.status,
        created_at: g.created_at
      })));

      // Promotions
      const { data: promoData } = await supabase
        .from('vendor_promotions')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
      
      setPromotions((promoData || []).map(p => ({
        id: p.id,
        name: p.name,
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        start_date: p.start_date,
        end_date: p.end_date,
        is_active: p.is_active,
        applicable_products: Array.isArray(p.applicable_products) 
          ? (p.applicable_products as unknown as string[])
          : [],
        applicable_categories: Array.isArray(p.applicable_categories)
          ? (p.applicable_categories as unknown as string[])
          : []
      })));

      // Produits du vendeur - chercher par vendor_id OU user_id pour compatibilité
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, images, category_id')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
        .order('name');
      
      console.log('[AdvancedSalesManager] Produits chargés:', productsData?.length || 0, 'pour vendorId:', vendorId);
      
      if (productsError) {
        console.error('[AdvancedSalesManager] Erreur chargement produits:', productsError);
      }
      
      setVendorProducts(productsData || []);

      // Catégories actives
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      setCategories(categoriesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [vendorId]);

  // Créer une vente à crédit
  const createCreditSale = async () => {
    if (!vendorId || !newCredit.customer_name || !newCredit.due_date) {
      toast({ title: 'Champs requis manquants', variant: 'destructive' });
      return;
    }
    
    if (creditSelectedProducts.length === 0) {
      toast({ title: 'Veuillez sélectionner au moins un produit', variant: 'destructive' });
      return;
    }

    try {
      // Calculer le total à partir des produits sélectionnés
      const calculatedTotal = creditSelectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const orderNum = `CR-${Date.now().toString(36).toUpperCase()}`;
      
      // Préparer les items pour sauvegarde
      const itemsToSave = creditSelectedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        images: p.images || []
      }));
      
      const { error } = await supabase
        .from('vendor_credit_sales')
        .insert([{
          vendor_id: vendorId,
          customer_name: newCredit.customer_name,
          order_number: orderNum,
          total: calculatedTotal,
          subtotal: calculatedTotal,
          remaining_amount: calculatedTotal,
          due_date: newCredit.due_date,
          notes: newCredit.notes,
          items: itemsToSave,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({ title: '✅ Vente à crédit créée' });
      setIsNewCreditOpen(false);
      setNewCredit({ customer_name: '', total: '', due_date: '', notes: '', selected_category: '' });
      setCreditSelectedProducts([]);
      loadData();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // Créer un retour
  const createReturn = async () => {
    if (!vendorId || !newReturn.return_reason || !newReturn.refund_amount || !newReturn.unit_price) {
      toast({ title: 'Champs requis manquants', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('sale_returns')
        .insert([{
          vendor_id: vendorId,
          order_id: newReturn.order_id || null,
          return_reason: newReturn.return_reason,
          refund_amount: parseFloat(newReturn.refund_amount),
          quantity_returned: parseInt(newReturn.quantity_returned) || 1,
          unit_price: parseFloat(newReturn.unit_price)
        }]);

      if (error) throw error;

      toast({ title: '✅ Retour enregistré' });
      setIsNewReturnOpen(false);
      setNewReturn({ order_id: '', return_reason: '', refund_amount: '', quantity_returned: '1', unit_price: '', selected_category: '', selected_product: '' });
      loadData();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // Créer une promotion
  const createPromo = async () => {
    if (!vendorId || !newPromo.name || !newPromo.discount_value) {
      toast({ title: 'Champs requis manquants', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('vendor_promotions')
        .insert([{
          vendor_id: vendorId,
          name: newPromo.name,
          discount_type: newPromo.discount_type,
          discount_value: parseFloat(newPromo.discount_value),
          start_date: newPromo.start_date || null,
          end_date: newPromo.end_date || null,
          applicable_products: newPromo.selected_products.length > 0 ? newPromo.selected_products : null,
          applicable_categories: newPromo.selected_categories.length > 0 ? newPromo.selected_categories : null,
          is_active: true
        }]);

      if (error) throw error;

      toast({ title: '✅ Promotion créée' });
      setIsNewPromoOpen(false);
      setNewPromo({ 
        name: '', 
        discount_type: 'percentage', 
        discount_value: '', 
        start_date: '', 
        end_date: '', 
        selected_products: [],
        selected_categories: []
      });
      setProductSearchTerm('');
      loadData();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // Encaisser un paiement sur une vente à crédit
  const collectCreditPayment = async () => {
    if (!selectedCreditForPayment || !paymentAmount) {
      toast({ title: 'Montant requis', variant: 'destructive' });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Montant invalide', variant: 'destructive' });
      return;
    }

    if (amount > selectedCreditForPayment.remaining_amount) {
      toast({ title: 'Le montant dépasse le reste à payer', variant: 'destructive' });
      return;
    }

    try {
      const newPaidAmount = selectedCreditForPayment.paid_amount + amount;
      const newRemainingAmount = selectedCreditForPayment.total - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

      const { error } = await supabase
        .from('vendor_credit_sales')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus
        })
        .eq('id', selectedCreditForPayment.id);

      if (error) throw error;

      toast({ 
        title: newStatus === 'paid' ? '✅ Crédit soldé !' : '✅ Paiement enregistré',
        description: `${amount.toLocaleString()} GNF encaissés`
      });
      setIsCollectPaymentOpen(false);
      setSelectedCreditForPayment(null);
      setPaymentAmount('');
      loadData();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  // Ouvrir le dialogue d'encaissement
  const openCollectPaymentDialog = (credit: CreditSale) => {
    setSelectedCreditForPayment(credit);
    setPaymentAmount(credit.remaining_amount.toString());
    setIsCollectPaymentOpen(true);
  };

  // Toggle sélection produit pour promo
  const toggleProductSelection = (productId: string) => {
    setNewPromo(prev => ({
      ...prev,
      selected_products: prev.selected_products.includes(productId)
        ? prev.selected_products.filter(id => id !== productId)
        : [...prev.selected_products, productId]
    }));
  };

  // Toggle sélection catégorie pour promo
  const toggleCategorySelection = (categoryId: string) => {
    setNewPromo(prev => ({
      ...prev,
      selected_categories: prev.selected_categories.includes(categoryId)
        ? prev.selected_categories.filter(id => id !== categoryId)
        : [...prev.selected_categories, categoryId]
    }));
  };

  // Filtrer les produits (catégories sélectionnées + recherche)
  // Règle demandée : si une catégorie est sélectionnée, n'afficher QUE les produits de cette/ces catégorie(s)
  const filteredProducts = vendorProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(productSearchTerm.toLowerCase());
    const matchesSelectedCategories =
      newPromo.selected_categories.length === 0 ||
      (Boolean(p.category_id) && newPromo.selected_categories.includes(p.category_id as string));

    return matchesSearch && matchesSelectedCategories;
  });
  
  // Produits dans les catégories sélectionnées (pour mise en évidence)
  const productsInSelectedCategories = newPromo.selected_categories.length > 0
    ? vendorProducts.filter(p => p.category_id && newPromo.selected_categories.includes(p.category_id))
    : [];

  // Stats
  const totalCredit = creditSales.reduce((sum, c) => sum + c.remaining_amount, 0);
  const totalReturns = saleReturns.reduce((sum, r) => sum + r.refund_amount, 0);
  const activePromos = promotions.filter(p => p.is_active).length;

  if (loading) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Ventes Avancées
          </h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos ventes à crédit, retours et promotions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Créances</p>
                <p className="text-lg font-bold text-orange-600">{totalCredit.toLocaleString()} GNF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Retours</p>
                <p className="text-lg font-bold text-destructive">{totalReturns.toLocaleString()} GNF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Ventes groupées</p>
                <p className="text-lg font-bold">{groupedSales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Promos actives</p>
                <p className="text-lg font-bold text-green-600">{activePromos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="credit" className="text-xs sm:text-sm">
            <CreditCard className="w-4 h-4 mr-1 hidden sm:inline" />
            Crédit
          </TabsTrigger>
          <TabsTrigger value="returns" className="text-xs sm:text-sm">
            <RotateCcw className="w-4 h-4 mr-1 hidden sm:inline" />
            Retours
          </TabsTrigger>
          <TabsTrigger value="grouped" className="text-xs sm:text-sm">
            <Package className="w-4 h-4 mr-1 hidden sm:inline" />
            Groupées
          </TabsTrigger>
          <TabsTrigger value="promos" className="text-xs sm:text-sm">
            <Percent className="w-4 h-4 mr-1 hidden sm:inline" />
            Promos
          </TabsTrigger>
        </TabsList>

        {/* VENTES À CRÉDIT */}
        <TabsContent value="credit" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Ventes à crédit</h3>
            <Dialog open={isNewCreditOpen} onOpenChange={setIsNewCreditOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nouvelle
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Nouvelle vente à crédit</DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                  <div className="pb-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      {/* COL 1 — Client & Détails */}
                      <div className="space-y-4 lg:col-span-1">
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-2">Informations client</p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium">Nom du client *</label>
                              <Input
                                placeholder="Nom du client"
                                value={newCredit.customer_name}
                                onChange={(e) => setNewCredit({ ...newCredit, customer_name: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Notes</label>
                              <Input
                                placeholder="Notes optionnelles"
                                value={newCredit.notes}
                                onChange={(e) => setNewCredit({ ...newCredit, notes: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-2">Détails du crédit</p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium">Montant (GNF) *</label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={newCredit.total}
                                onChange={(e) => setNewCredit({ ...newCredit, total: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Date d'échéance *</label>
                              <Input
                                type="date"
                                value={newCredit.due_date}
                                onChange={(e) => setNewCredit({ ...newCredit, due_date: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* COL 2-3 — Sélection Catégorie & Produit */}
                      <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
                        {/* Catégories */}
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-2">Catégorie (optionnel)</p>
                          <ScrollArea className="h-56">
                            <div className="space-y-1">
                              {categories.map((cat) => (
                                <div
                                  key={cat.id}
                                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                                    newCredit.selected_category === cat.id ? 'bg-primary/10 border border-primary' : ''
                                  }`}
                                  onClick={() => {
                                    setNewCredit({ 
                                      ...newCredit, 
                                      selected_category: newCredit.selected_category === cat.id ? '' : cat.id
                                    });
                                  }}
                                >
                                  <Checkbox
                                    checked={newCredit.selected_category === cat.id}
                                    onCheckedChange={() => {
                                      setNewCredit({ 
                                        ...newCredit, 
                                        selected_category: newCredit.selected_category === cat.id ? '' : cat.id
                                      });
                                    }}
                                  />
                                  <span className="text-sm">{cat.name}</span>
                                </div>
                              ))}
                              {categories.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">Aucune catégorie</p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>

                        {/* Produits sélectionnés */}
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">Produits sélectionnés *</p>
                            {creditSelectedProducts.length > 0 && (
                              <Badge variant="secondary">{creditSelectedProducts.length} produit(s)</Badge>
                            )}
                          </div>
                          
                          {/* Liste des produits sélectionnés */}
                          {creditSelectedProducts.length > 0 && (
                            <div className="space-y-2 mb-3 p-2 bg-primary/5 rounded-lg border border-primary/20">
                              {creditSelectedProducts.map((sp) => (
                                <div key={sp.id} className="flex items-center gap-2">
                                  {sp.images && sp.images[0] ? (
                                    <img src={sp.images[0]} alt={sp.name} className="w-8 h-8 rounded object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                      <Package className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{sp.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{sp.price.toLocaleString()} GNF</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setCreditSelectedProducts(prev => 
                                          prev.map(p => p.id === sp.id ? {...p, quantity: Math.max(1, p.quantity - 1)} : p)
                                        );
                                      }}
                                    >
                                      -
                                    </Button>
                                    <span className="text-xs font-mono w-6 text-center">{sp.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setCreditSelectedProducts(prev => 
                                          prev.map(p => p.id === sp.id ? {...p, quantity: p.quantity + 1} : p)
                                        );
                                      }}
                                    >
                                      +
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => {
                                        setCreditSelectedProducts(prev => prev.filter(p => p.id !== sp.id));
                                      }}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <div className="pt-2 border-t">
                                <p className="text-sm font-bold text-primary">
                                  Total: {creditSelectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0).toLocaleString()} GNF
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="relative mb-2">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher un produit..."
                              value={creditProductSearch}
                              onChange={(e) => setCreditProductSearch(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          <ScrollArea className="h-48">
                            <div className="space-y-1">
                              {vendorProducts
                                .filter(p => {
                                  const matchesSearch = p.name.toLowerCase().includes(creditProductSearch.toLowerCase());
                                  const matchesCategory = !newCredit.selected_category || p.category_id === newCredit.selected_category;
                                  return matchesSearch && matchesCategory;
                                })
                                .map((product) => {
                                  const isSelected = creditSelectedProducts.some(sp => sp.id === product.id);
                                  return (
                                    <div
                                      key={product.id}
                                      className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                                        isSelected ? 'bg-primary/10 border border-primary' : ''
                                      }`}
                                      onClick={() => {
                                        if (isSelected) {
                                          setCreditSelectedProducts(prev => prev.filter(p => p.id !== product.id));
                                        } else {
                                          setCreditSelectedProducts(prev => [...prev, {
                                            id: product.id,
                                            name: product.name,
                                            price: product.price,
                                            quantity: 1,
                                            images: product.images
                                          }]);
                                        }
                                      }}
                                    >
                                      <Checkbox checked={isSelected} />
                                      {product.images && product.images[0] ? (
                                        <img 
                                          src={product.images[0]} 
                                          alt={product.name}
                                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                          <Package className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm block truncate">{product.name}</span>
                                        <span className="text-xs text-muted-foreground">{product.price.toLocaleString()} GNF</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              {vendorProducts.filter(p => {
                                const matchesSearch = p.name.toLowerCase().includes(creditProductSearch.toLowerCase());
                                const matchesCategory = !newCredit.selected_category || p.category_id === newCredit.selected_category;
                                return matchesSearch && matchesCategory;
                              }).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">Aucun produit trouvé</p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex gap-2 justify-end pt-4 flex-shrink-0 border-t">
                  <Button variant="outline" onClick={() => setIsNewCreditOpen(false)}>Annuler</Button>
                  <Button onClick={createCreditSale}>Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-3">
            {creditSales.map((sale) => (
              <Card key={sale.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* En-tête: Client + Montants + Actions */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                          <Users className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{sale.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Échéance: {new Date(sale.due_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-orange-600">{sale.remaining_amount.toLocaleString()} GNF</p>
                        <p className="text-xs text-muted-foreground">
                          sur {sale.total.toLocaleString()} GNF
                        </p>
                        <Badge variant={sale.status === 'paid' ? 'default' : 'secondary'}>
                          {sale.status === 'paid' ? 'Payé' : sale.status === 'partial' ? 'Partiel' : 'En attente'}
                        </Badge>
                      </div>
                      {sale.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          onClick={() => openCollectPaymentDialog(sale)}
                          className="flex-shrink-0"
                        >
                          <Banknote className="w-4 h-4 mr-1" />
                          Encaisser
                        </Button>
                      )}
                      {sale.status === 'paid' && (
                        <div className="flex-shrink-0 p-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                    </div>
                    
                    {/* Liste des produits vendus à crédit */}
                    {sale.items && sale.items.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Produits vendus:</p>
                        <div className="flex flex-wrap gap-2">
                          {sale.items.map((item, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-2 bg-muted/50 rounded-lg p-2"
                            >
                              {item.images && item.images[0] ? (
                                <img 
                                  src={item.images[0]} 
                                  alt={item.name}
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate max-w-[120px]">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {item.quantity}x {item.price.toLocaleString()} GNF
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {creditSales.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucune vente à crédit</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Dialog d'encaissement */}
          <Dialog open={isCollectPaymentOpen} onOpenChange={setIsCollectPaymentOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  Encaisser un paiement
                </DialogTitle>
              </DialogHeader>
              
              {selectedCreditForPayment && (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="font-semibold text-lg">{selectedCreditForPayment.customer_name}</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total crédit:</span>
                        <p className="font-medium">{selectedCreditForPayment.total.toLocaleString()} GNF</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Déjà payé:</span>
                        <p className="font-medium text-green-600">{selectedCreditForPayment.paid_amount.toLocaleString()} GNF</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Reste à payer:</span>
                        <p className="font-bold text-orange-600 text-lg">{selectedCreditForPayment.remaining_amount.toLocaleString()} GNF</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Montant à encaisser (GNF) *</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPaymentAmount(selectedCreditForPayment.remaining_amount.toString())}
                      >
                        Tout solder
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPaymentAmount(Math.round(selectedCreditForPayment.remaining_amount / 2).toString())}
                      >
                        Moitié
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsCollectPaymentOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={collectCreditPayment}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirmer l'encaissement
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* RETOURS */}
        <TabsContent value="returns" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Retours et remboursements</h3>
            <Dialog open={isNewReturnOpen} onOpenChange={setIsNewReturnOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nouveau retour
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Enregistrer un retour</DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4">
                  <div className="pb-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                      {/* COL 1 — Contexte & Raison */}
                      <div className="space-y-4 lg:col-span-1">
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-2">Contexte</p>
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium">N° Commande (optionnel)</label>
                              <Input
                                placeholder="ORD-XXXXX"
                                value={newReturn.order_id}
                                onChange={(e) => setNewReturn({ ...newReturn, order_id: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Raison du retour *</label>
                              <Input
                                placeholder="Produit défectueux, mauvaise taille..."
                                value={newReturn.return_reason}
                                onChange={(e) => setNewReturn({ ...newReturn, return_reason: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-2">Montants</p>
                          <div className="space-y-3">
                            <div className="grid gap-3 grid-cols-2">
                              <div>
                                <label className="text-sm font-medium">Quantité *</label>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  value={newReturn.quantity_returned}
                                  onChange={(e) => setNewReturn({ ...newReturn, quantity_returned: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Prix unitaire *</label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={newReturn.unit_price}
                                  onChange={(e) => setNewReturn({ ...newReturn, unit_price: e.target.value })}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Montant remboursement (GNF) *</label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={newReturn.refund_amount}
                                onChange={(e) => setNewReturn({ ...newReturn, refund_amount: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* COL 2-3 — Sélection Catégorie & Produit */}
                      <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
                        {/* Catégories */}
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-2">Catégorie (optionnel)</p>
                          <ScrollArea className="h-56">
                            <div className="space-y-1">
                              {categories.map((cat) => (
                                <div
                                  key={cat.id}
                                  className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                                    newReturn.selected_category === cat.id ? 'bg-primary/10 border border-primary' : ''
                                  }`}
                                  onClick={() => {
                                    setNewReturn({ 
                                      ...newReturn, 
                                      selected_category: newReturn.selected_category === cat.id ? '' : cat.id,
                                      selected_product: '' // Reset product when category changes
                                    });
                                  }}
                                >
                                  <Checkbox
                                    checked={newReturn.selected_category === cat.id}
                                    onCheckedChange={() => {
                                      setNewReturn({ 
                                        ...newReturn, 
                                        selected_category: newReturn.selected_category === cat.id ? '' : cat.id,
                                        selected_product: ''
                                      });
                                    }}
                                  />
                                  <span className="text-sm">{cat.name}</span>
                                </div>
                              ))}
                              {categories.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">Aucune catégorie</p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>

                        {/* Produits */}
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-2">Produit concerné *</p>
                          <div className="relative mb-2">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher..."
                              value={returnProductSearch}
                              onChange={(e) => setReturnProductSearch(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          <ScrollArea className="h-48">
                            <div className="space-y-1">
                              {vendorProducts
                                .filter(p => {
                                  const matchesSearch = p.name.toLowerCase().includes(returnProductSearch.toLowerCase());
                                  const matchesCategory = !newReturn.selected_category || p.category_id === newReturn.selected_category;
                                  return matchesSearch && matchesCategory;
                                })
                                .map((product) => (
                                  <div
                                    key={product.id}
                                    className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted/50 ${
                                      newReturn.selected_product === product.id ? 'bg-primary/10 border border-primary' : ''
                                    }`}
                                    onClick={() => {
                                      setNewReturn({ 
                                        ...newReturn, 
                                        selected_product: newReturn.selected_product === product.id ? '' : product.id,
                                        unit_price: product.price.toString()
                                      });
                                    }}
                                  >
                                    <Checkbox
                                      checked={newReturn.selected_product === product.id}
                                      onCheckedChange={() => {
                                        setNewReturn({ 
                                          ...newReturn, 
                                          selected_product: newReturn.selected_product === product.id ? '' : product.id,
                                          unit_price: product.price.toString()
                                        });
                                      }}
                                    />
                                    {product.images && product.images[0] ? (
                                      <img 
                                        src={product.images[0]} 
                                        alt={product.name}
                                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                        <Package className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm block truncate">{product.name}</span>
                                      <span className="text-xs text-muted-foreground">{product.price.toLocaleString()} GNF</span>
                                    </div>
                                  </div>
                                ))}
                              {vendorProducts.filter(p => {
                                const matchesSearch = p.name.toLowerCase().includes(returnProductSearch.toLowerCase());
                                const matchesCategory = !newReturn.selected_category || p.category_id === newReturn.selected_category;
                                return matchesSearch && matchesCategory;
                              }).length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">Aucun produit trouvé</p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex gap-2 justify-end pt-4 flex-shrink-0 border-t">
                  <Button variant="outline" onClick={() => setIsNewReturnOpen(false)}>Annuler</Button>
                  <Button onClick={createReturn}>Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-3">
            {saleReturns.map((ret) => (
              <Card key={ret.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <RotateCcw className="w-4 h-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-semibold">{ret.order_id ? `Commande ${ret.order_id}` : 'Retour direct'}</p>
                        <p className="text-sm text-muted-foreground">{ret.return_reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">-{ret.refund_amount.toLocaleString()} GNF</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ret.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {saleReturns.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <RotateCcw className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucun retour enregistré</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* VENTES GROUPÉES */}
        <TabsContent value="grouped" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Ventes groupées</h3>
          </div>
          
          <div className="space-y-3">
            {groupedSales.map((gs) => (
              <Card key={gs.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{gs.group_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(gs.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{gs.total.toLocaleString()} GNF</p>
                      {gs.discount_value > 0 && (
                        <p className="text-xs text-green-600">-{gs.discount_value}% remise</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {groupedSales.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucune vente groupée</p>
                  <p className="text-xs text-muted-foreground mt-1">Les ventes groupées sont créées depuis le POS</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* PROMOTIONS */}
        <TabsContent value="promos" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Promotions</h3>
            <Dialog open={isNewPromoOpen} onOpenChange={setIsNewPromoOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nouvelle promo
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Créer une promotion</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4">
                <div className="pb-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    {/* COL 1 — Infos promotion */}
                    <div className="space-y-4 lg:col-span-1">
                      <div>
                        <label className="text-sm font-medium">Nom de la promo *</label>
                        <Input
                          placeholder="Ex: Soldes d'été"
                          value={newPromo.name}
                          onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Type de remise</label>
                          <select
                            className="w-full px-3 py-2 border rounded-md bg-background"
                            value={newPromo.discount_type}
                            onChange={(e) => setNewPromo({ ...newPromo, discount_type: e.target.value })}
                          >
                            <option value="percentage">Pourcentage (%)</option>
                            <option value="fixed">Montant fixe (GNF)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Valeur {newPromo.discount_type === 'percentage' ? '(%)' : '(GNF)'} *
                          </label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={newPromo.discount_value}
                            onChange={(e) => setNewPromo({ ...newPromo, discount_value: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium">Date début</label>
                          <Input
                            type="date"
                            value={newPromo.start_date}
                            onChange={(e) => setNewPromo({ ...newPromo, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Date fin</label>
                          <Input
                            type="date"
                            value={newPromo.end_date}
                            onChange={(e) => setNewPromo({ ...newPromo, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* COL 2–3 — Sélection (catégories + produits) */}
                    <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
                      {/* 1. SÉLECTION DE CATÉGORIES */}
                      <div className="bg-muted/30 p-3 rounded-lg border">
                        <label className="text-sm font-medium flex items-center gap-2">
                          🏷️ Catégories concernées
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          {newPromo.selected_categories.length === 0
                            ? 'Toutes les catégories (aucune sélection)'
                            : `${newPromo.selected_categories.length} catégorie(s) sélectionnée(s) - Les produits ci-dessous seront filtrés`}
                        </p>

                        <div className="h-56 border rounded-md p-2 bg-background overflow-y-auto">
                          {categories.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Aucune catégorie disponible
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {categories.map((category) => (
                                <div
                                  key={category.id}
                                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                    newPromo.selected_categories.includes(category.id)
                                      ? 'bg-primary/10 border border-primary'
                                      : 'hover:bg-muted'
                                  }`}
                                  onClick={() => toggleCategorySelection(category.id)}
                                >
                                  <Checkbox
                                    checked={newPromo.selected_categories.includes(category.id)}
                                    onCheckedChange={() => toggleCategorySelection(category.id)}
                                  />
                                  <Package className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{category.name}</span>
                                  <Badge variant="outline" className="ml-auto text-xs">
                                    {vendorProducts.filter(p => p.category_id === category.id).length} produit(s)
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {newPromo.selected_categories.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setNewPromo({ ...newPromo, selected_categories: [], selected_products: [] });
                            }}
                          >
                            Tout désélectionner
                          </Button>
                        )}
                      </div>

                      {/* 2. SÉLECTION DE PRODUITS */}
                      <div>
                        <label className="text-sm font-medium flex items-center gap-2">
                          📦 Produits à promouvoir
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                          {newPromo.selected_categories.length > 0 && productsInSelectedCategories.length > 0 && (
                            <span className="text-primary font-medium">
                              {productsInSelectedCategories.length} produit(s) dans les catégories sélectionnées •
                            </span>
                          )}
                          {newPromo.selected_products.length === 0
                            ? (newPromo.selected_categories.length > 0
                                ? ' Produits de la/les catégorie(s) sélectionnée(s) (aucune sélection)'
                                : ' Tous les produits (aucune sélection)')
                            : ` ${newPromo.selected_products.length} produit(s) sélectionné(s)`}
                        </p>

                        {/* Recherche */}
                        <div className="relative mb-2">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Rechercher un produit..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="pl-8"
                          />
                        </div>

                        {/* Liste des produits */}
                        <div className="h-56 border rounded-md p-2 bg-background overflow-y-auto">
                          {vendorProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Aucun produit disponible dans votre boutique
                            </p>
                          ) : filteredProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {productSearchTerm
                                ? `Aucun résultat pour "${productSearchTerm}"`
                                : newPromo.selected_categories.length > 0
                                  ? 'Aucun produit dans la/les catégorie(s) sélectionnée(s)'
                                  : 'Aucun produit disponible'}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {filteredProducts.map((product) => {
                                const isSelected = newPromo.selected_products.includes(product.id);
                                const categoryName = categories.find(c => c.id === product.category_id)?.name;
                                const isInSelectedCategory =
                                  newPromo.selected_categories.length > 0 &&
                                  Boolean(product.category_id) &&
                                  newPromo.selected_categories.includes(product.category_id as string);

                                return (
                                  <div
                                    key={product.id}
                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors border ${
                                      isSelected
                                        ? 'bg-primary/10 border-primary'
                                        : isInSelectedCategory
                                          ? 'bg-accent/40 border-accent'
                                          : 'border-transparent hover:bg-muted'
                                    }`}
                                    onClick={() => toggleProductSelection(product.id)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleProductSelection(product.id)}
                                    />
                                    {product.images?.[0] && (
                                      <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-10 h-10 object-cover rounded"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{product.name}</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">
                                          {product.price.toLocaleString()} GNF
                                        </p>
                                        {categoryName && (
                                          <Badge variant="secondary" className="text-xs">
                                            {categoryName}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Badge variant="default" className="text-xs">✓</Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {newPromo.selected_products.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => setNewPromo({ ...newPromo, selected_products: [] })}
                          >
                            Tout désélectionner les produits
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </ScrollArea>
                <div className="flex gap-2 justify-end pt-4 flex-shrink-0 border-t">
                  <Button variant="outline" onClick={() => setIsNewPromoOpen(false)}>Annuler</Button>
                  <Button onClick={createPromo}>Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-3">
            {promotions.map((promo) => {
              // Récupérer les noms des produits liés
              const linkedProducts = promo.applicable_products && promo.applicable_products.length > 0
                ? vendorProducts.filter(p => promo.applicable_products?.includes(p.id))
                : [];
              
              // Récupérer les noms des catégories liées
              const linkedCategories = promo.applicable_categories && promo.applicable_categories.length > 0
                ? categories.filter(c => promo.applicable_categories?.includes(c.id))
                : [];
              
              return (
                <Card key={promo.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${promo.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                          <Percent className={`w-4 h-4 ${promo.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-semibold">{promo.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {promo.start_date && promo.end_date 
                              ? `${new Date(promo.start_date).toLocaleDateString('fr-FR')} - ${new Date(promo.end_date).toLocaleDateString('fr-FR')}`
                              : 'Sans limite de temps'
                            }
                          </p>
                          {/* Afficher les produits liés */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {linkedProducts.length > 0 ? (
                              <>
                                {linkedProducts.slice(0, 2).map(p => (
                                  <Badge key={p.id} variant="outline" className="text-xs">
                                    📦 {p.name}
                                  </Badge>
                                ))}
                                {linkedProducts.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{linkedProducts.length - 2} produits
                                  </Badge>
                                )}
                              </>
                            ) : null}
                            
                            {/* Afficher les catégories liées */}
                            {linkedCategories.length > 0 ? (
                              <>
                                {linkedCategories.slice(0, 2).map(c => (
                                  <Badge key={c.id} variant="secondary" className="text-xs">
                                    🏷️ {c.name}
                                  </Badge>
                                ))}
                                {linkedCategories.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{linkedCategories.length - 2} catégories
                                  </Badge>
                                )}
                              </>
                            ) : null}
                            
                            {linkedProducts.length === 0 && linkedCategories.length === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Tous les produits
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          -{promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' GNF'}
                        </p>
                        <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {promotions.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Percent className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucune promotion</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
