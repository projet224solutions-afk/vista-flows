import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar,
  Loader2,
  Edit,
  Ban,
  CheckCircle,
  Bike,
  Truck
} from 'lucide-react';
import { DriverSubscriptionService, DriverSubscription } from '@/services/driverSubscriptionService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function DriverSubscriptionManagement() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<DriverSubscription[]>([]);
  const [currentPrice, setCurrentPrice] = useState('50000');
  const [newPrice, setNewPrice] = useState('50000');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, subsData, config] = await Promise.all([
        DriverSubscriptionService.getStatistics(),
        DriverSubscriptionService.getAllSubscriptions(),
        DriverSubscriptionService.getConfig()
      ]);

      setStats(statsData);
      setSubscriptions(subsData);
      if (config) {
        setCurrentPrice(config.price.toString());
        setNewPrice(config.price.toString());
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Prix invalide');
      return;
    }

    try {
      setUpdating(true);
      const success = await DriverSubscriptionService.updatePrice(price);
      if (success) {
        toast.success('Prix mis à jour avec succès');
        setCurrentPrice(newPrice);
        await loadData();
      } else {
        toast.error('Erreur lors de la mise à jour du prix');
      }
    } catch (error) {
      console.error('Erreur mise à jour prix:', error);
      toast.error('Erreur système');
    } finally {
      setUpdating(false);
    }
  };

  const handleSuspend = async (subscriptionId: string) => {
    try {
      const success = await DriverSubscriptionService.suspendSubscription(subscriptionId);
      if (success) {
        toast.success('Abonnement suspendu');
        await loadData();
      } else {
        toast.error('Erreur lors de la suspension');
      }
    } catch (error) {
      console.error('Erreur suspension:', error);
      toast.error('Erreur système');
    }
  };

  const handleReactivate = async (subscriptionId: string) => {
    try {
      const success = await DriverSubscriptionService.reactivateSubscription(subscriptionId);
      if (success) {
        toast.success('Abonnement réactivé');
        await loadData();
      } else {
        toast.error('Erreur lors de la réactivation');
      }
    } catch (error) {
      console.error('Erreur réactivation:', error);
      toast.error('Erreur système');
    }
  };

  const handleMarkExpired = async () => {
    try {
      const count = await DriverSubscriptionService.markExpiredSubscriptions();
      toast.success(`${count} abonnement(s) expiré(s) marqué(s)`);
      await loadData();
    } catch (error) {
      console.error('Erreur marquage expirés:', error);
      toast.error('Erreur système');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abonnements Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_active || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <Bike className="inline h-3 w-3 mr-1" />
              {stats?.active_taxi || 0} Taxi |
              <Truck className="inline h-3 w-3 ml-1 mr-1" />
              {stats?.active_livreur || 0} Livreur
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.total_revenue || 0).toLocaleString()} GNF
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Depuis le début
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ce Mois</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.revenue_this_month || 0).toLocaleString()} GNF
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenus du mois en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirés</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_expired || 0}</div>
            <Button
              onClick={handleMarkExpired}
              variant="ghost"
              size="sm"
              className="text-xs mt-1 h-auto p-0"
            >
              Mettre à jour
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des Abonnements</CardTitle>
              <CardDescription>
                Gérez les abonnements actifs et expirés
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        {sub.type === 'taxi' ? (
                          <Badge variant="outline" className="bg-blue-500/10">
                            <Bike className="h-3 w-3 mr-1" />
                            Taxi
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10">
                            <Truck className="h-3 w-3 mr-1" />
                            Livreur
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {sub.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {sub.status === 'active' && (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            Actif
                          </Badge>
                        )}
                        {sub.status === 'expired' && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive">
                            Expiré
                          </Badge>
                        )}
                        {sub.status === 'suspended' && (
                          <Badge variant="outline" className="bg-warning/10 text-warning">
                            Suspendu
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sub.end_date), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{sub.price.toLocaleString()} GNF</TableCell>
                      <TableCell className="capitalize text-xs">
                        {sub.payment_method}
                      </TableCell>
                      <TableCell className="text-right">
                        {sub.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(sub.id)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {sub.status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(sub.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prix de l'Abonnement</CardTitle>
              <CardDescription>
                Modifiez le prix mensuel de l'abonnement Taxi Moto et Livreur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prix actuel</Label>
                <div className="text-2xl font-bold text-primary">
                  {parseFloat(currentPrice).toLocaleString()} GNF
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-price">Nouveau prix (GNF)</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-price"
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="50000"
                  />
                  <Button
                    onClick={handleUpdatePrice}
                    disabled={updating || newPrice === currentPrice}
                  >
                    {updating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Mettre à jour
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le nouveau prix s'appliquera immédiatement aux nouveaux abonnements
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DriverSubscriptionManagement;
