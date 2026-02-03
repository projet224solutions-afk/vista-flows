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
  Package, Users, Calendar, Search
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

interface CreditSale {
  id: string;
  customer_name: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: string;
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

  // Formulaires
  const [newCredit, setNewCredit] = useState({
    customer_name: '',
    total: '',
    due_date: '',
    notes: ''
  });

  const [newReturn, setNewReturn] = useState({
    order_id: '',
    return_reason: '',
    refund_amount: '',
    quantity_returned: '1',
    unit_price: ''
  });

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
        status: c.status
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
    if (!vendorId || !newCredit.customer_name || !newCredit.total || !newCredit.due_date) {
      toast({ title: 'Champs requis manquants', variant: 'destructive' });
      return;
    }

    try {
      const amount = parseFloat(newCredit.total);
      const orderNum = `CR-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase
        .from('vendor_credit_sales')
        .insert([{
          vendor_id: vendorId,
          customer_name: newCredit.customer_name,
          order_number: orderNum,
          total: amount,
          subtotal: amount,
          remaining_amount: amount,
          due_date: newCredit.due_date,
          notes: newCredit.notes,
          status: 'pending'
        }]);

      if (error) throw error;

      toast({ title: '✅ Vente à crédit créée' });
      setIsNewCreditOpen(false);
      setNewCredit({ customer_name: '', total: '', due_date: '', notes: '' });
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
      setNewReturn({ order_id: '', return_reason: '', refund_amount: '', quantity_returned: '1', unit_price: '' });
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

  // Filtrer les produits par recherche (le filtre catégorie est optionnel et ne masque plus)
  const filteredProducts = vendorProducts.filter(p => {
    // Filtre par texte de recherche uniquement
    return p.name.toLowerCase().includes(productSearchTerm.toLowerCase());
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle vente à crédit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nom du client *</label>
                    <Input
                      placeholder="Nom du client"
                      value={newCredit.customer_name}
                      onChange={(e) => setNewCredit({ ...newCredit, customer_name: e.target.value })}
                    />
                  </div>
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
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      placeholder="Notes optionnelles"
                      value={newCredit.notes}
                      onChange={(e) => setNewCredit({ ...newCredit, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsNewCreditOpen(false)}>Annuler</Button>
                    <Button onClick={createCreditSale}>Créer</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-3">
            {creditSales.map((sale) => (
              <Card key={sale.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <Users className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{sale.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Échéance: {new Date(sale.due_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{sale.remaining_amount.toLocaleString()} GNF</p>
                      <p className="text-xs text-muted-foreground">
                        sur {sale.total.toLocaleString()} GNF
                      </p>
                      <Badge variant={sale.status === 'paid' ? 'default' : 'secondary'}>
                        {sale.status === 'paid' ? 'Payé' : sale.status === 'partial' ? 'Partiel' : 'En attente'}
                      </Badge>
                    </div>
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enregistrer un retour</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsNewReturnOpen(false)}>Annuler</Button>
                    <Button onClick={createReturn}>Enregistrer</Button>
                  </div>
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
              <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Créer une promotion</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  <div>
                    <label className="text-sm font-medium">Nom de la promo *</label>
                    <Input
                      placeholder="Ex: Soldes d'été"
                      value={newPromo.name}
                      onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                    />
                  </div>
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
                  <div className="grid grid-cols-2 gap-4">
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
                  
                  {/* 1. SÉLECTION DE CATÉGORIES (EN PREMIER) */}
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <label className="text-sm font-medium flex items-center gap-2">
                      🏷️ Catégories concernées
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      {newPromo.selected_categories.length === 0 
                        ? 'Toutes les catégories (aucune sélection)' 
                        : `${newPromo.selected_categories.length} catégorie(s) sélectionnée(s) - Les produits ci-dessous seront filtrés`}
                    </p>
                    
                    <div className="h-32 border rounded-md p-2 bg-background overflow-y-auto">
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
                        ? ' Tous les produits (aucune sélection)' 
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
                    <div className="h-48 border rounded-md p-2 bg-background overflow-y-auto">
                      {vendorProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucun produit disponible dans votre boutique
                        </p>
                      ) : filteredProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {productSearchTerm 
                            ? `Aucun résultat pour "${productSearchTerm}"`
                            : 'Aucun produit disponible'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredProducts.map((product) => {
                            const isSelected = newPromo.selected_products.includes(product.id);
                            const categoryName = categories.find(c => c.id === product.category_id)?.name;
                            const isInSelectedCategory = newPromo.selected_categories.length > 0 && 
                              product.category_id && 
                              newPromo.selected_categories.includes(product.category_id);
                            
                            return (
                              <div
                                key={product.id}
                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors border ${
                                  isSelected
                                    ? 'bg-primary/10 border-primary'
                                    : isInSelectedCategory
                                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
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
