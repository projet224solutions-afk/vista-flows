/**
 * TAXI-MOTO: Payment processing
 * Supporte: Card (Stripe), Orange Money, Wallet 224Solutions
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[TAXI-PAYMENT] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep('Payment started');

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Authentication failed");
    
    logStep('User authenticated', { userId: user.id });

    const { rideId, paymentMethod, idempotencyKey } = await req.json();
    if (!rideId || !paymentMethod) throw new Error("rideId and paymentMethod required");

    logStep('Processing payment', { rideId, paymentMethod, idempotencyKey });

    // Check for duplicate
    if (idempotencyKey) {
      const { data: existing } = await supabaseClient
        .from('taxi_transactions')
        .select('id, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) {
        logStep('Duplicate request detected', { existingId: existing.id });
        return new Response(
          JSON.stringify({ success: true, transaction: existing }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get ride details
    const { data: ride, error: rideError } = await supabaseClient
      .from('taxi_trips')
      .select('*')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) throw new Error('Ride not found');

    logStep('Ride found', { price: ride.price_total, driverId: ride.driver_id });

    // Create transaction record
    const { data: transaction, error: txError } = await supabaseClient
      .from('taxi_transactions')
      .insert({
        ride_id: rideId,
        customer_id: ride.customer_id,
        driver_id: ride.driver_id,
        amount: ride.price_total,
        currency: 'GNF',
        payment_method: paymentMethod,
        driver_share: ride.driver_share,
        platform_fee: ride.platform_fee,
        status: 'processing',
        idempotency_key: idempotencyKey,
        metadata: { user_id: user.id }
      })
      .select()
      .single();

    if (txError) throw txError;

    logStep('Transaction created', { txId: transaction.id });

    // Process based on payment method
    let paymentResult;

    switch (paymentMethod) {
      case 'wallet': {
        logStep('Processing wallet payment');
        
        // Get customer wallet
        const { data: wallet } = await supabaseClient
          .from('wallets')
          .select('balance, currency')
          .eq('user_id', ride.customer_id)
          .eq('currency', 'GNF')
          .single();

        if (!wallet || wallet.balance < ride.price_total) {
          throw new Error('Insufficient wallet balance');
        }

        // Process transaction via wallet service
        const { error: walletError } = await supabaseClient.rpc('process_wallet_transaction', {
          p_sender_id: ride.customer_id,
          p_receiver_id: ride.driver_id,
          p_amount: ride.driver_share,
          p_currency: 'GNF',
          p_description: `Taxi ride ${rideId}`
        });

        if (walletError) throw walletError;

        paymentResult = { success: true, method: 'wallet' };
        break;
      }

      case 'card': {
        logStep('Processing card payment via Stripe');
        
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2025-08-27.basil",
        });

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(ride.price_total),
          currency: 'gnf',
          metadata: {
            ride_id: rideId,
            customer_id: ride.customer_id,
            driver_id: ride.driver_id
          }
        });

        // Update transaction with provider info
        await supabaseClient
          .from('taxi_transactions')
          .update({
            payment_provider: 'stripe',
            provider_tx_id: paymentIntent.id,
            metadata: { ...transaction.metadata, payment_intent_id: paymentIntent.id }
          })
          .eq('id', transaction.id);

        paymentResult = { 
          success: true, 
          method: 'card',
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id
        };
        break;
      }

      case 'orange_money': {
        logStep('Processing Orange Money payment');
        
        // TODO: Integrate with Orange Money API
        // For now, mark as processing and wait for webhook
        
        paymentResult = { 
          success: true, 
          method: 'orange_money',
          status: 'processing',
          message: 'Confirmez le paiement sur votre téléphone'
        };
        break;
      }

      case 'cash': {
        logStep('Cash payment - marking as pending');
        
        await supabaseClient
          .from('taxi_transactions')
          .update({ status: 'pending' })
          .eq('id', transaction.id);

        paymentResult = { success: true, method: 'cash', status: 'pending' };
        break;
      }

      default:
        throw new Error('Invalid payment method');
    }

    // Mark transaction completed (except card which waits for confirmation)
    if (paymentMethod === 'wallet') {
      await supabaseClient
        .from('taxi_transactions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', transaction.id);

      await supabaseClient
        .from('taxi_trips')
        .update({ payment_status: 'paid' })
        .eq('id', rideId);
    }

    logStep('Payment processed', paymentResult);

    // Notify driver
    if (ride.driver_id) {
      const { data: driver } = await supabaseClient
        .from('taxi_drivers')
        .select('user_id')
        .eq('id', ride.driver_id)
        .single();

      if (driver) {
        await supabaseClient.rpc('create_taxi_notification', {
          p_user_id: driver.user_id,
          p_type: 'payment_received',
          p_title: 'Paiement reçu',
          p_body: `Paiement de ${ride.price_total} GNF confirmé`,
          p_data: { rideId, amount: ride.driver_share },
          p_ride_id: rideId
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, transaction, payment: paymentResult }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('ERROR', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});