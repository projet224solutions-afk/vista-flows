import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, TrendingUp, Package, ShoppingCart, Warehouse, 
  Truck, UserPlus, LogOut, BarChart3, FileText, 
  MessageSquare, Settings, Shield, Wallet, CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface VendorAgent {
  id: string;
  vendor_id: string;
  agent_code: string;
  name: string;
  email: string;
  phone: string;
  access_token: string;
  permissions: string[];
  can_create_sub_agent: boolean;
  is_active: boolean;
  created_at: string;
}

export default function VendorAgentInterface() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<VendorAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!token) {
      toast.error('Token d\'accès manquant');
      navigate('/');
      return;
    }
    loadAgentData(token);
  }, [token, navigate]);

  const loadAgentData = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('vendor_agents')
        .select('*')
        .eq('access_token', token)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error('Agent non trouvé ou inactif');
        navigate('/');
        return;
      }

      setAgent(data);
    } catch (error) {
      console.error('Erreur chargement agent:', error);
      toast.error('Erreur lors du chargement des données');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    navigate('/');
  };

  const hasPermission = (permission: string) => {
    return agent?.permissions?.includes(permission) || false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vendeur-primary/10 to-vendeur-secondary/10">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vendeur-primary mx-auto"></div>
          <p className="text-muted-foreground">Chargement de votre espace agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vendeur-primary/10 to-vendeur-secondary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun profil agent trouvé. Veuillez contacter votre vendeur.
            </p>
            <Button onClick={handleSignOut} className="w-full mt-4">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vendeur-primary/10 to-vendeur-secondary/10">
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-vendeur-gradient">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Espace Agent</h1>
                  <p className="text-sm text-muted-foreground">
                    {agent.name} • {agent.agent_code}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-vendeur-secondary/10 text-vendeur-secondary border-vendeur-secondary/20">
                Agent Actif
              </Badge>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            {hasPermission('view_dashboard') && (
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            )}
            {hasPermission('manage_products') && (
              <TabsTrigger value="products">Produits</TabsTrigger>
            )}
            {hasPermission('manage_orders') && (
              <TabsTrigger value="orders">Commandes</TabsTrigger>
            )}
            {hasPermission('access_wallet') && (
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Mes Permissions
                  </CardTitle>
                  <Shield className="w-4 h-4 text-vendeur-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agent.permissions.length}</div>
                  <p className="text-xs text-muted-foreground">
                    accès actifs
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Sous-Agents
                  </CardTitle>
                  <UserPlus className="w-4 h-4 text-vendeur-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    {agent.can_create_sub_agent ? 'Création autorisée' : 'Non autorisé'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Statut
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Actif</div>
                  <p className="text-xs text-muted-foreground">
                    Compte vérifié
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Contact
                  </CardTitle>
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">{agent.email}</div>
                  <p className="text-xs text-muted-foreground">
                    {agent.phone}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Informations Agent */}
            <Card className="border-0 shadow-elegant">
              <CardHeader className="bg-vendeur-accent/30 border-b">
                <CardTitle>Informations du Compte</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Nom</p>
                    <p className="text-base font-semibold">{agent.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Code Agent</p>
                    <p className="text-base font-mono font-semibold text-vendeur-primary">{agent.agent_code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <p className="text-base">{agent.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Téléphone</p>
                    <p className="text-base">{agent.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Permissions Actives</p>
                    <div className="flex flex-wrap gap-2">
                      {agent.permissions.map((perm: string) => (
                        <Badge 
                          key={perm}
                          variant="secondary"
                          className="bg-vendeur-primary/10 text-vendeur-primary border-vendeur-primary/20"
                        >
                          {perm.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modules Disponibles */}
            <Card className="border-0 shadow-elegant">
              <CardHeader className="bg-vendeur-accent/30 border-b">
                <CardTitle>Modules Disponibles</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {hasPermission('view_dashboard') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('dashboard')}
                    >
                      <BarChart3 className="h-6 w-6" />
                      <span className="text-sm">Dashboard</span>
                    </Button>
                  )}
                  {hasPermission('access_pos') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <CreditCard className="h-6 w-6" />
                      <span className="text-sm">POS</span>
                    </Button>
                  )}
                  {hasPermission('manage_products') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('products')}
                    >
                      <Package className="h-6 w-6" />
                      <span className="text-sm">Produits</span>
                    </Button>
                  )}
                  {hasPermission('manage_orders') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('orders')}
                    >
                      <ShoppingCart className="h-6 w-6" />
                      <span className="text-sm">Commandes</span>
                    </Button>
                  )}
                  {hasPermission('manage_inventory') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <Package className="h-6 w-6" />
                      <span className="text-sm">Inventaire</span>
                    </Button>
                  )}
                  {hasPermission('manage_warehouse') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <Warehouse className="h-6 w-6" />
                      <span className="text-sm">Entrepôt</span>
                    </Button>
                  )}
                  {hasPermission('manage_clients') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <Users className="h-6 w-6" />
                      <span className="text-sm">Clients</span>
                    </Button>
                  )}
                  {hasPermission('manage_delivery') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <Truck className="h-6 w-6" />
                      <span className="text-sm">Livraisons</span>
                    </Button>
                  )}
                  {hasPermission('access_wallet') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                      onClick={() => setActiveTab('wallet')}
                    >
                      <Wallet className="h-6 w-6" />
                      <span className="text-sm">Wallet</span>
                    </Button>
                  )}
                  {hasPermission('view_reports') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <FileText className="h-6 w-6" />
                      <span className="text-sm">Rapports</span>
                    </Button>
                  )}
                  {hasPermission('access_communication') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <MessageSquare className="h-6 w-6" />
                      <span className="text-sm">Messages</span>
                    </Button>
                  )}
                  {hasPermission('access_settings') && (
                    <Button
                      variant="outline"
                      className="h-24 flex flex-col gap-2"
                    >
                      <Settings className="h-6 w-6" />
                      <span className="text-sm">Paramètres</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard">
            <Card className="border-0 shadow-elegant">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Module Dashboard en cours de développement
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="border-0 shadow-elegant">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Module Produits en cours de développement
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="border-0 shadow-elegant">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Module Commandes en cours de développement
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <Card className="border-0 shadow-elegant">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Module Wallet en cours de développement
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
