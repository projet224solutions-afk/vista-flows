import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, Search, Filter, Eye, Package, Clock, 
  CheckCircle, XCircle, Truck, CreditCard, FileText,
  Calendar, User, MapPin, Download, MoreHorizontal, Shield, RefreshCw, Banknote
} from "lucide-react";

interface Address {
  street: string;
  city: string;
  postal_code?: string;
  country: string;
}

interface EscrowInfo {
  id: string;
  status: string;
  amount: number;
  created_at: string;
}

interface StandaloneEscrow {
  id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  commission_percent: number;
  commission_amount: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_address: any; // Json from Supabase
  billing_address?: any; // Json from Supabase
  notes?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  source?: 'online' | 'pos';
  customers?: {
    id: string;
    user_id: string;
    profiles?: {
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
  };
  order_items?: {
    id: string;
    product_id: string;
    variant_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    products: {
      name: string;
    };
  }[];
  escrow?: EscrowInfo;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-blue-100 text-blue-800',
  shipped: 'bg-orange-100 text-orange-800',
  in_transit: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En préparation',
  preparing: 'En préparation',
  ready: 'Prête',
  shipped: 'Expédiée',
  in_transit: 'En transit',
  delivered: 'Livrée',
  completed: 'Terminée',
  cancelled: 'Annulée'
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échec',
  refunded: 'Remboursé'
};

export default function OrderManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [standaloneEscrows, setStandaloneEscrows] = useState<StandaloneEscrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchOrders();

    // Mise à jour en temps réel des commandes (online ET pos)
    const channel = supabase
      .channel('vendor-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔔 Changement commande (realtime):', payload);
          fetchOrders(); // Recharger toutes les commandes
          
