import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { productId, currentStatus } = await req.json();

    if (!productId) {
      throw new Error('Missing productId');
    }

    // Initialiser le client Supabase avec la clé service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialiser le client Supabase avec le token utilisateur
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Vérifier que l'utilisateur est un agent avec les bonnes permissions
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents_management')
      .select('id, permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      console.error('Agent check error:', agentError);
      throw new Error('Not authorized as agent');
    }

    if (!agent.permissions?.includes('manage_products')) {
      throw new Error('Missing manage_products permission');
    }

    console.log('Agent authorized to toggle product status:', agent.id);

    // Mettre à jour le statut du produit
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ is_active: !currentStatus })
      .eq('id', productId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('Product status toggled successfully:', productId);

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in agent-toggle-product-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
