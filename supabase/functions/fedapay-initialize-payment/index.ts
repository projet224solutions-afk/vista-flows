import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Non authentifié', details: 'Authorization header manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Non authentifié', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body once
    const body = await req.json();
    const { 
      amount, 
      currency = 'GNF',
      description,
      customer_email,
      customer_phone,
      customer_name,
      order_id,
      callback_url,
      return_url
    } = body;

    console.log('FedaPay payment request:', { amount, currency, customer_email, customer_phone, order_id });

    // Validate required fields
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Montant invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FEDAPAY_SECRET_KEY = Deno.env.get('FEDAPAY_SECRET_KEY');
    if (!FEDAPAY_SECRET_KEY) {
      console.error('FEDAPAY_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration FedaPay manquante', details: 'Clé API non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine environment (sandbox or live based on key prefix)
    const isSandbox = FEDAPAY_SECRET_KEY.startsWith('sk_sandbox_') || FEDAPAY_SECRET_KEY.startsWith('sk_test_');
    const apiUrl = isSandbox 
      ? 'https://sandbox-api.fedapay.com/v1/transactions' 
      : 'https://api.fedapay.com/v1/transactions';

    console.log('Using FedaPay API:', apiUrl, 'Sandbox:', isSandbox);

    // Build customer object
    const customer: Record<string, unknown> = {};
    if (customer_email) customer.email = customer_email;
    if (customer_phone) customer.phone_number = { number: customer_phone, country: 'GN' };
    if (customer_name) {
      const nameParts = customer_name.split(' ');
      customer.firstname = nameParts[0] || '';
      customer.lastname = nameParts.slice(1).join(' ') || '';
    }

    // Create transaction payload
    const transactionPayload: Record<string, unknown> = {
      description: description || `Paiement commande ${order_id || 'N/A'}`,
      amount: Math.round(amount),
      currency: { iso: currency },
      callback_url: callback_url || `${Deno.env.get('SUPABASE_URL')}/functions/v1/fedapay-webhook`,
    };

    // Add customer if we have data
    if (Object.keys(customer).length > 0) {
      transactionPayload.customer = customer;
    }

    // Add metadata
    transactionPayload.custom_metadata = {
      order_id: order_id,
      user_id: user.id,
      platform: '224solutions'
    };

    console.log('Creating FedaPay transaction:', JSON.stringify(transactionPayload));

    // Create transaction
    const createResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionPayload),
    });

    const createData = await createResponse.json();
    console.log('FedaPay create response:', createResponse.status, JSON.stringify(createData));

    if (!createResponse.ok) {
      const errorMessage = createData?.message || createData?.error?.message || 'Erreur FedaPay';
      console.error('FedaPay create error:', createData);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la création de la transaction',
          details: createData,
          fedapay_message: errorMessage
        }),
        { status: createResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = createData.v1?.transaction?.id || createData.id;
    
    if (!transactionId) {
      console.error('No transaction ID in response:', createData);
      return new Response(
        JSON.stringify({ error: 'ID de transaction manquant dans la réponse' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate payment token/URL
    const tokenUrl = isSandbox
      ? `https://sandbox-api.fedapay.com/v1/transactions/${transactionId}/token`
      : `https://api.fedapay.com/v1/transactions/${transactionId}/token`;

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const tokenData = await tokenResponse.json();
    console.log('FedaPay token response:', tokenResponse.status, JSON.stringify(tokenData));

    if (!tokenResponse.ok) {
      console.error('FedaPay token error:', tokenData);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la génération du lien de paiement',
          details: tokenData 
        }),
        { status: tokenResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentToken = tokenData.token || tokenData.v1?.token;
    const paymentUrl = isSandbox
      ? `https://sandbox-checkout.fedapay.com/checkout/${paymentToken}`
      : `https://checkout.fedapay.com/checkout/${paymentToken}`;

    console.log('FedaPay payment URL generated:', paymentUrl);

    // Store transaction reference in database
    try {
      await supabaseClient.from('payment_transactions').insert({
        user_id: user.id,
        provider: 'fedapay',
        provider_transaction_id: String(transactionId),
        amount: amount,
        currency: currency,
        status: 'pending',
        metadata: {
          order_id,
          payment_token: paymentToken,
          sandbox: isSandbox
        }
      });
    } catch (dbError) {
      console.log('Could not save transaction to DB (table may not exist):', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        payment_url: paymentUrl,
        payment_token: paymentToken,
        sandbox: isSandbox
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('FedaPay initialization error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
