/**
 * 🔄 SYNC TO CLOUD SQL
 * Edge Function qui synchronise les données Supabase → Google Cloud SQL
 * Appelée après chaque opération critique (login, inscription, commande, etc.)
 * L'auth reste dans Supabase, les données métier vont dans Cloud SQL
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    
    const backendUrl = Deno.env.get('AWS_BACKEND_URL') || 'https://api.224solution.net';
    const syncApiKey = Deno.env.get('CLOUD_SQL_SYNC_API_KEY') || '';

    // Vérifier le JWT Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    switch (action) {
      case 'sync_user': {
        // Sync le profil utilisateur vers Cloud SQL
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', data.userId || userId)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ error: 'Profil non trouvé' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Envoyer au backend AWS pour insertion dans Cloud SQL
        const syncResponse = await fetch(`${backendUrl}/api/cloudsql/sync-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-API-Key': syncApiKey,
          },
          body: JSON.stringify({
            supabase_user_id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            city: profile.city,
            country: profile.country,
            role: profile.role,
            created_at: profile.created_at,
          }),
        });

        const syncResult = await syncResponse.json();
        console.log(`✅ User synced to Cloud SQL: ${profile.id}`, syncResult);

        return new Response(JSON.stringify({ success: true, action: 'sync_user', result: syncResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_order': {
        // Sync une commande vers Cloud SQL
        const { data: order } = await supabaseAdmin
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', data.orderId)
          .single();

        if (!order) {
          return new Response(JSON.stringify({ error: 'Commande non trouvée' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const syncResponse = await fetch(`${backendUrl}/api/cloudsql/sync-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-API-Key': syncApiKey,
          },
          body: JSON.stringify(order),
        });

        const syncResult = await syncResponse.json();
        console.log(`✅ Order synced to Cloud SQL: ${order.id}`);

        return new Response(JSON.stringify({ success: true, action: 'sync_order', result: syncResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync_transaction': {
        // Sync une transaction wallet vers Cloud SQL
        const syncResponse = await fetch(`${backendUrl}/api/cloudsql/sync-transaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-API-Key': syncApiKey,
          },
          body: JSON.stringify(data),
        });

        const syncResult = await syncResponse.json();
        console.log(`✅ Transaction synced to Cloud SQL`);

        return new Response(JSON.stringify({ success: true, action: 'sync_transaction', result: syncResult }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'full_sync': {
        // Synchronisation complète de toutes les tables critiques
        const tables = [
          'profiles', 'vendors', 'orders', 'order_items', 'products',
          'wallets', 'wallet_transactions', 'deliveries', 'escrows',
          'agents_management', 'pdg_management'
        ];

        const results: Record<string, any> = {};

        for (const table of tables) {
          try {
            const { data: rows, error } = await supabaseAdmin
              .from(table)
              .select('*');

            if (error) {
              results[table] = { error: error.message, count: 0 };
              continue;
            }

            const syncResponse = await fetch(`${backendUrl}/api/cloudsql/bulk-sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Sync-API-Key': syncApiKey,
              },
              body: JSON.stringify({ table, rows }),
            });

            const syncResult = await syncResponse.json();
            results[table] = { success: true, count: rows?.length || 0, result: syncResult };
          } catch (err) {
            results[table] = { error: err.message, count: 0 };
          }
        }

        console.log('✅ Full sync completed:', results);

        return new Response(JSON.stringify({ success: true, action: 'full_sync', results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Action inconnue: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (err) {
    console.error('❌ Sync to Cloud SQL error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
