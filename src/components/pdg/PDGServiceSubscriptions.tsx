import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ServiceSubscriptionService,
  ServicePlan,
  ServicePriceHistory,
  ServiceSubscriptionStats
} from '@/services/serviceSubscriptionService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { 
  DollarSign, History, TrendingUp, Users, Edit, RefreshCw, Gift,
  Store, Calendar, AlertCircle, CheckCircle, XCircle, Clock,
  UtensilsCrossed, Home, Wrench, Car, Dumbbell, Scissors, Laptop,
  BookOpen, Truck, Camera, Leaf, Heart, Hammer, Sparkles, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Service type icon mapping
const SERVICE_ICONS: Record<string, React.ReactNode> = {
  restaurant: <UtensilsCrossed className="w-4 h-4" />,
  location: <Home className="w-4 h-4" />,
  construction: <Hammer className="w-4 h-4" />,
  vtc: <Car className="w-4 h-4" />,
  sport: <Dumbbell className="w-4 h-4" />,
  beaute: <Scissors className="w-4 h-4" />,
  informatique: <Laptop className="w-4 h-4" />,
  education: <BookOpen className="w-4 h-4" />,
  livraison: <Truck className="w-4 h-4" />,
  media: <Camera className="w-4 h-4" />,
  agriculture: <Leaf className="w-4 h-4" />,
  sante: <Heart className="w-4 h-4" />,
  reparation: <Wrench className="w-4 h-4" />,
  menage: <Sparkles className="w-4 h-4" />,
  ecommerce: <Store className="w-4 h-4" />,
};

interface ServiceTypeInfo {
  id: string;
  code: string;
  name: string;
}

