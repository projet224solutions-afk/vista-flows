import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCurrentVendor } from "@/hooks/useCurrentVendor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GeocodedAddress } from "@/components/vendor/GeocodedAddress";
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

// Supprimé: StandaloneEscrow interface (non utilisé)

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
      id: string;
      name: string;
      sku?: string;
      price: number;
      images?: string[];
      stock_quantity?: number;
      is_active: boolean;
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
  const { vendorId, user, loading: vendorLoading } = useCurrentVendor();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'pos' | 'online'>('pos');
  const [onlineStatusFilter, setOnlineStatusFilter] = useState<'all' | 'pending' | 'processing' | 'delivered'>('all');

  useEffect(() => {
    if (!vendorId || vendorLoading) return;
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
  }, [vendorId, vendorLoading]);

  const fetchOrders = async () => {
    if (!vendorId || !user) {
      console.warn('⚠️ Pas de vendorId ou user pour charger les commandes');
      setLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      console.log('🔍 Fetching ALL orders (online + POS) for vendor:', vendorId);

      // Charger TOUTES les commandes du vendeur (online ET pos) avec les infos clients et produits
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
            products(
              id,
              name,
              sku,
              price,
              images,
              stock_quantity,
              is_active
            )
          )
        `)
        .eq('vendor_id', vendorId)
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
      console.log('   - With Escrow:', ordersWithEscrow.filter(o => o.escrow).length);
      
      setOrders(ordersWithEscrow);

      if (ordersWithEscrow.length === 0) {
        console.warn('⚠️ Aucune commande trouvée.');
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

  // Filtrer uniquement les ventes en ligne et trier par priorité (escrow en premier)
  const onlineOrders = orders
    .filter(order => order.source === 'online')
    .sort((a, b) => {
      // Priorité 1: Commandes avec escrow en premier
      const aHasEscrow = !!a.escrow;
      const bHasEscrow = !!b.escrow;
      if (aHasEscrow && !bHasEscrow) return -1;
      if (!aHasEscrow && bHasEscrow) return 1;
      
      // Priorité 2: Statut escrow (pending/held avant released)
      if (aHasEscrow && bHasEscrow) {
        const aEscrowPending = ['pending', 'held'].includes(a.escrow!.status);
        const bEscrowPending = ['pending', 'held'].includes(b.escrow!.status);
        if (aEscrowPending && !bEscrowPending) return -1;
        if (!aEscrowPending && bEscrowPending) return 1;
      }
      
      // Priorité 3: Date (plus récent en premier)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

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
      if (!vendorId || !user?.id) {
        throw new Error('User not authenticated or vendor not found');
      }

      // Update order status with vendor verification
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('vendor_id', vendorId) // Security: only update own orders
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
  const processingOnlineOrders = onlineOrders.filter(o => 
    ['processing', 'preparing', 'ready', 'shipped', 'in_transit', 'confirmed'].includes(o.status)
  ).length;
  const deliveredOnlineOrders = onlineOrders.filter(o => 
    ['delivered', 'completed'].includes(o.status)
  ).length;
  const totalOnlineRevenue = onlineOrders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total_amount, 0);

  if (loading) return <div className="p-4">Chargement des commandes...</div>;

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Titre et actions - Mobile optimisé */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold truncate">Gestion des Commandes</h2>
          <p className="text-xs md:text-sm text-muted-foreground truncate">Suivez et gérez vos commandes</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Button 
            variant="outline" 
            onClick={fetchOrders}
            disabled={isRefreshing}
            className="relative flex-shrink-0 h-9 px-3 text-xs md:text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
          <Button variant="outline" className="flex-shrink-0 h-9 px-3 text-xs md:text-sm" onClick={() => {
            toast({
              title: "Export en cours",
              description: "L'export des commandes sera bientôt disponible."
            });
          }}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button variant="outline" className="flex-shrink-0 h-9 px-3 text-xs md:text-sm" onClick={() => {
            toast({
              title: "Rapport généré",
              description: "Le rapport des commandes sera bientôt disponible."
            });
          }}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">Rapport</span>
          </Button>
        </div>
      </div>

      {/* Boutons Ventes POS et En Ligne - Mobile optimisé */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {/* Bouton Ventes POS */}
        <Card 
          className="border-2 border-purple-300 bg-purple-50/50 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
          onClick={() => {
            setActiveView('pos');
            setTimeout(() => {
              document.querySelector('.pos-orders-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
        >
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-purple-700 text-base md:text-lg">
              🛒 Ventes POS
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
              Ventes par points de vente
            </p>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Total ventes</p>
                <p className="text-xl md:text-3xl font-bold text-purple-700">
                  {orders.filter(o => o.source === 'pos').length}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Chiffre d'affaires</p>
                <p className="text-sm md:text-xl font-bold text-purple-700 truncate">
                  {orders
                    .filter(o => o.source === 'pos' && o.payment_status === 'paid')
                    .reduce((sum, o) => sum + o.total_amount, 0)
                    .toLocaleString()} <span className="text-xs">GNF</span>
                </p>
              </div>
            </div>
            <Button className="w-full mt-3 md:mt-4 bg-purple-600 hover:bg-purple-700 h-9 text-xs md:text-sm">
              Voir les ventes POS
            </Button>
          </CardContent>
        </Card>

        {/* Bouton Ventes En Ligne */}
        <Card 
          className="border-2 border-blue-300 bg-blue-50/50 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
          onClick={() => {
            setActiveView('online');
            setTimeout(() => {
              document.querySelector('.online-orders-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
        >
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-blue-700 text-base md:text-lg">
              🌐 Ventes En Ligne
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
              Commandes via compte client
            </p>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Total</p>
                <p className="text-xl md:text-3xl font-bold text-blue-700">
                  {totalOnlineOrders}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">En cours</p>
                <p className="text-lg md:text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.source === 'online' && o.status === 'processing').length}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">En attente</p>
                <p className="text-lg md:text-2xl font-bold text-yellow-600">
                  {pendingOnlineOrders}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Livrées</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {deliveredOnlineOrders}
                </p>
              </div>
            </div>
            <Button className="w-full mt-3 md:mt-4 bg-blue-600 hover:bg-blue-700 h-9 text-xs md:text-sm">
              Voir les ventes en ligne
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filtres - Mobile optimisé */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-2 md:flex-row md:gap-4 md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 border rounded-md text-sm flex-1 md:flex-none h-9"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmées</option>
                <option value="processing">En préparation</option>
                <option value="shipped">Expédiées</option>
                <option value="delivered">Livrées</option>
                <option value="cancelled">Annulées</option>
              </select>
              <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Tableau des Ventes POS */}
      {activeView === 'pos' && (
        <Card className="border-2 border-purple-200 bg-purple-50/30 pos-orders-section">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-purple-700 text-base md:text-lg">
            🛒 Ventes POS ({orders.filter(o => o.source === 'pos').length})
          </CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Commandes via points de vente
          </p>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
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
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Nom:</span>
                              <span className="ml-2 font-semibold">
                                {order.customers?.profiles?.first_name || order.customers?.profiles?.last_name
                                  ? `${order.customers.profiles.first_name || ''} ${order.customers.profiles.last_name || ''}`
                                  : 'Client POS'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">ID Client:</span>
                              <span className="ml-2 font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded">
                                {order.customers?.id.slice(0, 8)}...
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
                      <p className="text-sm font-medium text-muted-foreground mb-2">Articles vendus</p>
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{item.products?.name || 'Produit'}</p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.products?.sku || 'N/A'} | 
                                Stock: {item.products?.stock_quantity !== undefined ? item.products.stock_quantity : 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">x{item.quantity}</p>
                              <p className="text-xs text-muted-foreground">{item.unit_price.toLocaleString()} GNF</p>
                            </div>
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
      )}

      {/* Section des Ventes En Ligne */}
      {activeView === 'online' && (
        <Card className="border-2 border-blue-200 bg-blue-50/30 online-orders-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            🌐 Ventes En Ligne ({onlineOrders.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Commandes passées via le compte client
          </p>
        </CardHeader>
        <CardContent>
          {/* Statistiques Ventes En Ligne - Compte Client */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card 
              className={`bg-white/80 cursor-pointer transition-all hover:shadow-md ${onlineStatusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setOnlineStatusFilter('all')}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total ventes</p>
                <p className="text-3xl font-bold text-blue-700">
                  {totalOnlineOrders}
                </p>
              </CardContent>
            </Card>
            <Card 
              className={`bg-white/80 cursor-pointer transition-all hover:shadow-md ${onlineStatusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
              onClick={() => setOnlineStatusFilter('pending')}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pendingOnlineOrders}
                </p>
              </CardContent>
            </Card>
            <Card 
              className={`bg-white/80 cursor-pointer transition-all hover:shadow-md ${onlineStatusFilter === 'processing' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setOnlineStatusFilter('processing')}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">En cours</p>
                <p className="text-2xl font-bold text-blue-600">
                  {processingOnlineOrders}
                </p>
              </CardContent>
            </Card>
            <Card 
              className={`bg-white/80 cursor-pointer transition-all hover:shadow-md ${onlineStatusFilter === 'delivered' ? 'ring-2 ring-green-500' : ''}`}
              onClick={() => setOnlineStatusFilter('delivered')}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Livrées</p>
                <p className="text-2xl font-bold text-green-600">
                  {deliveredOnlineOrders}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des ventes En Ligne */}
          <div className="space-y-4">
            {onlineOrders.filter(order => {
              if (onlineStatusFilter === 'all') return true;
              if (onlineStatusFilter === 'pending') return order.status === 'pending';
              if (onlineStatusFilter === 'processing') return ['processing', 'preparing', 'ready', 'shipped', 'in_transit', 'confirmed'].includes(order.status);
              if (onlineStatusFilter === 'delivered') return ['delivered', 'completed'].includes(order.status);
              return true;
            }).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>
                  {onlineStatusFilter === 'all' 
                    ? 'Aucune vente en ligne pour le moment'
                    : `Aucune commande ${onlineStatusFilter === 'pending' ? 'en attente' : onlineStatusFilter === 'processing' ? 'en cours' : 'livrée'}`
                  }
                </p>
              </div>
            ) : (
              onlineOrders.filter(order => {
                if (onlineStatusFilter === 'all') return true;
                if (onlineStatusFilter === 'pending') return order.status === 'pending';
                if (onlineStatusFilter === 'processing') return ['processing', 'preparing', 'ready', 'shipped', 'in_transit', 'confirmed'].includes(order.status);
                if (onlineStatusFilter === 'delivered') return ['delivered', 'completed'].includes(order.status);
                return true;
              }).map((order) => (
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
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Nom:</span>
                              <span className="ml-2 font-semibold">
                                {order.customers?.profiles?.first_name || order.customers?.profiles?.last_name
                                  ? `${order.customers.profiles.first_name || ''} ${order.customers.profiles.last_name || ''}`
                                  : 'Client'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">ID Client:</span>
                              <span className="ml-2 font-mono text-xs font-semibold bg-muted px-2 py-0.5 rounded">
                                {order.customers?.id.slice(0, 8)}...
                              </span>
                            </div>
                            {order.customers?.profiles?.phone && (
                              <div>
                                <span className="text-muted-foreground">Téléphone:</span>
                                <span className="ml-2 font-semibold">{order.customers.profiles.phone}</span>
                              </div>
                            )}
                          </div>
                          {/* Adresse de livraison géolocalisée */}
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <GeocodedAddress address={order.shipping_address} />
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
                          order.escrow.status === 'pending' || order.escrow.status === 'held' 
                            ? 'bg-orange-100 text-orange-800 border-orange-300 border-2' :
                          order.escrow.status === 'released' 
                            ? 'bg-green-100 text-green-800' :
                          order.escrow.status === 'refunded' 
                            ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }>
                          <Shield className="w-3 h-3 mr-1" />
                          {(order.escrow.status === 'pending' || order.escrow.status === 'held') && '🔒 Paiement sécurisé (Escrow)'}
                          {order.escrow.status === 'released' && '✅ Paiement reçu'}
                          {order.escrow.status === 'refunded' && '↩️ Remboursé'}
                          {order.escrow.status === 'dispute' && '⚠️ Litige'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Articles commandés</p>
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{item.products?.name || 'Produit'}</p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.products?.sku || 'N/A'} | 
                                Stock: {item.products?.stock_quantity !== undefined ? item.products.stock_quantity : 'N/A'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">x{item.quantity}</p>
                              <p className="text-xs text-muted-foreground">{item.unit_price.toLocaleString()} GNF</p>
                            </div>
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
                        {order.payment_method || 'Non spécifié'}
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
      )}


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