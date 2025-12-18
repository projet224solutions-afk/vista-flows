import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CARD-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    logStep("Stripe key verified");

    const body = await req.json();
    const { 
      amount, 
      currency = "gnf", 
      description, 
      customer_email,
      customer_name,
      metadata = {},
      success_url,
      cancel_url,
      payment_type = "checkout" // "checkout" ou "payment_intent"
    } = body;

    logStep("Request body parsed", { amount, currency, payment_type, customer_email });

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Créer un client Supabase pour récupérer l'utilisateur si connecté
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    let userEmail = customer_email;
    let userId = null;

    // Vérifier si l'utilisateur est authentifié
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userEmail = userData.user.email || customer_email;
        userId = userData.user.id;
        logStep("User authenticated", { userId, email: userEmail });
      }
    }

    // Vérifier si le client Stripe existe déjà
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { customerId });
      }
    }

    if (payment_type === "checkout") {
      // Créer une session Checkout Stripe
      const origin = req.headers.get("origin") || "https://your-app.lovable.app";
      
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description || "Paiement",
                description: `Paiement de ${amount.toLocaleString()} ${currency.toUpperCase()}`,
              },
              unit_amount: Math.round(amount), // GNF n'a pas de centimes
            },
            quantity: 1,
          },
        ],
        success_url: success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${origin}/payment-canceled`,
        metadata: {
          ...metadata,
          user_id: userId || "guest",
          original_amount: amount.toString(),
          currency: currency,
        },
      };

      // Ajouter le client si existant
      if (customerId) {
        sessionParams.customer = customerId;
      } else if (userEmail) {
        sessionParams.customer_email = userEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      logStep("Checkout session created", { sessionId: session.id, url: session.url });

      return new Response(
        JSON.stringify({
          success: true,
          session_id: session.id,
          payment_url: session.url,
          type: "checkout",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Créer un PaymentIntent pour une intégration personnalisée
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
        payment_method_types: ["card"],
        description: description || "Paiement par carte",
        metadata: {
          ...metadata,
          user_id: userId || "guest",
        },
      };

      if (customerId) {
        paymentIntentParams.customer = customerId;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      logStep("PaymentIntent created", { 
        paymentIntentId: paymentIntent.id, 
        clientSecret: paymentIntent.client_secret?.substring(0, 20) + "..." 
      });

      return new Response(
        JSON.stringify({
          success: true,
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          type: "payment_intent",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
