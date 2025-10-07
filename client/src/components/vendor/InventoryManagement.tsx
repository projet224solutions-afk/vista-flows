import { useState, useEffect } from 'react';
import { getErrorMessage, logError } from '@/lib/errors';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Package, AlertTriangle, TrendingDown, Warehouse, Search, Filter, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      // Fetch inventory with product details
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(
            name,
            price,
            sku
          )
        `)
        .eq('products.vendor_id', vendor.id);

      if (inventoryError) throw inventoryError;

      // Fetch warehouses
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('vendor_id', vendor.id);

      if (warehousesError) throw warehousesError;

      setInventory(inventoryData || []);
      setWarehouses(warehousesData || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données d'inventaire.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
  const totalProducts = inventory.length;
  const totalValue = inventory.reduce((acc, item) => acc + (item.quantity * item.product.price), 0);

  const updateStock = async (itemId: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));

      toast({
        title: "Stock mis à jour",
        description: "La quantité a été mise à jour avec succès."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le stock.",
        variant: "destructive"
      });
    }
  };

  if (loading) return <div className="p-4">Chargement de l'inventaire...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Stocks</h2>
          <p className="text-muted-foreground">Gérez votre inventaire et optimisez vos approvisionnements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter stock
          </Button>
          <Button variant="outline">
            <Warehouse className="w-4 h-4 mr-2" />
            Entrepôts
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-muted-foreground">Rupture de stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-600 rounded-full" />
              <div>
                <p className="text-sm text-muted-foreground">Valeur inventaire</p>
                <p className="text-2xl font-bold">{totalValue.toLocaleString()} GNF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes urgentes */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Alertes stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outOfStockItems.length > 0 && (
                <p className="text-red-600 font-medium">
                  ⚠️ {outOfStockItems.length} produit(s) en rupture de stock
                </p>
              )}
              {lowStockItems.length > 0 && (
                <p className="text-orange-600 font-medium">
                  📉 {lowStockItems.length} produit(s) avec un stock faible
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                      {(item.quantity * item.product.price).toLocaleString()} FCFA
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.product.price.toLocaleString()} FCFA/unité
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
    </div>
  );
}