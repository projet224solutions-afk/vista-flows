/**
 * EDGE FUNCTION: stripe-webhook
 * Traiter les webhooks Stripe (payment_intent.succeeded, payment_intent.payment_failed, etc.)
 * 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
    
    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error('❌ Missing Stripe keys');
      return new Response(
        JSON.stringify({ error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        stripeWebhookSecret
      );
      console.log('✅ Webhook signature verified:', event.type);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process event based on type
    console.log('📥 Processing webhook event:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('✅ Payment succeeded:', paymentIntent.id);
        
        // Récupérer transaction
        const { data: transaction, error: fetchError } = await supabase
          .from('stripe_transactions')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single();

        if (fetchError || !transaction) {
          console.error('❌ Transaction not found:', paymentIntent.id);
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Récupérer charge pour détails paiement
        let chargeId = null;
        let last4 = null;
        let cardBrand = null;
        let threeDsStatus = null;

        if (paymentIntent.latest_charge) {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          chargeId = charge.id;
          
          if (charge.payment_method_details?.card) {
            last4 = charge.payment_method_details.card.last4;
            cardBrand = charge.payment_method_details.card.brand;
            threeDsStatus = charge.payment_method_details.card.three_d_secure?.authentication_flow || null;
          }
        }

        // Mettre à jour transaction
        const { error: updateError } = await supabase
          .from('stripe_transactions')
          .update({
            status: 'SUCCEEDED',
            stripe_charge_id: chargeId,
            last4: last4,
            card_brand: cardBrand,
            three_ds_status: threeDsStatus,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        if (updateError) {
          console.error('❌ Error updating transaction:', updateError);
        }

        // Traiter le paiement (mettre à jour wallets)
        const { error: processError } = await supabase.rpc('process_successful_payment', {
          p_transaction_id: transaction.id
        });

        if (processError) {
          console.error('❌ Error processing payment:', processError);
        } else {
          console.log('✅ Payment processed successfully, wallets updated');
        }

        // TODO: Envoyer notification vendeur et acheteur
        // await sendPaymentNotification(transaction.buyer_id, transaction.seller_id, transaction);

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', paymentIntent.id);

        const error = paymentIntent.last_payment_error;

        // Mettre à jour transaction
        const { error: updateError } = await supabase
          .from('stripe_transactions')
          .update({
            status: 'FAILED',
            error_code: error?.code || 'unknown',
            error_message: error?.message || 'Payment failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error('❌ Error updating failed transaction:', updateError);
        }

        // TODO: Envoyer notification échec à l'acheteur
        // await sendPaymentFailureNotification(buyer_id);

        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('🚫 Payment canceled:', paymentIntent.id);

        const { error: updateError } = await supabase
          .from('stripe_transactions')
          .update({
            status: 'CANCELED',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error('❌ Error updating canceled transaction:', updateError);
        }

        break;
      }

      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('🔐 Payment requires 3D Secure:', paymentIntent.id);

        const { error: updateError } = await supabase
          .from('stripe_transactions')
          .update({
            requires_3ds: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error('❌ Error updating transaction 3DS status:', updateError);
        }

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('💸 Charge refunded:', charge.id);

        const { error: updateError } = await supabase
          .from('stripe_transactions')
          .update({
            status: 'REFUNDED',
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_charge_id', charge.id);

        if (updateError) {
          console.error('❌ Error updating refunded transaction:', updateError);
        }

        // TODO: Reverser les montants des wallets

        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log('⚠️ Dispute created:', dispute.id);

        const { error: updateError } = await supabase
          .from('stripe_transactions')
          .update({
            status: 'DISPUTED',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_charge_id', dispute.charge as string);

        if (updateError) {
          console.error('❌ Error updating disputed transaction:', updateError);
        }

        // TODO: Geler montant vendeur pour investigation
        // TODO: Notifier admin et vendeur

        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in stripe-webhook:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed', 
        details: message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
