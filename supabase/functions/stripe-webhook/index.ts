/**
 * EDGE FUNCTION: stripe-webhook
 * Traiter les webhooks Stripe (payment_intent.succeeded, payment_intent.payment_failed, etc.)
 * Support: POS, Dépôts, Taxi, Livraison
 * 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'stripe-signature, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
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
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!stripeSecretKey) {
      logStep('ERROR', { message: 'Missing STRIPE_SECRET_KEY' });
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

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (stripeWebhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          stripeWebhookSecret
        );
        logStep('Webhook signature verified', { eventType: event.type });
      } catch (err) {
        logStep('Webhook signature verification failed', { error: String(err) });
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Parse event without verification (development mode)
      event = JSON.parse(body);
      logStep('Webhook received (no signature verification)', { eventType: event.type });
    }

    // Process event based on type
    logStep('Processing webhook event', { type: event.type });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep('Payment succeeded', { 
          id: paymentIntent.id,
          metadata: paymentIntent.metadata 
        });
        
        const source = paymentIntent.metadata?.source;
        
        // Récupérer charge pour détails paiement
        let chargeId = null;
        let last4 = null;
        let cardBrand = null;
        let threeDsStatus = null;

        if (paymentIntent.latest_charge) {
          try {
            const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
            chargeId = charge.id;
            
            if (charge.payment_method_details?.card) {
              last4 = charge.payment_method_details.card.last4;
              cardBrand = charge.payment_method_details.card.brand;
              threeDsStatus = charge.payment_method_details.card.three_d_secure?.authentication_flow || null;
            }
          } catch (chargeErr) {
            logStep('Error fetching charge', { error: String(chargeErr) });
          }
        }

        // Traiter selon le type de source
        if (source === 'taxi' || paymentIntent.metadata?.ride_id) {
          // Paiement taxi-moto
          logStep('Processing taxi payment');
          
          const { error: taxiError } = await supabase.rpc('process_taxi_card_payment', {
            p_stripe_payment_intent_id: paymentIntent.id
          });

          if (taxiError) {
            logStep('Error processing taxi payment', { error: taxiError.message });
          } else {
            logStep('Taxi payment processed successfully');
          }
          
        } else if (source === 'wallet_deposit' || paymentIntent.metadata?.type === 'deposit') {
          // Dépôt wallet
          logStep('Processing wallet deposit');
          
          // Récupérer la transaction
          const { data: transaction } = await supabase
            .from('stripe_transactions')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .single();

          if (transaction) {
            // Mettre à jour le statut
            await supabase
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

            // Traiter le dépôt
            const { error: depositError } = await supabase.rpc('process_deposit_payment', {
              p_transaction_id: transaction.id
            });

            if (depositError) {
              logStep('Error processing deposit', { error: depositError.message });
            } else {
              logStep('Deposit processed successfully');
            }
          }
          
        } else {
          // Paiement POS standard (marketplace)
          logStep('Processing POS/marketplace payment');
          
          // Récupérer transaction
          const { data: transaction, error: fetchError } = await supabase
            .from('stripe_transactions')
            .select('*')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .single();

          if (fetchError || !transaction) {
            logStep('Transaction not found', { paymentIntentId: paymentIntent.id });
            break;
          }

          // Mettre à jour transaction
          const { error: updateError } = await supabase
            .from('stripe_transactions')
            .update({
              payment_status: 'SUCCEEDED',
              stripe_charge_id: chargeId,
              last4: last4,
              card_brand: cardBrand,
              three_ds_status: threeDsStatus,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id);

          if (updateError) {
            logStep('Error updating transaction', { error: updateError.message });
          }

          // =========================================================
          // � CRÉER COMMANDE SI MANQUANTE
          // =========================================================
          let orderId = transaction.order_id;
          
          if (!orderId && transaction.product_id) {
            logStep('📦 Creating order from payment...');
            
            try {
              const { data: orderResult, error: orderError } = await supabase
                .rpc('create_order_from_payment', {
                  p_transaction_id: transaction.id
                });

              if (orderError) {
                logStep('⚠️ Error creating order', { error: orderError.message });
              } else if (orderResult?.success) {
                orderId = orderResult.order_id;
                logStep('✅ Order created', { 
                  orderId, 
                  orderNumber: orderResult.order_number 
                });
              }
            } catch (orderErr) {
              logStep('⚠️ Exception creating order', { error: String(orderErr) });
            }
          }

          // =========================================================
          // 💰 CRÉDITER WALLET VENDEUR DIRECTEMENT
          // =========================================================
          logStep('💰 Crediting seller wallet...');
          
          try {
            const { data: walletResult, error: walletError } = await supabase
              .rpc('force_credit_seller_wallet', {
                p_transaction_id: transaction.id
              });

            if (walletError) {
              logStep('❌ Error crediting wallet', { error: walletError.message });
              
              // Fallback: essayer process_successful_payment
              const { error: processError } = await supabase.rpc('process_successful_payment', {
                p_transaction_id: transaction.id
              });
              
              if (processError) {
                logStep('❌ Error in fallback wallet credit', { error: processError.message });
              } else {
                logStep('✅ Wallet credited via fallback');
              }
            } else if (walletResult?.success) {
              logStep('✅ Wallet credited', {
                walletId: walletResult.wallet_id,
                amount: walletResult.amount_credited,
                balanceBefore: walletResult.balance_before,
                balanceAfter: walletResult.balance_after
              });
            }
          } catch (walletErr) {
            logStep('❌ Exception crediting wallet', { error: String(walletErr) });
          }

          // =========================================================
          // 📋 METTRE À JOUR LA COMMANDE
          // =========================================================
          if (orderId) {
            await supabase
              .from('orders')
              .update({
                payment_status: 'paid',
                status: 'confirmed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', orderId);
            
            logStep('✅ Order updated', { orderId });
          }
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep('Payment failed', { id: paymentIntent.id });

        const error = paymentIntent.last_payment_error;

        // Mettre à jour transaction
        await supabase
          .from('stripe_transactions')
          .update({
            status: 'FAILED',
            error_code: error?.code || 'unknown',
            error_message: error?.message || 'Payment failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        // Mettre à jour taxi_transactions si c'est un paiement taxi
        if (paymentIntent.metadata?.ride_id) {
          await supabase
            .from('taxi_transactions')
            .update({
              status: 'failed',
              metadata: { error: error?.message }
            })
            .eq('provider_tx_id', paymentIntent.id);
        }

        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep('Payment canceled', { id: paymentIntent.id });

        await supabase
          .from('stripe_transactions')
          .update({
            status: 'CANCELED',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        break;
      }

      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep('Payment requires 3D Secure', { id: paymentIntent.id });

        await supabase
          .from('stripe_transactions')
          .update({
            requires_3ds: true,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        logStep('Charge refunded', { id: charge.id });

        await supabase
          .from('stripe_transactions')
          .update({
            status: 'REFUNDED',
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_charge_id', charge.id);

        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        logStep('Dispute created', { id: dispute.id });

        await supabase
          .from('stripe_transactions')
          .update({
            status: 'DISPUTED',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_charge_id', dispute.charge as string);

        break;
      }

      default:
        logStep('Unhandled event type', { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logStep('Error in stripe-webhook', { error: String(error) });
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
