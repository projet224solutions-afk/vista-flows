/**
 * AGENT ORDERS MODULE
 * Module Gestion Commandes - miroir de PDGOrders
 */

import { useState, useEffect } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, Package, Truck, CheckCircle, XCircle, 
  RefreshCw, Search, Clock, Eye, DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AgentOrdersModuleProps {
  agentId: string;
  canManage?: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  buyer_id: string;
  vendor_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  vendors?: {
    business_name: string;
  };
}

export function AgentOrdersModule({ agentId, canManage = false }: AgentOrdersModuleProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    totalAmount: 0
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_amount, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const ordersList = (data || []).map((o: any) => ({
        ...o,
        buyer_id: '',
        vendor_id: '',
        profiles: null,
        vendors: null
      })) as Order[];
      
      setOrders(ordersList);

      const totalAmount = ordersList.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      
      setStats({
        total: ordersList.length,
        pending: ordersList.filter(o => o.status === 'pending').length,
        processing: ordersList.filter(o => o.status === 'processing' || o.status === 'shipped').length,
        completed: ordersList.filter(o => o.status === 'completed' || o.status === 'delivered').length,
        cancelled: ordersList.filter(o => o.status === 'cancelled').length,
        totalAmount
      });
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pending: { color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" />, label: 'En attente' },
      confirmed: { color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3 h-3" />, label: 'Confirmée' },
      processing: { color: 'bg-indigo-100 text-indigo-700', icon: <Package className="w-3 h-3" />, label: 'En préparation' },
      shipped: { color: 'bg-purple-100 text-purple-700', icon: <Truck className="w-3 h-3" />, label: 'Expédiée' },
      delivered: { color: 'bg-primary-orange-100 text-primary-blue-900', icon: <CheckCircle className="w-3 h-3" />, label: 'Livrée' },
      completed: { color: 'bg-primary-orange-100 text-primary-blue-900', icon: <CheckCircle className="w-3 h-3" />, label: 'Terminée' },
      cancelled: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Annulée' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', icon: null, label: status };
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const fc = useFormatCurrency();
  const formatAmount = (amount: number, currency: string = 'GNF') => fc(amount, currency);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vendors?.business_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'pending') return matchesSearch && order.status === 'pending';
    if (activeTab === 'processing') return matchesSearch && (order.status === 'processing' || order.status === 'shipped');
    if (activeTab === 'completed') return matchesSearch && (order.status === 'completed' || order.status === 'delivered');
    if (activeTab === 'cancelled') return matchesSearch && order.status === 'cancelled';
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Gestion des Commandes</CardTitle>
                <CardDescription>Suivi et gestion des commandes de la plateforme</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 text-center">
              <ShoppingCart className="w-5 h-5 text-slate-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-700">{stats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div className="bg-gradient-to-br from-amber-100 to-orange-200 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-700">{stats.pending}</p>
              <p className="text-xs text-amber-500">En attente</p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-xl p-4 text-center">
              <Package className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-blue-700">{stats.processing}</p>
              <p className="text-xs text-blue-500">En cours</p>
            </div>
            <div className="bg-gradient-to-br from-primary-blue-100 to-primary-orange-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-5 h-5 text-primary-orange-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-primary-orange-700">{stats.completed}</p>
              <p className="text-xs text-primary-orange-500">Terminées</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-pink-200 rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-700">{formatAmount(stats.totalAmount)}</p>
              <p className="text-xs text-purple-500">Volume total</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Rechercher par numéro, client, vendeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">Toutes</TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">En attente</TabsTrigger>
              <TabsTrigger value="processing" className="flex-1">En cours</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">Terminées</TabsTrigger>
              <TabsTrigger value="cancelled" className="flex-1">Annulées</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune commande trouvée</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.profiles?.first_name} {order.profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vendeur: {order.vendors?.business_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">{formatAmount(order.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Commande {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="font-bold text-lg">{formatAmount(selectedOrder.total_amount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">
                    {selectedOrder.profiles?.first_name} {selectedOrder.profiles?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.profiles?.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vendeur</p>
                  <p className="font-medium">{selectedOrder.vendors?.business_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Créée le</p>
                  <p className="font-medium">
                    {format(new Date(selectedOrder.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Mise à jour</p>
                  <p className="font-medium">
                    {format(new Date(selectedOrder.updated_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgentOrdersModule;