          if (payload.eventType === 'INSERT') {
            const source = (payload.new as any).source;
            toast({
              title: source === 'pos' ? "🛒 Nouvelle vente POS!" : "🎉 Nouvelle commande!",
              description: `Commande ${(payload.new as any).order_number} reçue`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchOrders = async () => {
    try {
      setIsRefreshing(true);
      if (!user?.id) {
        console.error('User ID not available');
        setLoading(false);
        return;
      }

      // Get vendor ID
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (vendorError) {
        console.error('Error fetching vendor:', vendorError);
        throw vendorError;
      }

      if (!vendor) {
        console.log('No vendor found for user');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching ALL orders (online + POS) for vendor:', vendor.id);

      // Charger TOUTES les commandes du vendeur (online ET pos) avec les infos clients
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(
            id, 
            user_id,
            profiles(first_name, last_name, phone)
          ),
          order_items(
            id,
            product_id,
            variant_id,
            quantity,
            unit_price,
            total_price,
            products(name)
          )
        `)
        .eq('vendor_id', vendor.id)
        .in('source', ['online', 'pos'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching orders:', error);
        throw error;
      }

      console.log('✅ Orders fetched:', ordersData?.length || 0);

      // Charger les infos escrow pour chaque commande
      const ordersWithEscrow = await Promise.all((ordersData || []).map(async (order) => {
        const { data: escrow } = await supabase
          .from('escrow_transactions')
          .select('id, status, amount, created_at')
          .eq('order_id', order.id)
          .maybeSingle();
        
        return { ...order, escrow: escrow || undefined };
      }));

      console.log('📦 ALL orders loaded (online + POS):', ordersWithEscrow.length);
      console.log('   - Online:', ordersWithEscrow.filter(o => o.source === 'online').length);
      console.log('   - POS:', ordersWithEscrow.filter(o => o.source === 'pos').length);
      setOrders(ordersWithEscrow);

      // CORRECTION: Charger TOUS les escrows du vendeur (avec ou sans order_id)
      console.log('🔍 Recherche TOUS les escrows pour user_id:', user.id);
      const { data: allEscrowsData, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('receiver_id', user.id)
        .in('status', ['pending', 'held'])
        .order('created_at', { ascending: false });

      if (escrowError) {
        console.error('❌ Erreur chargement escrows:', escrowError);
      } else if (allEscrowsData) {
        console.log('✅ TOUS les escrows chargés:', allEscrowsData.length, allEscrowsData);
        // Filtrer ceux sans order_id pour affichage séparé
        const escrowsWithoutOrder = allEscrowsData.filter(e => !e.order_id);
        setStandaloneEscrows(escrowsWithoutOrder);
      }

      if (ordersWithEscrow.length === 0 && (!allEscrowsData || allEscrowsData.length === 0)) {
        console.warn('⚠️ Aucune commande en ligne ni escrow trouvé.');
      }
    } catch (error) {
      console.error('💥 Error in fetchOrders:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtrer uniquement les ventes en ligne
  const onlineOrders = orders.filter(order => order.source === 'online');
  const filteredOnlineOrders = onlineOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled') => {
    if (updatingOrderId === orderId) {
      console.log('⏳ Update already in progress for order:', orderId);
      return; // Prevent duplicate updates
    }
    
    console.log('🔄 Updating order status:', { orderId, newStatus });
    setUpdatingOrderId(orderId);
    
    // Optimistic update
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus as string, updated_at: new Date().toISOString() }
        : order
    ));
    
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get vendor ID first
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Update order status with vendor verification
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('vendor_id', vendor.id) // Security: only update own orders
        .select();

      if (error) {
        console.error('❌ Error updating order status:', error);
        // Rollback optimistic update
        await fetchOrders();
        throw error;
      }

      console.log('✅ Order status updated successfully:', data);

      toast({
        title: "✅ Statut mis à jour",
        description: `La commande a été marquée comme ${statusLabels[newStatus]}.`
      });

      // Refresh to ensure sync
      await fetchOrders();
    } catch (error) {
      console.error('❌ Failed to update order status:', error);
      toast({
        title: "❌ Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le statut de la commande.",
        variant: "destructive"
      });
      // Rollback optimistic update
      await fetchOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getOrderStatusActions = (order: Order) => {
    const actions = [];
    
    if (order.status === 'pending') {
      actions.push(
        <Button 
          key="confirm" 
          size="sm"
          disabled={updatingOrderId === order.id}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            console.log('✅ Confirming order:', order.id);
            updateOrderStatus(order.id, 'confirmed');
          }}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          {updatingOrderId === order.id ? 'En cours...' : 'Confirmer'}
        </Button>
      );
    }
    
    if (order.status === 'confirmed') {
      actions.push(
        <Button 
          key="process" 
          size="sm" 
          disabled={updatingOrderId === order.id}
          className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            console.log('📦 Preparing order:', order.id);
            updateOrderStatus(order.id, 'preparing');
          }}
        >
          <Package className="w-4 h-4 mr-1" />
          {updatingOrderId === order.id ? 'En cours...' : 'Préparer'}
        </Button>
      );
    }
    
    if (order.status === 'preparing') {
      actions.push(
        <Button 
          key="ready" 
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            console.log('✅ Order ready:', order.id);
            updateOrderStatus(order.id, 'ready');
          }}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Prêt
        </Button>
      );
    }
    
    if (order.status === 'ready') {
      actions.push(
        <Button 
          key="ship" 
          size="sm"
          className="bg-orange-600 hover:bg-orange-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            console.log('🚚 Shipping order:', order.id);
            updateOrderStatus(order.id, 'in_transit');
          }}
        >
          <Truck className="w-4 h-4 mr-1" />
          Expédier
        </Button>
      );
    }
    
    if (order.status === 'in_transit') {
      actions.push(
        <Button 
          key="deliver" 
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            console.log('✅ Delivering order:', order.id);
            updateOrderStatus(order.id, 'delivered');
          }}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Marquer livré
        </Button>
      );
    }
    
    if (!['cancelled', 'delivered', 'completed'].includes(order.status)) {
      actions.push(
        <Button 
          key="cancel" 
          size="sm" 
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            console.log('❌ Cancelling order:', order.id);
            if (confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
              updateOrderStatus(order.id, 'cancelled');
            }
          }}
        >
          <XCircle className="w-4 h-4 mr-1" />
          Annuler
        </Button>
      );
    }

    return actions;
  };

  // Actions spécifiques pour les ventes POS - uniquement remboursement
  const getPOSOrderActions = (order: Order) => {
    return [
      <Button 
        key="refund" 
        size="sm"
        className="bg-red-600 hover:bg-red-700 text-white"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Êtes-vous sûr de vouloir rembourser la commande ${order.order_number} ?`)) {
            toast({
              title: "💰 Remboursement",
              description: `Le remboursement de ${order.total_amount.toLocaleString()} GNF est en cours...`
            });
            // TODO: Implémenter la logique de remboursement
          }
        }}
      >
        <Banknote className="w-4 h-4 mr-1" />
        Rembourser
      </Button>
    ];
  };

