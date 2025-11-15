// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Package, ArrowRightLeft, Plus, Minus, Users, Lock, Unlock, Eye, Edit2, Trash2, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Warehouse {
  id: string;
  name: string;
  city?: string;
  country?: string;
}

interface WarehouseStock {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  minimum_stock: number;
  product?: {
    name: string;
    sku?: string;
    price: number;
  };
}

interface Permission {
  id: string;
  warehouse_id: string;
  user_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage_stock: boolean;
  can_transfer: boolean;
  user?: {
    email: string;
  };
}

interface StockMovement {
  id: string;
  product_id: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  quantity: number;
  movement_type: string;
  notes?: string;
  created_at: string;
  product?: {
    name: string;
  };
  from_warehouse?: {
    name: string;
  };
  to_warehouse?: {
    name: string;
  };
}

export default function WarehouseStockManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: 0,
    notes: ''
  });

  // Permission dialog
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({
    user_email: '',
    can_view: true,
    can_edit: false,
    can_manage_stock: false,
    can_transfer: false
  });

  // Adjustment dialog
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    product_id: '',
    warehouse_id: '',
    quantity_change: 0,
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchWarehouses();
      fetchProducts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedWarehouse) {
      fetchStocks();
      fetchMovements();
      fetchPermissions();
    }
  }, [selectedWarehouse]);

  // Écouter les événements de mise à jour des entrepôts
  useEffect(() => {
    const handleWarehouseUpdate = () => {
      fetchWarehouses();
      if (selectedWarehouse) {
        fetchStocks();
        fetchMovements();
      }
    };

    window.addEventListener('warehouseUpdated', handleWarehouseUpdate);
    return () => window.removeEventListener('warehouseUpdated', handleWarehouseUpdate);
  }, [selectedWarehouse]);

  const fetchWarehouses = async () => {
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('is_active', true);

      if (error) throw error;
      setWarehouses(data || []);
      if (data && data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, price')
        .eq('vendor_id', vendor.id)
        .eq('is_active', true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_stocks')
        .select('*')
        .eq('warehouse_id', selectedWarehouse);

      if (error) throw error;

      // Récupérer les informations des produits séparément
      if (data && data.length > 0) {
        const productIds = data.map(s => s.product_id);
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, sku, price')
          .in('id', productIds);

        const stocksWithProducts = data.map(stock => ({
          ...stock,
          product: productsData?.find(p => p.id === stock.product_id)
        }));

        setStocks(stocksWithProducts);
      } else {
        setStocks([]);
      }
    } catch (error: any) {
      console.error('Error fetching stocks:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .or(`from_warehouse_id.eq.${selectedWarehouse},to_warehouse_id.eq.${selectedWarehouse}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Récupérer les informations des produits et entrepôts séparément
      if (data && data.length > 0) {
        const productIds = [...new Set(data.map(m => m.product_id))];
        const warehouseIds = [...new Set([
          ...data.map(m => m.from_warehouse_id).filter(Boolean),
          ...data.map(m => m.to_warehouse_id).filter(Boolean)
        ])];

        const [productsData, warehousesData] = await Promise.all([
          supabase.from('products').select('id, name').in('id', productIds),
          supabase.from('warehouses').select('id, name').in('id', warehouseIds)
        ]);

        const movementsWithDetails = data.map(movement => ({
          ...movement,
          product: productsData.data?.find(p => p.id === movement.product_id),
          from_warehouse: warehousesData.data?.find(w => w.id === movement.from_warehouse_id),
          to_warehouse: warehousesData.data?.find(w => w.id === movement.to_warehouse_id)
        }));

        setMovements(movementsWithDetails);
      } else {
        setMovements([]);
      }
    } catch (error: any) {
      console.error('Error fetching movements:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_permissions')
        .select('*')
        .eq('warehouse_id', selectedWarehouse);

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.product_id || !transferData.from_warehouse_id || !transferData.to_warehouse_id || transferData.quantity <= 0) {
      toast({ title: 'Erreur', description: 'Tous les champs sont requis', variant: 'destructive' });
      return;
    }

    try {
      // Create movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: transferData.product_id,
          from_warehouse_id: transferData.from_warehouse_id,
          to_warehouse_id: transferData.to_warehouse_id,
          quantity: transferData.quantity,
          movement_type: 'transfer',
          notes: transferData.notes,
          created_by: user?.id
        });

      if (movementError) throw movementError;

      // Update source warehouse stock
      const { data: fromStock } = await supabase
        .from('warehouse_stocks')
        .select('quantity')
        .eq('warehouse_id', transferData.from_warehouse_id)
        .eq('product_id', transferData.product_id)
        .single();

      if (fromStock) {
        await supabase
          .from('warehouse_stocks')
          .update({ quantity: Math.max(0, fromStock.quantity - transferData.quantity) })
          .eq('warehouse_id', transferData.from_warehouse_id)
          .eq('product_id', transferData.product_id);
      }

      // Update destination warehouse stock
      const { data: toStock } = await supabase
        .from('warehouse_stocks')
        .select('quantity')
        .eq('warehouse_id', transferData.to_warehouse_id)
        .eq('product_id', transferData.product_id)
        .single();

      if (toStock) {
        await supabase
          .from('warehouse_stocks')
          .update({ quantity: toStock.quantity + transferData.quantity })
          .eq('warehouse_id', transferData.to_warehouse_id)
          .eq('product_id', transferData.product_id);
      } else {
        await supabase
          .from('warehouse_stocks')
          .insert({
            warehouse_id: transferData.to_warehouse_id,
            product_id: transferData.product_id,
            quantity: transferData.quantity
          });
      }

      toast({ title: '✅ Transfert effectué avec succès' });
      setTransferOpen(false);
      setTransferData({ product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: 0, notes: '' });
      fetchStocks();
      fetchMovements();
      
      // Déclencher un événement pour synchroniser
      window.dispatchEvent(new CustomEvent('warehouseUpdated'));
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({ title: 'Erreur transfert', description: error.message, variant: 'destructive' });
    }
  };

  const handleAdjustment = async () => {
    if (!adjustmentData.product_id || !adjustmentData.warehouse_id || adjustmentData.quantity_change === 0) {
      toast({ title: 'Erreur', description: 'Tous les champs sont requis', variant: 'destructive' });
      return;
    }

    try {
      // Create movement
      await supabase
        .from('stock_movements')
        .insert({
          product_id: adjustmentData.product_id,
          [adjustmentData.quantity_change > 0 ? 'to_warehouse_id' : 'from_warehouse_id']: adjustmentData.warehouse_id,
          quantity: Math.abs(adjustmentData.quantity_change),
          movement_type: 'adjustment',
          notes: adjustmentData.notes,
          created_by: user?.id
        });

      // Update stock
      const { data: currentStock } = await supabase
        .from('warehouse_stocks')
        .select('quantity')
        .eq('warehouse_id', adjustmentData.warehouse_id)
        .eq('product_id', adjustmentData.product_id)
        .single();

      if (currentStock) {
        await supabase
          .from('warehouse_stocks')
          .update({ quantity: Math.max(0, currentStock.quantity + adjustmentData.quantity_change) })
          .eq('warehouse_id', adjustmentData.warehouse_id)
          .eq('product_id', adjustmentData.product_id);
      } else {
        await supabase
          .from('warehouse_stocks')
          .insert({
            warehouse_id: adjustmentData.warehouse_id,
            product_id: adjustmentData.product_id,
            quantity: Math.max(0, adjustmentData.quantity_change)
          });
      }

      toast({ title: '✅ Ajustement effectué' });
      setAdjustmentOpen(false);
      setAdjustmentData({ product_id: '', warehouse_id: '', quantity_change: 0, notes: '' });
      fetchStocks();
      fetchMovements();
      
      // Déclencher un événement pour synchroniser
      window.dispatchEvent(new CustomEvent('warehouseUpdated'));
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddPermission = async () => {
    if (!newPermission.user_email) {
      toast({ title: 'Erreur', description: 'Email requis', variant: 'destructive' });
      return;
    }

    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newPermission.user_email)
        .single();

      if (userError || !userData) {
        toast({ title: 'Utilisateur non trouvé', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('warehouse_permissions')
        .insert({
          warehouse_id: selectedWarehouse,
          user_id: userData.id,
          can_view: newPermission.can_view,
          can_edit: newPermission.can_edit,
          can_manage_stock: newPermission.can_manage_stock,
          can_transfer: newPermission.can_transfer
        });

      if (error) throw error;

      toast({ title: '✅ Permission ajoutée' });
      setPermissionOpen(false);
      setNewPermission({ user_email: '', can_view: true, can_edit: false, can_manage_stock: false, can_transfer: false });
      fetchPermissions();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('warehouse_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;
      toast({ title: '✅ Permission supprimée' });
      fetchPermissions();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-4">Chargement...</div>;

  const currentWarehouse = warehouses.find(w => w.id === selectedWarehouse);
  const totalStock = stocks.reduce((acc, s) => acc + s.quantity, 0);
  const totalValue = stocks.reduce((acc, s) => acc + (s.quantity * (s.product?.price || 0)), 0);
  const lowStockItems = stocks.filter(s => s.quantity <= s.minimum_stock);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">🏭 Gestion Stock Entrepôts</h2>
          <p className="text-muted-foreground">Stock centralisé par entrepôt avec permissions</p>
        </div>
        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Sélectionner un entrepôt" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name} {warehouse.city && `- ${warehouse.city}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground">unités</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valeur Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString()} GNF</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stocks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">stock faible</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stock">
            <Package className="w-4 h-4 mr-2" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="movements">
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Mouvements
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Users className="w-4 h-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => setAdjustmentOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajustement Stock
            </Button>
            <Button onClick={() => setTransferOpen(true)} variant="outline">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfert
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {stocks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun stock dans cet entrepôt</p>
                ) : (
                  stocks.map((stock) => (
                    <div key={stock.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{stock.product?.name}</h4>
                          {stock.product?.sku && (
                            <Badge variant="outline">{stock.product.sku}</Badge>
                          )}
                          {stock.quantity <= stock.minimum_stock && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Stock faible
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          <span>Stock: {stock.quantity}</span>
                          <span>Réservé: {stock.reserved_quantity}</span>
                          <span>Min: {stock.minimum_stock}</span>
                          {stock.product?.price && (
                            <span>Valeur: {(stock.quantity * stock.product.price).toLocaleString()} GNF</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des mouvements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun mouvement</p>
                ) : (
                  movements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            movement.movement_type === 'transfer' ? 'default' :
                            movement.movement_type === 'in' ? 'default' :
                            movement.movement_type === 'adjustment' ? 'secondary' : 'outline'
                          }>
                            {movement.movement_type}
                          </Badge>
                          <span className="font-medium">{movement.product?.name}</span>
                          <span className="text-muted-foreground">x{movement.quantity}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {movement.from_warehouse && <span>De: {movement.from_warehouse.name}</span>}
                          {movement.to_warehouse && <span className="ml-2">Vers: {movement.to_warehouse.name}</span>}
                          {movement.notes && <p className="mt-1 text-xs">{movement.notes}</p>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Button onClick={() => setPermissionOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Ajouter Permission
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs autorisés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {permissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune permission configurée</p>
                ) : (
                  permissions.map((perm) => (
                    <div key={perm.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{perm.user_id}</p>
                        <div className="flex gap-2 mt-2">
                          {perm.can_view && <Badge variant="secondary"><Eye className="w-3 h-3 mr-1" />Voir</Badge>}
                          {perm.can_edit && <Badge variant="secondary"><Edit2 className="w-3 h-3 mr-1" />Éditer</Badge>}
                          {perm.can_manage_stock && <Badge variant="secondary"><Package className="w-3 h-3 mr-1" />Gérer Stock</Badge>}
                          {perm.can_transfer && <Badge variant="secondary"><ArrowRightLeft className="w-3 h-3 mr-1" />Transférer</Badge>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeletePermission(perm.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transférer du stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={transferData.product_id} onValueChange={(v) => setTransferData({...transferData, product_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={transferData.from_warehouse_id} onValueChange={(v) => setTransferData({...transferData, from_warehouse_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Depuis entrepôt" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={transferData.to_warehouse_id} onValueChange={(v) => setTransferData({...transferData, to_warehouse_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Vers entrepôt" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Quantité"
              value={transferData.quantity || ''}
              onChange={(e) => setTransferData({...transferData, quantity: parseInt(e.target.value) || 0})}
            />
            <Input
              placeholder="Notes (optionnel)"
              value={transferData.notes}
              onChange={(e) => setTransferData({...transferData, notes: e.target.value})}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Annuler</Button>
              <Button onClick={handleTransfer}>Transférer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustement de stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={adjustmentData.warehouse_id} onValueChange={(v) => setAdjustmentData({...adjustmentData, warehouse_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Entrepôt" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={adjustmentData.product_id} onValueChange={(v) => setAdjustmentData({...adjustmentData, product_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Produit" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Changement de quantité (+ ou -)"
              value={adjustmentData.quantity_change || ''}
              onChange={(e) => setAdjustmentData({...adjustmentData, quantity_change: parseInt(e.target.value) || 0})}
            />
            <Input
              placeholder="Raison de l'ajustement"
              value={adjustmentData.notes}
              onChange={(e) => setAdjustmentData({...adjustmentData, notes: e.target.value})}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>Annuler</Button>
              <Button onClick={handleAdjustment}>Ajuster</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={permissionOpen} onOpenChange={setPermissionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une permission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Email de l'utilisateur"
              value={newPermission.user_email}
              onChange={(e) => setNewPermission({...newPermission, user_email: e.target.value})}
            />
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPermission.can_view}
                  onChange={(e) => setNewPermission({...newPermission, can_view: e.target.checked})}
                />
                <Eye className="w-4 h-4" />
                Peut voir le stock
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPermission.can_edit}
                  onChange={(e) => setNewPermission({...newPermission, can_edit: e.target.checked})}
                />
                <Edit2 className="w-4 h-4" />
                Peut éditer l'entrepôt
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPermission.can_manage_stock}
                  onChange={(e) => setNewPermission({...newPermission, can_manage_stock: e.target.checked})}
                />
                <Package className="w-4 h-4" />
                Peut gérer le stock
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPermission.can_transfer}
                  onChange={(e) => setNewPermission({...newPermission, can_transfer: e.target.checked})}
                />
                <ArrowRightLeft className="w-4 h-4" />
                Peut transférer
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPermissionOpen(false)}>Annuler</Button>
              <Button onClick={handleAddPermission}>Ajouter</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}