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
  BookOpen, Truck, Camera, Leaf, Heart, Hammer, Sparkles, Filter,
  Shield, LayoutGrid, Eye, Ban, CreditCard, Settings2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Service type icon mapping
const SERVICE_ICONS: Record<string, any> = {
  restaurant: UtensilsCrossed,
  location: Home,
  construction: Hammer,
  vtc: Car,
  sport: Dumbbell,
  beaute: Scissors,
  informatique: Laptop,
  education: BookOpen,
  livraison: Truck,
  media: Camera,
  agriculture: Leaf,
  sante: Heart,
  reparation: Wrench,
  menage: Sparkles,
  ecommerce: Store,
  securite: Shield,
};

const SERVICE_COLORS: Record<string, string> = {
  restaurant: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
  location: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  construction: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  vtc: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
  sport: 'from-green-500/20 to-green-600/10 border-green-500/30',
  beaute: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  informatique: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
  education: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
  livraison: 'from-teal-500/20 to-teal-600/10 border-teal-500/30',
  media: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
  agriculture: 'from-lime-500/20 to-lime-600/10 border-lime-500/30',
  sante: 'from-red-500/20 to-red-600/10 border-red-500/30',
  reparation: 'from-slate-500/20 to-slate-600/10 border-slate-500/30',
  menage: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
  ecommerce: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  securite: 'from-sky-500/20 to-sky-600/10 border-sky-500/30',
};

interface ServiceTypeInfo {
  id: string;
  code: string;
  name: string;
}

