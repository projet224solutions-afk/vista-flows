// ============================================================================
// Post-Auth Route Resolution
// Single source of truth for determining where to redirect after authentication
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { getDashboardRoute } from '@/hooks/useRoleRedirect';

export interface PostAuthRouteOptions {
  userId: string;
  role: string;
  vendorShopType?: string | null;
}

/**
 * Resolves the correct dashboard route for a user based on their role and metadata.
 * This is the SINGLE source of truth — used by Auth.tsx login, signup, OAuth callback,
 * checkExistingSession, and useRoleRedirect.
 */
export async function resolvePostAuthRoute(opts: PostAuthRouteOptions): Promise<string> {
  const { userId, role, vendorShopType } = opts;
  const normalizedRole = role.toLowerCase();

  // vendor_agent → lookup access_token
  if (normalizedRole === 'vendor_agent') {
    const { data: va } = await supabase
      .from('vendor_agents')
      .select('access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (va?.access_token) {
      return `/vendor-agent/${va.access_token}`;
    }
    // Fallback without is_active filter
    const { data: vaAny } = await supabase
      .from('vendor_agents')
      .select('access_token')
      .eq('user_id', userId)
      .maybeSingle();
    
    return vaAny?.access_token ? `/vendor-agent/${vaAny.access_token}` : '/home';
  }

  // vendeur → check business_type for digital
  if (normalizedRole === 'vendeur') {
    // If vendorShopType is passed directly (from signup form), use it
    if (vendorShopType === 'digital') {
      return '/vendeur-digital';
    }
    // Otherwise check DB
    const { data: vendor } = await supabase
      .from('vendors')
      .select('business_type')
      .eq('user_id', userId)
      .maybeSingle();

    return vendor?.business_type === 'digital' ? '/vendeur-digital' : '/vendeur';
  }

  // prestataire → lookup professional_service
  if (normalizedRole === 'prestataire') {
    const { data: ps } = await supabase
      .from('professional_services')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    return ps?.id ? `/dashboard/service/${ps.id}` : '/service-selection';
  }

  // All other roles use the standard mapping
  return getDashboardRoute(role);
}

/**
 * Cleans up all OAuth-related localStorage flags.
 * Call after any post-auth redirect is complete.
 */
export function cleanupOAuthFlags(): void {
  const keysToRemove = [
    'oauth_intent_role',
    'oauth_is_new_signup',
    'oauth_vendor_shop_type',
    'oauth_service_type',
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

/**
 * Cleans up affiliate data from localStorage.
 */
export function cleanupAffiliateFlags(): void {
  const keysToRemove = [
    'affiliate_token',
    'affiliate_agent_name',
    'affiliate_agent_id',
    'affiliate_target_role',
    'affiliate_timestamp',
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
