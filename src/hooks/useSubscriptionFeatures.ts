import { useVendorSubscription } from './useVendorSubscription';

export type SubscriptionFeature = 
  | 'products_basic'
  | 'products_advanced'
  | 'inventory_management'
  | 'orders_simple'
  | 'orders_detailed'
  | 'crm_basic'
  | 'analytics_basic'
  | 'analytics_advanced'
  | 'analytics_realtime'
  | 'notifications_push'
  | 'delivery_tracking'
  | 'pos_system'
  | 'marketing_promotions'
  | 'affiliate_program'
  | 'sales_agents'
  | 'payment_links'
  | 'debt_management'
  | 'supplier_management'
  | 'multi_warehouse'
  | 'expense_management'
  | 'data_export'
  | 'api_access'
  | 'api_premium'
  | 'prospect_management'
  | 'support_tickets'
  | 'advanced_integrations'
  | 'multi_user'
  | 'gemini_ai'
  | 'communication_hub'
  | 'advanced_security'
  | 'dedicated_manager'
  | 'custom_branding'
  | 'training'
  | 'offline_mode'
  | 'cloud_sync'
  | 'priority_support'
  | 'featured_products'
  | 'email_support'
  | 'auto_billing'
  | 'stock_alerts'
  | 'complete_history'
  | 'custom_reports'
  | 'unlimited_modules'
  | 'custom_commissions'
  | 'unlimited_integrations';

// Mapping des fonctionnalités par plan
const PLAN_FEATURES: Record<string, SubscriptionFeature[]> = {
  'free': [
    'products_basic',
    'orders_simple'
  ],
  'basic': [
    'products_basic',
    'products_advanced',
    'orders_simple',
    'orders_detailed',
    'crm_basic',
    'analytics_basic',
    'notifications_push',
    'delivery_tracking',
    'email_support',
    'auto_billing'
  ],
  'pro': [
    'products_basic',
    'products_advanced',
    'inventory_management',
    'orders_simple',
    'orders_detailed',
    'crm_basic',
    'analytics_basic',
    'analytics_advanced',
    'notifications_push',
    'delivery_tracking',
    'marketing_promotions',
    'affiliate_program',
    'sales_agents',
    'payment_links',
    'stock_alerts',
    'complete_history',
    'priority_support',
    'featured_products',
    'email_support',
    'auto_billing'
  ],
  'business': [
    'products_basic',
    'products_advanced',
    'inventory_management',
    'orders_simple',
    'orders_detailed',
    'crm_basic',
    'analytics_basic',
    'analytics_advanced',
    'notifications_push',
    'delivery_tracking',
    'pos_system',
    'debt_management',
    'supplier_management',
    'multi_warehouse',
    'expense_management',
    'data_export',
    'api_access',
    'prospect_management',
    'support_tickets',
    'advanced_integrations',
    'multi_user',
    'marketing_promotions',
    'affiliate_program',
    'sales_agents',
    'payment_links',
    'stock_alerts',
    'complete_history',
    'priority_support',
    'featured_products',
    'email_support',
    'auto_billing'
  ],
  'premium': [
    'products_basic',
    'products_advanced',
    'inventory_management',
    'orders_simple',
    'orders_detailed',
    'crm_basic',
    'analytics_basic',
    'analytics_advanced',
    'analytics_realtime',
    'notifications_push',
    'delivery_tracking',
    'pos_system',
    'debt_management',
    'supplier_management',
    'multi_warehouse',
    'expense_management',
    'data_export',
    'api_access',
    'api_premium',
    'prospect_management',
    'support_tickets',
    'advanced_integrations',
    'multi_user',
    'gemini_ai',
    'communication_hub',
    'advanced_security',
    'dedicated_manager',
    'custom_branding',
    'training',
    'offline_mode',
    'cloud_sync',
    'priority_support',
    'featured_products',
    'marketing_promotions',
    'affiliate_program',
    'sales_agents',
    'payment_links',
    'stock_alerts',
    'complete_history',
    'unlimited_modules',
    'custom_commissions',
    'unlimited_integrations',
    'custom_reports',
    'email_support',
    'auto_billing'
  ]
};

export function useSubscriptionFeatures() {
  const { subscription, loading } = useVendorSubscription();

  const canAccessFeature = (feature: SubscriptionFeature): boolean => {
    // Bloquer l'accès pendant le chargement (sécurité par défaut)
    if (loading) {
      return false;
    }
    
    // Pas d'abonnement = pas d'accès (sauf aux fonctionnalités gratuites)
    if (!subscription) {
      const freeFeatures = PLAN_FEATURES['free'] || [];
      return freeFeatures.includes(feature);
    }

    // Vérifier que l'abonnement est actif
    if (subscription.status !== 'active') {
      const freeFeatures = PLAN_FEATURES['free'] || [];
      return freeFeatures.includes(feature);
    }

    const planName = subscription.plan_name?.toLowerCase() || 'free';
    const planFeatures = PLAN_FEATURES[planName] || PLAN_FEATURES['free'];
    
    return planFeatures.includes(feature);
  };

  const hasAnyFeature = (features: SubscriptionFeature[]): boolean => {
    return features.some(feature => canAccessFeature(feature));
  };

  const hasAllFeatures = (features: SubscriptionFeature[]): boolean => {
    return features.every(feature => canAccessFeature(feature));
  };

  const getAvailableFeatures = (): SubscriptionFeature[] => {
    // Pas d'abonnement ou pas actif = seulement fonctionnalités gratuites
    if (!subscription || subscription.status !== 'active') {
      return PLAN_FEATURES['free'] || [];
    }
    
    const planName = subscription.plan_name?.toLowerCase() || 'free';
    return PLAN_FEATURES[planName] || PLAN_FEATURES['free'];
  };

  const getPlanName = (): string => {
    return subscription?.plan_display_name || subscription?.plan_name || 'Aucun';
  };

  const isActive = (): boolean => {
    if (!subscription) return false;
    if (subscription.status !== 'active') return false;
    
    // Vérifier aussi la date d'expiration
    if (subscription.current_period_end) {
      const endDate = new Date(subscription.current_period_end);
      const now = new Date();
      if (endDate <= now) return false;
    }
    
    return true;
  };

  return {
    subscription,
    loading,
    canAccessFeature,
    hasAnyFeature,
    hasAllFeatures,
    getAvailableFeatures,
    getPlanName,
    isActive
  };
}
