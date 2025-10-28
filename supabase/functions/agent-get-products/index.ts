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

    console.log('User authenticated:', user.id);

    // Vérifier que l'utilisateur est un agent
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

    // Vérifier les permissions
    if (!agent.permissions?.includes('manage_products')) {
      throw new Error('Missing manage_products permission');
    }

    console.log('Agent authorized:', agent.id);

    // Récupérer tous les produits
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Products fetch error:', productsError);
      throw productsError;
    }

    // Récupérer l'inventaire pour calculer le stock
    const { data: inventory } = await supabaseAdmin
      .from('inventory')
      .select('product_id, quantity');

    // Créer un map pour le stock par produit
    const stockMap = new Map<string, number>();
    (inventory || []).forEach((inv: any) => {
      const current = stockMap.get(inv.product_id) || 0;
      stockMap.set(inv.product_id, current + (inv.quantity || 0));
    });

    // Ajouter le stock à chaque produit
    const productsWithStock = (products || []).map((product: any) => ({
      ...product,
      total_stock: stockMap.get(product.id) || 0
    }));

    // Récupérer les vendeurs
    const { data: vendors } = await supabaseAdmin
      .from('vendors')
      .select('id, user_id');

    // Calculer les statistiques
    const activeProducts = productsWithStock.filter((p: any) => p.is_active);
    const totalValue = productsWithStock.reduce((sum: number, p: any) => 
      sum + ((p.price || 0) * (p.total_stock || 0)), 0);
    const totalStock = productsWithStock.reduce((sum: number, p: any) => 
      sum + (p.total_stock || 0), 0);

    const stats = {
      total: productsWithStock.length,
      active: activeProducts.length,
      inactive: productsWithStock.length - activeProducts.length,
      lowStock: productsWithStock.filter((p: any) => (p.total_stock || 0) <= 10).length,
      totalValue,
      totalStock
    };

    console.log('Products fetched successfully:', productsWithStock.length);

    return new Response(
      JSON.stringify({ 
        products: productsWithStock,
        vendors: vendors || [],
        stats
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in agent-get-products:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
