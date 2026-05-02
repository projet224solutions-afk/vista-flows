/**
 * Liste des commandes du client avec possibilité de confirmer la réception
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { cancelOrder as cancelOrderRequest, confirmCashOnDeliveryOrder, listMyOrders } from '@/services/orderBackendService';
import { toast } from 'sonner';
import {
  Package, CheckCircle, Clock, Truck, XCircle,
  Shield, AlertCircle, Loader2, ListFilter, Ban, DollarSign, Banknote
} from 'lucide-react';
import { _Tabs, _TabsContent, _TabsList, _TabsTrigger } from '@/components/ui/tabs';
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
    product_name?: string;
    products: {
      name: string;
    } | null;
  }[];
  escrow?: EscrowStatus | null;
}

interface RatingOrderData {
  orderId: string;
  vendorId: string;
  vendorName: string;
}

// Helper pour vérifier si une commande est paiement à la livraison
const isCashOnDelivery = (order: Order): boolean => {
  return order.payment_method === 'cash' &&
         (
           order.shipping_address?.is_cod === true ||
           order.metadata?.is_cod === true ||
           order.metadata?.payment_type === 'cash_on_delivery'
         );
};

const canCancelOrder = (order: Order): boolean => order.status === 'pending';
interface EscrowStatus {
  id: string;
  status: string;
  amount: number;
  commission_amount?: number | null;
  metadata?: Record<string, any> | null;
  currency?: string;
}

const getVendorReceivableAmount = (order: Order, escrow?: EscrowStatus | null): number => {
  const metadataVendorAmount = Number(escrow?.metadata?.vendor_amount);
  if (Number.isFinite(metadataVendorAmount)) {
    return metadataVendorAmount;
  }

  if (typeof escrow?.amount === 'number' && Number.isFinite(escrow.amount)) {
    const commissionAmount = Number(escrow.commission_amount);
    return Math.max(escrow.amount - (Number.isFinite(commissionAmount) ? commissionAmount : 0), 0);
  }

  return typeof order.total_amount === 'number' && Number.isFinite(order.total_amount)
    ? order.total_amount
    : 0;
};

const getVendorReceivableCurrency = (order: Order, escrow?: EscrowStatus | null): string => {
  const metadataCurrency = typeof order.metadata?.currency === 'string' ? order.metadata.currency : null;
  const shippingCurrency = typeof order.shipping_address?.currency === 'string' ? order.shipping_address.currency : null;
  return escrow?.currency || metadataCurrency || shippingCurrency || 'GNF';
};

const extractFunctionErrorMessage = async (error: unknown): Promise<string> => {
  if (error instanceof Error && error.message) {
    const functionError = error as Error & { context?: { json?: () => Promise<any> } };
    if (functionError.context?.json) {
      try {
        const payload = await functionError.context.json();
        if (payload?.error && typeof payload.error === 'string') {
          return payload.error;
        }
      } catch {
        // Ignore JSON parsing issues and fallback to the standard error message.
      }
    }

    return error.message;
  }

  return 'Veuillez réessayer';
};

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
  const [ratingOrderData, setRatingOrderData] = useState<RatingOrderData | null>(null);
  const [pendingRatingOrderData, setPendingRatingOrderData] = useState<RatingOrderData | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const selectedOrderEscrow = selectedOrder ? escrows[selectedOrder.id] ?? selectedOrder.escrow ?? null : null;
  const selectedOrderIsCashOnDelivery = selectedOrder ? isCashOnDelivery(selectedOrder) : false;
  const sellerReceivableAmount = selectedOrder
    ? getVendorReceivableAmount(selectedOrder, selectedOrderEscrow)
    : 0;
  const sellerReceivableCurrency = selectedOrder
    ? getVendorReceivableCurrency(selectedOrder, selectedOrderEscrow)
    : 'GNF';

  useEffect(() => {
    if (user) {
      loadOrders();

      // Configurer l'écoute en temps réel pour les commandes ET les escrows
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
            console.log('🔄 Mise à jour en temps réel des commandes:', payload);
            loadOrders(); // Recharger les commandes
          }
        )
        .subscribe();

      // Écouter aussi les changements d'escrow pour mettre à jour le bouton
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
            console.log('🔄 Mise à jour en temps réel des escrows:', payload);
            loadOrders(); // Recharger les commandes et escrows
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(escrowChannel);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!pendingRatingOrderData || showConfirmDialog) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRatingOrderData(pendingRatingOrderData);
      setShowRatingDialog(true);
      setPendingRatingOrderData(null);
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [pendingRatingOrderData, showConfirmDialog]);

  const loadOrders = async () => {
    try {
      if (!user?.id) return;

      const response = await listMyOrders({ limit: 100 });
      if (!response.success) {
        throw new Error(response.error || 'Impossible de charger les commandes');
      }

      const ordersData = (response.data || []) as Order[];
      setOrders(ordersData);

      const escrowMap: Record<string, EscrowStatus> = {};
      ordersData.forEach((order) => {
        if (order.escrow) {
          escrowMap[order.id] = order.escrow;
        }
      });
      setEscrows(escrowMap);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = (order: Order) => {
    if (isCashOnDelivery(order)) {
      void confirmDelivery(order);
      return;
    }

    setSelectedOrder(order);
    setShowConfirmDialog(true);
  };

  const confirmDelivery = async (orderOverride?: Order) => {
    const orderToConfirm = orderOverride ?? selectedOrder;
    if (!orderToConfirm) return;

    setConfirmingOrderId(orderToConfirm.id);
    if (!orderOverride) {
      setShowConfirmDialog(false);
    }

    try {
      const escrow = escrows[orderToConfirm.id];
      const requiresEscrowRelease = orderToConfirm.payment_method !== 'cash';

      if (requiresEscrowRelease) {
        const { data, error } = await supabase.functions.invoke('confirm-delivery', {
          body: { order_id: orderToConfirm.id }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erreur lors de la confirmation');
      } else {
        const response = await confirmCashOnDeliveryOrder(orderToConfirm.id);
        if (!response.success) {
          throw new Error(response.error || 'Erreur lors de la confirmation du paiement à la livraison');
        }
      }

      toast.success('Réception confirmée !', {
        description: escrow ? 'Le vendeur a reçu le paiement' : 'La commande est maintenant terminée'
      });

      // Afficher la fenêtre de notation
      setPendingRatingOrderData({
        orderId: orderToConfirm.id,
        vendorId: orderToConfirm.vendor_id,
        vendorName: orderToConfirm.vendors?.business_name || 'ce vendeur'
      });

      // Recharger les commandes
      await loadOrders();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      const errorMessage = await extractFunctionErrorMessage(error);
      toast.error('Erreur lors de la confirmation', {
        description: errorMessage
      });
    } finally {
      setConfirmingOrderId(null);
      if (!orderOverride) {
        setSelectedOrder(null);
      }
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
      const response = await cancelOrderRequest(
        selectedOrder.id,
        cancelReason.trim() || 'Annulation demandée par le client'
      );

      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de l\'annulation');
      }

      const refund = (response as any).refund;
      if (refund?.refunded && refund.amount > 0) {
        toast.success('Commande annulée — remboursement effectué', {
          description: `${refund.amount.toLocaleString()} ${refund.currency} remboursés dans votre portefeuille`,
        });
      } else {
        toast.success('Commande annulée avec succès');
      }

      // Recharger les commandes
      await loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Erreur lors de l\'annulation', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer'
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

      toast.success('Demande de remboursement envoyée', {
        description: 'Le vendeur et l\'équipe ont été notifiés'
      });

      // Recharger les commandes
      await loadOrders();
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast.error('Erreur lors de la demande', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer'
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
      confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      preparing: { label: 'En préparation', color: 'bg-purple-100 text-purple-800', icon: Package },
      ready: { label: 'Prête', color: 'bg-blue-100 text-blue-800', icon: Package },
      in_transit: { label: 'En transit', color: 'bg-orange-100 text-orange-800', icon: Truck },
      delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      completed: { label: 'Terminée', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: XCircle }
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
      pending: { label: 'Fonds bloqués (Escrow)', color: 'bg-orange-100 text-orange-800' },
      released: { label: 'Fonds libérés', color: 'bg-green-100 text-green-800' },
      refunded: { label: 'Remboursé', color: 'bg-gray-100 text-gray-800' },
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
      // Livrées = delivered + completed
      return orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    }
    return orders;
  };

  const filteredOrders = getFilteredOrders();
  const pendingCount = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;
  const inProgressCount = orders.filter(o => o.status === 'in_transit').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;

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
              Livrées ({deliveredCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des commandes filtrées */}
      <Card>
        <CardContent className="p-6">
          <ScrollArea className="h-[600px] pr-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {activeFilter === 'pending' && 'Aucune commande en attente actuellement'}
                  {activeFilter === 'in_progress' && 'Aucune commande en cours actuellement'}
                  {activeFilter === 'delivered' && 'Aucune commande livrée actuellement'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const escrow = escrows[order.id];
                  const isCODOrder = isCashOnDelivery(order);
                  const requiresEscrowRelease = order.payment_method !== 'cash';
                  const _escrowPending = escrow?.status === 'pending' || escrow?.status === 'held';
                  const isDeliveryPending = order.status === 'in_transit' || order.status === 'shipped' || order.status === 'ready';
                  const isDeliveredAwaitingConfirmation = order.status === 'delivered' && (requiresEscrowRelease ? escrow?.status !== 'released' && escrow?.status !== 'refunded' : true);
                  const canConfirmDelivery = order.status !== 'cancelled' && order.status !== 'completed' && (isDeliveryPending || isDeliveredAwaitingConfirmation);

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
                      {item.quantity}x {item.products?.name || item.product_name || 'Produit'}
                    </div>
                  ))}
                </div>

                {/* Statuts */}
                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(order.status)}
                  {!isCODOrder && escrow && getEscrowBadge(escrow.status)}
                  {/* Badge paiement à la livraison */}
                  {isCODOrder && (
                    <Badge className="bg-amber-100 text-amber-800">
                      <Banknote className="w-3 h-3 mr-1" />
                      Paiement à la livraison
                    </Badge>
                  )}
                </div>

                {/* Info Paiement à la livraison */}
                {isCODOrder && !['delivered', 'completed', 'cancelled'].includes(order.status) && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Banknote className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Paiement à la livraison
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Vous paierez {order.total_amount.toLocaleString()} GNF à la réception de votre commande
                      </p>
                    </div>
                  </div>
                )}

                {/* Protection Escrow */}
                {!isCODOrder && escrow && (escrow.status === 'pending' || escrow.status === 'held') && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Paiement protégé
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Vos {escrow.amount.toLocaleString()} GNF sont sécurisés en escrow jusqu'à confirmation de livraison
                      </p>
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="space-y-2">
                  {/* Bouton d'annulation */}
                  {canCancelOrder(order) && (
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
                  {!isCODOrder && escrow && ['pending', 'held', 'released'].includes(escrow.status) && !['cancelled'].includes(order.status) && (
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
                          J'ai reçu ma commande
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Info si déjà livrée */}
                {(order.status === 'delivered' || order.status === 'completed') && escrow?.status === 'released' && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      Commande terminée et {formatCurrency(getVendorReceivableAmount(order, escrow), getVendorReceivableCurrency(order, escrow))} transférés au vendeur
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
            <AlertDialogTitle>Confirmer la réception ?</AlertDialogTitle>
            <AlertDialogDescription>
              En confirmant, vous attestez avoir reçu votre commande en bon état.
              {!selectedOrderIsCashOnDelivery && (
                <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <div className="text-sm text-muted-foreground">Montant qui sera libéré au vendeur</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {formatCurrency(sellerReceivableAmount, sellerReceivableCurrency)}
                  </div>
                </div>
              )}
              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-orange-800 dark:text-orange-200">
                    {selectedOrderIsCashOnDelivery
                      ? 'Cette action est irréversible. Après confirmation, la fenêtre d\'avis s\'ouvrira automatiquement.'
                      : 'Cette action est irréversible. Assurez-vous que votre colis est bien conforme.'}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelivery()}>
              Confirmer la réception
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
                <p>Vous êtes sur le point d'annuler cette commande.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Raison de l'annulation (optionnel)</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-2 border rounded-md resize-none"
                    rows={3}
                    placeholder="Ex: J'ai changé d'avis, produit indisponible ailleurs..."
                  />
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                      {selectedOrderIsCashOnDelivery
                        ? 'Cette commande est en paiement à la livraison. Aucun montant escrow ne sera affiché ni remboursé.'
                        : 'Si vous avez payé, votre argent sera automatiquement remboursé via le système Escrow.'}
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
                <p>Décrivez la raison de votre demande de remboursement. Votre demande sera examinée par notre équipe.</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Raison du remboursement *</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2 border rounded-md resize-none"
                    rows={4}
                    placeholder="Ex: Produit défectueux, non conforme, endommagé..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Montant demandé (optionnel)</label>
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
                      Un litige sera ouvert. Le vendeur pourra répondre avant qu'une décision finale ne soit prise.
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
            setPendingRatingOrderData(null);
          }}
        />
      )}
    </>
  );
}
