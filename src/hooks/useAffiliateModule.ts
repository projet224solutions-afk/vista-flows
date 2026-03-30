import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionService } from '@/services/subscriptionService';

export interface AffiliateModuleState {
  loading: boolean;
  hasActiveSubscription: boolean;
  subscriptionId: string | null;
  affiliateRowId: string | null;
  affiliateCode: string | null;
  affiliateStatus: string | null;
  isAffiliateEnabled: boolean;
}

const ACTIVE_AFFILIATE_STATUSES = new Set(['approved', 'active']);

function generateAffiliateCode() {
  const prefix = 'AFF';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

export function useAffiliateModule() {
  const { user } = useAuth();
  const [state, setState] = useState<AffiliateModuleState>({
    loading: true,
    hasActiveSubscription: false,
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

    const [{ data: subData }, { data: affiliateData }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('id,status,current_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('current_period_end', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from('travel_affiliates')
        .select('id,affiliate_code,status')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const hasActiveSubscription = !!subData?.id;
    const affiliateStatus = affiliateData?.status || null;
    const affiliateEnabled =
      hasActiveSubscription && !!affiliateStatus && ACTIVE_AFFILIATE_STATUSES.has(String(affiliateStatus));

    setState({
      loading: false,
      hasActiveSubscription,
      subscriptionId: subData?.id || null,
      affiliateRowId: affiliateData?.id || null,
      affiliateCode: affiliateData?.affiliate_code || null,
      affiliateStatus,
      isAffiliateEnabled: affiliateEnabled,
    });
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activateWithExistingSubscription = useCallback(async () => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    if (!state.hasActiveSubscription) {
      throw new Error('Aucun abonnement actif');
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

    if (error) {
      throw new Error(error.message || 'Impossible d\'activer le module affilié');
    }

    await refresh();
  }, [refresh, state.affiliateCode, state.hasActiveSubscription, user?.id]);

  const subscribeAndActivate = useCallback(
    async (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('id,monthly_price_gnf,yearly_price_gnf')
        .eq('id', planId)
        .eq('is_active', true)
        .maybeSingle();

      if (planError || !planData) {
        throw new Error('Plan introuvable');
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

      if (!subscriptionId) {
        throw new Error('Échec de la souscription');
      }

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
      refresh,
      activateWithExistingSubscription,
      subscribeAndActivate,
    }),
    [activateWithExistingSubscription, refresh, state, subscribeAndActivate]
  );
}
