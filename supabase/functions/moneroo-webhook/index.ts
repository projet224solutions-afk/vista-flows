import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonerooWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
      first_name: string;
      last_name: string;
    };
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook payload
    const webhookData: MonerooWebhookPayload = await req.json();
    console.log('Moneroo webhook received:', webhookData.event, webhookData.data.id);

    const { event, data: paymentData } = webhookData;

    // Update payment status in database
    const { error: updateError } = await supabaseClient
      .from('moneroo_payments')
      .update({
        status: paymentData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentData.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle specific events
    if (event === 'payment.successful') {
      console.log('Payment successful:', paymentData.id);
      
      // Get the payment record to find the user
      const { data: payment, error: paymentError } = await supabaseClient
        .from('moneroo_payments')
        .select('user_id, metadata')
        .eq('payment_id', paymentData.id)
        .single();

      if (!paymentError && payment) {
        // You can add custom logic here based on the metadata
        // For example, credit wallet, activate subscription, etc.
        const metadata = payment.metadata as Record<string, any>;
        
        if (metadata?.order_id) {
          // Update order status
          await supabaseClient
            .from('orders')
            .update({ status: 'paid', payment_method: 'moneroo' })
            .eq('id', metadata.order_id);
          
          console.log('Order updated:', metadata.order_id);
        }

        if (metadata?.wallet_recharge) {
          // Credit user wallet
          const { error: walletError } = await supabaseClient.rpc('credit_wallet', {
            p_user_id: payment.user_id,
            p_amount: paymentData.amount,
            p_description: `Recharge via Moneroo - ${paymentData.id}`,
          });

          if (walletError) {
            console.error('Error crediting wallet:', walletError);
          } else {
            console.log('Wallet credited:', payment.user_id, paymentData.amount);
          }
        }
      }
    } else if (event === 'payment.failed') {
      console.log('Payment failed:', paymentData.id);
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in moneroo-webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
