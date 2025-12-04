/**
 * GESTION DES COMMANDES RESTAURANT
 * Affichage et gestion des commandes en temps réel
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { Clock, CheckCircle, XCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  items: any[];
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  created_at: string;
  table_number?: string;
  notes?: string;
}

interface RestaurantOrdersProps {
  serviceId: string;
}

export function RestaurantOrders({ serviceId }: RestaurantOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');

  useEffect(() => {
    loadOrders();
    
    // Écouter les nouvelles commandes en temps réel
    const subscription = supabase
      .channel('restaurant-orders')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'service_bookings',
          filter: `professional_service_id=eq.${serviceId}`
        }, 
        (payload) => {
          console.log('Nouvelle commande:', payload);
          loadOrders();
          
          if (payload.eventType === 'INSERT') {
            toast.success('🔔 Nouvelle commande reçue!', {
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [serviceId]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('professional_service_id', serviceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('service_bookings')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Statut mis à jour avec succès');
      loadOrders();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { label: 'En attente', color: 'bg-yellow-500' },
      preparing: { label: 'En préparation', color: 'bg-blue-500' },
      ready: { label: 'Prêt', color: 'bg-green-500' },
      delivered: { label: 'Livré', color: 'bg-gray-500' },
      cancelled: { label: 'Annulé', color: 'bg-red-500' }
    };

    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  if (loading) {
    return <div className="text-center py-8">Chargement des commandes...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Toutes ({orders.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          En attente ({orders.filter(o => o.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'preparing' ? 'default' : 'outline'}
          onClick={() => setFilter('preparing')}
        >
          En préparation ({orders.filter(o => o.status === 'preparing').length})
        </Button>
        <Button
          variant={filter === 'ready' ? 'default' : 'outline'}
          onClick={() => setFilter('ready')}
        >
          Prêt ({orders.filter(o => o.status === 'ready').length})
        </Button>
      </div>

      {/* Liste des commandes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-16 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune commande pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Commande #{order.order_number || order.id.slice(0, 8)}
                  </CardTitle>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {new Date(order.created_at).toLocaleTimeString('fr-FR')}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{order.customer_name || 'Client'}</p>
                  {order.table_number && (
                    <p className="text-sm text-muted-foreground">Table {order.table_number}</p>
                  )}
                </div>

                {order.notes && (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Notes:</p>
                    <p>{order.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-2xl font-bold text-primary">
                    {order.total_amount?.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Commencer
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Prêt
                    </Button>
                  )}
                  {order.status === 'ready' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="flex-1"
                      size="sm"
                    >
                      <Package className="w-4 h-4 mr-1" />
                      Livré
                    </Button>
                  )}
                  {(order.status === 'pending' || order.status === 'preparing') && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
