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
import { DollarSign, History, TrendingUp, Users, Edit, RefreshCw, Gift, AlertTriangle, Image, Package } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const [newMaxImages, setNewMaxImages] = useState('');
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProductLimitDialogOpen, setIsProductLimitDialogOpen] = useState(false);
  const [isImageLimitDialogOpen, setIsImageLimitDialogOpen] = useState(false);
  const [isFreeSubscriptionDialogOpen, setIsFreeSubscriptionDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [freeSubscriptionData, setFreeSubscriptionData] = useState({
    userId: '',
    planId: '',
    days: ''
  });
  const [isSubscriptionsListOpen, setIsSubscriptionsListOpen] = useState(false);
  const [allSubscriptions, setAllSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    loadAllSubscriptionsOnMount();
    setupRealtimeSubscription();
  }, []);

  const loadAllSubscriptionsOnMount = async () => {
    try {
      setLoadingSubscriptions(true);
      
      // 1. Charger les abonnements vendeurs (table subscriptions)
      const { data: vendorSubs, error: vendorError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          status,
          billing_cycle,
          started_at,
          current_period_end,
          created_at,
          price_paid_gnf,
          plans (display_name, name)
        `)
        .order('created_at', { ascending: false });

      if (vendorError) throw vendorError;

      // 2. Charger les abonnements services (table service_subscriptions)
      const { data: serviceSubs, error: serviceError } = await supabase
        .from('service_subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          status,
          billing_cycle,
          started_at,
          current_period_end,
          created_at,
          price_paid_gnf,
          professional_service_id,
          service_plans (display_name, name, service_type_id)
        `)
        .order('created_at', { ascending: false });

      if (serviceError) throw serviceError;

      // 3. Normaliser les deux sources
      const normalizedVendor = (vendorSubs || []).map(sub => ({
        ...sub,
        source: 'vendor' as const,
        plan_display: (sub.plans as any)?.display_name || (sub.plans as any)?.name || 'N/A',
      }));

      const normalizedService = (serviceSubs || []).map(sub => ({
        ...sub,
        source: 'service' as const,
        plan_display: (sub.service_plans as any)?.display_name || (sub.service_plans as any)?.name || 'N/A',
      }));

      const allSubs = [...normalizedVendor, ...normalizedService];

      // 4. Récupérer les profils
      const userIds = [...new Set(allSubs.map(sub => sub.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, role')
          .in('id', userIds);
        profiles = profilesData || [];
      }

      // 5. Enrichir avec profils
      const enrichedData = allSubs.map(sub => ({
        ...sub,
        profiles: profiles.find(p => p.id === sub.user_id),
        acquisition_type: determineAcquisitionType(sub),
      }));

      // 6. Garder le plus récent par user
      const uniqueSubscriptions = enrichedData.reduce((acc, sub) => {
        const existingIndex = acc.findIndex(s => s.user_id === sub.user_id && s.source === sub.source);
        
        if (existingIndex === -1) {
          acc.push(sub);
        } else {
          const existingDate = new Date(acc[existingIndex].created_at);
          const currentDate = new Date(sub.created_at);
          if (currentDate > existingDate) {
            acc[existingIndex] = sub;
          }
        }
        return acc;
      }, [] as any[]);

      setAllSubscriptions(uniqueSubscriptions);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // Déterminer si l'abonnement est offert ou acheté
  const determineAcquisitionType = (sub: any): 'offered' | 'purchased' | 'free' => {
    // Billing cycle custom ou lifetime = offert par le PDG
    if (sub.billing_cycle === 'custom' || sub.billing_cycle === 'lifetime') return 'offered';
    // Prix payé = 0 ou plan gratuit = gratuit
    if (sub.price_paid_gnf === 0) return 'free';
    const planName = sub.plan_display?.toLowerCase() || sub.plans?.name?.toLowerCase() || '';
    if (planName === 'free' || planName === 'gratuit') return 'free';
    // Sinon = acheté
    return 'purchased';
  };

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

  const loadAllSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          plan_id,
          status,
          billing_cycle,
          started_at,
          current_period_end,
          created_at,
          plans (display_name, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Récupérer les profils utilisateurs séparément
      const userIds = [...new Set(data?.map(sub => sub.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fusionner les données
      const enrichedData = data?.map(sub => ({
        ...sub,
        profiles: profiles?.find(p => p.id === sub.user_id)
      }));

      // Filtrer pour garder seulement le dernier abonnement par utilisateur
      const uniqueSubscriptions = enrichedData?.reduce((acc, sub) => {
        const existingIndex = acc.findIndex(s => s.user_id === sub.user_id);
        
        if (existingIndex === -1) {
          // Pas encore d'abonnement pour cet utilisateur
          acc.push(sub);
        } else {
          // Comparer les dates pour garder le plus récent
          const existingDate = new Date(acc[existingIndex].created_at);
          const currentDate = new Date(sub.created_at);
          
          if (currentDate > existingDate) {
            acc[existingIndex] = sub;
          }
        }
        
        return acc;
      }, [] as any[]);

      setAllSubscriptions(uniqueSubscriptions || []);
      setIsSubscriptionsListOpen(true);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les abonnements',
        variant: 'destructive',
      });
    } finally {
      setLoadingSubscriptions(false);
    }
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

  const handleOpenImageLimitDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setNewMaxImages(plan.max_images_per_product?.toString() || '');
    setReason('');
    setIsImageLimitDialogOpen(true);
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

  const handleOpenFreeSubscriptionDialog = () => {
    setFreeSubscriptionData({ userId: '', planId: '', days: '' });
    setIsFreeSubscriptionDialogOpen(true);
  };

  const handleOfferFreeSubscription = async () => {
    if (!freeSubscriptionData.userId || !freeSubscriptionData.planId || !freeSubscriptionData.days) {
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
        description: 'Le nombre de jours doit être un nombre positif',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Résoudre l'ID utilisateur (accepte UUID ou custom_id)
      let resolvedUserId = freeSubscriptionData.userId;
      
      // Si ce n'est pas un UUID, chercher dans user_ids
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(freeSubscriptionData.userId)) {
        const { data: userIdData, error: userIdError } = await supabase
          .from('user_ids')
          .select('user_id')
          .eq('custom_id', freeSubscriptionData.userId.toUpperCase())
          .single();

        if (userIdError || !userIdData) {
          throw new Error(`Code utilisateur "${freeSubscriptionData.userId}" non trouvé`);
        }

        resolvedUserId = userIdData.user_id;
      }

      // Calculer la date de fin
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      // Créer l'abonnement gratuit
      const { error } = await supabase.from('subscriptions').insert({
        user_id: resolvedUserId,
        plan_id: freeSubscriptionData.planId,
        price_paid_gnf: 0,
        billing_cycle: 'custom',
        status: 'active',
        started_at: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        auto_renew: false,
        payment_method: 'free_gift',
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Abonnement gratuit de ${days} jours offert avec succès`,
      });

      setIsFreeSubscriptionDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error offering free subscription:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de l\'attribution de l\'abonnement',
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

  const handleChangeImageLimit = async () => {
    if (!selectedPlan) return;

    const imageLimit = newMaxImages === '' ? null : parseInt(newMaxImages);
    if (imageLimit !== null && (isNaN(imageLimit) || imageLimit < 1)) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un nombre valide (minimum 1)',
        variant: 'destructive',
      });
      return;
    }

    if (imageLimit === selectedPlan.max_images_per_product) {
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
          max_images_per_product: imageLimit,
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: `Limite d'images du plan ${selectedPlan.display_name} modifiée avec succès`,
      });
      setIsImageLimitDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error changing image limit:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de modifier la limite',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Vérifier les incohérences de limites
  const getLimitWarnings = () => {
    const warnings: string[] = [];
    const sortedPlans = [...plans].sort((a, b) => a.monthly_price_gnf - b.monthly_price_gnf);
    
    for (let i = 1; i < sortedPlans.length; i++) {
      const currentPlan = sortedPlans[i];
      const previousPlan = sortedPlans[i - 1];
      
      // Vérifier max_products
      if (currentPlan.max_products !== null && previousPlan.max_products !== null) {
        if (currentPlan.max_products < previousPlan.max_products) {
          warnings.push(`${currentPlan.display_name} (${currentPlan.max_products} produits) < ${previousPlan.display_name} (${previousPlan.max_products} produits)`);
        }
      }
      
      // Vérifier max_images
      if (currentPlan.max_images_per_product !== null && previousPlan.max_images_per_product !== null) {
        if (currentPlan.max_images_per_product < previousPlan.max_images_per_product) {
          warnings.push(`${currentPlan.display_name} (${currentPlan.max_images_per_product} images) < ${previousPlan.display_name} (${previousPlan.max_images_per_product} images)`);
        }
      }
    }
    
    return warnings;
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
        <div className="flex gap-2">
          <Button onClick={handleOpenFreeSubscriptionDialog} variant="default" size="sm">
            <Gift className="w-4 h-4 mr-2" />
            Offrir Abonnement
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={loadAllSubscriptions}>
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

      {/* Alerte pour les incohérences de limites */}
      {getLimitWarnings().length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Incohérences détectées dans les limites</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Les plans moins chers ont plus d'avantages que les plans plus chers :</p>
            <ul className="list-disc list-inside space-y-1">
              {getLimitWarnings().map((warning, idx) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
            <p className="mt-2 font-medium">Cliquez sur les boutons d'édition pour corriger.</p>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscribers">📋 Vendeurs Abonnés</TabsTrigger>
          <TabsTrigger value="plans">Plans et Prix</TabsTrigger>
          <TabsTrigger value="history">Historique des Prix</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Liste des Vendeurs Abonnés
                  </CardTitle>
                  <CardDescription>
                    Tous les vendeurs avec un abonnement actif
                  </CardDescription>
                </div>
                <Button onClick={loadAllSubscriptions} variant="outline" size="sm" disabled={loadingSubscriptions}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingSubscriptions ? 'animate-spin' : ''}`} />
                  Actualiser
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSubscriptions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-3">Chargement...</span>
                </div>
              ) : allSubscriptions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun abonnement trouvé</p>
                  <Button onClick={loadAllSubscriptions} variant="outline" className="mt-4">
                    Charger les abonnements
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{allSubscriptions.length} abonnement(s) trouvé(s)</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendeur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Début</TableHead>
                        <TableHead>Fin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {sub.profiles?.first_name} {sub.profiles?.last_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sub.profiles?.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{sub.profiles?.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{sub.plans?.display_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sub.status === 'active' ? 'default' : 'destructive'}>
                              {sub.status === 'active' ? '✓ Actif' : sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub.billing_cycle === 'lifetime' ? (
                              <Badge variant="default" className="bg-primary text-primary-foreground">
                                🎁 À vie
                              </Badge>
                            ) : sub.billing_cycle === 'custom' ? (
                              <Badge variant="outline" className="border-accent text-accent-foreground">
                                🎁 Offert
                              </Badge>
                            ) : sub.billing_cycle === 'yearly' ? (
                              <Badge variant="outline">Annuel</Badge>
                            ) : (
                              <Badge variant="outline">{sub.billing_cycle}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sub.started_at ? format(new Date(sub.started_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sub.current_period_end ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: fr }) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plans d'Abonnement</CardTitle>
              <CardDescription>
                Gérez les prix, limites de produits et images de chaque plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Prix Mensuel</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        Produits Max
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Image className="w-4 h-4" />
                        Images/Produit
                      </div>
                    </TableHead>
                    <TableHead>Fonctionnalités</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan, index) => {
                    const prevPlan = index > 0 ? plans[index - 1] : null;
                    const hasProductWarning = prevPlan && 
                      plan.max_products !== null && 
                      prevPlan.max_products !== null && 
                      plan.max_products < prevPlan.max_products;
                    const hasImageWarning = prevPlan && 
                      plan.max_images_per_product !== null && 
                      prevPlan.max_images_per_product !== null && 
                      plan.max_images_per_product < prevPlan.max_images_per_product;
                    
                    return (
                      <TableRow key={plan.id} className={hasProductWarning || hasImageWarning ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-medium">{plan.display_name}</TableCell>
                        <TableCell>
                          {SubscriptionService.formatAmount(plan.monthly_price_gnf)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {plan.max_products === null ? (
                              <Badge variant="secondary">Illimité</Badge>
                            ) : (
                              <span className={`font-medium ${hasProductWarning ? 'text-destructive' : ''}`}>
                                {plan.max_products}
                              </span>
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
                          <div className="flex items-center gap-2">
                            {plan.max_images_per_product === null ? (
                              <Badge variant="secondary">Illimité</Badge>
                            ) : (
                              <span className={`font-medium ${hasImageWarning ? 'text-destructive' : ''}`}>
                                {plan.max_images_per_product}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenImageLimitDialog(plan)}
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
                    );
                  })}
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

      {/* Dialog pour modifier la limite d'images */}
      <Dialog open={isImageLimitDialogOpen} onOpenChange={setIsImageLimitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la Limite d'Images par Produit</DialogTitle>
            <DialogDescription>
              {selectedPlan && `Plan: ${selectedPlan.display_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxImages">Nombre Maximum d'Images par Produit</Label>
              <Input
                id="maxImages"
                type="number"
                min="1"
                value={newMaxImages}
                onChange={(e) => setNewMaxImages(e.target.value)}
                placeholder="Ex: 3, 5, 10"
              />
              <p className="text-xs text-muted-foreground">
                Nombre d'images qu'un vendeur peut ajouter par produit (minimum 1)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reasonImages">Raison du changement (optionnel)</Label>
              <Textarea
                id="reasonImages"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez la raison de ce changement..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImageLimitDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangeImageLimit} disabled={submitting}>
              {submitting ? 'Modification...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour offrir un abonnement gratuit */}
      <Dialog open={isFreeSubscriptionDialogOpen} onOpenChange={setIsFreeSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offrir un Abonnement Gratuit</DialogTitle>
            <DialogDescription>
              Attribuez un abonnement gratuit à un utilisateur pour une durée déterminée
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID Utilisateur</Label>
              <Input
                id="userId"
                type="text"
                value={freeSubscriptionData.userId}
                onChange={(e) => setFreeSubscriptionData({ ...freeSubscriptionData, userId: e.target.value })}
                placeholder="UUID de l'utilisateur"
              />
              <p className="text-xs text-muted-foreground">
                L'identifiant unique de l'utilisateur (UUID)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planSelect">Plan d'Abonnement</Label>
              <select
                id="planSelect"
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                value={freeSubscriptionData.planId}
                onChange={(e) => setFreeSubscriptionData({ ...freeSubscriptionData, planId: e.target.value })}
              >
                <option value="">Sélectionnez un plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.display_name} - {SubscriptionService.formatAmount(plan.monthly_price_gnf)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Nombre de Jours</Label>
              <Input
                id="days"
                type="number"
                value={freeSubscriptionData.days}
                onChange={(e) => setFreeSubscriptionData({ ...freeSubscriptionData, days: e.target.value })}
                placeholder="Ex: 30, 60, 90"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Durée de l'abonnement gratuit en jours
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFreeSubscriptionDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleOfferFreeSubscription} disabled={submitting}>
              {submitting ? 'Attribution...' : 'Offrir l\'Abonnement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Liste des Abonnements */}
      <Dialog open={isSubscriptionsListOpen} onOpenChange={setIsSubscriptionsListOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Liste des Abonnements</DialogTitle>
            <DialogDescription>
              {allSubscriptions.length} abonnement(s) au total
            </DialogDescription>
          </DialogHeader>
          
          {loadingSubscriptions ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {sub.profiles?.first_name} {sub.profiles?.last_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.profiles?.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.profiles?.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{sub.plans?.display_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.status === 'active' ? 'default' : 'destructive'}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.billing_cycle === 'lifetime' ? (
                          <Badge variant="default" className="bg-primary text-primary-foreground">
                            🎁 Offert
                          </Badge>
                        ) : (
                          <span className="text-sm">{sub.billing_cycle}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sub.started_at ? format(new Date(sub.started_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {sub.current_period_end ? format(new Date(sub.current_period_end), 'dd/MM/yyyy', { locale: fr }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