  // Statistics - Toutes les commandes
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total_amount, 0);

  // Statistics - Ventes en ligne uniquement
  const totalOnlineOrders = onlineOrders.length;
  const pendingOnlineOrders = onlineOrders.filter(o => o.status === 'pending').length;
  const processingOnlineOrders = onlineOrders.filter(o => ['confirmed', 'processing'].includes(o.status)).length;
  const deliveredOnlineOrders = onlineOrders.filter(o => o.status === 'delivered').length;
  const totalOnlineRevenue = onlineOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total_amount, 0);

  if (loading) return <div className="p-4">Chargement des commandes...</div>;

  return (
    <div className="space-y-6">
      {/* Titre et actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Commandes</h2>
          <p className="text-muted-foreground">Suivez et gérez toutes vos commandes clients</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchOrders}
            disabled={isRefreshing}
            className="relative"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" onClick={() => {
            // Export functionality
            toast({
              title: "Export en cours",
              description: "L'export des commandes sera bientôt disponible."
            });
          }}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" onClick={() => {
            // Report functionality
            toast({
              title: "Rapport généré",
              description: "Le rapport des commandes sera bientôt disponible."
            });
          }}>
            <FileText className="w-4 h-4 mr-2" />
            Rapport
          </Button>
        </div>
      </div>

      {/* Boutons Ventes POS et En Ligne */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bouton Ventes POS */}
        <Card 
          className="border-2 border-purple-300 bg-purple-50/50 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
          onClick={() => {
            document.querySelector('.pos-orders-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              🛒 Ventes POS
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Toutes les ventes passées par points de vente
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Total ventes</p>
                <p className="text-3xl font-bold text-purple-700">
                  {orders.filter(o => o.source === 'pos').length}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Chiffre d'affaires</p>
                <p className="text-xl font-bold text-purple-700">
                  {orders
                    .filter(o => o.source === 'pos' && o.payment_status === 'paid')
                    .reduce((sum, o) => sum + o.total_amount, 0)
                    .toLocaleString()} GNF
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orders.filter(o => o.source === 'pos' && o.status === 'pending').length}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Livrées</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.source === 'pos' && o.status === 'delivered').length}
                </p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
              Voir toutes les ventes POS
            </Button>
          </CardContent>
        </Card>

        {/* Bouton Ventes En Ligne */}
        <Card 
          className="border-2 border-blue-300 bg-blue-50/50 cursor-pointer hover:shadow-xl transition-all hover:scale-105"
          onClick={() => {
            document.querySelector('.online-orders-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              🌐 Ventes En Ligne
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Toutes les ventes passées via le compte client
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Total ventes</p>
                <p className="text-3xl font-bold text-blue-700">
                  {totalOnlineOrders}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Chiffre d'affaires</p>
                <p className="text-xl font-bold text-blue-700">
                  {totalOnlineRevenue.toLocaleString()} GNF
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingOnlineOrders}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Livrées</p>
                <p className="text-2xl font-bold text-green-600">
                  {deliveredOnlineOrders}
                </p>
              </div>
            </div>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
              Voir toutes les ventes en ligne
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro de commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmées</option>
              <option value="processing">En préparation</option>
              <option value="shipped">Expédiées</option>
              <option value="delivered">Livrées</option>
              <option value="cancelled">Annulées</option>
            </select>
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Section des Ventes En Ligne */}
      <Card className="border-2 border-blue-200 bg-blue-50/30 online-orders-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            🌐 Ventes En Ligne ({orders.filter(o => o.source === 'online').length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Commandes passées via le compte client
          </p>
        </CardHeader>
        <CardContent>
          {/* Statistiques Ventes En Ligne */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <Card className="bg-white/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total vente</p>
                    <p className="text-xl font-bold">{orders.filter(o => o.source === 'online').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">CA En Ligne</p>
                    <p className="text-lg font-bold">
                      {orders
                        .filter(o => o.source === 'online' && o.payment_status === 'paid')
                        .reduce((sum, o) => sum + o.total_amount, 0)
                        .toLocaleString()} GNF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des ventes En Ligne */}
          <div className="space-y-4">
            {orders.filter(o => o.source === 'online').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune vente en ligne pour le moment</p>
              </div>
            ) : (
              orders.filter(o => o.source === 'online').map((order) => (
                <div key={order.id} className="border-2 border-blue-200 rounded-lg p-6 bg-white hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-xl text-blue-700">{order.order_number}</h3>
                        <Badge variant="outline" className="text-xs">
                          ID: {order.id.slice(0, 8)}
                        </Badge>
                        <Badge className="bg-blue-500 text-white">
                          🌐 Vente En Ligne
                        </Badge>
                      </div>
                      
                      {/* Informations Client */}
                      {order.customers && (
                        <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
                          <h4 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Informations Client
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Nom:</span>
                              <span className="ml-2 font-semibold">
                                {order.customers?.profiles?.first_name || order.customers?.profiles?.last_name
                                  ? `${order.customers.profiles.first_name || ''} ${order.customers.profiles.last_name || ''}`
                                  : 'Client'}
                              </span>
                            </div>
                            {order.customers?.profiles?.phone && (
                              <div>
                                <span className="text-muted-foreground">Téléphone:</span>
                                <span className="ml-2 font-semibold">{order.customers.profiles.phone}</span>
                              </div>
                            )}
                          </div>
                          {/* Adresse de livraison */}
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-muted-foreground text-xs">Adresse de livraison:</span>
                                <p className="font-medium text-sm">
                                  {typeof order.shipping_address === 'object' && order.shipping_address !== null
                                    ? `${(order.shipping_address as any).address || (order.shipping_address as any).street || 'Adresse non spécifiée'}, ${(order.shipping_address as any).city || 'Conakry'}, ${(order.shipping_address as any).country || 'Guinée'}`
                                    : 'Adresse non spécifiée'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Date de commande */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>Commandé le {new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                      <Badge className={paymentStatusColors[order.payment_status]}>
                        {paymentStatusLabels[order.payment_status]}
                      </Badge>
                      {order.escrow && (
                        <Badge className={
                          order.escrow.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          order.escrow.status === 'released' ? 'bg-green-100 text-green-800' :
                          order.escrow.status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }>
                          <Shield className="w-3 h-3 mr-1" />
                          {order.escrow.status === 'pending' && 'Escrow en attente'}
                          {order.escrow.status === 'released' && 'Paiement reçu'}
                          {order.escrow.status === 'refunded' && 'Remboursé'}
                          {order.escrow.status === 'dispute' && 'Litige'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Articles</p>
                      <div className="text-sm">
                        {order.order_items?.map((item, index) => (
                          <div key={item.id}>
                            {item.products.name} x{item.quantity}
                            {index < (order.order_items?.length || 0) - 1 ? ', ' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Montant total</p>
                      <p className="text-xl font-bold text-blue-700">
                        {order.total_amount.toLocaleString()} GNF
                      </p>
                      {order.discount_amount > 0 && (
                        <p className="text-sm text-green-600">
                          Remise: -{order.discount_amount.toLocaleString()} GNF
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Méthode de paiement</p>
                      <div className="text-sm text-muted-foreground">
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        {order.payment_method || 'En ligne'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {getOrderStatusActions(order)}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                        setShowOrderDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tableau des Ventes POS */}
      <Card className="border-2 border-purple-200 bg-purple-50/30 pos-orders-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            🛒 Ventes POS ({orders.filter(o => o.source === 'pos').length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Commandes passées via les points de vente
          </p>
        </CardHeader>
        <CardContent>
          {/* Statistiques Ventes POS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <Card className="bg-white/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total vente</p>
                    <p className="text-xl font-bold">{orders.filter(o => o.source === 'pos').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">CA POS</p>
                    <p className="text-lg font-bold">
                      {orders
                        .filter(o => o.source === 'pos' && o.payment_status === 'paid')
                        .reduce((sum, o) => sum + o.total_amount, 0)
                        .toLocaleString()} GNF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Liste des ventes POS */}
          <div className="space-y-4">
            {orders.filter(o => o.source === 'pos').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune vente POS pour le moment</p>
              </div>
            ) : (
              orders.filter(o => o.source === 'pos').map((order) => (
                <div key={order.id} className="border-2 border-purple-200 rounded-lg p-6 bg-white hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-xl text-purple-700">{order.order_number}</h3>
                        <Badge variant="outline" className="text-xs">
                          ID: {order.id.slice(0, 8)}
                        </Badge>
                        <Badge className="bg-purple-500 text-white">
                          🛒 Vente POS
                        </Badge>
                      </div>
                      
                      {/* Informations Client */}
                      {order.customers && (
                        <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
                          <h4 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Informations Client
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Nom:</span>
                              <span className="ml-2 font-semibold">
                                {order.customers?.profiles?.first_name || order.customers?.profiles?.last_name
                                  ? `${order.customers.profiles.first_name || ''} ${order.customers.profiles.last_name || ''}`
                                  : 'Client POS'}
                              </span>
                            </div>
                            {order.customers?.profiles?.phone && (
                              <div>
                                <span className="text-muted-foreground">Téléphone:</span>
                                <span className="ml-2 font-semibold">{order.customers.profiles.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Date de vente */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>Vendu le {new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                      <Badge className={paymentStatusColors[order.payment_status]}>
                        {paymentStatusLabels[order.payment_status]}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Articles</p>
                      <div className="text-sm">
                        {order.order_items?.map((item, index) => (
                          <div key={item.id}>
                            {item.products.name} x{item.quantity}
                            {index < (order.order_items?.length || 0) - 1 ? ', ' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Montant total</p>
                      <p className="text-xl font-bold text-purple-700">
                        {order.total_amount.toLocaleString()} GNF
                      </p>
                      {order.discount_amount > 0 && (
                        <p className="text-sm text-green-600">
                          Remise: -{order.discount_amount.toLocaleString()} GNF
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Méthode de paiement</p>
                      <div className="text-sm text-muted-foreground">
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        {order.payment_method || 'Espèces'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {getPOSOrderActions(order)}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                        setShowOrderDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste de toutes les commandes (Online + POS) */}
      <Card className="orders-list">
        <CardHeader>
          <CardTitle>
            {statusFilter === 'all' 
              ? `Toutes les commandes - Online + POS (${filteredOrders.length})` 
              : `Commandes ${statusLabels[statusFilter]?.toLowerCase() || statusFilter} (${filteredOrders.length})`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border-2 border-primary/20 rounded-lg p-6 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-xl text-primary">{order.order_number}</h3>
                      <Badge variant="outline" className="text-xs">
                        ID: {order.id.slice(0, 8)}
                      </Badge>
                      {/* Badge Source */}
                      <Badge 
                        variant={order.source === 'pos' ? 'default' : 'secondary'}
                        className={order.source === 'pos' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}
                      >
                        {order.source === 'pos' ? '🛒 POS' : '🌐 Online'}
                      </Badge>
                    </div>
                    
                    {/* Informations Client */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
                      <h4 className="font-semibold text-sm text-primary mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Informations Client
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nom:</span>
                          <span className="ml-2 font-semibold">
                            {order.customers?.profiles?.first_name || order.customers?.profiles?.last_name
                              ? `${order.customers.profiles.first_name || ''} ${order.customers.profiles.last_name || ''}`
                              : 'Client non identifié'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ID Client:</span>
                          <span className="ml-2 font-mono text-xs font-semibold">
                            {order.customers?.user_id ? order.customers.user_id.slice(0, 8) : 'N/A'}
                          </span>
                        </div>
                        {order.customers?.profiles?.phone && (
                          <div>
                            <span className="text-muted-foreground">Téléphone:</span>
                            <span className="ml-2 font-semibold">{order.customers.profiles.phone}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Pays:</span>
                          <span className="ml-2 font-semibold">
                            {typeof order.shipping_address === 'object' && order.shipping_address !== null
                              ? (order.shipping_address as any).country || 'Guinée'
                              : 'Guinée'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Adresse de livraison détaillée */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-muted-foreground text-xs">Adresse de livraison:</span>
                            <p className="font-medium text-sm">
                              {typeof order.shipping_address === 'object' && order.shipping_address !== null
                                ? `${(order.shipping_address as any).address || (order.shipping_address as any).street || 'Adresse non spécifiée'}, ${(order.shipping_address as any).city || 'Conakry'}, ${(order.shipping_address as any).country || 'Guinée'}`
                                : 'Adresse non spécifiée'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Date de commande */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>Commandé le {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={statusColors[order.status]}>
                      {statusLabels[order.status]}
                    </Badge>
                    <Badge className={paymentStatusColors[order.payment_status]}>
                      {paymentStatusLabels[order.payment_status]}
                    </Badge>
                    {order.escrow && (
                      <Badge className={
                        order.escrow.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        order.escrow.status === 'released' ? 'bg-green-100 text-green-800' :
                        order.escrow.status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }>
                        <Shield className="w-3 h-3 mr-1" />
                        {order.escrow.status === 'pending' && 'Escrow en attente'}
                        {order.escrow.status === 'released' && 'Paiement reçu'}
                        {order.escrow.status === 'refunded' && 'Remboursé'}
                        {order.escrow.status === 'dispute' && 'Litige'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Articles</p>
                    <div className="text-sm">
                      {order.order_items?.map((item, index) => (
                        <div key={item.id}>
                          {item.products.name} x{item.quantity}
                          {index < (order.order_items?.length || 0) - 1 ? ', ' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Montant total</p>
                    <p className="text-xl font-bold text-vendeur-primary">
                      {order.total_amount.toLocaleString()} GNF
                    </p>
                    {order.discount_amount > 0 && (
                      <p className="text-sm text-green-600">
                        Remise: -{order.discount_amount.toLocaleString()} GNF
                      </p>
                    )}
                    {order.escrow && order.escrow.status === 'pending' && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                        <Shield className="w-3 h-3" />
                        <span>Fonds sécurisés en escrow</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse de livraison</p>
                    <div className="text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {typeof order.shipping_address === 'object' && order.shipping_address !== null
                        ? `${(order.shipping_address as any).address || ''} ${(order.shipping_address as any).city || 'Conakry'}`
                        : 'Adresse non spécifiée'}
                    </div>
                  </div>
                </div>

                {/* Info Escrow */}
                {order.escrow && order.escrow.status === 'pending' && (
                  <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-2">
                      <Shield className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Paiement sécurisé par Escrow
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                          Le paiement de {order.escrow.amount.toLocaleString()} GNF est bloqué dans le système escrow.
                          Vous recevrez les fonds quand le client confirmera la réception.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {order.escrow && order.escrow.status === 'released' && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        Paiement reçu - Le client a confirmé la livraison
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    {getOrderStatusActions(order)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowOrderDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      // Generate invoice
                      toast({
                        title: "Facture générée",
                        description: `Facture générée pour la commande ${order.order_number}`
                      });
                    }}>
                      <FileText className="w-4 h-4 mr-1" />
                      Facture
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune commande trouvée</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' || searchTerm 
                  ? 'Aucune commande ne correspond aux critères de recherche.' 
                  : 'Vous n\'avez pas encore reçu de commandes.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog des détails de commande */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la commande {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informations commande</h4>
                  <div className="space-y-2 text-sm">
                    <div>Status: <Badge className={statusColors[selectedOrder.status]}>{statusLabels[selectedOrder.status]}</Badge></div>
                    <div>Paiement: <Badge className={paymentStatusColors[selectedOrder.payment_status]}>{paymentStatusLabels[selectedOrder.payment_status]}</Badge></div>
                    <div>Date: {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')}</div>
                    {selectedOrder.payment_method && (
                      <div>Méthode de paiement: {selectedOrder.payment_method}</div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Montants</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span>{selectedOrder.subtotal.toLocaleString()} GNF</span>
                    </div>
                    {selectedOrder.tax_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Taxes:</span>
                        <span>{selectedOrder.tax_amount.toLocaleString()} GNF</span>
                      </div>
                    )}
                    {selectedOrder.shipping_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Livraison:</span>
                        <span>{selectedOrder.shipping_amount.toLocaleString()} GNF</span>
                      </div>
                    )}
                    {selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Remise:</span>
                        <span>-{selectedOrder.discount_amount.toLocaleString()} GNF</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{selectedOrder.total_amount.toLocaleString()} GNF</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Articles commandés */}
              <div>
                <h4 className="font-semibold mb-4">Articles commandés</h4>
                <div className="space-y-2">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <span className="font-medium">{item.products.name}</span>
                      </div>
                      <div className="text-right">
                        <div>{item.quantity} x {item.unit_price.toLocaleString()} GNF</div>
                        <div className="font-semibold">{item.total_price.toLocaleString()} GNF</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adresses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Adresse de livraison</h4>
                  <div className="text-sm text-muted-foreground">
                    {selectedOrder.shipping_address ? (
                      <div>
                        {(selectedOrder.shipping_address as Address)?.street && <div>{(selectedOrder.shipping_address as Address).street}</div>}
                        {(selectedOrder.shipping_address as Address)?.city && <div>{(selectedOrder.shipping_address as Address).city}</div>}
                        {(selectedOrder.shipping_address as Address)?.postal_code && <div>{(selectedOrder.shipping_address as Address).postal_code}</div>}
                        {(selectedOrder.shipping_address as Address)?.country && <div>{(selectedOrder.shipping_address as Address).country}</div>}
                      </div>
                    ) : (
                      <span>Non spécifiée</span>
                    )}
                  </div>
                </div>
                {selectedOrder.billing_address && (
                  <div>
                    <h4 className="font-semibold mb-2">Adresse de facturation</h4>
                    <div className="text-sm text-muted-foreground">
                      {(selectedOrder.billing_address as Address)?.street && <div>{(selectedOrder.billing_address as Address).street}</div>}
                      {(selectedOrder.billing_address as Address)?.city && <div>{(selectedOrder.billing_address as Address).city}</div>}
                      {(selectedOrder.billing_address as Address)?.postal_code && <div>{(selectedOrder.billing_address as Address).postal_code}</div>}
                      {(selectedOrder.billing_address as Address)?.country && <div>{(selectedOrder.billing_address as Address).country}</div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}