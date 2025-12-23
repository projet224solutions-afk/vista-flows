import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ServiceSubscriptionService,
  ServicePlan,
  ServicePriceHistory,
  ServiceSubscriptionStats
} from '@/services/serviceSubscriptionService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
  DollarSign, 
  History, 
  TrendingUp, 
  Users, 
  Edit, 
  RefreshCw, 
  Gift,
  Store,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PDGServiceSubscriptions() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [priceHistory, setPriceHistory] = useState<ServicePriceHistory[]>([]);
  const [stats, setStats] = useState<ServiceSubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFreeDialogOpen, setIsFreeDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [freeSubscriptionData, setFreeSubscriptionData] = useState({
    serviceId: '',
    planId: '',
    days: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, historyData, statsData, subsData] = await Promise.all([
        ServiceSubscriptionService.getPlans(),
        ServiceSubscriptionService.getPriceHistory(),
        ServiceSubscriptionService.getStats(),
        ServiceSubscriptionService.getAllSubscriptions(50)
      ]);
      setPlans(plansData);
      setPriceHistory(historyData);
      setStats(statsData);
      setSubscriptions(subsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPriceDialog = (plan: ServicePlan) => {
    setSelectedPlan(plan);
    setNewPrice(plan.monthly_price_gnf.toString());
    setReason('');
    setIsDialogOpen(true);
  };

  const handleChangePlanPrice = async () => {
    if (!selectedPlan) return;

    const priceValue = parseInt(newPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un prix valide',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const success = await ServiceSubscriptionService.changePlanPrice(
        selectedPlan.id,
        priceValue,
        user.id,
        reason || undefined
      );

      if (success) {
        toast({
          title: 'Succès',
          description: `Prix du plan ${selectedPlan.display_name} modifié`,
        });
        setIsDialogOpen(false);
        fetchData();
      } else {
        throw new Error('Échec de la modification');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le prix',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfferFreeSubscription = async () => {
    if (!freeSubscriptionData.serviceId || !freeSubscriptionData.planId || !freeSubscriptionData.days) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive',
      });
      return;
    }

    const days = parseInt(freeSubscriptionData.days);
    if (isNaN(days) || days <= 0) {
      toast({
        title: 'Erreur',
        description: 'Nombre de jours invalide',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Récupérer le service et son user_id
      const { data: service, error: serviceError } = await supabase
        .from('professional_services')
        .select('id, user_id')
        .eq('id', freeSubscriptionData.serviceId)
        .single();

      if (serviceError || !service) {
        throw new Error('Service non trouvé');
      }

      const success = await ServiceSubscriptionService.offerFreeSubscription(
        service.id,
        service.user_id,
        freeSubscriptionData.planId,
        days
      );

      if (success) {
        toast({
          title: 'Succès',
          description: `Abonnement gratuit de ${days} jours offert`,
        });
        setIsFreeDialogOpen(false);
        setFreeSubscriptionData({ serviceId: '', planId: '', days: '' });
        fetchData();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'attribution',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cet abonnement ?')) return;

    const success = await ServiceSubscriptionService.cancelSubscription(subscriptionId);
    if (success) {
      toast({ title: 'Abonnement annulé' });
      fetchData();
    } else {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  const handleMarkExpired = async () => {
    const count = await ServiceSubscriptionService.markExpiredSubscriptions();
    toast({ title: `${count} abonnement(s) expiré(s) marqué(s)` });
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case 'expired':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expiré</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Annulé</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />Impayé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Abonnements Services Professionnels</h2>
          <p className="text-muted-foreground">
            Gérez les plans et abonnements des 15 types de services
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsFreeDialogOpen(true)} variant="default" size="sm">
            <Gift className="w-4 h-4 mr-2" />
            Offrir Abonnement
          </Button>
          <Button onClick={handleMarkExpired} variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />
            Marquer Expirés
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Abonnements</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_subscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_subscriptions} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ServiceSubscriptionService.formatAmount(stats.total_revenue)}
              </div>
              <p className="text-xs text-muted-foreground">Tous les services</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Mensuel</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ServiceSubscriptionService.formatAmount(stats.monthly_revenue)}
              </div>
              <p className="text-xs text-muted-foreground">30 derniers jours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Services Actifs</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_subscriptions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_subscriptions > 0
                  ? ((stats.active_subscriptions / stats.total_subscriptions) * 100).toFixed(0)
                  : 0}% du total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans et Prix</TabsTrigger>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          <TabsTrigger value="history">Historique Prix</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plans d'Abonnement Services</CardTitle>
              <CardDescription>
                Plans disponibles pour les services professionnels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Prix Mensuel</TableHead>
                    <TableHead>Prix Annuel</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Fonctionnalités</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <div>
                          {plan.display_name}
                          {plan.priority_listing && (
                            <Badge variant="secondary" className="ml-2">Premium</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </TableCell>
                      <TableCell>
                        {ServiceSubscriptionService.formatAmount(plan.monthly_price_gnf)}
                      </TableCell>
                      <TableCell>
                        {plan.yearly_price_gnf 
                          ? ServiceSubscriptionService.formatAmount(plan.yearly_price_gnf)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>Réservations: {plan.max_bookings_per_month || '∞'}</div>
                        <div>Produits: {plan.max_products || '∞'}</div>
                        <div>Staff: {plan.max_staff || '∞'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {plan.analytics_access && <Badge variant="outline" className="text-xs">Analytics</Badge>}
                          {plan.sms_notifications && <Badge variant="outline" className="text-xs">SMS</Badge>}
                          {plan.custom_branding && <Badge variant="outline" className="text-xs">Branding</Badge>}
                          {plan.api_access && <Badge variant="outline" className="text-xs">API</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenPriceDialog(plan)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Abonnements Actifs</CardTitle>
              <CardDescription>
                Liste des abonnements de services professionnels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun abonnement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.professional_services?.business_name || 'Service inconnu'}
                        </TableCell>
                        <TableCell>
                          {sub.service_plans?.display_name || sub.service_plans?.name || 'Plan inconnu'}
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: fr })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ServiceSubscriptionService.getDaysRemaining(sub.current_period_end)} jours restants
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ServiceSubscriptionService.formatAmount(sub.price_paid_gnf)}
                        </TableCell>
                        <TableCell>
                          {sub.status === 'active' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCancelSubscription(sub.id)}
                            >
                              Annuler
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Changements de Prix</CardTitle>
              <CardDescription>
                Suivi des modifications de prix des plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ancien Prix</TableHead>
                    <TableHead>Nouveau Prix</TableHead>
                    <TableHead>Raison</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Aucun historique de changement de prix
                      </TableCell>
                    </TableRow>
                  ) : (
                    priceHistory.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell>
                          {format(new Date(history.changed_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {ServiceSubscriptionService.formatAmount(history.old_price)}
                        </TableCell>
                        <TableCell>
                          {ServiceSubscriptionService.formatAmount(history.new_price)}
                        </TableCell>
                        <TableCell>{history.reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Changement de Prix */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Prix du Plan</DialogTitle>
            <DialogDescription>
              {selectedPlan?.display_name} - Prix actuel: {selectedPlan && ServiceSubscriptionService.formatAmount(selectedPlan.monthly_price_gnf)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPrice">Nouveau Prix (GNF)</Label>
              <Input
                id="newPrice"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Ex: 50000"
              />
            </div>
            <div>
              <Label htmlFor="reason">Raison (optionnel)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Ajustement tarifaire"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangePlanPrice} disabled={submitting}>
              {submitting ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Offrir Abonnement Gratuit */}
      <Dialog open={isFreeDialogOpen} onOpenChange={setIsFreeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offrir un Abonnement Gratuit</DialogTitle>
            <DialogDescription>
              Attribuer un abonnement gratuit à un service professionnel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceId">ID du Service</Label>
              <Input
                id="serviceId"
                value={freeSubscriptionData.serviceId}
                onChange={(e) => setFreeSubscriptionData(prev => ({ ...prev, serviceId: e.target.value }))}
                placeholder="UUID du service professionnel"
              />
            </div>
            <div>
              <Label htmlFor="planId">Plan</Label>
              <select
                id="planId"
                className="w-full p-2 border rounded-md bg-background"
                value={freeSubscriptionData.planId}
                onChange={(e) => setFreeSubscriptionData(prev => ({ ...prev, planId: e.target.value }))}
              >
                <option value="">Sélectionner un plan</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="days">Durée (jours)</Label>
              <Input
                id="days"
                type="number"
                value={freeSubscriptionData.days}
                onChange={(e) => setFreeSubscriptionData(prev => ({ ...prev, days: e.target.value }))}
                placeholder="Ex: 30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFreeDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleOfferFreeSubscription} disabled={submitting}>
              {submitting ? 'Attribution...' : 'Offrir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
