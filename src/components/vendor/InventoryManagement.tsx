// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Package, AlertTriangle, TrendingDown, Warehouse, Search, Filter, Plus, Edit, History, TrendingUp, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";
import { useInventoryService } from "@/hooks/useInventoryService";
import InventoryAlerts from "./InventoryAlerts";
import InventoryHistory from "./InventoryHistory";

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  minimum_stock: number;
  warehouse_location?: string;
  lot_number?: string;
  expiry_date?: string;
  product: {
    name: string;
    price: number;
    sku?: string;
  };
}

interface Warehouse {
  id: string;
  name: string;
  address?: string;
  is_active: boolean;
}

export default function InventoryManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    inventory,
    alerts,
    history,
    stats,
    loading,
    updateStock,
    markAlertAsRead,
    resolveAlert,
    refresh
  } = useInventoryService();
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => {
    if (!user) return;
    fetchWarehouses();
  }, [user]);

  const fetchWarehouses = async () => {
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      const { data: warehousesData, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('vendor_id', vendor.id);

      if (error) throw error;
      setWarehouses(warehousesData || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm || 
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lot_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = stockFilter === 'all' || 
      (stockFilter === 'low' && item.quantity <= item.minimum_stock) ||
      (stockFilter === 'out' && item.quantity === 0);

    return matchesSearch && matchesFilter;
  });

  const lowStockItems = inventory.filter(item => item.quantity <= item.minimum_stock && item.quantity > 0);
  const outOfStockItems = inventory.filter(item => item.quantity === 0);
  const totalProducts = stats?.total_products || inventory.length;
  const totalValue = stats?.total_value || inventory.reduce((acc, item) => acc + (item.quantity * (item.product?.price || 0)), 0);
  const totalCost = stats?.total_cost || 0;
  const potentialProfit = stats?.potential_profit || 0;


  const [addOpen, setAddOpen] = useState(false);
  const [addQty, setAddQty] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  if (loading) return <div className="p-4">Chargement de l'inventaire...</div>;

  const addStock = async () => {
    if (!selectedItem) return;
    const qty = parseInt(addQty || '0', 10);
    if (qty <= 0) {
      toast({ title: 'Quantité invalide', variant: 'destructive' });
      return;
    }
    try {
      const newQty = selectedItem.quantity + qty;
      await updateStock(selectedItem.id, newQty);
      setAddOpen(false);
      setAddQty('');
    } catch (e: any) {
      toast({ title: 'Erreur ajout stock', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">📦 Gestion Intelligente des Stocks</h2>
          <p className="text-muted-foreground">Inventaire connecté et synchronisé en temps réel</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!selectedItem}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter du stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Produit: <span className="font-medium">{selectedItem?.product.name}</span>
                </div>
                <Input type="number" placeholder="Quantité" value={addQty} onChange={(e) => setAddQty(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
                  <Button onClick={addStock}>Ajouter</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline">
            <Warehouse className="w-4 h-4 mr-2" />
            Entrepôts
          </Button>
        </div>
      </div>

      {/* Statistiques améliorées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Stock faible</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Rupture</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valeur stock</p>
                <p className="text-xl font-bold">{totalValue.toLocaleString()} GNF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Profit potentiel</p>
                <p className="text-xl font-bold">{potentialProfit.toLocaleString()} GNF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs pour organiser le contenu */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertes ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filtres */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un produit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as "all" | "low" | "out")}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">Tous les produits</option>
                  <option value="low">Stock faible</option>
                  <option value="out">Rupture de stock</option>
                </select>
                <Filter className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Liste d'inventaire */}
          <Card>
        <CardHeader>
          <CardTitle>Inventaire détaillé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInventory.map((item) => {
              const availableStock = item.quantity - item.reserved_quantity;
              const stockPercentage = item.minimum_stock > 0 
                ? (item.quantity / item.minimum_stock) * 100 
                : 100;
              
              return (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg" onClick={() => setSelectedItem(item)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{item.product.name}</h4>
                      {item.product.sku && (
                        <Badge variant="outline">{item.product.sku}</Badge>
                      )}
                      {item.quantity === 0 && (
                        <Badge variant="destructive">Rupture</Badge>
                      )}
                      {item.quantity <= item.minimum_stock && item.quantity > 0 && (
                        <Badge className="bg-orange-100 text-orange-800">Stock faible</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Stock total</p>
                        <p className="font-medium">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Disponible</p>
                        <p className="font-medium">{availableStock}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Réservé</p>
                        <p className="font-medium">{item.reserved_quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Seuil minimum</p>
                        <p className="font-medium">{item.minimum_stock}</p>
                      </div>
                    </div>

                    {item.lot_number && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Lot: {item.lot_number}
                        {item.expiry_date && ` • Expire le: ${new Date(item.expiry_date).toLocaleDateString('fr-FR')}`}
                      </p>
                    )}

                    {item.warehouse_location && (
                      <p className="text-xs text-muted-foreground">
                        Emplacement: {item.warehouse_location}
                      </p>
                    )}

                    <div className="mt-2">
                      <Progress 
                        value={Math.min(stockPercentage, 100)} 
                        className={`h-2 ${stockPercentage <= 100 ? 'bg-red-100' : 'bg-green-100'}`}
                      />
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <p className="font-semibold text-lg">
                      {(item.quantity * item.product.price).toLocaleString()} GNF
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.product.price.toLocaleString()} GNF/unité
                    </p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    {item.quantity <= item.minimum_stock && (
                      <Button size="sm">
                        Réapprovisionner
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredInventory.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
              <p className="text-muted-foreground">
                {searchTerm || stockFilter !== 'all' 
                  ? 'Aucun produit ne correspond aux critères de recherche.' 
                  : 'Votre inventaire est vide. Commencez par ajouter des produits.'}
              </p>
            </div>
          )}
        </CardContent>
          </Card>

          {/* Entrepôts */}
      {warehouses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Entrepôts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse) => (
                <div key={warehouse.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{warehouse.name}</h4>
                    <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                      {warehouse.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  {warehouse.address && (
                    <p className="text-sm text-muted-foreground">{warehouse.address}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          <InventoryAlerts 
            alerts={alerts}
            onMarkAsRead={markAlertAsRead}
            onResolve={resolveAlert}
          />
        </TabsContent>

        <TabsContent value="history">
          <InventoryHistory history={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}