export default function PDGServiceSubscriptions() {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [priceHistory, setPriceHistory] = useState<ServicePriceHistory[]>([]);
  const [stats, setStats] = useState<ServiceSubscriptionStats>({
    total_subscriptions: 0, active_subscriptions: 0, expired_subscriptions: 0,
    total_revenue: 0, monthly_revenue: 0, subscriptions_by_plan: {}, subscriptions_by_status: {}
  });
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditLimitsOpen, setIsEditLimitsOpen] = useState(false);
  const [isFreeDialogOpen, setIsFreeDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeServiceTab, setActiveServiceTab] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<string>('subscriptions');
  const [editLimitsForm, setEditLimitsForm] = useState({
    max_bookings_per_month: '' as string,
    max_products: '' as string,
    max_staff: '' as string,
    analytics_access: false,
    sms_notifications: false,
    email_notifications: false,
    custom_branding: false,
    priority_listing: false,
  });
  const [freeSubscriptionData, setFreeSubscriptionData] = useState({
    serviceId: '', planId: '', days: ''
  });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[PDGServiceSubscriptions] Loading data...');
      
      const [plansData, historyData, statsData, subsData] = await Promise.all([
        ServiceSubscriptionService.getPlans(),
        ServiceSubscriptionService.getPriceHistory(),
        ServiceSubscriptionService.getStats(),
        ServiceSubscriptionService.getAllSubscriptions(200)
      ]);

      const { data: stData, error: stError } = await supabase
        .from('service_types')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');

      console.log('[PDGServiceSubscriptions] Data loaded:', {
        plans: plansData.length,
        history: historyData.length,
        stats: statsData,
        subscriptions: subsData.length,
        serviceTypes: stData?.length || 0,
        stError: stError?.message
      });

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

  // Stats per service type
  const serviceTypeStats = useMemo(() => {
    const statsMap: Record<string, { active: number; expired: number; cancelled: number; total: number; revenue: number; name: string; code: string }> = {};
    
    serviceTypes.forEach(st => {
      statsMap[st.id] = { active: 0, expired: 0, cancelled: 0, total: 0, revenue: 0, name: st.name, code: st.code };
    });

    subscriptions.forEach(sub => {
      const stId = sub.professional_services?.service_type_id;
      if (!stId || !statsMap[stId]) return;
      statsMap[stId].total++;
      if (sub.status === 'active') statsMap[stId].active++;
      else if (sub.status === 'expired') statsMap[stId].expired++;
      else if (sub.status === 'cancelled') statsMap[stId].cancelled++;
      statsMap[stId].revenue += sub.price_paid_gnf || 0;
    });

    return statsMap;
  }, [subscriptions, serviceTypes]);

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    if (activeServiceTab === 'all') return subscriptions;
    return subscriptions.filter(sub => 
      sub.professional_services?.service_type_id === activeServiceTab
    );
  }, [subscriptions, activeServiceTab]);

  // Service types with subscriptions (for tabs)
  const activeServiceTypes = useMemo(() => {
    return serviceTypes.filter(st => serviceTypeStats[st.id]?.total > 0);
  }, [serviceTypes, serviceTypeStats]);

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

  const handleOpenEditLimits = (plan: ServicePlan) => {
    setSelectedPlan(plan);
    setEditLimitsForm({
      max_bookings_per_month: plan.max_bookings_per_month?.toString() || '',
      max_products: plan.max_products?.toString() || '',
      max_staff: plan.max_staff?.toString() || '',
      analytics_access: plan.analytics_access,
      sms_notifications: plan.sms_notifications,
      email_notifications: plan.email_notifications,
      custom_branding: plan.custom_branding,
      priority_listing: plan.priority_listing,
    });
    setIsEditLimitsOpen(true);
  };

  const handleSaveLimits = async () => {
    if (!selectedPlan) return;
    try {
      setSubmitting(true);
      const success = await ServiceSubscriptionService.updatePlanLimitsAndFeatures(selectedPlan.id, {
        max_bookings_per_month: editLimitsForm.max_bookings_per_month ? parseInt(editLimitsForm.max_bookings_per_month) : null,
        max_products: editLimitsForm.max_products ? parseInt(editLimitsForm.max_products) : null,
        max_staff: editLimitsForm.max_staff ? parseInt(editLimitsForm.max_staff) : null,
        analytics_access: editLimitsForm.analytics_access,
        sms_notifications: editLimitsForm.sms_notifications,
        email_notifications: editLimitsForm.email_notifications,
        custom_branding: editLimitsForm.custom_branding,
        api_access: editLimitsForm.api_access,
        priority_listing: editLimitsForm.priority_listing,
      });
      if (success) {
        toast({ title: 'Succès', description: `Limites du plan ${selectedPlan.display_name} mises à jour` });
        setIsEditLimitsOpen(false);
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

  const currentStats = activeServiceTab === 'all' 
    ? stats 
    : serviceTypeStats[activeServiceTab] 
      ? {
          total_subscriptions: serviceTypeStats[activeServiceTab].total,
          active_subscriptions: serviceTypeStats[activeServiceTab].active,
          expired_subscriptions: serviceTypeStats[activeServiceTab].expired,
          total_revenue: serviceTypeStats[activeServiceTab].revenue,
          monthly_revenue: 0,
          subscriptions_by_plan: {},
          subscriptions_by_status: {}
        }
      : null;

  const getIcon = (code: string) => {
    const IconComp = SERVICE_ICONS[code] || Store;
    return <IconComp className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Abonnements Services de Proximité</h2>
          <p className="text-muted-foreground text-sm">Gestion unifiée par catégorie de service</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsFreeDialogOpen(true)} size="sm" variant="outline">
            <Gift className="w-4 h-4 mr-2" />Offrir
          </Button>
          <Button onClick={handleMarkExpired} variant="outline" size="sm">
            <Clock className="w-4 h-4 mr-2" />Marquer expirés
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />Actualiser
          </Button>
        </div>
      </div>

      {/* Service Type Tabs - Primary Navigation */}
      <div className="overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-2 pb-2 min-w-max">
          {/* All tab */}
          <button
            onClick={() => setActiveServiceTab('all')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
              activeServiceTab === 'all'
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Vue Globale</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {subscriptions.length}
            </Badge>
          </button>

          {/* Per-service-type tabs */}
          {serviceTypes.map(st => {
            const stStats = serviceTypeStats[st.id];
            const hasData = stStats && stStats.total > 0;
            const isActive = activeServiceTab === st.id;
            const colorClass = SERVICE_COLORS[st.code] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30';

            return (
              <button
                key={st.id}
                onClick={() => setActiveServiceTab(st.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border whitespace-nowrap",
                  isActive
                    ? `bg-gradient-to-r ${colorClass} shadow-md`
                    : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
                  !hasData && "opacity-60"
                )}
              >
                {getIcon(st.code)}
                <span>{st.name}</span>
                {stStats && stStats.total > 0 && (
                  <Badge variant={isActive ? "default" : "secondary"} className="ml-1 text-[10px] px-1.5 py-0">
                    {stStats.active}/{stStats.total}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Cards for selected service */}
      {currentStats && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abonnements</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentStats.total_subscriptions}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500 font-medium">{currentStats.active_subscriptions} actifs</span>
                {currentStats.expired_subscriptions > 0 && (
                  <span className="text-destructive ml-2">{currentStats.expired_subscriptions} expirés</span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ServiceSubscriptionService.formatAmount(currentStats.total_revenue)}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux d'Activation</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentStats.total_subscriptions > 0 
                  ? ((currentStats.active_subscriptions / currentStats.total_subscriptions) * 100).toFixed(0) 
                  : 0}%
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {activeServiceTab === 'all' ? 'Rev. Mensuel' : 'Moy. / Abo.'}
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeServiceTab === 'all' 
                  ? ServiceSubscriptionService.formatAmount(stats.monthly_revenue || 0)
                  : ServiceSubscriptionService.formatAmount(
                      currentStats.total_subscriptions > 0 
                        ? Math.round(currentStats.total_revenue / currentStats.total_subscriptions) 
                        : 0
                    )
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service-specific breakdown when "all" */}
      {activeServiceTab === 'all' && activeServiceTypes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Répartition par service</h3>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-3">
              {activeServiceTypes.map(st => {
                const stStats = serviceTypeStats[st.id];
                const colorClass = SERVICE_COLORS[st.code] || 'from-gray-500/20 to-gray-600/10 border-gray-500/30';
                
                return (
                  <Card
                    key={st.id}
                    className={cn(
                      "min-w-[200px] cursor-pointer transition-all hover:shadow-lg border",
                      `bg-gradient-to-br ${colorClass}`
                    )}
                    onClick={() => setActiveServiceTab(st.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-background/60">{getIcon(st.code)}</div>
                        <span className="text-sm font-semibold">{st.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-green-500">{stStats.active}</p>
                          <p className="text-[10px] text-muted-foreground">Actifs</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-destructive">{stStats.expired}</p>
                          <p className="text-[10px] text-muted-foreground">Expirés</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{stStats.total}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs font-semibold text-primary">
                          {ServiceSubscriptionService.formatAmount(stStats.revenue)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Active filter indicator */}
      {activeServiceTab !== 'all' && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
          {getIcon(serviceTypes.find(s => s.id === activeServiceTab)?.code || '')}
          <span className="text-sm font-semibold">
            {serviceTypes.find(s => s.id === activeServiceTab)?.name}
          </span>
          <span className="text-xs text-muted-foreground">— {filteredSubscriptions.length} abonnement(s)</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setActiveServiceTab('all')}>
            <Eye className="w-4 h-4 mr-1" /> Vue globale
          </Button>
        </div>
      )}

      {/* Sub-tabs: Abonnements / Plans / Historique */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">
            <Users className="w-3.5 h-3.5 mr-1.5" />Abonnements
          </TabsTrigger>
          <TabsTrigger value="plans">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />Plans & Prix
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-3.5 h-3.5 mr-1.5" />Historique
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions List */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {activeServiceTab !== 'all' && getIcon(serviceTypes.find(s => s.id === activeServiceTab)?.code || '')}
                {activeServiceTab !== 'all'
                  ? `Abonnements ${serviceTypes.find(s => s.id === activeServiceTab)?.name}`
                  : 'Tous les Abonnements Services'}
              </CardTitle>
              <CardDescription>
                {filteredSubscriptions.length} abonnement(s) 
                {activeServiceTab !== 'all' && ` pour ${serviceTypes.find(s => s.id === activeServiceTab)?.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      {activeServiceTab === 'all' && <TableHead>Type</TableHead>}
                      <TableHead>Plan</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={activeServiceTab === 'all' ? 8 : 7} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Store className="w-8 h-8 opacity-30" />
                            <span>Aucun abonnement trouvé</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubscriptions.map((sub) => {
                        const stId = sub.professional_services?.service_type_id;
                        const st = serviceTypes.find(s => s.id === stId);
                        const daysRemaining = ServiceSubscriptionService.getDaysRemaining(sub.current_period_end);

                        return (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">
                              {sub.professional_services?.business_name || 'Inconnu'}
                            </TableCell>
                            {activeServiceTab === 'all' && (
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {getIcon(st?.code || '')}
                                  <span className="text-xs">{st?.name || '-'}</span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <Badge variant="outline">
                                {sub.service_plans?.display_name || sub.service_plans?.name || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(sub.status)}</TableCell>
                            <TableCell>
                              <span className="text-xs capitalize">{sub.billing_cycle || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: fr })}
                                </div>
                                <div className={cn(
                                  "text-xs font-medium",
                                  daysRemaining <= 0 ? "text-destructive" : daysRemaining <= 7 ? "text-orange-500" : "text-muted-foreground"
                                )}>
                                  {daysRemaining <= 0 ? 'Expiré' : `${daysRemaining}j restants`}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {ServiceSubscriptionService.formatAmount(sub.price_paid_gnf)}
                            </TableCell>
                            <TableCell>
                              {sub.status === 'active' && (
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleCancelSubscription(sub.id)}>
                                  <Ban className="w-3.5 h-3.5 mr-1" />Annuler
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans & Pricing */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plans d'Abonnement — Services de Proximité</CardTitle>
              <CardDescription>Plans unifiés pour tous les types de services professionnels</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
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
                    {plans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center gap-2">
                            <CreditCard className="w-8 h-8 opacity-30" />
                            <span>Aucun plan configuré</span>
                            <p className="text-xs">Les plans de service n'ont pas pu être chargés. Vérifiez la configuration.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">
                            <div>
                              {plan.display_name}
                              {plan.priority_listing && <Badge variant="secondary" className="ml-2">Premium</Badge>}
                            </div>
                            {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                          </TableCell>
                          <TableCell className="font-semibold">{ServiceSubscriptionService.formatAmount(plan.monthly_price_gnf)}</TableCell>
                          <TableCell>
                            {plan.yearly_price_gnf ? ServiceSubscriptionService.formatAmount(plan.yearly_price_gnf) : '-'}
                            {plan.yearly_discount_percentage && (
                              <Badge variant="secondary" className="ml-1 text-[10px]">-{plan.yearly_discount_percentage}%</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs space-y-0.5">
                            <div>Réservations: <span className="font-medium">{plan.max_bookings_per_month || '∞'}</span></div>
                            <div>Produits: <span className="font-medium">{plan.max_products || '∞'}</span></div>
                            <div>Staff: <span className="font-medium">{plan.max_staff || '∞'}</span></div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {plan.analytics_access && <Badge variant="outline" className="text-[10px]">Analytics</Badge>}
                              {plan.sms_notifications && <Badge variant="outline" className="text-[10px]">SMS</Badge>}
                              {plan.email_notifications && <Badge variant="outline" className="text-[10px]">Email</Badge>}
                              {plan.custom_branding && <Badge variant="outline" className="text-[10px]">Branding</Badge>}
                              {plan.api_access && <Badge variant="outline" className="text-[10px]">API</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenPriceDialog(plan)} title="Modifier le prix">
                                <DollarSign className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditLimits(plan)} title="Modifier limites & fonctionnalités">
                                <Settings2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Changements de Prix</CardTitle>
              <CardDescription>Traçabilité des modifications tarifaires</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Ancien Prix</TableHead>
                    <TableHead>Nouveau Prix</TableHead>
                    <TableHead>Variation</TableHead>
                    <TableHead>Raison</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center gap-2">
                          <History className="w-8 h-8 opacity-30" />
                          <span>Aucun historique de prix</span>
                          <p className="text-xs">Les changements de prix apparaîtront ici après modification d'un plan</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    priceHistory.map((h) => {
                      const diff = h.new_price - h.old_price;
                      const pctChange = h.old_price > 0 ? ((diff / h.old_price) * 100).toFixed(1) : '0';
                      return (
                        <TableRow key={h.id}>
                          <TableCell>{format(new Date(h.changed_at), 'dd MMM yyyy HH:mm', { locale: fr })}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {plans.find(p => p.id === h.plan_id)?.display_name || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>{ServiceSubscriptionService.formatAmount(h.old_price)}</TableCell>
                          <TableCell className="font-semibold">{ServiceSubscriptionService.formatAmount(h.new_price)}</TableCell>
                          <TableCell>
                            <Badge variant={diff > 0 ? 'destructive' : 'default'} className="text-xs">
                              {diff > 0 ? '+' : ''}{pctChange}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{h.reason || '-'}</TableCell>
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
            <DialogDescription>Attribuer un abonnement gratuit à un service de proximité</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ID du Service Professionnel</Label>
              <Input
                value={freeSubscriptionData.serviceId}
                onChange={e => setFreeSubscriptionData(prev => ({ ...prev, serviceId: e.target.value }))}
                placeholder="UUID du service"
              />
            </div>
            <div>
              <Label>Plan</Label>
              <select
                className="w-full p-2 border rounded-md bg-background text-foreground"
                value={freeSubscriptionData.planId}
                onChange={e => setFreeSubscriptionData(prev => ({ ...prev, planId: e.target.value }))}
              >
                <option value="">Sélectionner un plan</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.display_name} — {ServiceSubscriptionService.formatAmount(plan.monthly_price_gnf)}/mois</option>
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

      {/* Edit Limits & Features Dialog */}
      <Dialog open={isEditLimitsOpen} onOpenChange={setIsEditLimitsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier Limites & Fonctionnalités</DialogTitle>
            <DialogDescription>
              {selectedPlan?.display_name} — Ajustez les limites et les fonctionnalités incluses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Limites */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Limites</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Réservations/mois</Label>
                  <Input
                    type="number"
                    value={editLimitsForm.max_bookings_per_month}
                    onChange={e => setEditLimitsForm(f => ({ ...f, max_bookings_per_month: e.target.value }))}
                    placeholder="∞ (vide)"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Produits max</Label>
                  <Input
                    type="number"
                    value={editLimitsForm.max_products}
                    onChange={e => setEditLimitsForm(f => ({ ...f, max_products: e.target.value }))}
                    placeholder="∞ (vide)"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Staff max</Label>
                  <Input
                    type="number"
                    value={editLimitsForm.max_staff}
                    onChange={e => setEditLimitsForm(f => ({ ...f, max_staff: e.target.value }))}
                    placeholder="∞ (vide)"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Laissez vide pour illimité (∞)</p>
            </div>

            {/* Fonctionnalités */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Fonctionnalités</h4>
              <div className="space-y-2">
                {[
                  { key: 'analytics_access', label: 'Analytics' },
                  { key: 'sms_notifications', label: 'Notifications SMS' },
                  { key: 'email_notifications', label: 'Notifications Email' },
                  { key: 'custom_branding', label: 'Branding personnalisé' },
                  { key: 'api_access', label: 'Accès API' },
                  { key: 'priority_listing', label: 'Mise en avant prioritaire' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-border bg-muted/30">
                    <Label className="text-sm cursor-pointer">{label}</Label>
                    <Switch
                      checked={editLimitsForm[key as keyof typeof editLimitsForm] as boolean}
                      onCheckedChange={(checked) => setEditLimitsForm(f => ({ ...f, [key]: checked }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLimitsOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveLimits} disabled={submitting}>
              {submitting ? 'Sauvegarde...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
