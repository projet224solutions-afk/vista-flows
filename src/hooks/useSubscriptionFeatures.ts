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
    // Permettre l'accès pendant le chargement ou si pas d'abonnement
    if (loading) {
      return true; // Permettre l'accès pendant le chargement
    }
    
    if (!subscription) {
      return true; // Permettre l'accès si pas d'abonnement trouvé
    }

    const planName = subscription.plan_name;
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
    if (!subscription) {
      return PLAN_FEATURES['free'] || [];
    }
    
    const planName = subscription.plan_name;
    return PLAN_FEATURES[planName] || PLAN_FEATURES['free'];
  };

  const getPlanName = (): string => {
    return subscription?.plan_display_name || 'Gratuit';
  };

  const isActive = (): boolean => {
    return subscription?.status === 'active';
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
