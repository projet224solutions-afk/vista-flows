import { ArrowLeft, Store, Calendar, CreditCard, Wallet, CalendarDays, CheckCircle2, XCircle, Loader2, Crown, Sparkles, Package, ImageIcon, BarChart3, Headphones, Star, Code, Palette, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useVendorSubscription } from '@/hooks/useVendorSubscription';
import { Plan, SubscriptionService } from '@/services/subscriptionService';
import { format, addMonths, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductLimitInfo {
  current_count: number;
  max_products: number | null;
  can_add: boolean;
  is_unlimited: boolean;
  plan_name: string;
}

// Helper: get the plan the user is on (from subscription or free fallback)
function getActivePlan(plans: Plan[], subscription: any, hasAccess: boolean, isExpired: boolean): Plan | null {
  if (subscription && hasAccess && !isExpired) {
    return plans.find(p => p.id === subscription.plan_id) || null;
  }
  return plans.find(p => p.name === 'free') || null;
}

// Feature row component
function FeatureRow({ label, icon: Icon, enabled }: { label: string; icon: any; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1">{label}</span>
      {enabled ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      )}
    </div>
  );
}

/**
 * Génère une description marketing dynamique à partir des données réelles du plan.
 * Aucune valeur hardcodée — tout vient de l'objet plan.
 */
function buildPlanDescription(plan: Plan): string {
  const parts: string[] = [];
  const featureSet = new Set<string>();

  const normalizeFeature = (value: string): string => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('analytic')) return 'analytics';
    if (normalized.includes('support')) return 'support prioritaire';
    if (normalized.includes('avant') || normalized.includes('featured')) return 'mise en avant';
    if (normalized.includes('api')) return 'acces API';
    if (normalized.includes('branding') || normalized.includes('marque')) return 'branding personnalise';
    return normalized;
  };

  // Produits
  if (plan.max_products === null) {
    parts.push('produits illimités');
  } else {
    parts.push(`${plan.max_products} produits`);
  }

  // Images
  if (plan.max_images_per_product !== null) {
    parts.push(`${plan.max_images_per_product} images/produit`);
  }

  // Features cles
  if (plan.analytics_access) featureSet.add('analytics');
  if (plan.priority_support) featureSet.add('support prioritaire');
  if (plan.featured_products) featureSet.add('mise en avant');
  if (plan.api_access) featureSet.add('acces API');
  if (plan.custom_branding) featureSet.add('branding personnalise');

  if (Array.isArray(plan.features)) {
    for (const feature of plan.features) {
      const normalized = normalizeFeature(feature);
      if (!normalized) continue;
      if (normalized.includes('produit') || normalized.includes('image')) continue;
      featureSet.add(normalized);
    }
  }

  const orderedMainFeatures = [
    'analytics',
    'support prioritaire',
    'mise en avant',
    'acces API',
    'branding personnalise',
  ];

  const extras: string[] = [];
  for (const feature of orderedMainFeatures) {
    if (featureSet.has(feature)) {
      extras.push(feature);
      featureSet.delete(feature);
    }
  }

  for (const feature of featureSet) {
    extras.push(feature);
  }

  if (extras.length > 0) {
    parts.push(extras.join(', '));
  }

  // Construct sentence
  const toneMap: Record<string, string> = {
    free: 'Idéal pour démarrer',
    basic: 'Pour structurer votre boutique',
    pro: 'Pour accélérer votre croissance',
    business: 'Pour une activité à grande échelle',
    premium: 'Pour une gestion avancée et complète',
  };
  const tone = toneMap[plan.name] || 'Un plan adapté à vos besoins';

  return `${tone} avec ${parts.join(', ')}.`;
}

