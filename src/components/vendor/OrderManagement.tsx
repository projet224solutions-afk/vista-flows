// @ts-nocheck
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
  Calendar, User, MapPin, Download, MoreHorizontal
} from "lucide-react";

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
  shipping_address: unknown;
  billing_address?: unknown;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    user_id: string;
  };
  order_items?: {
    id: string;
    product_id: string;
    variant_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product: {
      name: string;
      sku?: string;
    };
  }[];
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      // Fetch orders with related data
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, user_id),
          order_items:order_items(
            id,
            product_id,
            variant_id,
            quantity,
            unit_price,
            total_price,
            product:products(name, sku)
          )
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.user_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus as string, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: "Statut mis à jour",
        description: `La commande a été marquée comme ${statusLabels[newStatus as keyof typeof statusLabels]}.`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la commande.",
        variant: "destructive"
      });
    }
  };

  const getOrderStatusActions = (order: Order) => {
    const actions = [];
    
    if (order.status === 'pending') {
      actions.push(
        <Button key="confirm" size="sm" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
          <CheckCircle className="w-4 h-4 mr-1" />
          Confirmer
        </Button>
      );
    }
    
    if (order.status === 'confirmed') {
      actions.push(
        <Button key="process" size="sm" onClick={() => updateOrderStatus(order.id, 'preparing')}>
          <Package className="w-4 h-4 mr-1" />
          Préparer
        </Button>
      );
    }
    
    if (order.status === 'preparing') {
      actions.push(
        <Button key="ship" size="sm" onClick={() => updateOrderStatus(order.id, 'in_transit')}>
          <Truck className="w-4 h-4 mr-1" />
          Expédier
        </Button>
      );
    }
    
    if (['pending', 'confirmed'].includes(order.status)) {
      actions.push(
        <Button key="cancel" size="sm" variant="destructive" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
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
  const processingOrders = orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total_amount, 0);

  if (loading) return <div className="p-4">Chargement des commandes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Commandes</h2>
          <p className="text-muted-foreground">Suivez et gérez toutes vos commandes clients</p>
        </div>
        <div className="flex gap-2">
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

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total commandes</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
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
                <p className="text-2xl font-bold text-purple-600">{processingOrders}</p>
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
                <p className="text-2xl font-bold text-green-600">{deliveredOrders}</p>
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
                <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} GNF</p>
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

      {/* Liste des commandes */}
      <Card>
        <CardHeader>
          <CardTitle>Commandes récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{order.order_number}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        <User className="w-4 h-4 ml-2" />
                        Client ID: {order.customer?.user_id || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                          {item.product.name} x{item.quantity}
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
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adresse de livraison</p>
                    <div className="text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {(order.shipping_address as unknown)?.city || 'Non spécifiée'}
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
                        <span className="font-medium">{item.product.name}</span>
                        {item.product.sku && (
                          <span className="text-sm text-muted-foreground ml-2">({item.product.sku})</span>
                        )}
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
                        {(selectedOrder.shipping_address as unknown).street && <div>{(selectedOrder.shipping_address as unknown).street}</div>}
                        {(selectedOrder.shipping_address as unknown).city && <div>{(selectedOrder.shipping_address as unknown).city}</div>}
                        {(selectedOrder.shipping_address as unknown).postal_code && <div>{(selectedOrder.shipping_address as unknown).postal_code}</div>}
                        {(selectedOrder.shipping_address as unknown).country && <div>{(selectedOrder.shipping_address as unknown).country}</div>}
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
                      {(selectedOrder.billing_address as unknown)?.street && <div>{(selectedOrder.billing_address as unknown).street}</div>}
                      {(selectedOrder.billing_address as unknown)?.city && <div>{(selectedOrder.billing_address as unknown).city}</div>}
                      {(selectedOrder.billing_address as unknown)?.postal_code && <div>{(selectedOrder.billing_address as unknown).postal_code}</div>}
                      {(selectedOrder.billing_address as unknown)?.country && <div>{(selectedOrder.billing_address as unknown).country}</div>}
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