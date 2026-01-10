/**
 * 🎯 SERVICE COPILOTE VENDEUR ENTERPRISE - 224SOLUTIONS
 * Analyse ultra-professionnelle de l'interface vendeur complète
 * Intelligence équivalente Amazon Seller Central / Shopify Plus
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// INTERFACES D'ANALYSE COMPLÈTE
// =====================================================

// =====================================================
// INTERFACE ANALYSE CLIENT DÉTAILLÉE
// =====================================================

export interface CustomerDetailedAnalysis {
  // 📊 IDENTITÉ
  customer_id: string;
  user_id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  full_name: string;
  created_at: string;
  
  // 📍 LOCALISATION
  country: string;
  city: string;
  address: string;
  addresses: Array<{
    type: 'billing' | 'shipping' | 'default';
    street: string;
    city: string;
    country: string;
    postal_code: string;
    is_default: boolean;
  }>;
  
  // 🛒 HISTORIQUE D'ACHATS
  is_first_time_buyer: boolean;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  pending_orders: number;
  first_order_date: string | null;
  last_order_date: string | null;
  days_since_last_order: number;
  
  // 💰 VALEUR CLIENT
  total_spent: number;
  average_order_value: number;
  largest_order_value: number;
  total_items_purchased: number;
  
  // 📊 COMPORTEMENT
  favorite_vendor_id: string | null;
  favorite_vendor_name: string | null;
  orders_with_this_vendor: number;
  preferred_payment_method: string;
  
  // 📈 ENGAGEMENT
  customer_lifetime_days: number;
  purchase_frequency: number; // Orders per month
  customer_status: 'new' | 'active' | 'at_risk' | 'inactive' | 'loyal';
  
  // 🎯 SEGMENTATION
  customer_segment: 'vip' | 'regular' | 'occasional' | 'one_time';
  loyalty_score: number; // 0-100
}

export interface VendorDashboardAnalysis {
  // 📊 IDENTITÉ & STATUT
  vendor_id: string;
  shop_name: string;
  business_type: string;
  email: string;
  phone: string;
  created_at: string;
  last_activity: string;
  
  // 🎯 ABONNEMENT & LIMITES
  subscription: {
    plan: string;
    status: string;
    features_unlocked: string[];
    features_locked: string[];
    usage_limits: {
      products_current: number;
      products_max: number;
      storage_used_mb: number;
      storage_max_mb: number;
    };
    renewal_date: string;
    amount_per_month: number;
  };
  
  // 🔒 SÉCURITÉ & VÉRIFICATION
  security: {
    kyc_status: 'verified' | 'pending' | 'rejected' | 'not_started';
    certification_level: string;
    mfa_enabled: boolean;
    last_password_change: string;
    suspicious_activity: boolean;
    account_health_score: number;
  };
  
  // 📦 CATALOGUE PRODUITS
  products: {
    total: number;
    active: number;
    inactive: number;
    out_of_stock: number;
    low_stock: number;
    bestsellers: Array<{
      id: string;
      name: string;
      sales_30d: number;
      revenue_30d: number;
    }>;
    worst_performers: Array<{
      id: string;
      name: string;
      views_30d: number;
      sales_30d: number;
    }>;
    categories_distribution: Record<string, number>;
    average_price: number;
    total_inventory_value: number;
  };
  
  // 📊 INVENTAIRE & STOCK
  inventory: {
    total_items: number;
    total_value: number;
    stockout_risk_count: number;
    overstock_count: number;
    dead_stock_count: number;
    stock_turnover_rate: number;
    days_of_inventory: number;
    reorder_alerts: number;
    warehouse_locations: number;
  };
  
  // 🛒 COMMANDES & VENTES
  orders: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    orders_today: number;
    orders_week: number;
    orders_month: number;
    revenue_today: number;
    revenue_week: number;
    revenue_month: number;
    pending_orders: number;
    confirmed_orders: number;
    shipped_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    return_rate: number;
    fulfillment_speed_hours: number;
    order_growth_rate: number;
  };
  
  // 💰 FINANCES & WALLET
  finances: {
    wallet_balance: number;
    pending_balance: number;
    total_withdrawals: number;
    total_deposits: number;
    revenue_lifetime: number;
    revenue_this_month: number;
    profit_margin_estimate: number;
    payment_success_rate: number;
    failed_payments: number;
    stripe_connected: boolean;
    bank_account_connected: boolean;
    payment_methods: string[];
    transaction_fees_paid: number;
  };
  
  // 👥 CLIENTS
  customers: {
    total_customers: number;
    new_customers_30d: number;
    returning_customers: number;
    customer_retention_rate: number;
    average_lifetime_value: number;
    top_customers: Array<{
      name: string;
      total_spent: number;
      orders_count: number;
    }>;
    customer_satisfaction_score: number;
  };
  
  // ⭐ RÉPUTATION & AVIS
  reputation: {
    overall_rating: number;
    total_reviews: number;
    reviews_5_stars: number;
    reviews_4_stars: number;
    reviews_3_stars: number;
    reviews_2_stars: number;
    reviews_1_star: number;
    response_rate: number;
    average_response_time_hours: number;
    sentiment_positive: number;
    sentiment_neutral: number;
    sentiment_negative: number;
    pending_reviews: number;
  };
  
  // 🚚 LIVRAISONS
  deliveries: {
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    in_transit: number;
    success_rate: number;
    average_delivery_time_hours: number;
    cod_orders: number;
    prepaid_orders: number;
    delivery_zones_covered: string[];
  };
  
  // 💳 POINT DE VENTE (POS)
  pos: {
    total_pos_sales: number;
    pos_revenue: number;
    offline_transactions: number;
    pending_sync: number;
    pos_locations: number;
    average_pos_ticket: number;
  };
  
  // 📱 MARKETING & PROMOTIONS
  marketing: {
    active_campaigns: number;
    total_campaigns: number;
    campaign_revenue: number;
    campaign_roi: number;
    active_promotions: number;
    discount_codes_used: number;
    affiliate_partners: number;
    affiliate_revenue: number;
    email_campaigns_sent: number;
    sms_campaigns_sent: number;
  };
  
  // 📞 SUPPORT & TICKETS
  support: {
    open_tickets: number;
    closed_tickets: number;
    average_resolution_time_hours: number;
    customer_satisfaction_rate: number;
    escalated_tickets: number;
    ticket_categories: Record<string, number>;
  };
  
  // 💸 DÉPENSES & FOURNISSEURS
  expenses: {
    total_expenses_month: number;
    supplier_count: number;
    pending_payments_suppliers: number;
    top_expenses_categories: Record<string, number>;
  };
  
  // 📊 ANALYTICS AVANCÉS
  analytics: {
    conversion_rate: number;
    bounce_rate: number;
    page_views_30d: number;
    product_views_30d: number;
    cart_abandonment_rate: number;
    search_terms_trending: string[];
    traffic_sources: Record<string, number>;
  };
  
  // 🤖 INTELLIGENCE ARTIFICIELLE
  ai_insights: {
    copilot_enabled: boolean;
    ai_decisions_pending: number;
    ai_decisions_executed: number;
    ai_savings_generated: number;
    ai_revenue_optimization: number;
    recommendations: Array<{
      type: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      potential_impact: string;
      action_required: string;
    }>;
  };
  
  // 🎯 SCORES & SANTÉ
  health_scores: {
    overall_health: number;
    inventory_health: number;
    financial_health: number;
    customer_satisfaction: number;
    operational_efficiency: number;
    growth_trajectory: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    alerts: Array<{
      severity: 'info' | 'warning' | 'error' | 'critical';
      category: string;
      message: string;
      action: string;
    }>;
  };
}

// =====================================================
// SERVICE PRINCIPAL
// =====================================================

export class VendorCopilotService {
  /**
   * � ANALYSE DÉTAILLÉE D'UN CLIENT
   * Analyse complète d'un client spécifique avec localisation et historique
   * Accepte customer_id (customers table) OU user_id (profiles table)
   */
  static async analyzeCustomer(customerId: string, vendorId: string): Promise<CustomerDetailedAnalysis | null> {
    try {
      console.log(`🔍 Analyse client ${customerId} pour vendeur ${vendorId}...`);

      // 1. TENTATIVE 1: Rechercher dans la table customers
      let customer: any = null;
      let profile: any = null;
      let userId: string | null = null;
      let customerTableId: string | null = null;

      const { data: customerData } = await (supabase as any)
        .from('customers')
        .select(`
          id,
          user_id,
          addresses,
          payment_methods,
          created_at,
          profiles!inner(
            email,
            phone,
            first_name,
            last_name
          )
        `)
        .eq('id', customerId)
        .maybeSingle();

      if (customerData) {
        console.log('✅ Client trouvé dans table customers');
        customer = customerData;
        profile = customerData.profiles;
        userId = customerData.user_id;
        customerTableId = customerData.id;
      } else {
        // 2. TENTATIVE 2: Rechercher directement dans profiles (user_id)
        console.log('⚠️ Pas trouvé dans customers, recherche dans profiles...');
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('id, email, phone, first_name, last_name, created_at, raw_user_meta_data')
          .eq('id', customerId)
          .maybeSingle();

        if (profileData) {
          console.log('✅ Client trouvé dans table profiles (user_id)');
          profile = profileData;
          userId = profileData.id;
          customerTableId = null; // Pas dans customers table
          
          // Créer un objet customer factice
          customer = {
            id: null,
            user_id: userId,
            addresses: profileData.raw_user_meta_data?.addresses || [],
            payment_methods: profileData.raw_user_meta_data?.payment_methods || [],
            created_at: profileData.created_at,
          };
        } else {
          console.error('❌ Client non trouvé ni dans customers ni dans profiles');
          return null;
        }
      }

      const full_name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Client anonyme';

      // 2. Extraction des adresses
      const addresses = customer.addresses || [];
      const defaultAddress = addresses.find((a: any) => a.is_default) || addresses[0] || null;
      
      const country = defaultAddress?.country || 'Guinée';
      const city = defaultAddress?.city || 'Non spécifié';
      const address = defaultAddress?.street || 'Non spécifié';

      // 3. Historique des commandes (TOUTES confondues)
      // IMPORTANT: chercher par customer_id OU par user_id selon ce qui est disponible
      const { data: allOrders } = await (supabase as any)
        .from('orders')
        .select('id, total_amount, status, created_at, vendor_id, customer_id')
        .or(customerTableId ? `customer_id.eq.${customerTableId}` : `customer_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      const total_orders = allOrders?.length || 0;
      const completed_orders = allOrders?.filter((o: any) => o.status === 'delivered').length || 0;
      const cancelled_orders = allOrders?.filter((o: any) => o.status === 'cancelled').length || 0;
      const pending_orders = allOrders?.filter((o: any) => ['pending', 'confirmed', 'processing'].includes(o.status)).length || 0;

      const is_first_time_buyer = total_orders === 0;
      const first_order_date = allOrders && allOrders.length > 0 ? allOrders[0].created_at : null;
      const last_order_date = allOrders && allOrders.length > 0 ? allOrders[allOrders.length - 1].created_at : null;

      const days_since_last_order = last_order_date 
        ? Math.floor((Date.now() - new Date(last_order_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // 4. Valeur client
      const total_spent = allOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0;
      const average_order_value = total_orders > 0 ? total_spent / total_orders : 0;
      const largest_order_value = allOrders?.reduce((max: number, o: any) => Math.max(max, o.total_amount || 0), 0) || 0;

      // Total d'items achetés
      const { data: orderItems } = await (supabase as any)
        .from('order_items')
        .select('quantity, order_id')
        .in('order_id', allOrders?.map((o: any) => o.id) || []);
      
      const total_items_purchased = orderItems?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

      // 5. Comportement avec CE vendeur
      const orders_with_this_vendor = allOrders?.filter((o: any) => o.vendor_id === vendorId).length || 0;

      // Vendeur favori (celui avec qui il a le plus commandé)
      const vendorOrderCounts: Record<string, number> = {};
      allOrders?.forEach((o: any) => {
        vendorOrderCounts[o.vendor_id] = (vendorOrderCounts[o.vendor_id] || 0) + 1;
      });
      
      const favoriteVendorEntry = Object.entries(vendorOrderCounts).sort((a, b) => b[1] - a[1])[0];
      const favorite_vendor_id = favoriteVendorEntry ? favoriteVendorEntry[0] : null;

      let favorite_vendor_name = null;
      if (favorite_vendor_id) {
        const { data: favVendor } = await (supabase as any)
          .from('vendors')
          .select('business_name')
          .eq('id', favorite_vendor_id)
          .single();
        favorite_vendor_name = favVendor?.business_name || null;
      }

      // Méthode de paiement préférée
      const paymentMethods = customer.payment_methods || [];
      const preferred_payment_method = paymentMethods.find((pm: any) => pm.is_default)?.type || 'Non spécifié';

      // 6. Engagement et segmentation
      const customer_lifetime_days = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const purchase_frequency = customer_lifetime_days > 0 ? (total_orders / (customer_lifetime_days / 30)) : 0;

      // Statut client
      let customer_status: 'new' | 'active' | 'at_risk' | 'inactive' | 'loyal' = 'new';
      if (total_orders === 0) {
        customer_status = 'new';
      } else if (days_since_last_order > 90) {
        customer_status = 'inactive';
      } else if (days_since_last_order > 30) {
        customer_status = 'at_risk';
      } else if (total_orders >= 10 && purchase_frequency >= 1) {
        customer_status = 'loyal';
      } else {
        customer_status = 'active';
      }

      // Segment client
      let customer_segment: 'vip' | 'regular' | 'occasional' | 'one_time' = 'one_time';
      if (total_orders === 1) {
        customer_segment = 'one_time';
      } else if (total_orders >= 2 && total_orders < 5) {
        customer_segment = 'occasional';
      } else if (total_orders >= 5 && total_orders < 15) {
        customer_segment = 'regular';
      } else if (total_orders >= 15 || total_spent >= 500000) {
        customer_segment = 'vip';
      }

      // Score de fidélité (0-100)
      let loyalty_score = 0;
      loyalty_score += Math.min(total_orders * 5, 40); // Max 40 points pour le nombre de commandes
      loyalty_score += Math.min(purchase_frequency * 10, 30); // Max 30 points pour la fréquence
      loyalty_score += days_since_last_order < 30 ? 20 : days_since_last_order < 60 ? 10 : 0; // 20 points si actif
      loyalty_score += orders_with_this_vendor > 0 ? 10 : 0; // 10 points si a commandé chez ce vendeur

      return {
        customer_id: customerTableId || userId, // Utiliser customerTableId si disponible, sinon userId
        user_id: userId,
        email: profile.email,
        phone: profile.phone || 'Non spécifié',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        full_name,
        created_at: customer.created_at,
        
        country,
        city,
        address,
        addresses: addresses.map((a: any) => ({
          type: a.type || 'default',
          street: a.street || '',
          city: a.city || '',
          country: a.country || '',
          postal_code: a.postal_code || '',
          is_default: a.is_default || false,
        })),
        
        is_first_time_buyer,
        total_orders,
        completed_orders,
        cancelled_orders,
        pending_orders,
        first_order_date,
        last_order_date,
        days_since_last_order,
        
        total_spent: Math.round(total_spent),
        average_order_value: Math.round(average_order_value),
        largest_order_value: Math.round(largest_order_value),
        total_items_purchased,
        
        favorite_vendor_id,
        favorite_vendor_name,
        orders_with_this_vendor,
        preferred_payment_method,
        
        customer_lifetime_days,
        purchase_frequency: Math.round(purchase_frequency * 100) / 100,
        customer_status,
        
        customer_segment,
        loyalty_score: Math.min(Math.round(loyalty_score), 100),
      };

    } catch (error) {
      console.error('❌ Erreur analyse client:', error);
      return null;
    }
  }

  /**
   * �📊 ANALYSE COMPLÈTE DE L'INTERFACE VENDEUR
   * Analyse ultra-professionnelle de TOUTES les sections
   */
  static async analyzeVendorDashboard(vendorId: string): Promise<VendorDashboardAnalysis | null> {
    try {
      console.log(`🔍 Analyse complète du vendeur ${vendorId}...`);

      // 1. INFORMATIONS DE BASE
      const { data: vendor, error: vendorError } = await (supabase as any)
        .from('vendors')
        .select(`
          id,
          business_name,
          user_id,
          is_active,
          created_at,
          updated_at,
          users!inner(email, phone, raw_user_meta_data)
        `)
        .eq('id', vendorId)
        .single();

      if (vendorError || !vendor) {
        console.error('Vendeur non trouvé:', vendorError);
        return null;
      }

      // 2. ANALYSE PRODUITS
      const productsAnalysis = await this.analyzeProducts(vendorId);
      
      // 3. ANALYSE INVENTAIRE
      const inventoryAnalysis = await this.analyzeInventory(vendorId);
      
      // 4. ANALYSE COMMANDES
      const ordersAnalysis = await this.analyzeOrders(vendorId);
      
      // 5. ANALYSE FINANCES
      const financesAnalysis = await this.analyzeFinances(vendorId, vendor.user_id);
      
      // 6. ANALYSE CLIENTS
      const customersAnalysis = await this.analyzeCustomers(vendorId);
      
      // 7. ANALYSE RÉPUTATION
      const reputationAnalysis = await this.analyzeReputation(vendorId);
      
      // 8. ANALYSE LIVRAISONS
      const deliveriesAnalysis = await this.analyzeDeliveries(vendorId);
      
      // 9. ANALYSE POS
      const posAnalysis = await this.analyzePOS(vendorId);
      
      // 10. ANALYSE MARKETING
      const marketingAnalysis = await this.analyzeMarketing(vendorId);
      
      // 11. ANALYSE SUPPORT
      const supportAnalysis = await this.analyzeSupport(vendorId);
      
      // 12. ANALYSE DÉPENSES
      const expensesAnalysis = await this.analyzeExpenses(vendorId);
      
      // 13. ANALYSE ANALYTICS
      const analyticsAnalysis = await this.analyzeAnalytics(vendorId);
      
      // 14. ANALYSE IA
      const aiAnalysis = await this.analyzeAI(vendorId);
      
      // 15. CALCUL DES SCORES DE SANTÉ
      const healthScores = this.calculateHealthScores({
        products: productsAnalysis,
        inventory: inventoryAnalysis,
        orders: ordersAnalysis,
        finances: financesAnalysis,
        customers: customersAnalysis,
        reputation: reputationAnalysis,
      });

      // 16. ABONNEMENT & LIMITES
      const subscription = await this.analyzeSubscription(vendorId, productsAnalysis.total);

      // 17. SÉCURITÉ
      const security = await this.analyzeSecurity(vendor);

      // ASSEMBLAGE FINAL
      return {
        vendor_id: vendorId,
        shop_name: vendor.business_name,
        business_type: 'retail',
        email: vendor.users.email,
        phone: vendor.users.phone || 'N/A',
        created_at: vendor.created_at,
        last_activity: vendor.updated_at,
        
        subscription,
        security,
        products: productsAnalysis,
        inventory: inventoryAnalysis,
        orders: ordersAnalysis,
        finances: financesAnalysis,
        customers: customersAnalysis,
        reputation: reputationAnalysis,
        deliveries: deliveriesAnalysis,
        pos: posAnalysis,
        marketing: marketingAnalysis,
        support: supportAnalysis,
        expenses: expensesAnalysis,
        analytics: analyticsAnalysis,
        ai_insights: aiAnalysis,
        health_scores: healthScores,
      };

    } catch (error) {
      console.error('❌ Erreur analyse vendeur:', error);
      return null;
    }
  }

  /**
   * 📦 ANALYSE PRODUITS
   */
  private static async analyzeProducts(vendorId: string) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, is_active, category_id, created_at')
      .eq('vendor_id', vendorId);

    const total = products?.length || 0;
    const active = products?.filter(p => p.is_active).length || 0;
    const out_of_stock = products?.filter(p => p.stock_quantity === 0).length || 0;
    const low_stock = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length || 0;

    // Bestsellers (derniers 30 jours)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orderItems } = await (supabase as any)
      .from('order_items')
      .select('product_id, quantity, unit_price')
      .gte('created_at', thirtyDaysAgo);

    const salesByProduct: Record<string, { sales: number; revenue: number }> = {};
    orderItems?.forEach((item: any) => {
      if (!salesByProduct[item.product_id]) {
        salesByProduct[item.product_id] = { sales: 0, revenue: 0 };
      }
      salesByProduct[item.product_id].sales += item.quantity;
      salesByProduct[item.product_id].revenue += (item.unit_price || 0) * item.quantity;
    });

    const bestsellers = products
      ?.map(p => ({
        id: p.id,
        name: p.name,
        sales_30d: salesByProduct[p.id]?.sales || 0,
        revenue_30d: salesByProduct[p.id]?.revenue || 0,
      }))
      .sort((a, b) => b.sales_30d - a.sales_30d)
      .slice(0, 5) || [];

    const worst_performers = products
      ?.map(p => ({
        id: p.id,
        name: p.name,
        views_30d: 0, // TODO: Implémenter analytics
        sales_30d: salesByProduct[p.id]?.sales || 0,
      }))
      .sort((a, b) => a.sales_30d - b.sales_30d)
      .slice(0, 5) || [];

    const average_price = products?.length
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length
      : 0;

    const total_inventory_value = products?.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0) || 0;

    return {
      total,
      active,
      inactive: total - active,
      out_of_stock,
      low_stock,
      bestsellers,
      worst_performers,
      categories_distribution: {}, // TODO: Implémenter si nécessaire
      average_price: Math.round(average_price),
      total_inventory_value: Math.round(total_inventory_value),
    };
  }

  /**
   * 📊 ANALYSE INVENTAIRE
   */
  private static async analyzeInventory(vendorId: string) {
    const { data: products } = await supabase
      .from('products')
      .select('id, price, stock_quantity')
      .eq('vendor_id', vendorId)
      .eq('is_active', true);

    const total_items = products?.reduce((sum, p) => sum + p.stock_quantity, 0) || 0;
    const total_value = products?.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0) || 0;
    const stockout_risk_count = products?.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length || 0;
    const overstock_count = products?.filter(p => p.stock_quantity > 100).length || 0;

    return {
      total_items,
      total_value: Math.round(total_value),
      stockout_risk_count,
      overstock_count,
      dead_stock_count: 0, // TODO: Implémenter
      stock_turnover_rate: 0, // TODO: Calculer
      days_of_inventory: 0, // TODO: Calculer
      reorder_alerts: stockout_risk_count,
      warehouse_locations: 1,
    };
  }

  /**
   * 🛒 ANALYSE COMMANDES
   */
  private static async analyzeOrders(vendorId: string) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, status, payment_status, created_at')
      .eq('vendor_id', vendorId);

    const total_orders = orders?.length || 0;
    const total_revenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const average_order_value = total_orders > 0 ? total_revenue / total_orders : 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const orders_today = orders?.filter(o => o.created_at >= today).length || 0;
    const orders_week = orders?.filter(o => o.created_at >= weekAgo).length || 0;
    const orders_month = orders?.filter(o => o.created_at >= monthAgo).length || 0;

    const revenue_today = orders?.filter(o => o.created_at >= today).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const revenue_week = orders?.filter(o => o.created_at >= weekAgo).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const revenue_month = orders?.filter(o => o.created_at >= monthAgo).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    const pending_orders = orders?.filter(o => o.status === 'pending').length || 0;
    const confirmed_orders = orders?.filter(o => o.status === 'confirmed').length || 0;
    const delivered_orders = orders?.filter(o => o.status === 'delivered').length || 0;
    const cancelled_orders = orders?.filter(o => o.status === 'cancelled').length || 0;

    return {
      total_orders,
      total_revenue: Math.round(total_revenue),
      average_order_value: Math.round(average_order_value),
      orders_today,
      orders_week,
      orders_month,
      revenue_today: Math.round(revenue_today),
      revenue_week: Math.round(revenue_week),
      revenue_month: Math.round(revenue_month),
      pending_orders,
      confirmed_orders,
      shipped_orders: 0, // TODO: Ajouter statut "shipped"
      delivered_orders,
      cancelled_orders,
      return_rate: 0, // TODO: Calculer
      fulfillment_speed_hours: 0, // TODO: Calculer
      order_growth_rate: 0, // TODO: Calculer
    };
  }

  /**
   * 💰 ANALYSE FINANCES
   */
  private static async analyzeFinances(vendorId: string, userId: string) {
    const { data: wallet } = await (supabase as any)
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const { data: withdrawals } = await (supabase as any)
      .from('wallet_logs')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'withdrawal');

    const { data: deposits } = await (supabase as any)
      .from('wallet_logs')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'deposit');

    const total_withdrawals = withdrawals?.reduce((sum, w) => sum + Math.abs(w.amount), 0) || 0;
    const total_deposits = deposits?.reduce((sum, d) => sum + Math.abs(d.amount), 0) || 0;

    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, payment_status, created_at')
      .eq('vendor_id', vendorId);

    const revenue_lifetime = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const revenue_this_month = orders?.filter(o => o.created_at >= monthAgo).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    const successful_payments = orders?.filter(o => o.payment_status === 'paid').length || 0;
    const payment_success_rate = orders?.length ? (successful_payments / orders.length) * 100 : 0;
    const failed_payments = orders?.filter(o => o.payment_status === 'failed').length || 0;

    return {
      wallet_balance: wallet?.balance || 0,
      pending_balance: 0,
      total_withdrawals: Math.round(total_withdrawals),
      total_deposits: Math.round(total_deposits),
      revenue_lifetime: Math.round(revenue_lifetime),
      revenue_this_month: Math.round(revenue_this_month),
      profit_margin_estimate: 0, // TODO: Calculer avec dépenses
      payment_success_rate: Math.round(payment_success_rate),
      failed_payments,
      stripe_connected: false, // TODO: Vérifier
      bank_account_connected: false, // TODO: Vérifier
      payment_methods: ['wallet', 'cod', 'mobile_money'],
      transaction_fees_paid: 0, // TODO: Calculer
    };
  }

  /**
   * 👥 ANALYSE CLIENTS
   */
  private static async analyzeCustomers(vendorId: string) {
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_id, total_amount, created_at')
      .eq('vendor_id', vendorId);

    const customerOrders: Record<string, { count: number; total: number }> = {};
    orders?.forEach(order => {
      if (!customerOrders[order.customer_id]) {
        customerOrders[order.customer_id] = { count: 0, total: 0 };
      }
      customerOrders[order.customer_id].count++;
      customerOrders[order.customer_id].total += order.total_amount || 0;
    });

    const total_customers = Object.keys(customerOrders).length;
    const returning_customers = Object.values(customerOrders).filter(c => c.count > 1).length;
    const customer_retention_rate = total_customers > 0 ? (returning_customers / total_customers) * 100 : 0;

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const new_customers_30d = orders?.filter(o => o.created_at >= monthAgo)
      .map(o => o.customer_id)
      .filter((v, i, a) => a.indexOf(v) === i).length || 0;

    const top_customers = Object.entries(customerOrders)
      .map(([id, data]) => ({
        name: `Client ${id.slice(0, 8)}`,
        total_spent: data.total,
        orders_count: data.count,
      }))
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5);

    const average_lifetime_value = total_customers > 0
      ? Object.values(customerOrders).reduce((sum, c) => sum + c.total, 0) / total_customers
      : 0;

    return {
      total_customers,
      new_customers_30d,
      returning_customers,
      customer_retention_rate: Math.round(customer_retention_rate),
      average_lifetime_value: Math.round(average_lifetime_value),
      top_customers,
      customer_satisfaction_score: 0, // TODO: Calculer depuis reviews
    };
  }

  /**
   * ⭐ ANALYSE RÉPUTATION
   */
  private static async analyzeReputation(vendorId: string) {
    const { data: reviews } = await (supabase as any)
      .from('reviews')
      .select('rating, comment, created_at')
      .eq('vendor_id', vendorId);

    const total_reviews = reviews?.length || 0;
    const reviews_5_stars = reviews?.filter(r => r.rating === 5).length || 0;
    const reviews_4_stars = reviews?.filter(r => r.rating === 4).length || 0;
    const reviews_3_stars = reviews?.filter(r => r.rating === 3).length || 0;
    const reviews_2_stars = reviews?.filter(r => r.rating === 2).length || 0;
    const reviews_1_star = reviews?.filter(r => r.rating === 1).length || 0;

    const overall_rating = total_reviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews
      : 0;

    const responded_reviews = 0; // TODO: Ajouter colonne vendor_response
    const response_rate = 0;

    const pending_reviews = total_reviews;

    return {
      overall_rating: Math.round(overall_rating * 10) / 10,
      total_reviews,
      reviews_5_stars,
      reviews_4_stars,
      reviews_3_stars,
      reviews_2_stars,
      reviews_1_star,
      response_rate: Math.round(response_rate),
      average_response_time_hours: 0, // TODO: Calculer
      sentiment_positive: reviews_5_stars + reviews_4_stars,
      sentiment_neutral: reviews_3_stars,
      sentiment_negative: reviews_2_stars + reviews_1_star,
      pending_reviews,
    };
  }

  /**
   * 🚚 ANALYSE LIVRAISONS
   */
  private static async analyzeDeliveries(vendorId: string) {
    const { data: deliveries } = await (supabase as any)
      .from('deliveries')
      .select('status, created_at, completed_at')
      .eq('vendor_id', vendorId);

    const total_deliveries = deliveries?.length || 0;
    const successful_deliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;
    const failed_deliveries = deliveries?.filter(d => d.status === 'failed').length || 0;
    const in_transit = deliveries?.filter(d => d.status === 'in_transit').length || 0;
    const success_rate = total_deliveries > 0 ? (successful_deliveries / total_deliveries) * 100 : 0;

    const cod_orders = 0; // TODO: Ajouter colonne delivery_type
    const prepaid_orders = 0;

    return {
      total_deliveries,
      successful_deliveries,
      failed_deliveries,
      in_transit,
      success_rate: Math.round(success_rate),
      average_delivery_time_hours: 0, // TODO: Calculer
      cod_orders,
      prepaid_orders,
      delivery_zones_covered: ['Conakry'], // TODO: Implémenter
    };
  }

  /**
   * 💳 ANALYSE POS
   */
  private static async analyzePOS(vendorId: string) {
    // Table pos_sales n'existe pas encore
    const posSales: any[] = [];

    const total_pos_sales = posSales?.length || 0;
    const pos_revenue = posSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
    const pending_sync = posSales?.filter(s => !s.is_synced).length || 0;

    return {
      total_pos_sales,
      pos_revenue: Math.round(pos_revenue),
      offline_transactions: pending_sync,
      pending_sync,
      pos_locations: 1,
      average_pos_ticket: total_pos_sales > 0 ? Math.round(pos_revenue / total_pos_sales) : 0,
    };
  }

  /**
   * 📱 ANALYSE MARKETING
   */
  private static async analyzeMarketing(vendorId: string) {
    const { data: campaigns } = await (supabase as any)
      .from('marketing_campaigns')
      .select('id, status')
      .eq('vendor_id', vendorId);

    const active_campaigns = campaigns?.filter((c: any) => c.status === 'active').length || 0;
    const total_campaigns = campaigns?.length || 0;
    const campaign_revenue = 0; // TODO: Ajouter colonne revenue_generated
    const campaign_budget = 0; // TODO: Ajouter colonne budget
    const campaign_roi = 0;

    return {
      active_campaigns,
      total_campaigns,
      campaign_revenue: Math.round(campaign_revenue),
      campaign_roi: Math.round(campaign_roi),
      active_promotions: 0, // TODO: Implémenter
      discount_codes_used: 0, // TODO: Implémenter
      affiliate_partners: 0, // TODO: Implémenter
      affiliate_revenue: 0, // TODO: Implémenter
      email_campaigns_sent: 0, // TODO: Implémenter
      sms_campaigns_sent: 0, // TODO: Implémenter
    };
  }

  /**
   * 📞 ANALYSE SUPPORT
   */
  private static async analyzeSupport(vendorId: string) {
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('status, category, created_at, resolved_at')
      .eq('vendor_id', vendorId);

    const open_tickets = tickets?.filter(t => t.status === 'open').length || 0;
    const closed_tickets = tickets?.filter(t => t.status === 'closed').length || 0;

    return {
      open_tickets,
      closed_tickets,
      average_resolution_time_hours: 0, // TODO: Calculer
      customer_satisfaction_rate: 0, // TODO: Implémenter
      escalated_tickets: 0, // TODO: Implémenter
      ticket_categories: {}, // TODO: Implémenter
    };
  }

  /**
   * 💸 ANALYSE DÉPENSES
   */
  private static async analyzeExpenses(vendorId: string) {
    // Table expenses n'existe pas encore
    const expenses: any[] = [];

    const total_expenses_month = 0;

    return {
      total_expenses_month: Math.round(total_expenses_month),
      supplier_count: 0, // TODO: Implémenter
      pending_payments_suppliers: 0, // TODO: Implémenter
      top_expenses_categories: {}, // TODO: Implémenter
    };
  }

  /**
   * 📊 ANALYSE ANALYTICS
   */
  private static async analyzeAnalytics(vendorId: string) {
    return {
      conversion_rate: 0, // TODO: Implémenter
      bounce_rate: 0, // TODO: Implémenter
      page_views_30d: 0, // TODO: Implémenter
      product_views_30d: 0, // TODO: Implémenter
      cart_abandonment_rate: 0, // TODO: Implémenter
      search_terms_trending: [],
      traffic_sources: {},
    };
  }

  /**
   * 🤖 ANALYSE INTELLIGENCE ARTIFICIELLE
   */
  private static async analyzeAI(vendorId: string) {
    const { data: aiControl } = await (supabase as any)
      .from('vendor_ai_control')
      .select('ai_enabled')
      .eq('vendor_id', vendorId)
      .single();

    const { data: decisions } = await (supabase as any)
      .from('vendor_ai_decisions')
      .select('status')
      .eq('vendor_id', vendorId);

    const pending = decisions?.filter((d: any) => d.status === 'pending').length || 0;
    const executed = decisions?.filter((d: any) => d.status === 'executed').length || 0;
    const savings = 0; // TODO: Ajouter colonne impact_amount

    return {
      copilot_enabled: aiControl?.ai_enabled || false,
      ai_decisions_pending: pending,
      ai_decisions_executed: executed,
      ai_savings_generated: Math.round(savings),
      ai_revenue_optimization: 0,
      recommendations: [], // Sera rempli dynamiquement
    };
  }

  /**
   * 🔒 ANALYSE SÉCURITÉ
   */
  private static async analyzeSecurity(vendor: any) {
    return {
      kyc_status: vendor.kyc_status || 'pending',
      certification_level: vendor.certification_level || 'none',
      mfa_enabled: vendor.users.raw_user_meta_data?.mfa_enabled || false,
      last_password_change: 'N/A', // TODO: Supabase ne stocke pas cette info
      suspicious_activity: false,
      account_health_score: 100,
    };
  }

  /**
   * 🎯 ANALYSE ABONNEMENT
   */
  private static async analyzeSubscription(vendorId: string, currentProducts: number) {
    // subscription_tier n'existe pas dans vendors
    const plan = 'free';
    
    const limits: Record<string, { max: number; storage: number }> = {
      free: { max: 5, storage: 100 },
      basic: { max: 20, storage: 500 },
      pro: { max: 100, storage: 2000 },
      business: { max: 500, storage: 10000 },
      premium: { max: 999999, storage: 50000 },
    };

    return {
      plan,
      status: 'active',
      features_unlocked: [],
      features_locked: [],
      usage_limits: {
        products_current: currentProducts,
        products_max: limits[plan]?.max || 5,
        storage_used_mb: 0,
        storage_max_mb: limits[plan]?.storage || 100,
      },
      renewal_date: 'N/A',
      amount_per_month: 0,
    };
  }

  /**
   * 🎯 CALCUL DES SCORES DE SANTÉ
   */
  private static calculateHealthScores(data: any) {
    const inventory_health = Math.max(0, 100 - (data.inventory.stockout_risk_count * 10));
    const financial_health = data.finances.wallet_balance > 0 ? 85 : 50;
    const customer_satisfaction = data.reputation.overall_rating * 20;
    const operational_efficiency = data.orders.total_orders > 0 ? 80 : 40;
    const growth_trajectory = data.orders.order_growth_rate > 0 ? 90 : 60;

    const overall_health = Math.round(
      (inventory_health + financial_health + customer_satisfaction + operational_efficiency + growth_trajectory) / 5
    );

    let risk_level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overall_health < 40) risk_level = 'critical';
    else if (overall_health < 60) risk_level = 'high';
    else if (overall_health < 75) risk_level = 'medium';

    const alerts: any[] = [];
    if (data.inventory.stockout_risk_count > 0) {
      alerts.push({
        severity: 'warning',
        category: 'Inventaire',
        message: `${data.inventory.stockout_risk_count} produit(s) en rupture de stock imminente`,
        action: 'Réapprovisionner maintenant',
      });
    }
    if (data.finances.wallet_balance < 10000) {
      alerts.push({
        severity: 'warning',
        category: 'Finances',
        message: 'Solde wallet faible',
        action: 'Effectuer un retrait ou surveiller les paiements',
      });
    }

    return {
      overall_health,
      inventory_health,
      financial_health,
      customer_satisfaction: Math.round(customer_satisfaction),
      operational_efficiency,
      growth_trajectory,
      risk_level,
      alerts,
    };
  }
}
