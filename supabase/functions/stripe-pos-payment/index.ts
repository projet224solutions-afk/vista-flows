/**
 * STRIPE POS PAYMENT - Paiement carte bancaire POS
 * Edge Function pour créer un Payment Intent avec enregistrement dans stripe_transactions
 * 
 * LOGIQUE MARKETPLACE:
 * 1. L'argent est encaissé sur le compte Stripe 224Solutions
 * 2. La commission est calculée et retenue
 * 3. Le wallet vendeur est crédité du montant NET (via webhook)
 * 4. Le payout réel se fait plus tard (manuel ou automatique)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-POS] ${step}${detailsStr}`);
};

// Taux de commission par défaut (2.5%)
const DEFAULT_COMMISSION_RATE = 2.5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // Vérifier l'authentification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Non autorisé");
    }
    logStep("User authenticated", { userId: user.id });

    // Récupérer les données
    const { 
      amount, 
      currency = 'gnf', 
      orderId, 
      description,
      sellerId: rawSellerId,
      commissionRate = DEFAULT_COMMISSION_RATE
    } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Montant invalide");
    }

    if (!rawSellerId) {
      throw new Error("Seller ID requis");
    }

    // Résoudre le sellerId - il peut être un user_id UUID ou un public_id/custom_id
    let sellerId = rawSellerId;
    
    // Si ce n'est pas un UUID valide, chercher par public_id ou custom_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rawSellerId)) {
      logStep("Resolving seller by public_id/custom_id", { rawSellerId });
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const normalizedId = rawSellerId.trim().toUpperCase();
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`public_id.eq.${normalizedId},custom_id.eq.${normalizedId}`)
        .maybeSingle();
      
      if (profileError || !profileData) {
        logStep("Error resolving seller", { error: profileError?.message });
        throw new Error("Vendeur introuvable avec cet ID");
      }
      
      sellerId = profileData.id;
      logStep("Seller resolved", { originalId: rawSellerId, resolvedId: sellerId });
    }

    // ✅ Commission payée par le CLIENT
    // - amount = montant produit (base)
    // - commissionAmount = frais plateforme
    // - totalAmount = montant total facturé au client
    // - sellerNetAmount = montant reversé au vendeur (montant produit)
    const commissionAmount = Math.round(amount * (commissionRate / 100));
    const totalAmount = amount + commissionAmount;
    const sellerNetAmount = amount;

    logStep("Payment details", {
      productAmount: amount,
      commissionRate,
      commissionAmount,
      totalAmount,
      sellerNetAmount,
      orderId,
    });

    // Initialiser Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount), // GNF n'a pas de centimes
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        order_id: orderId || '',
        buyer_id: user.id,
        seller_id: sellerId,
        product_amount: amount.toString(),
        commission_rate: commissionRate.toString(),
        commission_amount: commissionAmount.toString(),
        total_amount: totalAmount.toString(),
        seller_net_amount: sellerNetAmount.toString(),
        source: 'pos',
        description: description || 'Paiement POS 224Solutions',
      },
    });

    logStep("Payment Intent created", { 
      id: paymentIntent.id, 
      status: paymentIntent.status 
    });

    // Enregistrer dans stripe_transactions avec admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: transaction, error: insertError } = await supabaseAdmin
      .from('stripe_transactions')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        buyer_id: user.id,
        seller_id: sellerId,
        amount: totalAmount, // ✅ total facturé au client
        currency: currency.toUpperCase(),
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_net_amount: sellerNetAmount, // ✅ montant reversé au vendeur
        status: 'PENDING',
        order_id: orderId || null,
        payment_method: 'card',
        metadata: {
          description: description || 'Paiement POS',
          source: 'pos',
          created_by: user.id,
          product_amount: amount,
          total_amount: totalAmount,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      logStep("Error inserting transaction", { error: insertError.message });
      // On continue quand même, le webhook traitera
    } else {
      logStep("Transaction recorded", { transactionId: transaction?.id });
    }

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        transactionId: transaction?.id,

        // Compat UI
        commissionRate,
        commissionAmount,
        sellerNetAmount,

        // Infos supplémentaires
        productAmount: amount,
        totalAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