export default function PDGServiceSubscriptions() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [priceHistory, setPriceHistory] = useState<ServicePriceHistory[]>([]);
  const [stats, setStats] = useState<ServiceSubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFreeDialogOpen, setIsFreeDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [freeSubscriptionData, setFreeSubscriptionData] = useState({
    serviceId: '', planId: '', days: ''
  });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, historyData, statsData, subsData] = await Promise.all([
        ServiceSubscriptionService.getPlans(),
        ServiceSubscriptionService.getPriceHistory(),
        ServiceSubscriptionService.getStats(),
        ServiceSubscriptionService.getAllSubscriptions(200)
      ]);

      // Fetch service types
      const { data: stData } = await supabase
        .from('service_types')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');

      setPlans(plansData);
      setPriceHistory(historyData);
      setStats(statsData);
      setSubscriptions(subsData);
      setServiceTypes(stData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter subscriptions by service type
  const filteredSubscriptions = useMemo(() => {
    if (selectedServiceType === 'all') return subscriptions;
    return subscriptions.filter(sub => 
      sub.professional_services?.service_type_id === selectedServiceType
    );
  }, [subscriptions, selectedServiceType]);

  // Stats per service type
  const serviceTypeStats = useMemo(() => {
    const statsMap: Record<string, { active: number; total: number; revenue: number; name: string }> = {};
    
    subscriptions.forEach(sub => {
      const stId = sub.professional_services?.service_type_id;
      if (!stId) return;
      const st = serviceTypes.find(s => s.id === stId);
      if (!statsMap[stId]) {
        statsMap[stId] = { active: 0, total: 0, revenue: 0, name: st?.name || 'Inconnu' };
      }
      statsMap[stId].total++;
      if (sub.status === 'active') statsMap[stId].active++;
      statsMap[stId].revenue += sub.price_paid_gnf || 0;
    });

    return statsMap;
  }, [subscriptions, serviceTypes]);

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
      toast({ title: 'Erreur', description: 'Prix invalide', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const success = await ServiceSubscriptionService.changePlanPrice(selectedPlan.id, priceValue, user.id, reason || undefined);
      if (success) {
        toast({ title: 'Succès', description: `Prix du plan ${selectedPlan.display_name} modifié` });
        setIsDialogOpen(false);
        fetchData();
      } else throw new Error('Échec');
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfferFreeSubscription = async () => {
    if (!freeSubscriptionData.serviceId || !freeSubscriptionData.planId || !freeSubscriptionData.days) {
      toast({ title: 'Erreur', description: 'Remplissez tous les champs', variant: 'destructive' });
      return;
    }
    const days = parseInt(freeSubscriptionData.days);
    if (isNaN(days) || days <= 0) {
      toast({ title: 'Erreur', description: 'Jours invalides', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const { data: service, error: serviceError } = await supabase
        .from('professional_services')
        .select('id, user_id')
        .eq('id', freeSubscriptionData.serviceId)
        .single();

      if (serviceError || !service) throw new Error('Service non trouvé');

      const success = await ServiceSubscriptionService.offerFreeSubscription(
        service.id, service.user_id, freeSubscriptionData.planId, days
      );
      if (success) {
        toast({ title: 'Succès', description: `Abonnement de ${days} jours offert` });
        setIsFreeDialogOpen(false);
        setFreeSubscriptionData({ serviceId: '', planId: '', days: '' });
        fetchData();
      }
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Annuler cet abonnement ?')) return;
    const success = await ServiceSubscriptionService.cancelSubscription(subscriptionId);
    if (success) { toast({ title: 'Abonnement annulé' }); fetchData(); }
    else toast({ title: 'Erreur', variant: 'destructive' });
  };

  const handleMarkExpired = async () => {
    const count = await ServiceSubscriptionService.markExpiredSubscriptions();
    toast({ title: `${count} abonnement(s) expiré(s) marqué(s)` });
    fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case 'expired': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expiré</Badge>;
      case 'cancelled': return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Annulé</Badge>;
      case 'past_due': return <Badge className="bg-orange-500 text-white"><AlertCircle className="w-3 h-3 mr-1" />Impayé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Abonnements Services Professionnels</h2>
          <p className="text-muted-foreground text-sm">Gestion par type de service</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsFreeDialogOpen(true)} size="sm">
            <Gift className="w-4 h-4 mr-2" />Offrir
          </Button>
          <Button onClick={handleMarkExpired} variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />Expirés
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />Actualiser
          </Button>
        </div>
      </div>

      {/* Global Stats */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_subscriptions}</div>
              <p className="text-xs text-muted-foreground">{stats.active_subscriptions} actifs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ServiceSubscriptionService.formatAmount(stats.total_revenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Mensuel</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ServiceSubscriptionService.formatAmount(stats.monthly_revenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux Actif</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_subscriptions > 0 ? ((stats.active_subscriptions / stats.total_subscriptions) * 100).toFixed(0) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-Service-Type Stats Cards */}
      {Object.keys(serviceTypeStats).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Abonnements par type de service
          </h3>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-3">
              {Object.entries(serviceTypeStats).map(([stId, st]) => {
                const stInfo = serviceTypes.find(s => s.id === stId);
                const code = stInfo?.code || '';
                const icon = SERVICE_ICONS[code] || <Store className="w-4 h-4" />;
                const isSelected = selectedServiceType === stId;
                
                return (
                  <Card
                    key={stId}
                    className={`min-w-[180px] cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedServiceType(isSelected ? 'all' : stId)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-primary/10">{icon}</div>
                        <span className="text-xs font-medium truncate">{st.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-lg font-bold">{st.active}</p>
                          <p className="text-[10px] text-muted-foreground">Actifs</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{st.total}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-primary mt-1">
                        {ServiceSubscriptionService.formatAmount(st.revenue)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Filter indicator */}
      {selectedServiceType !== 'all' && (
        <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-3">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            Filtré: {serviceTypes.find(s => s.id === selectedServiceType)?.name}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedServiceType('all')}>
            <XCircle className="w-4 h-4 mr-1" /> Réinitialiser
          </Button>
          <Badge variant="secondary">{filteredSubscriptions.length} résultat(s)</Badge>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          <TabsTrigger value="plans">Plans et Prix</TabsTrigger>
          <TabsTrigger value="history">Historique Prix</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedServiceType !== 'all'
                  ? `Abonnements - ${serviceTypes.find(s => s.id === selectedServiceType)?.name}`
                  : 'Tous les Abonnements'}
              </CardTitle>
              <CardDescription>
                {filteredSubscriptions.length} abonnement(s) trouvé(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Aucun abonnement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscriptions.map((sub) => {
                      const stId = sub.professional_services?.service_type_id;
                      const st = serviceTypes.find(s => s.id === stId);
                      const code = st?.code || '';
                      const icon = SERVICE_ICONS[code] || <Store className="w-3 h-3" />;

                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {sub.professional_services?.business_name || 'Inconnu'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {icon}
                              <span className="text-xs">{st?.name || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {sub.service_plans?.display_name || sub.service_plans?.name || '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: fr })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ServiceSubscriptionService.getDaysRemaining(sub.current_period_end)}j restants
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {ServiceSubscriptionService.formatAmount(sub.price_paid_gnf)}
                          </TableCell>
                          <TableCell>
                            {sub.status === 'active' && (
                              <Button variant="destructive" size="sm" onClick={() => handleCancelSubscription(sub.id)}>
                                Annuler
                              </Button>
                            )}
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

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plans d'Abonnement Services</CardTitle>
              <CardDescription>Plans disponibles pour tous les services professionnels</CardDescription>
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
                          {plan.priority_listing && <Badge variant="secondary" className="ml-2">Premium</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.description}</p>
                      </TableCell>
                      <TableCell>{ServiceSubscriptionService.formatAmount(plan.monthly_price_gnf)}</TableCell>
                      <TableCell>
                        {plan.yearly_price_gnf ? ServiceSubscriptionService.formatAmount(plan.yearly_price_gnf) : '-'}
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
                        <Button variant="ghost" size="sm" onClick={() => handleOpenPriceDialog(plan)}>
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

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Changements de Prix</CardTitle>
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
                        Aucun historique
                      </TableCell>
                    </TableRow>
                  ) : (
                    priceHistory.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{format(new Date(h.changed_at), 'dd MMM yyyy HH:mm', { locale: fr })}</TableCell>
                        <TableCell>{ServiceSubscriptionService.formatAmount(h.old_price)}</TableCell>
                        <TableCell>{ServiceSubscriptionService.formatAmount(h.new_price)}</TableCell>
                        <TableCell>{h.reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Price Change Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le Prix</DialogTitle>
            <DialogDescription>
              {selectedPlan?.display_name} — Actuel: {selectedPlan && ServiceSubscriptionService.formatAmount(selectedPlan.monthly_price_gnf)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nouveau Prix (GNF)</Label>
              <Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
            </div>
            <div>
              <Label>Raison (optionnel)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ajustement tarifaire" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleChangePlanPrice} disabled={submitting}>
              {submitting ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Free Subscription Dialog */}
      <Dialog open={isFreeDialogOpen} onOpenChange={setIsFreeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offrir un Abonnement Gratuit</DialogTitle>
            <DialogDescription>Attribuer un abonnement gratuit à un service</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ID du Service</Label>
              <Input
                value={freeSubscriptionData.serviceId}
                onChange={e => setFreeSubscriptionData(prev => ({ ...prev, serviceId: e.target.value }))}
                placeholder="UUID du service"
              />
            </div>
            <div>
              <Label>Plan</Label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={freeSubscriptionData.planId}
                onChange={e => setFreeSubscriptionData(prev => ({ ...prev, planId: e.target.value }))}
              >
                <option value="">Sélectionner</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Durée (jours)</Label>
              <Input
                type="number"
                value={freeSubscriptionData.days}
                onChange={e => setFreeSubscriptionData(prev => ({ ...prev, days: e.target.value }))}
                placeholder="30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFreeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleOfferFreeSubscription} disabled={submitting}>
              {submitting ? 'Attribution...' : 'Offrir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
