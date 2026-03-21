/**
 * Liste des achats personnels avec possibilité de confirmer la réception (Escrow)
 * Utilisable par vendeurs et agents quand ils achètent sur le marketplace
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
  Shield, AlertCircle, Loader2, ListFilter, Ban, DollarSign, Banknote, ShoppingBag
} from 'lucide-react';
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

interface EscrowStatus {
  id: string;
  status: string;
  amount: number;
}

interface MyPurchasesOrdersListProps {
  title?: string;
  emptyMessage?: string;
}

// Helper pour vérifier si une commande est paiement à la livraison
const isCashOnDelivery = (order: Order): boolean => {
  return order.payment_method === 'cash' && 
         order.shipping_address?.is_cod === true;
};

// Tracker visuel de progression
function OrderProgressTracker({ status }: { status: string }) {
  const steps = [
    { key: 'pending', label: 'En attente', icon: Clock },
    { key: 'confirmed', label: 'Confirmée', icon: CheckCircle },
    { key: 'preparing', label: 'Préparation', icon: Package },
    { key: 'in_transit', label: 'Expédiée', icon: Truck },
    { key: 'delivered', label: 'Livrée', icon: CheckCircle },
  ];

  const currentIndex = steps.findIndex(s => s.key === status);
  const progressPercent = currentIndex >= 0 ? ((currentIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="w-full py-3">
      <div className="relative">
        {/* Barre de progression */}
        <div className="absolute top-4 left-0 w-full h-1 bg-muted rounded-full">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        {/* Étapes */}
        <div className="flex justify-between relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentIndex >= index;
            const isCurrent = currentIndex === index;
            
            return (
              <div key={step.key} className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center z-10
                  ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                `}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs mt-2 text-center ${isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MyPurchasesOrdersList({ 
  title = "Mes achats", 
  emptyMessage = "Vous n'avez pas encore effectué d'achats" 
}: MyPurchasesOrdersListProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [escrows, setEscrows] = useState<Record<string, EscrowStatus>>({});
  const [loading, setLoading] = useState(true);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'delivered'>('all');
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
      
      // Écoute temps réel des commandes
      const ordersChannel = supabase
        .channel('my-purchases-orders-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => loadOrders()
        )
        .subscribe();

      // Écoute temps réel des escrows
      const escrowChannel = supabase
        .channel('my-purchases-escrow-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'escrow_transactions' },
          () => loadOrders()
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

      // Récupérer le customer_id lié à cet utilisateur
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) {
        setLoading(false);
        return;
      }

      // Vérifier si l'utilisateur est aussi un vendeur (pour exclure ses propres ventes)
      const { data: userVendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Récupérer les commandes où l'utilisateur est CLIENT (pas vendeur)
      let query = supabase
        .from('orders')
        .select(`
          *,
          vendors(business_name),
          order_items(quantity, products(name))
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      // Si l'utilisateur est aussi vendeur, exclure ses propres commandes reçues
      if (userVendor?.id) {
        query = query.neq('vendor_id', userVendor.id);
      }

      const { data: ordersData, error } = await query;

      if (error) throw error;

      setOrders(ordersData || []);

      // Charger les escrows
      if (ordersData && ordersData.length > 0) {
        const escrowPromises = ordersData.map(async (order) => {
          const { data: escrow } = await supabase
            .from('escrow_transactions')
            .select('id, status, amount')
            .eq('order_id', order.id)
            .single();
          return { orderId: order.id, escrow };
        });

        const escrowResults = await Promise.all(escrowPromises);
        const escrowMap: Record<string, EscrowStatus> = {};
        escrowResults.forEach(({ orderId, escrow }) => {
          if (escrow) escrowMap[orderId] = escrow;
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

  const handleConfirmDelivery = (order: Order) => {
    setSelectedOrder(order);
    setShowConfirmDialog(true);
  };

  const confirmDelivery = async () => {
    if (!selectedOrder) return;

    setConfirmingOrderId(selectedOrder.id);
    setShowConfirmDialog(false);

    try {
      const escrow = escrows[selectedOrder.id];
      if (!escrow) {
        toast.error('Pas d\'escrow trouvé pour cette commande');
        return;
      }

      const { data, error } = await supabase.functions.invoke('confirm-delivery', {
        body: { order_id: selectedOrder.id }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erreur lors de la confirmation');

      toast.success('Livraison confirmée !', {
        description: 'Le vendeur a reçu le paiement'
      });

      await loadOrders();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Erreur lors de la confirmation');
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
        body: { order_id: selectedOrder.id, reason: cancelReason }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erreur lors de l\'annulation');

      toast.success('Commande annulée', {
        description: data.refunded ? 'Votre paiement a été remboursé' : undefined
      });

      await loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Erreur lors de l\'annulation');
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
          requested_amount: refundAmount ? parseFloat(refundAmount) : undefined
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erreur lors de la demande');

      toast.success('Demande de remboursement envoyée');
      await loadOrders();
    } catch (error) {
      console.error('Error requesting refund:', error);
      toast.error('Erreur lors de la demande');
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
      pending: { label: 'Fonds bloqués', color: 'bg-orange-100 text-orange-800' },
      held: { label: 'Fonds sécurisés', color: 'bg-blue-100 text-blue-800' },
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

  // Filtrage
  const getFilteredOrders = () => {
    if (activeFilter === 'all') return orders;
    if (activeFilter === 'pending') return orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
    if (activeFilter === 'in_progress') return orders.filter(o => o.status === 'in_transit');
    if (activeFilter === 'delivered') return orders.filter(o => o.status === 'delivered');
    return orders;
  };

  const filteredOrders = getFilteredOrders();
  const pendingCount = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;
  const inProgressCount = orders.filter(o => o.status === 'in_transit').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ListFilter className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Filtrer</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={activeFilter === 'all' ? 'default' : 'outline'} onClick={() => setActiveFilter('all')} size="sm">
              <Package className="w-4 h-4 mr-1" /> Toutes ({orders.length})
            </Button>
            <Button variant={activeFilter === 'pending' ? 'default' : 'outline'} onClick={() => setActiveFilter('pending')} size="sm">
              <Clock className="w-4 h-4 mr-1" /> En attente ({pendingCount})
            </Button>
            <Button variant={activeFilter === 'in_progress' ? 'default' : 'outline'} onClick={() => setActiveFilter('in_progress')} size="sm">
              <Truck className="w-4 h-4 mr-1" /> En cours ({inProgressCount})
            </Button>
            <Button variant={activeFilter === 'delivered' ? 'default' : 'outline'} onClick={() => setActiveFilter('delivered')} size="sm">
              <CheckCircle className="w-4 h-4 mr-1" /> Livrées ({deliveredCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <ScrollArea className="h-[600px] pr-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune commande dans cette catégorie</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const escrow = escrows[order.id];
                  const canConfirmDelivery = (order.status === 'in_transit' || order.status === 'delivered') && 
                                              (!escrow || escrow?.status === 'pending' || escrow?.status === 'held');

                  return (
                    <Card key={order.id} className="overflow-hidden border">
                      <CardHeader className="bg-muted/50 p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">#{order.order_number}</CardTitle>
                            <p className="text-sm text-muted-foreground">{order.vendors?.business_name || 'Vendeur'}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{order.total_amount.toLocaleString()} GNF</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {/* Tracker visuel */}
                        <OrderProgressTracker status={order.status} />

                        {/* Articles */}
                        <div className="space-y-1">
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              {item.quantity}x {item.products.name}
                            </div>
                          ))}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(order.status)}
                          {escrow && getEscrowBadge(escrow.status)}
                          {isCashOnDelivery(order) && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <Banknote className="w-3 h-3 mr-1" /> Paiement à la livraison
                            </Badge>
                          )}
                        </div>

                        {/* Info Escrow */}
                        {escrow && (escrow.status === 'pending' || escrow.status === 'held') && (
                          <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-green-800">Paiement protégé</p>
                              <p className="text-xs text-green-700">
                                {escrow.amount.toLocaleString()} GNF sécurisés jusqu'à confirmation
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-2">
                          {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                            <Button variant="destructive" size="sm" onClick={() => handleCancelOrder(order)} disabled={cancellingOrderId === order.id} className="w-full">
                              {cancellingOrderId === order.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
                              Annuler la commande
                            </Button>
                          )}

                          {escrow && ['pending', 'held', 'released'].includes(escrow.status) && !['cancelled'].includes(order.status) && (
                            <Button variant="outline" size="sm" onClick={() => handleRequestRefund(order)} disabled={refundingOrderId === order.id} className="w-full">
                              {refundingOrderId === order.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                              Demander un remboursement
                            </Button>
                          )}

                          {canConfirmDelivery && (
                            <Button onClick={() => handleConfirmDelivery(order)} disabled={confirmingOrderId === order.id} className="w-full">
                              {confirmingOrderId === order.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                              J'ai reçu ma commande
                            </Button>
                          )}
                        </div>

                        {order.status === 'delivered' && escrow?.status === 'released' && (
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-muted-foreground">Livrée - Paiement transféré au vendeur</span>
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

      {/* Dialogs */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la réception ?</AlertDialogTitle>
            <AlertDialogDescription>
              En confirmant, vous attestez avoir reçu votre commande. Le paiement sera transféré au vendeur.
              <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <span className="text-sm text-orange-800">Action irréversible. Vérifiez votre colis.</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelivery}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>Vous êtes sur le point d'annuler cette commande.</p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2 border rounded-md resize-none"
                  rows={3}
                  placeholder="Raison de l'annulation (optionnel)"
                />
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span className="text-sm text-blue-800">Votre paiement sera automatiquement remboursé via Escrow.</span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelOrder} className="bg-destructive text-destructive-foreground">Confirmer l'annulation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demander un remboursement</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>Décrivez la raison de votre demande.</p>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2 border rounded-md resize-none"
                  rows={4}
                  placeholder="Raison du remboursement"
                  required
                />
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="Montant (optionnel, vide = total)"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRequestRefund} disabled={!refundReason.trim()}>Envoyer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
