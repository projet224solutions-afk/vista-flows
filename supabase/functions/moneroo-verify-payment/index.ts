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

    // Get payment ID from query params
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'payment_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment:', paymentId);

    // Get Moneroo secret key
    const monerooSecretKey = Deno.env.get('MONEROO_SECRET_KEY');
    if (!monerooSecretKey) {
      console.error('MONEROO_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration de paiement manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Moneroo API to verify payment
    const monerooResponse = await fetch(`https://api.moneroo.io/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${monerooSecretKey}`,
        'Accept': 'application/json',
      },
    });

    if (!monerooResponse.ok) {
      console.error('Moneroo API error:', monerooResponse.status);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification du paiement' }),
        { status: monerooResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await monerooResponse.json();
    console.log('Payment verified:', paymentData.id, paymentData.status);

    // Update payment status in database
    const { error: updateError } = await supabaseClient
      .from('moneroo_payments')
      .update({
        status: paymentData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database error:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: paymentData.id,
          status: paymentData.status,
          amount: paymentData.amount,
          currency: paymentData.currency,
          created_at: paymentData.created_at,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in moneroo-verify-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
