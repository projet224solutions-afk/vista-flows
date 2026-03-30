import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionService } from '@/services/subscriptionService';

export interface AffiliateModuleState {
  loading: boolean;
  hasActiveSubscription: boolean;
  hasEligibleActiveSubscription: boolean;
  requiresDedicatedAffiliatePlan: boolean;
  activeSubscriptionPlanName: string | null;
  subscriptionId: string | null;
  affiliateRowId: string | null;
  affiliateCode: string | null;
  affiliateStatus: string | null;
  isAffiliateEnabled: boolean;
}

const ACTIVE_AFFILIATE_STATUSES = new Set(['approved', 'active']);
const AFFILIATE_PLAN_KEYWORDS = ['affiliate', 'affiliation', 'affilie'];
const AFFILIATE_FEATURE_FLAGS = ['affiliate_access', 'affiliate_module', 'module_affiliate', 'travel_affiliate'];

function generateAffiliateCode() {
  const prefix = 'AFF';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

function extractFeatureStrings(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((item) => String(item).toLowerCase());
  if (typeof raw === 'object') return Object.keys(raw as Record<string, unknown>).map((key) => key.toLowerCase());
  return [String(raw).toLowerCase()];
}

function isDedicatedAffiliatePlan(plan: { name?: string | null; display_name?: string | null; features?: unknown }): boolean {
  const text = `${plan.name || ''} ${plan.display_name || ''}`.toLowerCase();
  if (AFFILIATE_PLAN_KEYWORDS.some((keyword) => text.includes(keyword))) return true;
  const featureList = extractFeatureStrings(plan.features);
  return AFFILIATE_FEATURE_FLAGS.some((flag) => featureList.some((value) => value.includes(flag)));
}

export function useAffiliateModule() {
  const { user } = useAuth();
  const [state, setState] = useState<AffiliateModuleState>({
    loading: true,
    hasActiveSubscription: false,
    hasEligibleActiveSubscription: false,
    requiresDedicatedAffiliatePlan: false,
    activeSubscriptionPlanName: null,
    subscriptionId: null,
    affiliateRowId: null,
    affiliateCode: null,
    affiliateStatus: null,
    isAffiliateEnabled: false,
  });

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setState({
        loading: false,
        hasActiveSubscription: false,
        hasEligibleActiveSubscription: false,
        requiresDedicatedAffiliatePlan: false,
        activeSubscriptionPlanName: null,
        subscriptionId: null,
        affiliateRowId: null,
        affiliateCode: null,
        affiliateStatus: null,
        isAffiliateEnabled: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    const nowIso = new Date().toISOString();

    const [{ data: subData }, { data: allPlans }, { data: affiliateData }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('id,status,current_period_end,plans(name,display_name,features)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('current_period_end', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('plans')
        .select('name,display_name,features')
        .eq('is_active', true),
      (supabase as any)
        .from('travel_affiliates')
        .select('id,affiliate_code,status')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const dedicatedPlans = (allPlans || []).filter((plan) => isDedicatedAffiliatePlan(plan as any));
    const requiresDedicatedAffiliatePlan = dedicatedPlans.length > 0;

    const hasActiveSubscription = !!subData?.id;
    const activePlan = (subData as any)?.plans;
    const activePlanEligible = activePlan ? isDedicatedAffiliatePlan(activePlan) : false;
    const hasEligibleActiveSubscription = hasActiveSubscription && (!requiresDedicatedAffiliatePlan || activePlanEligible);

    const affiliateStatus = affiliateData?.status || null;
    const isAffiliateEnabled =
      hasEligibleActiveSubscription && !!affiliateStatus && ACTIVE_AFFILIATE_STATUSES.has(String(affiliateStatus));

    setState({
      loading: false,
      hasActiveSubscription,
      hasEligibleActiveSubscription,
      requiresDedicatedAffiliatePlan,
      activeSubscriptionPlanName: activePlan?.display_name || activePlan?.name || null,
      subscriptionId: subData?.id || null,
      affiliateRowId: affiliateData?.id || null,
      affiliateCode: affiliateData?.affiliate_code || null,
      affiliateStatus,
      isAffiliateEnabled,
    });
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activateWithExistingSubscription = useCallback(async () => {
    if (!user?.id) throw new Error('Utilisateur non connecté');
    if (!state.hasActiveSubscription) throw new Error('Aucun abonnement actif');
    if (!state.hasEligibleActiveSubscription) {
      throw new Error('Votre abonnement actif ne débloque pas le module affilié dédié.');
    }

    const payload = {
      user_id: user.id,
      status: 'approved',
      affiliate_code: state.affiliateCode || generateAffiliateCode(),
      specialization: ['general'],
    };

    const { error } = await (supabase as any)
      .from('travel_affiliates')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw new Error(error.message || 'Impossible d\'activer le module affilié');
    await refresh();
  }, [refresh, state.affiliateCode, state.hasActiveSubscription, state.hasEligibleActiveSubscription, user?.id]);

  const subscribeAndActivate = useCallback(
    async (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
      if (!user?.id) throw new Error('Utilisateur non connecté');

      const [{ data: planData, error: planError }, { data: allPlans }] = await Promise.all([
        supabase
          .from('plans')
          .select('id,name,display_name,features,monthly_price_gnf,yearly_price_gnf')
          .eq('id', planId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('plans')
          .select('name,display_name,features')
          .eq('is_active', true),
      ]);

      if (planError || !planData) throw new Error('Plan introuvable');

      const hasDedicatedPlans = (allPlans || []).some((plan) => isDedicatedAffiliatePlan(plan as any));
      if (hasDedicatedPlans && !isDedicatedAffiliatePlan(planData as any)) {
        throw new Error('Ce plan ne permet pas d\'activer l\'affiliation dédiée.');
      }

      const price =
        billingCycle === 'yearly'
          ? planData.yearly_price_gnf || Math.round((planData.monthly_price_gnf || 0) * 12 * 0.85)
          : planData.monthly_price_gnf || 0;

      const subscriptionId = await SubscriptionService.recordSubscriptionPayment({
        userId: user.id,
        planId: planData.id,
        pricePaid: price,
        paymentMethod: 'wallet',
        billingCycle,
      });

      if (!subscriptionId) throw new Error('Échec de la souscription');

      const payload = {
        user_id: user.id,
        status: 'approved',
        affiliate_code: state.affiliateCode || generateAffiliateCode(),
        specialization: ['general'],
      };

      const { error: affiliateError } = await (supabase as any)
        .from('travel_affiliates')
        .upsert(payload, { onConflict: 'user_id' });

      if (affiliateError) {
        throw new Error(affiliateError.message || 'Abonnement payé mais activation affilié impossible');
      }

      await refresh();
      return subscriptionId;
    },
    [refresh, state.affiliateCode, user?.id]
  );

  return useMemo(
    () => ({
      ...state,
      isDedicatedAffiliatePlan,
      refresh,
      activateWithExistingSubscription,
      subscribeAndActivate,
    }),
    [activateWithExistingSubscription, refresh, state, subscribeAndActivate]
  );
}