export default function VendorSubscriptionPage() {
  const navigate = useNavigate();
  const {
    subscription,
    plans,
    loading,
    hasAccess,
    isExpired,
    daysRemaining,
    expiryDate,
    priceFormatted,
    refresh,
  } = useVendorSubscription();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [processing, setProcessing] = useState(false);
  const [productLimit, setProductLimit] = useState<ProductLimitInfo | null>(null);

  const activePlan = getActivePlan(plans, subscription, hasAccess, isExpired);

  useEffect(() => {
    loadProductLimit();
  }, [subscription]);

  const loadProductLimit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const limit = await SubscriptionService.checkProductLimit(user.id);
    if (limit) setProductLimit(limit as unknown as ProductLimitInfo);
  };

  const handleBack = () => navigate('/vendeur/dashboard');

  const handleSelectPlan = (plan: Plan) => {
    if (plan.name === 'free') return;
    if (subscription && hasAccess && !isExpired && subscription.plan_id === plan.id) return;
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const calculatePrice = (plan: Plan, cycle: 'monthly' | 'yearly') => {
    if (cycle === 'yearly') {
      return plan.yearly_price_gnf || Math.round(plan.monthly_price_gnf * 12 * 0.85);
    }
    return plan.monthly_price_gnf;
  };

  const calculateEndDate = (cycle: 'monthly' | 'yearly') => {
    return cycle === 'yearly' ? addYears(new Date(), 1) : addMonths(new Date(), 1);
  };

  const calculateYearlySavings = (plan: Plan) => {
    const monthlyTotal = plan.monthly_price_gnf * 12;
    const yearlyPrice = plan.yearly_price_gnf || Math.round(monthlyTotal * 0.85);
    return monthlyTotal - yearlyPrice;
  };

  const getYearlySavingsPercent = (plan: Plan) => {
    const monthlyTotal = plan.monthly_price_gnf * 12;
    const yearlyPrice = plan.yearly_price_gnf || Math.round(monthlyTotal * 0.85);
    return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    try {
      setProcessing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Vous devez être connecté'); return; }

      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      const price = calculatePrice(selectedPlan, billingCycle);
      if (!walletData || walletData.balance < price) {
        toast.error(`Solde insuffisant. Vous avez besoin de ${SubscriptionService.formatAmount(price)}`);
        return;
      }

      const subscriptionId = await SubscriptionService.recordSubscriptionPayment({
        userId: user.id,
        planId: selectedPlan.id,
        pricePaid: price,
        paymentMethod: 'wallet',
        billingCycle,
      });

      if (subscriptionId) {
        const endDate = format(calculateEndDate(billingCycle), 'dd/MM/yyyy', { locale: fr });
        toast.success(`Abonnement ${selectedPlan.display_name} activé jusqu'au ${endDate}`);
        setIsDialogOpen(false);
        refresh();
      } else {
        throw new Error('Échec de la création');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Impossible de souscrire');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPrice = selectedPlan ? calculatePrice(selectedPlan, billingCycle) : 0;
  const endDate = calculateEndDate(billingCycle);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="container max-w-3xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Abonnement Vendeur</h1>
            <p className="text-muted-foreground">Gérez votre plan et vos limites</p>
          </div>
        </div>

        {/* Current status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Mon Plan Actuel
                </CardTitle>
                <CardDescription>
                  {!subscription
                    ? 'Vous utilisez actuellement le plan gratuit'
                    : isExpired
                      ? 'Votre abonnement a expiré'
                      : `Plan ${subscription.plan_display_name} actif`}
                </CardDescription>
              </div>
              {hasAccess && !isExpired ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Actif
                </Badge>
              ) : isExpired ? (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Expiré</Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground">Gratuit</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasAccess && subscription && !isExpired && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan actuel</p>
                    <p className="text-lg font-bold text-primary">{subscription.plan_display_name}</p>
                    <p className="text-2xl font-bold text-primary">{priceFormatted} GNF</p>
                  </div>
                  <Calendar className="h-12 w-12 text-primary/30" />
                </div>
                {expiryDate && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/10">
                    <div>
                      <p className="text-xs text-muted-foreground">Expiration</p>
                      <p className="font-medium">{format(expiryDate, 'dd MMMM yyyy', { locale: fr })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jours restants</p>
                      <p className="font-medium">{daysRemaining} jours</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Usage Limits */}
            {activePlan && (
              <div className="p-4 border rounded-xl space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Limites de votre plan
                </h3>

                {/* Products */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Produits</span>
                    <span className="font-medium">
                      {productLimit
                        ? activePlan.max_products === null
                          ? `${productLimit.current_count} (illimité)`
                          : `${productLimit.current_count} / ${activePlan.max_products}`
                        : activePlan.max_products === null ? 'Illimité' : `Max ${activePlan.max_products}`}
                    </span>
                  </div>
                  {activePlan.max_products !== null && productLimit && (
                    <Progress
                      value={Math.min((productLimit.current_count / activePlan.max_products) * 100, 100)}
                      className="h-2"
                    />
                  )}
                  {activePlan.max_products !== null && productLimit && productLimit.current_count >= activePlan.max_products * 0.8 && (
                    <p className="text-xs text-orange-600">
                      {productLimit.current_count >= activePlan.max_products
                        ? '⚠️ Limite atteinte — mettez à niveau pour ajouter des produits'
                        : '⚡ Proche de la limite'}
                    </p>
                  )}
                </div>

                {/* Images */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Images par produit</span>
                  <span className="font-medium">
                    {activePlan.max_images_per_product === null ? 'Illimité' : `Max ${activePlan.max_images_per_product}`}
                  </span>
                </div>
              </div>
            )}

            {/* Current plan features from DB */}
            {activePlan && (
              <div className="p-4 border rounded-xl space-y-3">
                <h3 className="font-semibold text-sm">Fonctionnalités incluses</h3>
                <div className="grid gap-2">
                  <FeatureRow icon={BarChart3} label="Analytics & statistiques" enabled={activePlan.analytics_access} />
                  <FeatureRow icon={Headphones} label="Support prioritaire" enabled={activePlan.priority_support} />
                  <FeatureRow icon={Star} label="Produits mis en avant" enabled={activePlan.featured_products} />
                  <FeatureRow icon={Code} label="Accès API" enabled={activePlan.api_access} />
                  <FeatureRow icon={Palette} label="Branding personnalisé" enabled={activePlan.custom_branding} />
                </div>
                {activePlan.features && activePlan.features.length > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Autres avantages :</p>
                    {activePlan.features.map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> {f}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans comparison */}
        {plans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choisir un plan</CardTitle>
              <CardDescription>Comparez les plans et choisissez celui adapté à votre activité</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plans.map((plan) => {
                const isCurrentPlan = activePlan?.id === plan.id;
                const isRecommended = plan.name === 'pro';
                const isPopular = plan.name === 'basic';
                const savingsPercent = plan.name !== 'free' ? getYearlySavingsPercent(plan) : 0;

                return (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isCurrentPlan
                        ? 'border-primary bg-primary/5'
                        : plan.name === 'free'
                          ? 'border-border bg-muted/20'
                          : 'border-border hover:border-primary/50 cursor-pointer'
                    }`}
                    onClick={() => !isCurrentPlan && plan.name !== 'free' && handleSelectPlan(plan)}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base">{plan.display_name}</h3>
                          {isCurrentPlan && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Actuel</Badge>
                          )}
                          {isRecommended && !isCurrentPlan && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs border-0">
                              <Crown className="h-3 w-3 mr-1" /> Recommandé
                            </Badge>
                          )}
                          {isPopular && !isCurrentPlan && (
                            <Badge className="bg-blue-500 text-white text-xs border-0">
                              <Sparkles className="h-3 w-3 mr-1" /> Populaire
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[#000000] mt-1 leading-snug">
                          {buildPlanDescription(plan)}
                        </p>
                      </div>
                      {!isCurrentPlan && plan.name !== 'free' && (
                        <Button size="sm">Choisir</Button>
                      )}
                    </div>

                    {/* KEY LIMITS — highly visible */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                        <Package className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-bold leading-tight">
                            {plan.max_products === null ? 'Illimité' : plan.max_products}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {plan.max_products === null ? 'produits' : plan.max_products === 1 ? 'produit max' : 'produits max'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                        <ImageIcon className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-bold leading-tight">
                            {plan.max_images_per_product === null ? 'Illimité' : plan.max_images_per_product}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {plan.max_images_per_product === null ? 'images / produit' : plan.max_images_per_product === 1 ? 'image / produit' : 'images / produit'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                      <p className="text-sm font-semibold">
                        {plan.name === 'free'
                          ? 'Gratuit — aucun paiement requis'
                          : `${SubscriptionService.formatAmount(plan.monthly_price_gnf)} GNF/mois`}
                      </p>
                      {savingsPercent > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          Économisez {savingsPercent}% en annuel
                        </p>
                      )}
                    </div>

                    {/* Features grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        {plan.analytics_access ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                        <span className={!plan.analytics_access ? 'text-muted-foreground/60' : ''}>Analytics</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {plan.priority_support ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                        <span className={!plan.priority_support ? 'text-muted-foreground/60' : ''}>Support prioritaire</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {plan.featured_products ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                        <span className={!plan.featured_products ? 'text-muted-foreground/60' : ''}>Mise en avant</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {plan.api_access ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                        <span className={!plan.api_access ? 'text-muted-foreground/60' : ''}>Accès API</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {plan.custom_branding ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                        <span className={!plan.custom_branding ? 'text-muted-foreground/60' : ''}>Branding personnalisé</span>
                      </div>
                    </div>

                    {/* Free-text features */}
                    {plan.features && plan.features.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        {plan.features.map((f, i) => (
                          <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> {f}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscription dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer votre abonnement</DialogTitle>
            <DialogDescription>
              Plan: <strong>{selectedPlan?.display_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Cycle de facturation :</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    billingCycle === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Mensuel</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPlan && SubscriptionService.formatAmount(selectedPlan.monthly_price_gnf)}/mois
                  </p>
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`p-3 rounded-lg border-2 transition-all text-left relative ${
                    billingCycle === 'yearly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {selectedPlan && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      -{getYearlySavingsPercent(selectedPlan)}%
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Annuel</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedPlan && SubscriptionService.formatAmount(calculatePrice(selectedPlan, 'yearly'))}/an
                  </p>
                </button>
              </div>
              {billingCycle === 'yearly' && selectedPlan && (
                <p className="text-xs text-green-600 font-medium">
                  Économisez {SubscriptionService.formatAmount(calculateYearlySavings(selectedPlan))} par an !
                </p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Montant</span>
                <span className="font-bold text-lg">{SubscriptionService.formatAmount(currentPrice)} GNF</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valable jusqu'au</span>
                <span className="font-medium">{format(endDate, 'dd/MM/yyyy', { locale: fr })}</span>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="font-medium">Paiement par Wallet</span>
              </div>
              <p className="text-xs text-muted-foreground">Le montant sera débité de votre wallet</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubscribe} disabled={processing}>
              <CreditCard className="w-4 h-4 mr-2" />
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
