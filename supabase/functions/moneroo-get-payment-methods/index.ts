import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Moneroo secret key
    const monerooSecretKey = Deno.env.get('MONEROO_SECRET_KEY');
    if (!monerooSecretKey) {
      console.error('MONEROO_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration de paiement manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching payment methods from Moneroo...');
    
    // Call Moneroo API to get payment methods
    const monerooResponse = await fetch('https://api.moneroo.io/v1/utils/payment/methods', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${monerooSecretKey}`,
        'Accept': 'application/json',
      },
    });

    const monerooData = await monerooResponse.json();
    console.log('Moneroo API response status:', monerooResponse.status);

    if (!monerooResponse.ok) {
      console.error('Moneroo API error:', monerooData);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la récupération des méthodes',
          details: monerooData 
        }),
        { status: monerooResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter for Guinea (GN) mobile money methods
    const guineaMethods = monerooData.data?.filter((method: any) => 
      method.code && (
        method.code.includes('gn') ||
        method.code.includes('guinea') ||
        method.currency === 'GNF'
      )
    ) || [];

    console.log('Guinea payment methods found:', guineaMethods.length);

    return new Response(
      JSON.stringify({
        success: true,
        methods: guineaMethods,
        all_methods: monerooData.data,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in moneroo-get-payment-methods:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
