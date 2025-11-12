/**
 * Liste des commandes du client avec possibilité de confirmer la réception
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Package, CheckCircle, Clock, Truck, XCircle, 
  Shield, AlertCircle, Loader2
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
  total_amount: number;
  created_at: string;
  metadata?: any;
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

export default function ClientOrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [escrows, setEscrows] = useState<Record<string, EscrowStatus>>({});
  const [loading, setLoading] = useState(true);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      if (!user?.id) return;

      // Récupérer le customer_id
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) return;

      // Récupérer uniquement les commandes en ligne (pas POS)
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
        .eq('source', 'online')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);

      // Charger les statuts escrow pour chaque commande
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
      
      if (!escrow) {
        toast.error('Pas d\'escrow trouvé pour cette commande');
        return;
      }

      // Libérer l'escrow
      const { error: releaseError } = await supabase.rpc('release_escrow', {
        p_escrow_id: escrow.id,
        p_commission_percent: 2.5
      });

      if (releaseError) throw releaseError;

      // Mettre à jour le statut de la commande
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (updateError) throw updateError;

      toast.success('Livraison confirmée !', {
        description: 'Le vendeur a reçu le paiement'
      });

      // Recharger les commandes
      await loadOrders();
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Erreur lors de la confirmation', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer'
      });
    } finally {
      setConfirmingOrderId(null);
      setSelectedOrder(null);
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
      <div className="space-y-4">
        {orders.map((order) => {
          const escrow = escrows[order.id];
          const canConfirmDelivery = order.status === 'in_transit' && escrow?.status === 'pending';

          return (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Commande #{order.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {order.vendors?.business_name || 'Vendeur'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{order.total_amount.toLocaleString()} GNF</div>
                    <div className="text-xs text-muted-foreground">
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
                </div>

                {/* Protection Escrow */}
                {escrow && escrow.status === 'pending' && (
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

                {/* Info si déjà livrée */}
                {order.status === 'delivered' && escrow?.status === 'released' && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      Commande livrée et paiement transféré au vendeur
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de confirmation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la réception ?</AlertDialogTitle>
            <AlertDialogDescription>
              En confirmant, vous attestez avoir reçu votre commande en bon état.
              Le paiement sera immédiatement transféré au vendeur.
              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-orange-800 dark:text-orange-200">
                    Cette action est irréversible. Assurez-vous que votre colis est bien conforme.
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelivery}>
              Confirmer la réception
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
