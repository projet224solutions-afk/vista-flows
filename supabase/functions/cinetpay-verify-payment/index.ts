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

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const transactionId = url.searchParams.get('transaction_id');

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('CINETPAY_API_KEY');
    const siteId = Deno.env.get('CINETPAY_SITE_ID');

    if (!apiKey || !siteId) {
      return new Response(
        JSON.stringify({ error: 'Configuration de paiement manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying CinetPay payment:', transactionId);

    // Vérifier le statut auprès de CinetPay
    const verifyResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
      }),
    });

    const verifyData = await verifyResponse.json();
    console.log('CinetPay verification result:', verifyData);

    // Mettre à jour en base si nécessaire
    let dbStatus = 'pending';
    const paymentStatus = verifyData.data?.status;

    if (paymentStatus === 'ACCEPTED') {
      dbStatus = 'completed';
    } else if (paymentStatus === 'REFUSED' || paymentStatus === 'CANCELLED') {
      dbStatus = 'failed';
    }

    const { error: updateError } = await supabaseClient
      .from('cinetpay_payments')
      .update({
        status: dbStatus,
        payment_method: verifyData.data?.payment_method,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        status: dbStatus,
        cinetpay_status: paymentStatus,
        amount: verifyData.data?.amount,
        currency: verifyData.data?.currency,
        payment_method: verifyData.data?.payment_method,
        payment_date: verifyData.data?.payment_date,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cinetpay-verify-payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
