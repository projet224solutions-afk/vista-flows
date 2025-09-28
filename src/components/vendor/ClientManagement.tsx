import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Search, Filter, Eye, Star, ShoppingCart, 
  CreditCard, Calendar, Mail, Phone, MapPin, 
  TrendingUp, Award, Clock, MessageSquare
} from "lucide-react";

interface Client {
  id: string;
  user_id: string;
  addresses?: unknown;
  payment_methods?: unknown;
  preferences?: unknown;
  created_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    email: string;
    phone?: string;
  };
  orders?: {
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
  }[];
}

interface ClientStats {
  totalClients: number;
  newClientsThisMonth: number;
  vipClients: number;
  activeClients: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export default function ClientManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    totalClients: 0,
    newClientsThisMonth: 0,
    vipClients: 0,
    activeClients: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'vip' | 'regular' | 'new'>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDialog, setShowClientDialog] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchClients();
  }, [user]);

  const fetchClients = async () => {
    try {
      // Get vendor ID
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!vendor) return;

      // Fetch clients who have made orders with this vendor
      const { data: clientsData, error } = await supabase
        .from('customers')
        .select(`
          *,
          profile:profiles(first_name, last_name, email, phone),
          orders:orders!customers(
            id,
            total_amount,
            status,
            created_at
          )
        `)
        .eq('orders.vendor_id', vendor.id);

      if (error) throw error;

      // Process and calculate stats
      const processedClients = (clientsData || []).map(client => ({
        ...client,
        orders: client.orders || []
      }));

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalOrders = processedClients.reduce((sum, client) => sum + client.orders.length, 0);
      const totalRevenue = processedClients.reduce((sum, client) => 
        sum + client.orders.reduce((orderSum, order) => orderSum + order.total_amount, 0), 0);

      const newClientsThisMonth = processedClients.filter(client => 
        new Date(client.created_at) >= thisMonthStart).length;

      const vipClients = processedClients.filter(client => {
        const clientRevenue = client.orders.reduce((sum, order) => sum + order.total_amount, 0);
        return clientRevenue > 500000; // VIP si plus de 500k FCFA dépensés
      }).length;

      const activeClients = processedClients.filter(client => {
        const lastOrderDate = client.orders.length > 0 
          ? new Date(Math.max(...client.orders.map(o => new Date(o.created_at).getTime())))
          : null;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastOrderDate && lastOrderDate >= thirtyDaysAgo;
      }).length;

      setStats({
        totalClients: processedClients.length,
        newClientsThisMonth,
        vipClients,
        activeClients,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      });

      setClients(processedClients);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données clients.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getClientType = (client: Client) => {
    const clientRevenue = client.orders.reduce((sum, order) => sum + order.total_amount, 0);
    const orderCount = client.orders.length;
    const isNew = new Date(client.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (clientRevenue > 500000 || orderCount > 10) return 'vip';
    if (isNew) return 'new';
    return 'regular';
  };

  const getClientTypeLabel = (type: string) => {
    switch (type) {
      case 'vip': return 'VIP';
      case 'new': return 'Nouveau';
      case 'regular': return 'Régulier';
      default: return 'Régulier';
    }
  };

  const getClientTypeColor = (type: string) => {
    switch (type) {
      case 'vip': return 'bg-yellow-100 text-yellow-800';
      case 'new': return 'bg-green-100 text-green-800';
      case 'regular': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const clientType = getClientType(client);
    const matchesType = clientTypeFilter === 'all' || clientType === clientTypeFilter;

    return matchesSearch && matchesType;
  });

  if (loading) return <div className="p-4">Chargement des clients...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Clients</h2>
          <p className="text-muted-foreground">Gérez vos relations clients et analysez leur comportement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            // Contact all clients functionality
            toast({
              title: "Fonction en développement",
              description: "La fonctionnalité de contact groupé sera bientôt disponible."
            });
          }}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Contacter tous
          </Button>
          <Button variant="outline" onClick={() => {
            // Newsletter functionality  
            toast({
              title: "Newsletter",
              description: "La fonctionnalité newsletter sera bientôt disponible."
            });
          }}>
            <Mail className="w-4 h-4 mr-2" />
            Newsletter
          </Button>
        </div>
      </div>

      {/* Statistiques clients */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total clients</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Nouveaux (30j)</p>
                <p className="text-2xl font-bold text-green-600">{stats.newClientsThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Clients VIP</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.vipClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Actifs (30j)</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foregreen">CA total</p>
                <p className="text-xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Panier moyen</p>
                <p className="text-xl font-bold">{stats.averageOrderValue.toLocaleString()} FCFA</p>
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
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={clientTypeFilter}
              onChange={(e) => setClientTypeFilter(e.target.value as "all" | "new" | "regular" | "vip")}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Tous les clients</option>
              <option value="vip">Clients VIP</option>
              <option value="regular">Clients réguliers</option>
              <option value="new">Nouveaux clients</option>
            </select>
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Liste des clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => {
          const clientRevenue = client.orders.reduce((sum, order) => sum + order.total_amount, 0);
          const orderCount = client.orders.length;
          const lastOrder = client.orders.length > 0 
            ? new Date(Math.max(...client.orders.map(o => new Date(o.created_at).getTime())))
            : null;
          const clientType = getClientType(client);

          return (
            <Card key={client.id} className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {client.profile?.first_name && client.profile?.last_name 
                          ? `${client.profile.first_name} ${client.profile.last_name}`
                          : client.profile?.email?.split('@')[0] || 'Client anonyme'}
                      </h3>
                      <Badge className={getClientTypeColor(clientType)}>
                        {getClientTypeLabel(clientType)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {client.profile?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {client.profile.email}
                        </div>
                      )}
                      {client.profile?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {client.profile.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDialog(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Commandes:</span>
                    <span className="font-semibold">{orderCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total dépensé:</span>
                    <span className="font-semibold text-vendeur-primary">
                      {clientRevenue.toLocaleString()} FCFA
                    </span>
                  </div>
                  {lastOrder && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Dernière commande:</span>
                      <span className="text-sm">
                        {lastOrder.toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {clientRevenue > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Panier moyen:</span>
                      <span className="text-sm font-medium">
                        {Math.round(clientRevenue / orderCount).toLocaleString()} FCFA
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    // Contact client functionality
                    if (client.profile?.email) {
                      window.location.href = `mailto:${client.profile.email}`;
                    } else {
                      toast({
                        title: "Email non disponible",
                        description: "L'adresse email de ce client n'est pas renseignée."
                      });
                    }
                  }}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Contacter
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    // View client orders
                    toast({
                      title: "Commandes du client",
                      description: "Affichage des commandes de ce client."
                    });
                  }}>
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Commandes
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun client trouvé</h3>
              <p className="text-muted-foreground">
                {searchTerm || clientTypeFilter !== 'all' 
                  ? 'Aucun client ne correspond aux critères de recherche.' 
                  : 'Vous n\'avez pas encore de clients.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog des détails client */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Profil client détaillé</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              {/* Informations personnelles */}
              <div>
                <h4 className="font-semibold mb-4">Informations personnelles</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                    <p className="font-medium">
                      {selectedClient.profile?.first_name && selectedClient.profile?.last_name 
                        ? `${selectedClient.profile.first_name} ${selectedClient.profile.last_name}`
                        : 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="font-medium">{selectedClient.profile?.email || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                    <p className="font-medium">{selectedClient.profile?.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Membre depuis</label>
                    <p className="font-medium">
                      {new Date(selectedClient.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statistiques */}
              <div>
                <h4 className="font-semibold mb-4">Statistiques</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <p className="text-2xl font-bold text-vendeur-primary">
                      {selectedClient.orders.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Commandes</p>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedClient.orders.reduce((sum, order) => sum + order.total_amount, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">FCFA dépensés</p>
                  </div>
                  <div className="text-center p-4 bg-accent rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedClient.orders.length > 0 
                        ? Math.round(selectedClient.orders.reduce((sum, order) => sum + order.total_amount, 0) / selectedClient.orders.length).toLocaleString()
                        : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Panier moyen</p>
                  </div>
                </div>
              </div>

              {/* Historique des commandes */}
              <div>
                <h4 className="font-semibold mb-4">Historique des commandes</h4>
                <div className="space-y-2">
                  {selectedClient.orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                      <div>
                        <p className="font-medium">Commande #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{order.total_amount.toLocaleString()} FCFA</p>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {selectedClient.orders.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      ... et {selectedClient.orders.length - 5} autres commandes
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}