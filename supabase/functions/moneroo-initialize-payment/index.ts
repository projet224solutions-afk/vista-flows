import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
  };
  return_url: string;
  methods?: string[];
  metadata?: Record<string, any>;
}

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

    // Get request body
    const paymentData: PaymentRequest = await req.json();
    console.log('Payment request:', { ...paymentData, amount: paymentData.amount });

    // Validate required fields
    if (!paymentData.amount || !paymentData.currency || !paymentData.description) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Moneroo API request
    const monerooSecretKey = Deno.env.get('MONEROO_SECRET_KEY');
    if (!monerooSecretKey) {
      console.error('MONEROO_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration de paiement manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const monerooPayload = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      description: paymentData.description,
      customer: paymentData.customer,
      return_url: paymentData.return_url,
      methods: paymentData.methods || ['orange_gn', 'mtn_gn'],
      metadata: {
        ...paymentData.metadata,
        user_id: user.id,
      },
    };

    console.log('Calling Moneroo API...');
    
    // Call Moneroo API
    const monerooResponse = await fetch('https://api.moneroo.io/v1/payments/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${monerooSecretKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(monerooPayload),
    });

    const monerooData = await monerooResponse.json();
    console.log('Moneroo API response status:', monerooResponse.status);

    if (!monerooResponse.ok) {
      console.error('Moneroo API error:', monerooData);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de l\'initialisation du paiement',
          details: monerooData 
        }),
        { status: monerooResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store payment record in database
    const { error: dbError } = await supabaseClient
      .from('moneroo_payments')
      .insert({
        user_id: user.id,
        payment_id: monerooData.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'pending',
        checkout_url: monerooData.checkout_url,
        metadata: paymentData.metadata,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue anyway, as payment was initialized
    }

    console.log('Payment initialized successfully:', monerooData.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: monerooData.id,
        checkout_url: monerooData.checkout_url,
        status: monerooData.status,
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in moneroo-initialize-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
