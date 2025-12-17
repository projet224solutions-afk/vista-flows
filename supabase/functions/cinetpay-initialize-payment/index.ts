import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency?: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  return_url?: string;
  notify_url?: string;
  metadata?: Record<string, unknown>;
}

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

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { amount, currency = 'GNF', description, customer_name, customer_email, customer_phone, return_url, metadata } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Montant invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('CINETPAY_API_KEY');
    const siteId = Deno.env.get('CINETPAY_SITE_ID');

    if (!apiKey || !siteId) {
      console.error('CinetPay configuration manquante');
      return new Response(
        JSON.stringify({ error: 'Configuration de paiement manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer un ID de transaction unique
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const origin = req.headers.get('origin') || 'https://224solutions.app';
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cinetpay-webhook`;

    console.log('Initializing CinetPay payment:', { transactionId, amount, currency });

    // Appel API CinetPay
    const cinetpayResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
        amount: Math.round(amount),
        currency: currency,
        description: description || 'Paiement 224Solutions',
        customer_name: customer_name || user.user_metadata?.full_name || 'Client',
        customer_email: customer_email || user.email,
        customer_phone_number: customer_phone || user.user_metadata?.phone || '',
        customer_address: 'Guinée',
        customer_city: 'Conakry',
        customer_country: 'GN',
        customer_state: 'Conakry',
        customer_zip_code: '000',
        return_url: return_url || `${origin}/payment-success`,
        notify_url: notifyUrl,
        channels: 'ALL',
        metadata: JSON.stringify({
          user_id: user.id,
          ...metadata
        }),
      }),
    });

    const cinetpayData = await cinetpayResponse.json();
    console.log('CinetPay response:', cinetpayData);

    if (cinetpayData.code !== '201') {
      console.error('CinetPay error:', cinetpayData);
      return new Response(
        JSON.stringify({ 
          error: cinetpayData.message || 'Erreur lors de l\'initialisation du paiement',
          details: cinetpayData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sauvegarder la transaction en base
    const { error: dbError } = await supabaseClient
      .from('cinetpay_payments')
      .insert({
        user_id: user.id,
        transaction_id: transactionId,
        payment_token: cinetpayData.data?.payment_token,
        amount: amount,
        currency: currency,
        status: 'pending',
        description: description,
        metadata: metadata,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // On continue même si l'enregistrement échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        payment_url: cinetpayData.data?.payment_url,
        payment_token: cinetpayData.data?.payment_token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cinetpay-initialize-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
