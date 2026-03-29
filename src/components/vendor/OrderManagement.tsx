import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentVendor } from "@/hooks/useCurrentVendor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GeocodedAddress } from "@/components/vendor/GeocodedAddress";
import CreditSalesForm from "@/components/vendor/CreditSalesForm";
import { 
  ShoppingCart, Search, Filter, Eye, Package, Clock, 
  CheckCircle, XCircle, Truck, CreditCard, FileText,
  Calendar, User, MapPin, Download, MoreHorizontal, Shield, RefreshCw, Banknote, Lock
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

// SupprimÃ©: StandaloneEscrow interface (non utilisÃ©)

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
      full_name?: string;
      phone?: string;
      email?: string;
      city?: string;
      country?: string;
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
  delivered: 'bg-primary-orange-100 text-primary-orange-800',
  completed: 'bg-primary-orange-100 text-primary-orange-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'ConfirmÃ©e',
  processing: 'En prÃ©paration',
  preparing: 'En prÃ©paration',
  ready: 'PrÃªte',
  shipped: 'ExpÃ©diÃ©e',
  in_transit: 'En transit',
  delivered: 'LivrÃ©e',
  completed: 'TerminÃ©e',
  cancelled: 'AnnulÃ©e'
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-primary-orange-100 text-primary-orange-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800'
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'En attente',
  paid: 'PayÃ©',
  failed: 'Ã‰chec',
  refunded: 'RemboursÃ©'
};

// Labels pour les mÃ©thodes de paiement
const paymentMethodLabels: Record<string, string> = {
  wallet: 'Wallet 224Solutions',
  card: 'Carte bancaire',
  cash: 'EspÃ¨ces',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Virement bancaire'
};

// Fonction pour obtenir le libellÃ© de la mÃ©thode de paiement
const getPaymentMethodLabel = (order: Order): string => {
  const method = order.payment_method;
  const isCOD = order.source === 'online' && 
                method === 'cash' && 
                order.payment_status === 'pending' &&
                (order.shipping_address as any)?.is_cod === true;
  
  if (isCOD) {
    return 'ðŸ’µ Paiement Ã  la livraison';
  }
  
  return paymentMethodLabels[method || ''] || method || 'Non spÃ©cifiÃ©';
};

