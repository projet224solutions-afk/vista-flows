import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    
    if (!currentUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non authentifié' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissions insuffisantes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (currentUser.id === userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Impossible de supprimer votre propre compte' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: userToDelete } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .maybeSingle();

    console.log(`🗑️ Début suppression utilisateur ${userId} (${userToDelete?.email || 'email inconnu'})`);

    // ========================================
    // SUPPRESSION COMPLÈTE DE TOUTES LES DONNÉES
    // ========================================

    // Helper pour supprimer sans erreur si table n'existe pas
    const safeDelete = async (table: string, column: string, value: string) => {
      try {
        const { error } = await supabaseAdmin.from(table).delete().eq(column, value);

        if (error) {
          const code = (error as any)?.code as string | undefined;
          // Tables/colonnes optionnelles selon les déploiements
          if (code === '42P01' || code === '42703') {
            console.log(`  ⚠ ${table}: ignoré (${code})`);
            return;
          }

          console.log(`  ❌ ${table}: ${error.message}`);
          throw error;
        }

        console.log(`  ✓ ${table}`);
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.log(`  ⚠ ${table}: ${errorMsg}`);
      }
    };

    // Helper pour mettre à jour sans planter si table n'existe pas
    const safeUpdate = async (table: string, updates: Record<string, unknown>, column: string, value: string) => {
      try {
        const { error } = await supabaseAdmin.from(table).update(updates as any).eq(column, value);

        if (error) {
          const code = (error as any)?.code as string | undefined;
          if (code === '42P01' || code === '42703') {
            console.log(`  ⚠ ${table}: update ignoré (${code})`);
            return;
          }

          console.log(`  ❌ ${table} (update): ${error.message}`);
          throw error;
        }

        console.log(`  ✓ ${table} (update)`);
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.log(`  ⚠ ${table} (update): ${errorMsg}`);
      }
    };

    console.log('📋 Suppression des logs et audits...');
    await safeDelete('system_errors', 'user_id', userId);
    await safeDelete('audit_logs', 'actor_id', userId);
    await safeDelete('security_audit_logs', 'actor_id', userId);
    await safeDelete('communication_audit_logs', 'user_id', userId);
    await safeDelete('taxi_audit_logs', 'actor_id', userId);
    await safeDelete('vehicle_security_log', 'actor_id', userId);
    await safeDelete('inventory_history', 'user_id', userId);
    await safeDelete('secure_logs', 'user_id', userId);
    await safeDelete('fraud_detection_logs', 'user_id', userId);
    await safeDelete('delivery_logs', 'user_id', userId);
    await safeDelete('wallet_logs', 'user_id', userId);
    await safeDelete('transaction_audit_log', 'user_id', userId);

    console.log('💳 Suppression des données financières...');
    await safeDelete('wallet_transactions', 'user_id', userId);
    await safeDelete('wallet_suspicious_activities', 'user_id', userId);
    await safeDelete('wallet_idempotency_keys', 'user_id', userId);
    await safeDelete('wallets', 'user_id', userId);
    await safeDelete('virtual_cards', 'user_id', userId);
    await safeDelete('transactions', 'user_id', userId);
    await safeDelete('financial_transactions', 'user_id', userId);
    await safeDelete('financial_transactions', 'created_by', userId);
    await safeDelete('financial_ledger', 'actor_id', userId);
    await safeDelete('financial_quarantine', 'actor_id', userId);
    await safeDelete('moneroo_payments', 'user_id', userId);
    await safeDelete('payment_methods', 'user_id', userId);

    console.log('🛒 Suppression des données client...');
    const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('user_id', userId).maybeSingle();
    if (customer) {
      await safeDelete('carts', 'customer_id', customer.id);
      await safeDelete('customer_credits', 'customer_id', customer.id);
      await safeDelete('customers', 'id', customer.id);
    }
    await safeDelete('advanced_carts', 'user_id', userId);
    await safeDelete('wishlists', 'user_id', userId);
    await safeDelete('user_addresses', 'user_id', userId);
    await safeDelete('product_views', 'user_id', userId);
    await safeDelete('product_reviews', 'user_id', userId);
    await safeDelete('product_recommendations', 'user_id', userId);
    await safeDelete('user_product_interactions', 'user_id', userId);

    console.log('🏪 Suppression des données vendeur...');
    const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', userId).maybeSingle();
    if (vendor) {
      // ✅ IMPORTANT: désactiver immédiatement la boutique pour qu'elle ne s'affiche plus nulle part
      // même si une contrainte FK empêche une suppression physique complète.
      await safeUpdate('vendors', { is_active: false, updated_at: new Date().toISOString() }, 'id', vendor.id);
      await safeUpdate('products', { is_active: false }, 'vendor_id', vendor.id);
      await safeDelete('advanced_carts', 'vendor_id', vendor.id); // paniers d'autres clients pouvant bloquer des contraintes

      // Supprimer les escrow_transactions liées aux orders
      const { data: vendorOrders } = await supabaseAdmin.from('orders').select('id').eq('vendor_id', vendor.id);
      if (vendorOrders && vendorOrders.length > 0) {
        const orderIds = vendorOrders.map(o => o.id);
        for (const orderId of orderIds) {
          await safeDelete('escrow_transactions', 'order_id', orderId);
          await safeDelete('order_items', 'order_id', orderId);
          await safeDelete('payment_schedules', 'order_id', orderId);
        }
      }
      
      // Supprimer les produits et données liées
      const { data: products } = await supabaseAdmin.from('products').select('id').eq('vendor_id', vendor.id);
      if (products && products.length > 0) {
        for (const product of products) {
          await safeDelete('product_variants', 'product_id', product.id);
          await safeDelete('inventory', 'product_id', product.id);
          await safeDelete('product_images', 'product_id', product.id);
        }
      }

      await safeDelete('vendor_subscriptions', 'vendor_id', vendor.id);
      await safeDelete('products', 'vendor_id', vendor.id);
      await safeDelete('orders', 'vendor_id', vendor.id);
      await safeDelete('quotes', 'vendor_id', vendor.id);
      await safeDelete('invoices', 'vendor_id', vendor.id);
      await safeDelete('contracts', 'vendor_id', vendor.id);
      await safeDelete('deliveries', 'vendor_id', vendor.id);
      await safeDelete('vendor_agents', 'vendor_id', vendor.id);
      await safeDelete('clients', 'vendor_id', vendor.id);
      await safeDelete('prospects', 'vendor_id', vendor.id);
      await safeDelete('promo_codes', 'vendor_id', vendor.id);
      await safeDelete('support_tickets', 'vendor_id', vendor.id);
      await safeDelete('debts', 'created_by', userId);
      await safeDelete('vendors', 'id', vendor.id);
    }

    console.log('🚚 Suppression des données livreur...');
    const { data: driver } = await supabaseAdmin.from('delivery_drivers').select('id').eq('user_id', userId).maybeSingle();
    if (driver) {
      await safeDelete('deliveries', 'driver_id', driver.id);
      await safeDelete('delivery_drivers', 'id', driver.id);
    }
    await safeDelete('drivers', 'user_id', userId);
    await safeDelete('driver_subscriptions', 'user_id', userId);
    await safeDelete('driver_subscription_revenues', 'user_id', userId);
    await safeDelete('delivery_notifications', 'user_id', userId);

    console.log('🚕 Suppression des données taxi...');
    await supabaseAdmin.from('taxi_trips').delete().or(`driver_id.eq.${userId},client_id.eq.${userId}`);
    await safeDelete('taxi_drivers', 'user_id', userId);
    await safeDelete('taxi_rides', 'user_id', userId);
    await safeDelete('taxi_ratings', 'user_id', userId);
    await safeDelete('taxi_notifications', 'user_id', userId);

    console.log('💬 Suppression des communications...');
    const { data: conversations } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    
    if (conversations && conversations.length > 0) {
      const convIds = conversations.map(c => c.conversation_id);
      for (const convId of convIds) {
        await safeDelete('messages', 'conversation_id', convId);
      }
    }
    await safeDelete('conversation_participants', 'user_id', userId);
    await supabaseAdmin.from('calls').delete().or(`caller_id.eq.${userId},receiver_id.eq.${userId}`);
    await safeDelete('communication_notifications', 'user_id', userId);
    await safeDelete('notifications', 'user_id', userId);
    await safeDelete('push_notifications', 'user_id', userId);

    console.log('📊 Suppression des données diverses...');
    await safeDelete('user_ids', 'user_id', userId);
    await safeDelete('user_roles', 'user_id', userId);
    await safeDelete('user_contacts', 'user_id', userId);
    await safeDelete('user_analytics', 'user_id', userId);
    await safeDelete('trackings', 'user_id', userId);
    await safeDelete('subscriptions', 'user_id', userId);
    await safeDelete('service_subscriptions', 'user_id', userId);
    await safeDelete('service_subscription_payments', 'user_id', userId);
    await safeDelete('support_tickets', 'requester_id', userId);
    await safeDelete('mfa_verifications', 'user_id', userId);
    await safeDelete('generated_reports', 'user_id', userId);
    await safeDelete('custom_report_templates', 'user_id', userId);
    await safeDelete('performance_metrics', 'user_id', userId);
    await safeDelete('professional_services', 'user_id', userId);
    await safeDelete('warehouse_permissions', 'user_id', userId);
    await safeDelete('soc_analysts', 'user_id', userId);
    await safeDelete('vendor_employees', 'user_id', userId);
    await safeDelete('vendor_agents', 'user_id', userId);
    await safeDelete('agent_created_users', 'user_id', userId);
    await safeDelete('agents', 'user_id', userId);
    await safeDelete('agents_management', 'user_id', userId);
    await safeDelete('api_keys', 'user_id', userId);
    await safeDelete('revenus_pdg', 'user_id', userId);
    await safeDelete('pdg_management', 'user_id', userId);

    console.log('👤 Suppression du profil...');
    await safeDelete('profiles', 'id', userId);

    console.log('🔐 Suppression de l\'utilisateur auth...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Erreur suppression auth:', deleteError.message);
      
      // Vérifier si l'utilisateur existe encore dans auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUser?.user) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `L'utilisateur auth n'a pas pu être supprimé: ${deleteError.message}. Des données liées existent peut-être encore.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    console.log(`✅ Utilisateur ${userId} (${userToDelete?.email}) supprimé avec succès`);

    return new Response(
      JSON.stringify({ success: true, message: 'Utilisateur et toutes ses données supprimés' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Erreur:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
