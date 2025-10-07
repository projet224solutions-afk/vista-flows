import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Order, OrderItem, Vendor } from "@shared/schema";
import { 
  ShoppingCart, Search, Filter, Eye, Package, Clock, 
  CheckCircle, XCircle, Truck, CreditCard, FileText,
  Calendar, User, MapPin, Download
} from "lucide-react";

interface OrderWithItems extends Order {
  orderItems?: OrderItem[];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  // Fetch vendor info
  const { data: vendor, isLoading: isLoadingVendor, isError: isVendorError } = useQuery<Vendor>({
    queryKey: ['/api/vendors/user', user?.id],
    queryFn: async () => apiRequest(`/api/vendors/user/${user?.id}`),
    enabled: !!user?.id,
  });

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ['/api/orders', vendor?.id],
    enabled: !!vendor?.id,
    queryFn: async () => {
      const ordersData = await apiRequest(`/api/orders?vendorId=${vendor!.id}`);
      
      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order: Order) => {
          try {
            const items = await apiRequest(`/api/orders/${order.id}/items`);
            return { ...order, orderItems: items };
          } catch {
            return { ...order, orderItems: [] };
          }
        })
      );
      
      return ordersWithItems;
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      // Invalidate the orders query with the full key including vendor.id
      queryClient.invalidateQueries({ queryKey: ['/api/orders', vendor?.id] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la commande a été mis à jour avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la commande.",
        variant: "destructive"
      });
    }
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = (orderId: string, status: string) => {
    updateStatusMutation.mutate({ orderId, status });
  };

  const getOrderStatusActions = (order: OrderWithItems) => {
    const actions = [];
    
    if (order.status === 'pending') {
      actions.push(
        <Button 
          key="confirm" 
          size="sm" 
          onClick={() => updateOrderStatus(order.id, 'confirmed')}
          data-testid={`button-confirm-order-${order.id}`}
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Confirmer
        </Button>
      );
    }
    
    if (order.status === 'confirmed') {
      actions.push(
        <Button 
          key="process" 
          size="sm" 
          onClick={() => updateOrderStatus(order.id, 'preparing')}
          data-testid={`button-prepare-order-${order.id}`}
        >
          <Package className="w-4 h-4 mr-1" />
          Préparer
        </Button>
      );
    }
    
    if (order.status === 'preparing') {
      actions.push(
        <Button 
          key="ship" 
          size="sm" 
          onClick={() => updateOrderStatus(order.id, 'in_transit')}
          data-testid={`button-ship-order-${order.id}`}
        >
          <Truck className="w-4 h-4 mr-1" />
          Expédier
        </Button>
      );
    }
    
    if (['pending', 'confirmed'].includes(order.status)) {
      actions.push(
        <Button 
          key="cancel" 
          size="sm" 
          variant="destructive" 
          onClick={() => updateOrderStatus(order.id, 'cancelled')}
          data-testid={`button-cancel-order-${order.id}`}
        >
          <XCircle className="w-4 h-4 mr-1" />
          Annuler
        </Button>
      );
    }

    return actions;
  };

  // Statistics
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => ['confirmed', 'processing', 'preparing'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  // Handle vendor absence (after all hooks)
  if (isVendorError || (!isLoadingVendor && !vendor && user)) {
    return (
      <div className="p-8 text-center" data-testid="no-vendor-message">
        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucun compte vendeur</h3>
        <p className="text-muted-foreground">
          Vous n'avez pas encore de compte vendeur activé. Contactez l'administrateur pour créer votre boutique.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="p-4" data-testid="loading-orders">Chargement des commandes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Commandes</h2>
          <p className="text-muted-foreground">Suivez et gérez toutes vos commandes clients</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              toast({
                title: "Export en cours",
                description: "L'export des commandes sera bientôt disponible."
              });
            }}
            data-testid="button-export-orders"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              toast({
                title: "Rapport généré",
                description: "Le rapport des commandes sera bientôt disponible."
              });
            }}
            data-testid="button-generate-report"
          >
            <FileText className="w-4 h-4 mr-2" />
            Rapport
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total commandes</p>
                <p className="text-2xl font-bold" data-testid="stat-total-orders">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="stat-pending-orders">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="stat-processing-orders">{processingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Livrées</p>
                <p className="text-2xl font-bold text-green-600" data-testid="stat-delivered-orders">{deliveredOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold" data-testid="stat-total-revenue">{totalRevenue.toLocaleString()} FCFA</p>
              </div>
            </div>
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
                data-testid="input-search-orders"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
              data-testid="select-status-filter"
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

      {/* Liste des commandes */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4" data-testid={`order-card-${order.id}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-lg" data-testid={`order-number-${order.id}`}>{order.orderNumber}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                        <User className="w-4 h-4 ml-2" />
                        Client ID: {order.customerId}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[order.status]} data-testid={`order-status-${order.id}`}>
                      {statusLabels[order.status]}
                    </Badge>
                    <Badge className={paymentStatusColors[order.paymentStatus]} data-testid={`payment-status-${order.id}`}>
                      {paymentStatusLabels[order.paymentStatus]}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Articles</p>
                    <div className="text-sm" data-testid={`order-items-${order.id}`}>
                      {order.orderItems?.map((item, index) => (
                        <div key={item.id}>
                          Article {item.productId.slice(0, 8)} x{item.quantity}
                          {index < (order.orderItems?.length || 0) - 1 ? ', ' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Montant total</p>
                    <p className="text-xl font-bold text-vendeur-primary" data-testid={`order-total-${order.id}`}>
                      {Number(order.totalAmount).toLocaleString()} FCFA
                    </p>
                    {Number(order.discountAmount) > 0 && (
                      <p className="text-sm text-green-600">
                        Remise: -{Number(order.discountAmount).toLocaleString()} FCFA
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse de livraison</p>
                    <div className="text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {(order.shippingAddress as any)?.city || 'Non spécifiée'}
                    </div>
                  </div>
                </div>

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
                      data-testid={`button-view-order-${order.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        toast({
                          title: "Facture générée",
                          description: `Facture générée pour la commande ${order.orderNumber}`
                        });
                      }}
                      data-testid={`button-invoice-${order.id}`}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Facture
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8" data-testid="no-orders-message">
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
            <DialogTitle>Détails de la commande {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Informations commande</h4>
                  <div className="space-y-2 text-sm">
                    <div>Status: <Badge className={statusColors[selectedOrder.status]}>{statusLabels[selectedOrder.status]}</Badge></div>
                    <div>Paiement: <Badge className={paymentStatusColors[selectedOrder.paymentStatus]}>{paymentStatusLabels[selectedOrder.paymentStatus]}</Badge></div>
                    <div>Date: {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR')}</div>
                    {selectedOrder.paymentMethod && (
                      <div>Méthode de paiement: {selectedOrder.paymentMethod}</div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Montants</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span>{Number(selectedOrder.subtotal).toLocaleString()} FCFA</span>
                    </div>
                    {Number(selectedOrder.taxAmount) > 0 && (
                      <div className="flex justify-between">
                        <span>Taxes:</span>
                        <span>{Number(selectedOrder.taxAmount).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    {Number(selectedOrder.shippingAmount) > 0 && (
                      <div className="flex justify-between">
                        <span>Livraison:</span>
                        <span>{Number(selectedOrder.shippingAmount).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    {Number(selectedOrder.discountAmount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Remise:</span>
                        <span>-{Number(selectedOrder.discountAmount).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{Number(selectedOrder.totalAmount).toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Articles commandés */}
              <div>
                <h4 className="font-semibold mb-4">Articles commandés</h4>
                <div className="space-y-2">
                  {selectedOrder.orderItems?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <span className="font-medium">Produit {item.productId.slice(0, 8)}...</span>
                      </div>
                      <div className="text-right">
                        <div>{item.quantity} x {Number(item.unitPrice).toLocaleString()} FCFA</div>
                        <div className="font-semibold">{Number(item.totalPrice).toLocaleString()} FCFA</div>
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
                    {selectedOrder.shippingAddress ? (
                      <div>
                        {(selectedOrder.shippingAddress as any).street && <div>{(selectedOrder.shippingAddress as any).street}</div>}
                        {(selectedOrder.shippingAddress as any).city && <div>{(selectedOrder.shippingAddress as any).city}</div>}
                        {(selectedOrder.shippingAddress as any).postal_code && <div>{(selectedOrder.shippingAddress as any).postal_code}</div>}
                        {(selectedOrder.shippingAddress as any).country && <div>{(selectedOrder.shippingAddress as any).country}</div>}
                      </div>
                    ) : (
                      <span>Non spécifiée</span>
                    )}
                  </div>
                </div>
                {selectedOrder.billingAddress && (
                  <div>
                    <h4 className="font-semibold mb-2">Adresse de facturation</h4>
                    <div className="text-sm text-muted-foreground">
                      {(selectedOrder.billingAddress as any)?.street && <div>{(selectedOrder.billingAddress as any).street}</div>}
                      {(selectedOrder.billingAddress as any)?.city && <div>{(selectedOrder.billingAddress as any).city}</div>}
                      {(selectedOrder.billingAddress as any)?.postal_code && <div>{(selectedOrder.billingAddress as any).postal_code}</div>}
                      {(selectedOrder.billingAddress as any)?.country && <div>{(selectedOrder.billingAddress as any).country}</div>}
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
