import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { SubscriptionService, Plan, PriceHistory } from '@/services/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { DollarSign, History, TrendingUp, Users, Edit, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SubscriptionManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newMaxProducts, setNewMaxProducts] = useState('');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductLimitDialogOpen, setIsProductLimitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, historyData, statsData] = await Promise.all([
        SubscriptionService.getPlans(),
        SubscriptionService.getPriceHistory(),
        SubscriptionService.getSubscriptionStats(),
      ]);
      setPlans(plansData);
      setPriceHistory(historyData);
      setStats(statsData);
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

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_price_history',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleOpenDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setNewPrice(plan.monthly_price_gnf.toString());
    setReason('');
    setIsDialogOpen(true);
  };

  const handleOpenProductLimitDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setNewMaxProducts(plan.max_products?.toString() || '');
    setReason('');
    setIsProductLimitDialogOpen(true);
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

    if (priceValue === selectedPlan.monthly_price_gnf) {
      toast({
        title: 'Attention',
        description: 'Le nouveau prix doit être différent de l\'ancien',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const success = await SubscriptionService.changePlanPrice(
        selectedPlan.id,
        priceValue,
        user.id,
        reason || undefined
      );

      if (success) {
        toast({
          title: 'Succès',
          description: `Prix du plan ${selectedPlan.display_name} modifié avec succès`,
        });
        setIsDialogOpen(false);
        fetchData();
      } else {
        throw new Error('Failed to change price');
      }
    } catch (error: any) {
      console.error('Error changing price:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier le prix',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeProductLimit = async () => {
    if (!selectedPlan) return;

    const productLimit = newMaxProducts === '' ? null : parseInt(newMaxProducts);
    if (productLimit !== null && (isNaN(productLimit) || productLimit < 0)) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un nombre valide (ou vide pour illimité)',
        variant: 'destructive',
      });
      return;
    }

    if (productLimit === selectedPlan.max_products) {
      toast({
        title: 'Attention',
        description: 'La nouvelle limite doit être différente de l\'ancienne',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('plans')
        .update({ 
          max_products: productLimit,
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Limite de produits du plan ${selectedPlan.display_name} modifiée avec succès`,
      });
      setIsProductLimitDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error changing product limit:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier la limite',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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
          <h2 className="text-3xl font-bold text-foreground">Gestion des Abonnements</h2>
          <p className="text-muted-foreground">
            Gérez les plans, prix et suivez les statistiques d'abonnement
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
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
                {SubscriptionService.formatAmount(stats.total_revenue)}
              </div>
              <p className="text-xs text-muted-foreground">Tous les abonnements</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de Conversion</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_subscriptions > 0
                  ? ((stats.active_subscriptions / stats.total_subscriptions) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Abonnements actifs</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">Plans et Prix</TabsTrigger>
          <TabsTrigger value="history">Historique des Prix</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plans d'Abonnement</CardTitle>
              <CardDescription>
                Gérez les prix et caractéristiques de chaque plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Produits Max</TableHead>
                    <TableHead>Fonctionnalités</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.display_name}</TableCell>
                      <TableCell>
                        {SubscriptionService.formatAmount(plan.monthly_price_gnf)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {plan.max_products === null ? (
                            <Badge variant="secondary">Illimité</Badge>
                          ) : (
                            <span className="font-medium">{plan.max_products}</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenProductLimitDialog(plan)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {plan.analytics_access && <Badge variant="outline">Analytics</Badge>}
                          {plan.priority_support && <Badge variant="outline">Support Pro</Badge>}
                          {plan.featured_products && <Badge variant="outline">Vedette</Badge>}
                          {plan.api_access && <Badge variant="outline">API</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(plan)}
                          disabled={plan.name === 'free'}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Modifier Prix
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
                Consultez l'historique complet des modifications de prix
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Ancien Prix</TableHead>
                    <TableHead>Nouveau Prix</TableHead>
                    <TableHead>Raison</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucun changement de prix enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    priceHistory.map((history) => {
                      const plan = plans.find((p) => p.id === history.plan_id);
                      return (
                        <TableRow key={history.id}>
                          <TableCell>
                            {format(new Date(history.changed_at), 'Pp', { locale: fr })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {plan?.display_name || 'Plan inconnu'}
                          </TableCell>
                          <TableCell>
                            {SubscriptionService.formatAmount(history.old_price)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {SubscriptionService.formatAmount(history.new_price)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {history.reason || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog pour modifier le prix */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Prix du Plan</DialogTitle>
            <DialogDescription>
              {selectedPlan && `Plan: ${selectedPlan.display_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPrice">Nouveau Prix (GNF)</Label>
              <Input
                id="newPrice"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Entrez le nouveau prix"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Raison du changement</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez la raison de ce changement..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangePlanPrice} disabled={submitting}>
              {submitting ? 'Modification...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour modifier la limite de produits */}
      <Dialog open={isProductLimitDialogOpen} onOpenChange={setIsProductLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Limite de Produits</DialogTitle>
            <DialogDescription>
              {selectedPlan && `Plan: ${selectedPlan.display_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxProducts">Nombre Maximum de Produits</Label>
              <Input
                id="maxProducts"
                type="number"
                value={newMaxProducts}
                onChange={(e) => setNewMaxProducts(e.target.value)}
                placeholder="Laissez vide pour illimité"
              />
              <p className="text-xs text-muted-foreground">
                Laissez le champ vide pour autoriser un nombre illimité de produits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reasonProducts">Raison du changement (optionnel)</Label>
              <Textarea
                id="reasonProducts"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez la raison de ce changement..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductLimitDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangeProductLimit} disabled={submitting}>
              {submitting ? 'Modification...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
