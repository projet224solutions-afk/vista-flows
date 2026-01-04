/**
 * EDGE FUNCTION: create-payment-intent
 * Créer un PaymentIntent Stripe pour paiement
 * 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentIntentRequest {
  amount: number; // En centimes (ex: 50000 = 500 GNF)
  currency?: string;
  seller_id: string;
  order_id?: string;
  service_id?: string;
  product_id?: string;
  metadata?: Record<string, string>;
}

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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const {
      amount,
      currency = 'gnf',
      seller_id,
      order_id,
      service_id,
      product_id,
      metadata = {}
    }: CreatePaymentIntentRequest = await req.json();

    // Validation
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!seller_id) {
      return new Response(
        JSON.stringify({ error: 'seller_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que le vendeur existe
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller) {
      return new Response(
        JSON.stringify({ error: 'Seller not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (seller.role !== 'VENDOR') {
      return new Response(
        JSON.stringify({ error: 'User is not a vendor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer configuration Stripe
    const { data: config, error: configError } = await supabase
      .from('stripe_config')
      .select('*')
      .limit(1)
      .single();

    if (configError || !config) {
      console.error('Stripe config not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Stripe configuration not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || config.stripe_secret_key;
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Calculer commission plateforme
    const commissionRate = config.platform_commission_rate;
    const commissionAmount = Math.round((amount * commissionRate) / 100);
    const sellerNetAmount = amount - commissionAmount;

    // Créer PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        buyer_id: user.id,
        seller_id: seller_id,
        order_id: order_id || '',
        service_id: service_id || '',
        product_id: product_id || '',
        commission_rate: commissionRate.toString(),
        commission_amount: commissionAmount.toString(),
        seller_net_amount: sellerNetAmount.toString(),
        platform: '224SOLUTIONS',
        ...metadata
      },
    });

    console.log('✅ PaymentIntent created:', paymentIntent.id);

    // Enregistrer transaction dans DB
    const { data: transaction, error: transactionError } = await supabase
      .from('stripe_transactions')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        buyer_id: user.id,
        seller_id: seller_id,
        amount: amount,
        currency: currency.toUpperCase(),
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_net_amount: sellerNetAmount,
        status: 'PENDING',
        order_id: order_id,
        service_id: service_id,
        product_id: product_id,
        payment_method: 'card',
        metadata: metadata,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Error creating transaction:', transactionError);
      // Ne pas bloquer le paiement, mais logger l'erreur
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        transaction_id: transaction?.id,
        amount: amount,
        currency: currency,
        commission_amount: commissionAmount,
        seller_net_amount: sellerNetAmount,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in create-payment-intent:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: 'Payment intent creation failed', 
        details: message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
