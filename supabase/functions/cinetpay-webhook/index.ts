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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // CinetPay envoie les données en form-urlencoded ou JSON
    let transactionId: string | null = null;
    let paymentToken: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await req.json();
      transactionId = body.cpm_trans_id || body.transaction_id;
      paymentToken = body.cpm_payment_token || body.payment_token;
    } else {
      const formData = await req.formData();
      transactionId = formData.get('cpm_trans_id') as string || formData.get('transaction_id') as string;
      paymentToken = formData.get('cpm_payment_token') as string || formData.get('payment_token') as string;
    }

    console.log('CinetPay webhook received:', { transactionId, paymentToken });

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le statut du paiement auprès de CinetPay
    const apiKey = Deno.env.get('CINETPAY_API_KEY');
    const siteId = Deno.env.get('CINETPAY_SITE_ID');

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
    console.log('CinetPay verification:', verifyData);

    const paymentStatus = verifyData.data?.status;
    let dbStatus = 'pending';

    if (paymentStatus === 'ACCEPTED') {
      dbStatus = 'completed';
    } else if (paymentStatus === 'REFUSED' || paymentStatus === 'CANCELLED') {
      dbStatus = 'failed';
    }

    // Mettre à jour le statut en base
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('cinetpay_payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (fetchError) {
      console.error('Error fetching payment:', fetchError);
    }

    const { error: updateError } = await supabaseAdmin
      .from('cinetpay_payments')
      .update({
        status: dbStatus,
        payment_method: verifyData.data?.payment_method,
        operator_id: verifyData.data?.operator_id,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId);

    if (updateError) {
      console.error('Error updating payment:', updateError);
    }

    // Si le paiement est réussi, créditer le wallet
    if (dbStatus === 'completed' && payment?.user_id) {
      const { error: walletError } = await supabaseAdmin.rpc('credit_wallet', {
        p_user_id: payment.user_id,
        p_amount: payment.amount,
        p_description: `Recharge CinetPay - ${transactionId}`,
        p_transaction_type: 'cinetpay_deposit'
      });

      if (walletError) {
        console.error('Error crediting wallet:', walletError);
      } else {
        console.log('Wallet credited successfully');
      }

      // Créer une notification
      await supabaseAdmin.from('notifications').insert({
        user_id: payment.user_id,
        title: 'Paiement reçu',
        message: `Votre paiement de ${payment.amount} ${payment.currency} a été confirmé.`,
        type: 'payment',
        is_read: false,
      });
    }

    return new Response(
      JSON.stringify({ success: true, status: dbStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cinetpay-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
