/**
 * Liste des commandes du client avec possibilitÃ© de confirmer la rÃ©ception
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Package, CheckCircle, Clock, Truck, XCircle, 
  Shield, AlertCircle, Loader2, ListFilter, Ban, DollarSign, Banknote
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProductRatingDialog from './ProductRatingDialog';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  total_amount: number;
  created_at: string;
  vendor_id: string;
  metadata?: any;
  shipping_address?: any;
  vendors?: {
    business_name: string;
  };
  order_items?: {
    quantity: number;
    products: {
      name: string;
    };
  }[];
}

// Helper pour vÃ©rifier si une commande est paiement Ã  la livraison
const isCashOnDelivery = (order: Order): boolean => {
  return order.payment_method === 'cash' && 
         order.shipping_address?.is_cod === true;
};
interface EscrowStatus {
  id: string;
  status: string;
  amount: number;
}

export default function ClientOrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [escrows, setEscrows] = useState<Record<string, EscrowStatus>>({});
  const [loading, setLoading] = useState(true);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'delivered'>('all');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingOrderData, setRatingOrderData] = useState<{ orderId: string; vendorId: string; vendorName: string } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadOrders();
      
      // Configurer l'Ã©coute en temps rÃ©el pour les commandes ET les escrows
      const ordersChannel = supabase
        .channel('client-orders-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('ðŸ”„ Mise Ã  jour en temps rÃ©el des commandes:', payload);
            loadOrders(); // Recharger les commandes
          }
        )
        .subscribe();

      // Ã‰couter aussi les changements d'escrow pour mettre Ã  jour le bouton
      const escrowChannel = supabase
        .channel('client-escrow-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'escrow_transactions'
          },
          (payload) => {
            console.log('ðŸ”„ Mise Ã  jour en temps rÃ©el des escrows:', payload);
            loadOrders(); // Recharger les commandes et escrows
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(escrowChannel);
      };
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      if (!user?.id) return;

      // RÃ©cupÃ©rer le customer_id
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) return;

      // RÃ©cupÃ©rer toutes les commandes du client (online et pos)
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          vendors(business_name),
          order_items(
            quantity,
            products(name)
          )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);

      // Charger les statuts escrow pour chaque commande
      if (ordersData && ordersData.length > 0) {
        const escrowPromises = ordersData.map(async (order) => {
          let escrow: EscrowStatus | null = null;

          const { data: escrowByOrder } = await supabase
            .from('escrow_transactions')
            .select('id, status, amount')
            .eq('order_id', order.id)
            .maybeSingle();

          escrow = escrowByOrder;

          if (!escrow && order.payment_method === 'card') {
            const paymentIntentId = typeof (order as any)?.metadata?.external_payment_id === 'string'
              ? (order as any).metadata.external_payment_id
              : null;
            if (paymentIntentId) {
              const { data: escrowByIntent } = await supabase
                .from('escrow_transactions')
                .select('id, status, amount')
                .eq('stripe_payment_intent_id', paymentIntentId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              escrow = escrowByIntent;
            }
          }

          return { orderId: order.id, escrow };
        });

        const escrowResults = await Promise.all(escrowPromises);
        const escrowMap: Record<string, EscrowStatus> = {};
        escrowResults.forEach(({ orderId, escrow }) => {
          if (escrow) {
            escrowMap[orderId] = escrow;
          }
        });
        setEscrows(escrowMap);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (order: Order) => {
    setSelectedOrder(order);
    setShowConfirmDialog(true);
  };

  const confirmDelivery = async () => {
    if (!selectedOrder) return;

    setConfirmingOrderId(selectedOrder.id);
    setShowConfirmDialog(false);

    try {
      const escrow = escrows[selectedOrder.id];

      const isCardOrder = selectedOrder.payment_method === 'card';
      if (isCardOrder && !escrow) {
        throw new Error("Commande carte non synchronisÃ©e avec l'escrow. Rechargez la page puis rÃ©essayez.");
      }

      if (escrow) {
        const { data, error } = await supabase.functions.invoke('confirm-delivery', {
          body: { order_id: selectedOrder.id }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erreur lors de la confirmation');
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'delivered', updated_at: new Date().toISOString() })
          .eq('id', selectedOrder.id);

        if (error) throw error;
      }

      toast.success('Livraison confirmÃ©e !', {
        description: 'Le vendeur a reÃ§u le paiement'
      });

      // Afficher la fenÃªtre de notation
      setRatingOrderData({
        orderId: selectedOrder.id,
        vendorId: selectedOrder.vendor_id,
        vendorName: selectedOrder.vendors?.business_name || 'ce vendeur'
      });
      setShowRatingDialog(true);

      // Recharger les commandes
      await loadOrders();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Erreur lors de la confirmation', {
        description: error instanceof Error ? error.message : 'Veuillez rÃ©essayer'
      });
    } finally {
      setConfirmingOrderId(null);
      setSelectedOrder(null);
    }
  };

  const handleCancelOrder = (order: Order) => {
    setSelectedOrder(order);
    setCancelReason('');
    setShowCancelDialog(true);
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrder) return;

    setCancellingOrderId(selectedOrder.id);
    setShowCancelDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('cancel-order', {
        body: {
          order_id: selectedOrder.id,
          reason: cancelReason
        }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de l\'annulation');
      }

      toast.success('Commande annulÃ©e avec succÃ¨s', {
        description: data.refunded ? 'Votre paiement a Ã©tÃ© remboursÃ©' : undefined
      });

      // Recharger les commandes
      await loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Erreur lors de l\'annulation', {
        description: error instanceof Error ? error.message : 'Veuillez rÃ©essayer'
      });
    } finally {
      setCancellingOrderId(null);
      setSelectedOrder(null);
      setCancelReason('');
    }
  };

  const handleRequestRefund = (order: Order) => {
    setSelectedOrder(order);
    setRefundReason('');
    setRefundAmount('');
    setShowRefundDialog(true);
  };

  const confirmRequestRefund = async () => {
    if (!selectedOrder) return;

    setRefundingOrderId(selectedOrder.id);
    setShowRefundDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('request-refund', {
        body: {
          order_id: selectedOrder.id,
          reason: refundReason,
          requested_amount: refundAmount ? parseFloat(refundAmount) : undefined,
          evidence_text: refundReason
        }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de la demande de remboursement');
      }

      toast.success('Demande de remboursement envoyÃ©e', {
        description: 'Le vendeur et l\'Ã©quipe ont Ã©tÃ© notifiÃ©s'
      });

      // Recharger les commandes
      await loadOrders();
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast.error('Erreur lors de la demande', {
        description: error instanceof Error ? error.message : 'Veuillez rÃ©essayer'
      });
    } finally {
      setRefundingOrderId(null);
      setSelectedOrder(null);
      setRefundReason('');
      setRefundAmount('');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { label: 'ConfirmÃ©e', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      preparing: { label: 'En prÃ©paration', color: 'bg-purple-100 text-purple-800', icon: Package },
      ready: { label: 'PrÃªte', color: 'bg-blue-100 text-blue-800', icon: Package },
      in_transit: { label: 'En transit', color: 'bg-orange-100 text-orange-800', icon: Truck },
      delivered: { label: 'LivrÃ©e', color: 'bg-primary-orange-100 text-primary-orange-800', icon: CheckCircle },
      cancelled: { label: 'AnnulÃ©e', color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getEscrowBadge = (escrowStatus?: string) => {
    if (!escrowStatus) return null;

    const escrowConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Fonds bloquÃ©s (Escrow)', color: 'bg-orange-100 text-orange-800' },
      released: { label: 'Fonds libÃ©rÃ©s', color: 'bg-primary-orange-100 text-primary-orange-800' },
      refunded: { label: 'RemboursÃ©', color: 'bg-gray-100 text-gray-800' },
      dispute: { label: 'Litige', color: 'bg-red-100 text-red-800' }
    };

    const config = escrowConfig[escrowStatus];
    if (!config) return null;

    return (
      <Badge className={config.color}>
        <Shield className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Filtrer les commandes selon le filtre actif
  const getFilteredOrders = () => {
    if (activeFilter === 'all') return orders;
    if (activeFilter === 'pending') {
      // En attente = pending, confirmed, preparing, ready
      return orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
    }
    if (activeFilter === 'in_progress') {
      // En cours = in_transit
      return orders.filter(o => o.status === 'in_transit');
    }
    if (activeFilter === 'delivered') {
      // LivrÃ©es = delivered
      return orders.filter(o => o.status === 'delivered');
    }
    return orders;
  };

  const filteredOrders = getFilteredOrders();
  const pendingCount = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;
  const inProgressCount = orders.filter(o => o.status === 'in_transit').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune commande pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Boutons de filtrage */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ListFilter className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Filtrer mes commandes</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('all')}
              className="flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Toutes ({orders.length})
            </Button>
            <Button
              variant={activeFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('pending')}
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              En attente ({pendingCount})
            </Button>
            <Button
              variant={activeFilter === 'in_progress' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('in_progress')}
              className="flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              En cours ({inProgressCount})
            </Button>
            <Button
              variant={activeFilter === 'delivered' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('delivered')}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              LivrÃ©es ({deliveredCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des commandes filtrÃ©es */}
      <Card>
        <CardContent className="p-6">
          <ScrollArea className="h-[600px] pr-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {activeFilter === 'pending' && 'Aucune commande en attente actuellement'}
                  {activeFilter === 'in_progress' && 'Aucune commande en cours actuellement'}
                  {activeFilter === 'delivered' && 'Aucune commande livrÃ©e actuellement'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const escrow = escrows[order.id];
                  const isCardOrder = order.payment_method === 'card';
                  const escrowPending = escrow?.status === 'pending' || escrow?.status === 'held';
                  const isDeliveryState = order.status === 'in_transit' || order.status === 'delivered';
                  const canConfirmDelivery = isDeliveryState && (isCardOrder ? escrowPending : (!escrow || escrowPending));

                  return (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-lg truncate">
                      Commande #{order.order_number}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {order.vendors?.business_name || 'Vendeur'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                    <div className="font-bold text-sm sm:text-lg whitespace-nowrap">
                      {order.total_amount.toLocaleString()} GNF
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Articles */}
                <div className="space-y-1">
                  {order.order_items?.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      {item.quantity}x {item.products.name}
                    </div>
                  ))}
                </div>

                {/* Statuts */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(order.status)}
                  {escrow && getEscrowBadge(escrow.status)}
                  {/* Badge paiement Ã  la livraison */}
                  {isCashOnDelivery(order) && (
                    <Badge className="bg-amber-100 text-amber-800">
                      <Banknote className="w-3 h-3 mr-1" />
                      Paiement Ã  la livraison
                    </Badge>
                  )}
                </div>

                {/* Info Paiement Ã  la livraison */}
                {isCashOnDelivery(order) && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Banknote className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Paiement Ã  la livraison
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Vous paierez {order.total_amount.toLocaleString()} GNF Ã  la rÃ©ception de votre commande
                      </p>
                    </div>
                  </div>
                )}

                {/* Protection Escrow */}
                {escrow && (escrow.status === 'pending' || escrow.status === 'held') && (
                  <div className="flex items-start gap-2 p-3 bg-gradient-to-br from-primary-blue-50 to-primary-orange-50 dark:bg-primary-orange-950 rounded-lg border border-primary-orange-200 dark:border-primary-orange-800">
                    <Shield className="w-5 h-5 text-primary-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary-orange-800 dark:text-primary-orange-200">
                        Paiement protÃ©gÃ©
                      </p>
                      <p className="text-xs text-primary-orange-700 dark:text-primary-orange-300">
                        Vos {escrow.amount.toLocaleString()} GNF sont sÃ©curisÃ©s en escrow jusqu'Ã  confirmation de livraison
                      </p>
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="space-y-2">
                  {/* Bouton d'annulation */}
                  {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                    <Button
                      variant="destructive"
                      onClick={() => handleCancelOrder(order)}
                      disabled={cancellingOrderId === order.id}
                      className="w-full"
                    >
                      {cancellingOrderId === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Annulation en cours...
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4 mr-2" />
                          Annuler la commande
                        </>
                      )}
                    </Button>
                  )}

                  {/* Bouton de demande de remboursement */}
                  {escrow && ['pending', 'held', 'released'].includes(escrow.status) && !['cancelled'].includes(order.status) && (
                    <Button
                      variant="outline"
                      onClick={() => handleRequestRefund(order)}
                      disabled={refundingOrderId === order.id}
                      className="w-full"
                    >
                      {refundingOrderId === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Demander un remboursement
                        </>
                      )}
                    </Button>
                  )}

                  {/* Bouton de confirmation */}
                  {canConfirmDelivery && (
                    <Button
                      onClick={() => handleConfirmDelivery(order)}
                      disabled={confirmingOrderId === order.id}
                      className="w-full"
                    >
                      {confirmingOrderId === order.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Confirmation en cours...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          J'ai reÃ§u ma commande
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Info si dÃ©jÃ  livrÃ©e */}
                {order.status === 'delivered' && escrow?.status === 'released' && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-primary-orange-600" />
                    <span className="text-sm text-muted-foreground">
                      Commande livrÃ©e et paiement transfÃ©rÃ© au vendeur
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la rÃ©ception ?</AlertDialogTitle>
            <AlertDialogDescription>
              En confirmant, vous attestez avoir reÃ§u votre commande en bon Ã©tat.
              Le paiement sera immÃ©diatement transfÃ©rÃ© au vendeur.
              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-orange-800 dark:text-orange-200">
                    Cette action est irrÃ©versible. Assurez-vous que votre colis est bien conforme.
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelivery}>
              Confirmer la rÃ©ception
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog d'annulation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>Vous Ãªtes sur le point d'annuler cette commande.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Raison de l'annulation (optionnel)</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-2 border rounded-md resize-none"
                    rows={3}
                    placeholder="Ex: J'ai changÃ© d'avis, produit indisponible ailleurs..."
                  />
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                      Si vous avez payÃ©, votre argent sera automatiquement remboursÃ© via le systÃ¨me Escrow.
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder la commande</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de demande de remboursement */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demander un remboursement</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>DÃ©crivez la raison de votre demande de remboursement. Votre demande sera examinÃ©e par notre Ã©quipe.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Raison du remboursement *</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2 border rounded-md resize-none"
                    rows={4}
                    placeholder="Ex: Produit dÃ©fectueux, non conforme, endommagÃ©..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Montant demandÃ© (optionnel)</label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Laisser vide pour remboursement total"
                  />
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-orange-800 dark:text-orange-200">
                      Un litige sera ouvert. Le vendeur pourra rÃ©pondre avant qu'une dÃ©cision finale ne soit prise.
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRequestRefund} disabled={!refundReason.trim()}>
              Envoyer la demande
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de notation des produits */}
      {ratingOrderData && (
        <ProductRatingDialog
          open={showRatingDialog}
          onOpenChange={setShowRatingDialog}
          orderId={ratingOrderData.orderId}
          vendorId={ratingOrderData.vendorId}
          vendorName={ratingOrderData.vendorName}
          onRatingSubmitted={() => {
            setRatingOrderData(null);
          }}
        />
      )}
    </>
  );
}
