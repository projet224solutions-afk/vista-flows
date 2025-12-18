import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('FedaPay webhook received:', JSON.stringify(body));

    const { entity, name: eventName } = body;
    
    if (!entity || !entity.id) {
      console.log('Invalid webhook payload - no entity');
      return new Response(
        JSON.stringify({ received: true, status: 'invalid_payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transactionId = String(entity.id);
    const status = entity.status;
    const amount = entity.amount;
    const reference = entity.reference;
    const customMetadata = entity.custom_metadata || {};

    console.log('Processing FedaPay event:', eventName, 'Transaction:', transactionId, 'Status:', status);

    // Map FedaPay status to our status
    let mappedStatus = 'pending';
    switch (status) {
      case 'approved':
      case 'transferred':
        mappedStatus = 'completed';
        break;
      case 'declined':
      case 'canceled':
      case 'refunded':
        mappedStatus = 'failed';
        break;
      case 'pending':
      default:
        mappedStatus = 'pending';
    }

    // Update transaction in database
    const { error: updateError } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: mappedStatus,
        provider_status: status,
        updated_at: new Date().toISOString(),
        webhook_data: body
      })
      .eq('provider_transaction_id', transactionId)
      .eq('provider', 'fedapay');

    if (updateError) {
      console.log('Error updating transaction:', updateError);
    }

    // If payment completed, update order status
    if (mappedStatus === 'completed' && customMetadata.order_id) {
      console.log('Payment completed, updating order:', customMetadata.order_id);
      
      const { error: orderError } = await supabaseClient
        .from('orders')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', customMetadata.order_id);

      if (orderError) {
        console.log('Error updating order:', orderError);
      }
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        status: 'processed',
        transaction_id: transactionId,
        mapped_status: mappedStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('FedaPay webhook error:', error);
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