export default function OrderManagement() {
  const { vendorId, user, loading: vendorLoading, canAccessPOS, businessType } = useCurrentVendor();
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
  const [mainTab, setMainTab] = useState<'orders' | 'credit'>('orders');

  useEffect(() => {
    if (!vendorId || vendorLoading) return;
    fetchOrders();

    // Mise Ã  jour en temps rÃ©el des commandes (online ET pos)
    const ordersChannel = supabase
      .channel('vendor-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('ðŸ”” Changement commande (realtime):', payload);
          fetchOrders(); // Recharger toutes les commandes
          
          if (payload.eventType === 'INSERT') {
            const source = (payload.new as any).source;
            toast({
              title: source === 'pos' ? "ðŸ›’ Nouvelle vente POS!" : "ðŸŽ‰ Nouvelle commande!",
              description: `Commande ${(payload.new as any).order_number} reÃ§ue`
            });
          }
        }
      )
      .subscribe();

    // Mise Ã  jour en temps rÃ©el des escrow (pour voir quand le client confirme la livraison)
    const escrowChannel = supabase
      .channel('vendor-escrow-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'escrow_transactions'
        },
        (payload) => {
          console.log('ðŸ’° Changement escrow (realtime):', payload);
          const newStatus = (payload.new as any).status;
          const oldStatus = (payload.old as any)?.status;
          
          // Notification quand l'escrow est libÃ©rÃ© (client a confirmÃ© la livraison)
          if (newStatus === 'released' && oldStatus !== 'released') {
            toast({
              title: "ðŸ’° Paiement libÃ©rÃ© !",
              description: `Le client a confirmÃ© la rÃ©ception. ${((payload.new as any).amount || 0).toLocaleString()} GNF transfÃ©rÃ©s sur votre compte.`,
              duration: 10000
            });
          }
          
          fetchOrders(); // Recharger pour mettre Ã  jour l'affichage
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(escrowChannel);
    };
  }, [vendorId, vendorLoading]);

  const fetchOrders = async () => {
    if (!vendorId || !user) {
      console.warn('âš ï¸ Pas de vendorId ou user pour charger les commandes');
      setLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      console.log('ðŸ” Fetching ALL orders (online + POS) for vendor:', vendorId);

      // Charger TOUTES les commandes du vendeur (online ET pos) avec les infos clients et produits
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(
            id, 
            user_id
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
        console.error('âŒ Error fetching orders:', error);
        throw error;
      }

      // RÃ©cupÃ©rer les user_ids des customers pour charger les profils
      const userIds = (ordersData || [])
        .filter(o => o.customers?.user_id)
        .map(o => o.customers.user_id);

      // Charger les profils correspondants
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, phone, email, full_name, city, country')
          .in('id', userIds);

        if (profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Enrichir les commandes avec les donnÃ©es de profil
      const enrichedOrders = (ordersData || []).map(order => {
        if (order.customers?.user_id && profilesMap[order.customers.user_id]) {
          return {
            ...order,
            customers: {
              ...order.customers,
              profiles: profilesMap[order.customers.user_id]
            }
          };
        }
        return order;
      });

      console.log('âœ… Orders fetched:', enrichedOrders?.length || 0);

      // Charger les infos escrow en une seule requÃªte batch (optimisation)
      const orderIds = enrichedOrders.map(o => o.id);
      let escrowMap: Record<string, EscrowInfo> = {};
      
      if (orderIds.length > 0) {
        const { data: escrowData } = await supabase
          .from('escrow_transactions')
          .select('id, status, amount, created_at, order_id')
          .in('order_id', orderIds);
        
        if (escrowData) {
          escrowData.forEach(e => {
            escrowMap[e.order_id] = {
              id: e.id,
              status: e.status,
              amount: e.amount,
              created_at: e.created_at
            };
          });
        }
      }
      
      const ordersWithEscrow = enrichedOrders.map(order => ({
        ...order,
        escrow: escrowMap[order.id] || undefined
      }));

      console.log('ðŸ“¦ ALL orders loaded (online + POS):', ordersWithEscrow.length);
      console.log('   - Online:', ordersWithEscrow.filter(o => o.source === 'online').length);
      console.log('   - POS:', ordersWithEscrow.filter(o => o.source === 'pos').length);
      console.log('   - With Escrow:', ordersWithEscrow.filter(o => o.escrow).length);
      
      setOrders(ordersWithEscrow);

      if (ordersWithEscrow.length === 0) {
        console.warn('âš ï¸ Aucune commande trouvÃ©e.');
      }
    } catch (error) {
      console.error('ðŸ’¥ Error in fetchOrders:', error);
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

  // Filtrer uniquement les ventes en ligne et trier par prioritÃ© (escrow en premier)
  const onlineOrders = orders
    .filter(order => order.source === 'online')
    .sort((a, b) => {
      // PrioritÃ© 1: Commandes avec escrow en premier
      const aHasEscrow = !!a.escrow;
      const bHasEscrow = !!b.escrow;
      if (aHasEscrow && !bHasEscrow) return -1;
      if (!aHasEscrow && bHasEscrow) return 1;
      
      // PrioritÃ© 2: Statut escrow (pending/held avant released)
      if (aHasEscrow && bHasEscrow) {
        const aEscrowPending = ['pending', 'held'].includes(a.escrow!.status);
        const bEscrowPending = ['pending', 'held'].includes(b.escrow!.status);
        if (aEscrowPending && !bEscrowPending) return -1;
        if (!aEscrowPending && bEscrowPending) return 1;
      }
      
      // PrioritÃ© 3: Date (plus rÃ©cent en premier)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filteredOnlineOrders = onlineOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled') => {
    // Prevent duplicate updates
    if (updatingOrderId === orderId) {
      console.log('â³ Update already in progress for order:', orderId);
      return;
    }
    
    // Validate required data before proceeding
    if (!vendorId) {
      console.error('âŒ No vendorId available');
      toast({
        title: "âŒ Erreur",
        description: "Profil vendeur non trouvÃ©. Veuillez rafraÃ®chir la page.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      console.error('âŒ No user authenticated');
      toast({
        title: "âŒ Erreur",
        description: "Vous devez Ãªtre connectÃ© pour effectuer cette action.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('ðŸ”„ Updating order status:', { orderId, newStatus, vendorId });
    setUpdatingOrderId(orderId);
    
    // Store previous state for rollback
    const previousOrders = [...orders];
    
    // Optimistic update
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus as string, updated_at: new Date().toISOString() }
        : order
    ));
    
    try {
      // Update (ne dÃ©pend pas du retour de lignes pour considÃ©rer le succÃ¨s)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('vendor_id', vendorId);

      if (updateError) {
        console.error('âŒ Supabase error updating order status:', updateError);
        throw updateError;
      }

      // VÃ©rifier que la mise Ã  jour est bien appliquÃ©e (Ã©vite les faux nÃ©gatifs â€œ0 rows returnedâ€)
      const { data: verify, error: verifyError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', orderId)
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (verifyError) {
        console.error('âŒ Supabase error verifying order status:', verifyError);
        throw verifyError;
      }

      if (!verify) {
        throw new Error('Commande non trouvÃ©e ou non autorisÃ©e');
      }

      if (verify.status !== newStatus) {
        throw new Error(`Le statut n'a pas Ã©tÃ© changÃ© (actuel: ${verify.status})`);
      }

      console.log('âœ… Order status updated successfully:', verify);

      toast({
        title: "âœ… Statut mis Ã  jour",
        description: `La commande a Ã©tÃ© marquÃ©e comme ${statusLabels[newStatus]}.`,
      });

      // Refresh to ensure sync
      await fetchOrders();
    } catch (error: any) {
      console.error('âŒ Failed to update order status:', error);
      
      // Rollback to previous state
      setOrders(previousOrders);
      
      toast({
        title: "âŒ Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre Ã  jour le statut de la commande.",
        variant: "destructive"
      });
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
          className="bg-primary-orange-600 hover:bg-primary-orange-700 text-white disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            console.log('âœ… Confirming order:', order.id);
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
          className="bg-vendeur-secondary hover:bg-vendeur-secondary/90 text-white disabled:opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            console.log('ðŸ“¦ Preparing order:', order.id);
            updateOrderStatus(order.id, 'preparing');
          }}
        >
          <Package className="w-4 h-4 mr-1" />
          {updatingOrderId === order.id ? 'En cours...' : 'PrÃ©parer'}
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
            console.log('âœ… Order ready:', order.id);
            updateOrderStatus(order.id, 'ready');
          }}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          PrÃªt
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
            console.log('ðŸšš Shipping order:', order.id);
            updateOrderStatus(order.id, 'in_transit');
          }}
        >
          <Truck className="w-4 h-4 mr-1" />
          ExpÃ©dier
        </Button>
      );
    }
    
    if (order.status === 'in_transit') {
      actions.push(
        <Button 
          key="deliver" 
          size="sm"
          className="bg-primary-orange-600 hover:bg-primary-orange-700 text-white"
          onClick={(e) => {
            e.stopPropagation();
            console.log('âœ… Delivering order:', order.id);
            updateOrderStatus(order.id, 'delivered');
          }}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Marquer livrÃ©
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
            console.log('âŒ Cancelling order:', order.id);
            if (confirm('ÃŠtes-vous sÃ»r de vouloir annuler cette commande ?')) {
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

  // Actions spÃ©cifiques pour les ventes POS - uniquement remboursement
  const getPOSOrderActions = (order: Order) => {
    return [
      <Button 
        key="refund" 
        size="sm"
        className="bg-red-600 hover:bg-red-700 text-white"
        onClick={async (e) => {
          e.stopPropagation();
          if (confirm(`ÃŠtes-vous sÃ»r de vouloir rembourser la commande ${order.order_number} ?`)) {
            try {
              // Mettre Ã  jour le statut de paiement en "refunded"
              const { error } = await supabase
                .from('orders')
                .update({ 
                  payment_status: 'refunded',
                  status: 'cancelled',
                  updated_at: new Date().toISOString()
                })
                .eq('id', order.id)
                .eq('vendor_id', vendorId);
              
              if (error) throw error;
              
              toast({
                title: "âœ… Remboursement effectuÃ©",
                description: `La commande ${order.order_number} a Ã©tÃ© remboursÃ©e (${order.total_amount.toLocaleString()} GNF)`
              });
              
              // RafraÃ®chir les commandes
              await fetchOrders();
            } catch (err) {
              console.error('Erreur remboursement:', err);
              toast({
                title: "âŒ Erreur",
                description: "Impossible de traiter le remboursement.",
                variant: "destructive"
              });
            }
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
    <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'orders' | 'credit')} className="w-full">
      {/* Onglets principaux */}
      <TabsList className="grid w-full grid-cols-2 h-auto">
        <TabsTrigger value="orders" className="flex items-center gap-2 text-xs sm:text-sm py-2">
          <ShoppingCart className="w-4 h-4" />
          <span>Commandes</span>
        </TabsTrigger>
        <TabsTrigger value="credit" className="flex items-center gap-2 text-xs sm:text-sm py-2">
          <CreditCard className="w-4 h-4" />
          <span>Ventes Ã  CrÃ©dit</span>
        </TabsTrigger>
      </TabsList>

      {/* Onglet Commandes */}
      <TabsContent value="orders" className="mt-6">
        <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Titre et actions - Mobile optimisÃ© */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div className="min-w-0">
          <h2 className="text-lg md:text-2xl font-bold truncate">Ventes & Commandes</h2>
          <p className="text-xs md:text-sm text-muted-foreground truncate">Ventes POS (en boutique) et Commandes en ligne</p>
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
              description: "L'export des commandes sera bientÃ´t disponible."
            });
          }}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          <Button variant="outline" className="flex-shrink-0 h-9 px-3 text-xs md:text-sm" onClick={() => {
            toast({
              title: "Rapport gÃ©nÃ©rÃ©",
              description: "Le rapport des commandes sera bientÃ´t disponible."
            });
          }}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">Rapport</span>
          </Button>
        </div>
      </div>

      {/* Boutons Ventes POS et En Ligne - Mobile optimisÃ© */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {/* Bouton Ventes POS - VerrouillÃ© si vendeur "online" uniquement */}
        <Card 
          className={`border-2 transition-all ${
            canAccessPOS 
              ? 'border-vendeur-secondary bg-vendeur-secondary/5 cursor-pointer hover:shadow-lg active:scale-[0.98]' 
              : 'border-gray-300 bg-gray-100/50 cursor-not-allowed opacity-60'
          }`}
          onClick={() => {
            if (!canAccessPOS) {
              toast({
                title: "AccÃ¨s restreint",
                description: "Le module POS n'est pas disponible pour les boutiques en ligne uniquement.",
                variant: "destructive"
              });
              return;
            }
            setActiveView('pos');
            setTimeout(() => {
              document.querySelector('.pos-orders-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
        >
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
            <CardTitle className={`flex items-center gap-2 text-base md:text-lg ${canAccessPOS ? 'text-vendeur-secondary' : 'text-gray-500'}`}>
              {canAccessPOS ? 'ðŸ›’' : <Lock className="w-4 h-4" />} Ventes POS
              {!canAccessPOS && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Non disponible
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
              {canAccessPOS ? 'Ventes par points de vente' : 'RÃ©servÃ© aux boutiques physiques'}
            </p>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Total ventes</p>
                <p className={`text-xl md:text-3xl font-bold ${canAccessPOS ? 'text-vendeur-secondary' : 'text-gray-400'}`}>
                  {orders.filter(o => o.source === 'pos').length}
                </p>
              </div>
              <div className="bg-white/80 rounded-lg p-2 md:p-4">
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">Chiffre d'affaires</p>
                <p className={`text-sm md:text-xl font-bold truncate ${canAccessPOS ? 'text-vendeur-secondary' : 'text-gray-400'}`}>
                  {orders
                    .filter(o => o.source === 'pos' && o.payment_status === 'paid')
                    .reduce((sum, o) => sum + o.total_amount, 0)
                    .toLocaleString()} <span className="text-xs">GNF</span>
                </p>
              </div>
            </div>
            <Button 
              className={`w-full mt-3 md:mt-4 h-9 text-xs md:text-sm ${
                canAccessPOS 
                  ? 'bg-vendeur-secondary hover:bg-vendeur-secondary/90' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={!canAccessPOS}
            >
              {canAccessPOS ? 'Voir les ventes POS' : 'POS verrouillÃ©'}
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
              ðŸ“¦ Commandes En Ligne
            </CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
              Commandes clients Ã  prÃ©parer et livrer
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
                <p className="text-[10px] md:text-sm text-muted-foreground mb-0.5 md:mb-1">LivrÃ©es</p>
                <p className="text-lg md:text-2xl font-bold text-primary-orange-600">
                  {deliveredOnlineOrders}
                </p>
              </div>
            </div>
            <Button className="w-full mt-3 md:mt-4 bg-blue-600 hover:bg-blue-700 h-9 text-xs md:text-sm">
              Voir les commandes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filtres - Mobile optimisÃ© */}
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
                <option value="confirmed">ConfirmÃ©es</option>
                <option value="processing">En prÃ©paration</option>
                <option value="shipped">ExpÃ©diÃ©es</option>
                <option value="delivered">LivrÃ©es</option>
                <option value="cancelled">AnnulÃ©es</option>
              </select>
              <Filter className="w-4 h-4 text-muted-foreground hidden md:block" />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Tableau des Ventes POS */}
      {activeView === 'pos' ? (() => {
        const posOrders = orders.filter(o => o.source === 'pos');
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const filterByPeriod = (list: typeof posOrders, period: string) => {
          if (period === 'day') return list.filter(o => new Date(o.created_at) >= startOfDay);
          if (period === 'week') return list.filter(o => new Date(o.created_at) >= startOfWeek);
          if (period === 'month') return list.filter(o => new Date(o.created_at) >= startOfMonth);
          if (period === 'year') return list.filter(o => new Date(o.created_at) >= startOfYear);
          return list;
        };

        const calcCA = (list: typeof posOrders) =>
          list.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total_amount, 0);

        const calcAvg = (list: typeof posOrders) => {
          const paid = list.filter(o => o.payment_status === 'paid');
          return paid.length > 0 ? Math.round(calcCA(list) / paid.length) : 0;
        };

        return (
        <Card className="border-2 border-vendeur-secondary/30 bg-vendeur-secondary/5 pos-orders-section">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-vendeur-secondary text-base md:text-lg">
            ðŸ›’ Ventes POS ({posOrders.length})
          </CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Commandes via points de vente
          </p>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
          {/* Filtres par pÃ©riode */}
          <Tabs defaultValue="all" className="mb-6">
            <TabsList className="grid grid-cols-5 w-full bg-muted/50">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-vendeur-secondary data-[state=active]:text-white">
                Tout
              </TabsTrigger>
              <TabsTrigger value="day" className="text-xs data-[state=active]:bg-vendeur-secondary data-[state=active]:text-white">
                Jour
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs data-[state=active]:bg-vendeur-secondary data-[state=active]:text-white">
                Semaine
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs data-[state=active]:bg-vendeur-secondary data-[state=active]:text-white">
                Mois
              </TabsTrigger>
              <TabsTrigger value="year" className="text-xs data-[state=active]:bg-vendeur-secondary data-[state=active]:text-white">
                AnnÃ©e
              </TabsTrigger>
            </TabsList>

            {['all', 'day', 'week', 'month', 'year'].map(period => {
              const filtered = filterByPeriod(posOrders, period);
              const ca = calcCA(filtered);
              const avg = calcAvg(filtered);
              const periodLabel = period === 'all' ? 'Total' : period === 'day' ? "Aujourd'hui" : period === 'week' ? 'Cette semaine' : period === 'month' ? 'Ce mois' : 'Cette annÃ©e';

              return (
                <TabsContent key={period} value={period} className="mt-4 space-y-4">
                  {/* Statistiques par pÃ©riode */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-white/80 dark:bg-card">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(15,100%,50%)]/10 flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4 text-[hsl(15,100%,50%)]" />
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">{periodLabel}</p>
                            <p className="text-lg md:text-xl font-bold">{filtered.length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/80 dark:bg-card">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(15,100%,50%)]/10 flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-[hsl(15,100%,50%)]" />
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">CA {periodLabel}</p>
                            <p className="text-sm md:text-lg font-bold truncate">{ca.toLocaleString()} <span className="text-[10px] text-muted-foreground">GNF</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/80 dark:bg-card">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[hsl(220,96%,32%)]/10 flex items-center justify-center">
                            <Banknote className="w-4 h-4 text-[hsl(220,96%,32%)]" />
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">Panier moyen</p>
                            <p className="text-sm md:text-lg font-bold truncate">{avg.toLocaleString()} <span className="text-[10px] text-muted-foreground">GNF</span></p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/80 dark:bg-card">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary-blue-500/10 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-primary-blue-500" />
                          </div>
                          <div>
                            <p className="text-[10px] md:text-xs text-muted-foreground">PayÃ©es</p>
                            <p className="text-lg md:text-xl font-bold">{filtered.filter(o => o.payment_status === 'paid').length}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Liste des ventes */}
                  <div className="space-y-4">
                    {filtered.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Aucune vente POS {period !== 'all' ? `pour ${periodLabel.toLowerCase()}` : 'pour le moment'}</p>
                      </div>
                    ) : (
                      filtered.map((order) => (
                <div key={order.id} className="border-2 border-[hsl(15,100%,50%)]/20 rounded-lg p-3 sm:p-6 bg-white hover:shadow-lg transition-all">
                  {/* Mobile-first header layout */}
                  <div className="space-y-3 mb-4">
                    {/* Order number and ID */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base sm:text-xl text-[hsl(15,100%,50%)] break-all">{order.order_number}</h3>
                      <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                        ID: {order.id.slice(0, 8)}
                      </Badge>
                    </div>
                    
                    {/* Badges - wrap on mobile */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <Badge className="bg-[hsl(15,100%,50%)] text-white text-[10px] sm:text-xs shrink-0">
                        ðŸ›’ Vente POS
                      </Badge>
                      <Badge className={`${statusColors[order.status]} text-[10px] sm:text-xs shrink-0`}>
                        {statusLabels[order.status]}
                      </Badge>
                      <Badge className={`${paymentStatusColors[order.payment_status]} text-[10px] sm:text-xs shrink-0`}>
                        {paymentStatusLabels[order.payment_status]}
                      </Badge>
                    </div>
                  </div>
                      
                  {/* Informations Client - responsive */}
                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4 space-y-2">
                    <h4 className="font-semibold text-xs sm:text-sm text-primary mb-2 flex items-center gap-2">
                      <User className="w-3 h-3 sm:w-4 sm:h-4" />
                      Informations Client
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div>
                        <span className="text-muted-foreground">Nom:</span>
                        <span className="ml-2 font-semibold break-all">
                          {order.customers?.profiles?.full_name 
                            || `${order.customers?.profiles?.first_name || ''} ${order.customers?.profiles?.last_name || ''}`.trim()
                            || 'Client'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ID Client:</span>
                        <span className="ml-2 font-mono text-[10px] sm:text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                          {order.customers?.id 
                            ? `CLI${order.customers.id.slice(-4).toUpperCase()}`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">TÃ©lÃ©phone:</span>
                        <span className="ml-2 font-semibold">
                          {order.customers?.profiles?.phone || 'Non renseignÃ©'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <span className="ml-2 font-semibold break-all">
                          {order.customers?.profiles?.email || 'Non renseignÃ©'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date de vente */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Vendu le {new Date(order.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
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
                      <p className="text-xl font-bold text-[hsl(15,100%,50%)]">
                        {order.total_amount.toLocaleString()} GNF
                      </p>
                      {order.discount_amount > 0 && (
                        <p className="text-sm text-primary-orange-600">
                          Remise: -{order.discount_amount.toLocaleString()} GNF
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">MÃ©thode de paiement</p>
                      <div className="text-sm text-muted-foreground">
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        {getPaymentMethodLabel(order)}
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
                      DÃ©tails
                    </Button>
                  </div>
                </div>
              ))
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
        );
      })() : null}


      {/* Section des Commandes En Ligne */}
      {activeView === 'online' && (
        <Card className="border-2 border-blue-200 bg-blue-50/30 online-orders-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            ðŸ“¦ Commandes En Ligne ({onlineOrders.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Commandes Ã  prÃ©parer et livrer aux clients
          </p>
        </CardHeader>
        <CardContent>
          {/* Statistiques Commandes En Ligne */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card 
              className={`bg-white/80 cursor-pointer transition-all hover:shadow-md ${onlineStatusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setOnlineStatusFilter('all')}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total commandes</p>
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
              className={`bg-white/80 cursor-pointer transition-all hover:shadow-md ${onlineStatusFilter === 'delivered' ? 'ring-2 ring-primary-orange-500' : ''}`}
              onClick={() => setOnlineStatusFilter('delivered')}
            >
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">LivrÃ©es</p>
                <p className="text-2xl font-bold text-primary-orange-600">
                  {deliveredOnlineOrders}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Liste des Commandes En Ligne */}
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
                    ? 'Aucune commande en ligne pour le moment'
                    : `Aucune commande ${onlineStatusFilter === 'pending' ? 'en attente' : onlineStatusFilter === 'processing' ? 'en cours' : 'livrÃ©e'}`
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
                <div key={order.id} className="border-2 border-blue-200 rounded-lg p-3 sm:p-6 bg-white hover:shadow-lg transition-all">
                  {/* Mobile-first header layout */}
                  <div className="space-y-3 mb-4">
                    {/* Order number and ID */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base sm:text-xl text-blue-700 break-all">{order.order_number}</h3>
                      <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                        ID: {order.id.slice(0, 8)}
                      </Badge>
                    </div>
                    
                    {/* Badges - wrap on mobile */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <Badge className="bg-blue-500 text-white text-[10px] sm:text-xs shrink-0">
                        ðŸ“¦ Commande En Ligne
                      </Badge>
                      <Badge className={`${statusColors[order.status]} text-[10px] sm:text-xs shrink-0`}>
                        {statusLabels[order.status]}
                      </Badge>
                      <Badge className={`${paymentStatusColors[order.payment_status]} text-[10px] sm:text-xs shrink-0`}>
                        {paymentStatusLabels[order.payment_status]}
                      </Badge>
                      {order.escrow && (
                        <Badge className={`text-[10px] sm:text-xs shrink-0 ${
                          order.escrow.status === 'pending' || order.escrow.status === 'held' 
                            ? 'bg-orange-100 text-orange-800 border-orange-300 border-2' :
                          order.escrow.status === 'released' 
                            ? 'bg-primary-orange-100 text-primary-orange-800 border-primary-orange-300 border-2' :
                          order.escrow.status === 'refunded' 
                            ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {(order.escrow.status === 'pending' || order.escrow.status === 'held') && 'ðŸ”’ Escrow'}
                          {order.escrow.status === 'released' && 'âœ… ReÃ§u'}
                          {order.escrow.status === 'refunded' && 'â†©ï¸ RemboursÃ©'}
                          {order.escrow.status === 'dispute' && 'âš ï¸ Litige'}
                        </Badge>
                      )}
                      {/* Badge Paiement Ã  la livraison */}
                      {order.source === 'online' && 
                       order.payment_method === 'cash' && 
                       order.payment_status === 'pending' &&
                       (order.shipping_address as any)?.is_cod === true && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 border-2 text-[10px] sm:text-xs shrink-0">
                          ðŸ’µ Paiement Ã  la livraison
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Informations Client - responsive */}
                  {order.customers && (
                    <div className="bg-muted/50 rounded-lg p-3 sm:p-4 mb-4 space-y-2">
                      <h4 className="font-semibold text-xs sm:text-sm text-primary mb-2 flex items-center gap-2">
                        <User className="w-3 h-3 sm:w-4 sm:h-4" />
                        Informations Client
                      </h4>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div>
                          <span className="text-muted-foreground">Nom:</span>
                          <span className="ml-2 font-semibold break-all">
                            {order.customers?.profiles?.full_name 
                              || `${order.customers?.profiles?.first_name || ''} ${order.customers?.profiles?.last_name || ''}`.trim()
                              || 'Client'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ID Client:</span>
                          <span className="ml-2 font-mono text-[10px] sm:text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">
                            {order.customers?.id 
                              ? `CLI${order.customers.id.slice(-4).toUpperCase()}`
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ðŸ“ž TÃ©lÃ©phone:</span>
                          <span className="ml-2 font-semibold">
                            {order.customers?.profiles?.phone || 'Non renseignÃ©'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <span className="ml-2 font-semibold break-all">
                            {order.customers?.profiles?.email || 'Non renseignÃ©'}
                          </span>
                        </div>
                      </div>
                      {/* Adresse de livraison gÃ©olocalisÃ©e + numÃ©ro COD */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-muted-foreground text-xs">Adresse de livraison:</span>
                            <p className="font-medium text-sm mt-1">
                              {[
                                (order.shipping_address as any)?.is_cod !== true ? (order.shipping_address as any)?.address : null,
                                (order.shipping_address as any)?.neighborhood,
                                (order.shipping_address as any)?.landmark,
                                (order.shipping_address as any)?.city,
                                (order.shipping_address as any)?.country
                              ].filter(Boolean).join(', ') || 'Non disponible'}
                            </p>
                          </div>
                        </div>
                        {(order.shipping_address as any)?.is_cod === true && (order.shipping_address as any)?.cod_phone && (
                          <p className="text-sm font-bold text-primary mt-1 ml-6">
                            ðŸ“ž NumÃ©ro Ã  contacter: {(order.shipping_address as any).cod_phone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date de commande */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>CommandÃ© le {new Date(order.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Articles commandÃ©s</p>
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
                        <p className="text-sm text-primary-orange-600">
                          Remise: -{order.discount_amount.toLocaleString()} GNF
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">MÃ©thode de paiement</p>
                      <div className="text-sm text-muted-foreground">
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        {getPaymentMethodLabel(order)}
                      </div>
                    </div>
                  </div>

                  {/* Escrow workflow info */}
                  {order.escrow && (
                    <div className={`p-3 rounded-lg border mb-4 ${
                      order.escrow.status === 'pending' || order.escrow.status === 'held'
                        ? 'bg-blue-50 border-blue-200'
                        : order.escrow.status === 'released'
                        ? 'bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 border-primary-orange-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          order.escrow.status === 'pending' || order.escrow.status === 'held'
                            ? 'text-blue-600'
                            : order.escrow.status === 'released'
                            ? 'text-primary-orange-600'
                            : 'text-gray-600'
                        }`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            order.escrow.status === 'pending' || order.escrow.status === 'held'
                              ? 'text-blue-800'
                              : order.escrow.status === 'released'
                              ? 'text-primary-orange-800'
                              : 'text-gray-800'
                          }`}>
                            {(order.escrow.status === 'pending' || order.escrow.status === 'held') && (
                              <>ðŸ”’ Fonds sÃ©curisÃ©s - {order.escrow.amount.toLocaleString()} GNF</>
                            )}
                            {order.escrow.status === 'released' && (
                              <>âœ… Paiement libÃ©rÃ© ! Vous avez reÃ§u {order.escrow.amount.toLocaleString()} GNF</>
                            )}
                            {order.escrow.status === 'refunded' && 'â†©ï¸ Commande remboursÃ©e au client'}
                          </p>
                          <p className={`text-xs mt-1 ${
                            order.escrow.status === 'pending' || order.escrow.status === 'held'
                              ? 'text-blue-700'
                              : order.escrow.status === 'released'
                              ? 'text-primary-orange-700'
                              : 'text-gray-700'
                          }`}>
                            {(order.escrow.status === 'pending' || order.escrow.status === 'held') && (
                              order.status === 'in_transit' 
                                ? "â³ En attente de confirmation de livraison par le client"
                                : order.status === 'delivered'
                                ? "ðŸ“¦ Commande livrÃ©e - le client doit confirmer la rÃ©ception"
                                : "Continuez le processus: Confirmer â†’ PrÃ©parer â†’ ExpÃ©dier â†’ Client confirme"
                            )}
                            {order.escrow.status === 'released' && 'Le client a confirmÃ© la rÃ©ception de sa commande'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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
                      DÃ©tails
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      )}


      {/* Dialog des dÃ©tails de commande */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DÃ©tails de la commande {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Informations gÃ©nÃ©rales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informations commande</h4>
                  <div className="space-y-2 text-sm">
                    <div>Status: <Badge className={statusColors[selectedOrder.status]}>{statusLabels[selectedOrder.status]}</Badge></div>
                    <div>Paiement: <Badge className={paymentStatusColors[selectedOrder.payment_status]}>{paymentStatusLabels[selectedOrder.payment_status]}</Badge></div>
                    <div>Date: {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')}</div>
                    <div>MÃ©thode de paiement: {getPaymentMethodLabel(selectedOrder)}</div>
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
                      <div className="flex justify-between text-primary-orange-600">
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

              {/* Articles commandÃ©s */}
              <div>
                <h4 className="font-semibold mb-4">Articles commandÃ©s</h4>
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
                      <span>Non spÃ©cifiÃ©e</span>
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

              {/* Bouton Ã‰tiquette Colis */}
              <div className="border-t pt-4">
                <Button
                  onClick={() => {
                    const addr = selectedOrder.shipping_address as any;
                    const profile = selectedOrder.customers?.profiles;
                    const customerName = profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Client';
                    const customerEmail = profile?.email || '';
                    const customerPhone = profile?.phone || '';
                    const codPhone = addr?.cod_phone || '';
                    const isCOD = addr?.is_cod === true || selectedOrder.payment_method === 'cash_on_delivery' || selectedOrder.metadata?.payment_method === 'cash_on_delivery';

                    const labelHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Ã‰tiquette Colis - ${selectedOrder.order_number}</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; width: 100mm; min-height: 150mm; padding: 5mm; background: #fff; }
  .label { border: 2.5px solid #111; border-radius: 4mm; padding: 5mm; height: 140mm; display: flex; flex-direction: column; }
  .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 4mm; margin-bottom: 4mm; }
  .header h1 { font-size: 14pt; text-transform: uppercase; letter-spacing: 2px; color: #111; }
  .header .order-num { font-size: 11pt; color: #555; margin-top: 2mm; font-weight: 600; }
  .section { margin-bottom: 3mm; }
  .section-title { font-size: 7pt; text-transform: uppercase; letter-spacing: 1.5px; color: #888; font-weight: 700; margin-bottom: 1.5mm; }
  .field { font-size: 11pt; font-weight: 600; color: #111; padding: 1.5mm 0; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 2mm; }
  .field .icon { font-size: 9pt; color: #666; min-width: 12mm; }
  .field .value { flex: 1; }
  .cod-badge { background: #dc2626; color: #fff; font-size: 8pt; font-weight: 800; text-transform: uppercase; padding: 2mm 4mm; border-radius: 2mm; text-align: center; margin-top: 3mm; letter-spacing: 1px; }
  .cod-phone { background: #fef2f2; border: 1.5px solid #dc2626; border-radius: 2mm; padding: 2mm 3mm; margin-top: 2mm; }
  .cod-phone .value { color: #dc2626; font-weight: 800; font-size: 12pt; }
  .footer { margin-top: auto; text-align: center; border-top: 2px dashed #333; padding-top: 3mm; }
  .footer .date { font-size: 8pt; color: #888; }
  .address-block { background: #f8f8f8; border-radius: 2mm; padding: 2.5mm 3mm; margin-top: 2mm; }
  .address-line { font-size: 10pt; color: #333; line-height: 1.5; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="label">
  <div class="header">
    <h1>ðŸ“¦ Ã‰tiquette Colis</h1>
    <div class="order-num">${selectedOrder.order_number}</div>
  </div>

  <div class="section">
    <div class="section-title">Destinataire</div>
    <div class="field"><span class="icon">ðŸ‘¤</span><span class="value">${customerName}</span></div>
    ${customerEmail ? `<div class="field"><span class="icon">âœ‰ï¸</span><span class="value">${customerEmail}</span></div>` : ''}
    ${customerPhone ? `<div class="field"><span class="icon">ðŸ“ž</span><span class="value">${customerPhone}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Articles</div>
    ${(selectedOrder.order_items || []).map((item: any) => `<div class="field"><span class="icon">ðŸ“¦</span><span class="value">${item.products?.name || 'Produit'} Ã— ${item.quantity}</span></div>`).join('')}
  </div>

  ${addr ? `
  <div class="section">
    <div class="section-title">Adresse de livraison</div>
    <div class="address-block">
      ${addr.street ? `<div class="address-line">${addr.street}</div>` : ''}
      <div class="address-line">${addr.city || ''}${addr.postal_code ? ', ' + addr.postal_code : ''}</div>
      ${addr.country ? `<div class="address-line">${addr.country}</div>` : ''}
    </div>
  </div>` : ''}

  ${isCOD ? `
  <div class="section">
    <div class="cod-badge">âš ï¸ Paiement Ã  la livraison (COD)</div>
    ${codPhone ? `
    <div class="cod-phone field">
      <span class="icon">ðŸ“±</span>
      <span class="value">${codPhone}</span>
    </div>` : ''}
    <div class="field" style="font-size:12pt;font-weight:800;color:#dc2626;justify-content:center;border:none;margin-top:2mm;">
      Montant Ã  collecter: ${selectedOrder.total_amount.toLocaleString()} GNF
    </div>
  </div>` : ''}

  <div class="footer">
    <div class="date">ImprimÃ© le ${new Date().toLocaleDateString('fr-FR')} Ã  ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;

                    const blob = new Blob([labelHTML], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const opened = window.open(url, '_blank', 'noopener,noreferrer');
                    if (!opened) {
                      toast({ title: 'Popup bloqu00e9e', description: 'Autorisez les popups' });
                    }
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  }}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  GÃ©nÃ©rer Ã©tiquette colis
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </TabsContent>

      {/* Onglet Ventes Ã  CrÃ©dit */}
      <TabsContent value="credit" className="mt-6">
        {vendorId ? <CreditSalesForm /> : <p>Chargement...</p>}
      </TabsContent>
    </Tabs>
  );
}