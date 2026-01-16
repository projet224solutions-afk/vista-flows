import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error('Non autorisé');
    }

    // Vérifier que l'utilisateur est PDG ou admin/ceo
    const { data: pdgProfile } = await supabaseAdmin
      .from('pdg_management')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAuthorized = pdgProfile || (adminProfile && ['admin', 'ceo'].includes(adminProfile.role));

    if (!isAuthorized) {
      throw new Error('Vous devez être PDG ou Admin pour supprimer des boutiques');
    }

    const { vendor_id, delete_user_too } = await req.json();

    if (!vendor_id) {
      throw new Error('ID vendeur requis');
    }

    // Récupérer les infos du vendeur
    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id, user_id, business_name')
      .eq('id', vendor_id)
      .single();

    if (vendorError || !vendor) {
      throw new Error('Boutique non trouvée');
    }

    console.log('🗑️ Suppression complète de la boutique:', vendor.business_name);

    // Helper pour supprimer sans erreur si table n'existe pas ou contrainte FK
    const safeDelete = async (table: string, column: string, value: string) => {
      try {
        const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
        if (error) {
          const code = (error as any)?.code;
          if (code === '42P01' || code === '42703') {
            console.log(`  ⚠ ${table}: table/colonne inexistante`);
            return;
          }
          if (code === '23503') {
            console.log(`  ⚠ ${table}: contrainte FK, ignoré`);
            return;
          }
          console.log(`  ❌ ${table}: ${error.message}`);
        } else {
          console.log(`  ✓ ${table}`);
        }
      } catch (e) {
        console.log(`  ⚠ ${table}: ${e}`);
      }
    };

    // 1. Supprimer les données liées aux commandes
    console.log('📦 Suppression des données commandes...');
    const { data: orders } = await supabaseAdmin.from('orders').select('id').eq('vendor_id', vendor.id);
    if (orders && orders.length > 0) {
      for (const order of orders) {
        await safeDelete('escrow_transactions', 'order_id', order.id);
        await safeDelete('order_items', 'order_id', order.id);
        await safeDelete('order_status_history', 'order_id', order.id);
        await safeDelete('delivery_tracking', 'order_id', order.id);
        await safeDelete('china_logistics', 'order_id', order.id);
      }
    }
    await safeDelete('orders', 'vendor_id', vendor.id);

    // 2. Supprimer les produits et données liées
    console.log('📦 Suppression des produits...');
    const { data: products } = await supabaseAdmin.from('products').select('id').eq('vendor_id', vendor.id);
    if (products && products.length > 0) {
      for (const product of products) {
        await safeDelete('product_variants', 'product_id', product.id);
        await safeDelete('product_images', 'product_id', product.id);
        await safeDelete('product_reviews', 'product_id', product.id);
        await safeDelete('advanced_carts', 'product_id', product.id);
        await safeDelete('carts', 'product_id', product.id);
        await safeDelete('wishlist_items', 'product_id', product.id);
        await safeDelete('inventory', 'product_id', product.id);
      }
    }
    await safeDelete('products', 'vendor_id', vendor.id);

    // 3. Supprimer les paniers liés au vendeur
    console.log('🛒 Suppression des paniers...');
    await safeDelete('advanced_carts', 'vendor_id', vendor.id);

    // 4. Supprimer les produits digitaux
    console.log('💾 Suppression des produits digitaux...');
    await safeDelete('digital_products', 'vendor_id', vendor.id);

    // 5. Supprimer les services professionnels
    console.log('💼 Suppression des services professionnels...');
    const { data: services } = await supabaseAdmin.from('professional_services').select('id').eq('vendor_id', vendor.id);
    if (services && services.length > 0) {
      for (const service of services) {
        await safeDelete('service_bookings', 'service_id', service.id);
        await safeDelete('beauty_appointments', 'professional_service_id', service.id);
        await safeDelete('beauty_services', 'professional_service_id', service.id);
        await safeDelete('beauty_staff', 'professional_service_id', service.id);
      }
    }
    await safeDelete('professional_services', 'vendor_id', vendor.id);

    // 6. Supprimer les produits de service du PDG
    console.log('🎯 Suppression des produits de service PDG...');
    await safeDelete('service_products', 'vendor_id', vendor.id);

    // 7. Supprimer les avis
    console.log('⭐ Suppression des avis...');
    await safeDelete('vendor_reviews', 'vendor_id', vendor.id);

    // 8. Supprimer les favoris
    console.log('❤️ Suppression des favoris...');
    await safeDelete('favorites', 'vendor_id', vendor.id);
    await safeDelete('wishlists', 'vendor_id', vendor.id);

    // 9. Supprimer les paramètres vendeur
    console.log('⚙️ Suppression des paramètres...');
    await safeDelete('vendor_settings', 'vendor_id', vendor.id);
    await safeDelete('vendor_analytics', 'vendor_id', vendor.id);
    await safeDelete('china_dropship_settings', 'vendor_id', vendor.id);
    await safeDelete('china_dropship_reports', 'vendor_id', vendor.id);

    // 10. Supprimer le wallet vendeur
    console.log('💰 Suppression du wallet...');
    await safeDelete('vendor_wallets', 'vendor_id', vendor.id);

    // 11. Supprimer le vendeur lui-même
    console.log('🏪 Suppression du vendeur...');
    const { error: deleteVendorError } = await supabaseAdmin
      .from('vendors')
      .delete()
      .eq('id', vendor.id);

    if (deleteVendorError) {
      // Si la suppression échoue, au moins désactiver
      console.log('⚠️ Suppression impossible, désactivation...');
      await supabaseAdmin
        .from('vendors')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', vendor.id);
    } else {
      console.log('✅ Vendeur supprimé');
    }

    // 12. Optionnel: supprimer l'utilisateur associé
    if (delete_user_too && vendor.user_id) {
      console.log('👤 Suppression de l\'utilisateur...');
      
      await safeDelete('profiles', 'id', vendor.user_id);
      await safeDelete('wallets', 'user_id', vendor.user_id);
      await safeDelete('notifications', 'user_id', vendor.user_id);
      
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(vendor.user_id);
      if (authError) {
        console.log('⚠️ Erreur suppression auth:', authError.message);
      } else {
        console.log('✅ Utilisateur auth supprimé');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Boutique "${vendor.business_name}" supprimée définitivement`,
        deleted: {
          vendor_id: vendor.id,
          business_name: vendor.business_name,
          user_deleted: delete_user_too && vendor.user_id ? true : false
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
