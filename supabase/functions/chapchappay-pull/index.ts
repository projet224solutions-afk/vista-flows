import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ChapChapPay API - NOT CinetPay
const CCP_API_URL = "https://api.chapchappay.com";

interface PullPaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod: "orange_money" | "mtn_momo" | "paycard" | "card";
  customerPhone: string;
  customerName?: string;
  description?: string;
  orderId?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [CCP-PULL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    logStep("PULL payment started");

    // Get ChapChapPay API key
    const apiKey = Deno.env.get("CCP_API_KEY");
    
    if (!apiKey) {
      logStep("❌ CCP_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Service de paiement non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PullPaymentRequest = await req.json();
    logStep("Request received", { 
      amount: body.amount, 
      paymentMethod: body.paymentMethod
    });

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Montant invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.customerPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "Numéro de téléphone requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.paymentMethod) {
      return new Response(
        JSON.stringify({ success: false, error: "Méthode de paiement requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number
    let cleanPhone = body.customerPhone.replace(/\s/g, "").replace(/^\+/, "");
    
    // Generate unique order ID
    const orderId = body.orderId || `PULL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    logStep("Input validated", { 
      amount: body.amount, 
      paymentMethod: body.paymentMethod, 
      phone: cleanPhone.slice(0, 6) + "...",
      orderId
    });

    // Prepare ChapChapPay PULL payment payload
    const paymentData = {
      amount: body.amount,
      currency: body.currency || "GNF",
      payment_method: body.paymentMethod,
      customer_phone: cleanPhone,
      customer_name: body.customerName || "Client",
      description: body.description || `Paiement Mobile Money - ${orderId}`,
      order_id: orderId,
      webhook_url: Deno.env.get("SUPABASE_URL") + "/functions/v1/chapchappay-webhook"
    };

    logStep("ChapChapPay payload prepared", { 
      orderId,
      amount: body.amount,
      currency: paymentData.currency,
      paymentMethod: body.paymentMethod
    });

    // Call ChapChapPay PULL API
    const response = await fetch(`${CCP_API_URL}/v1/pull/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CCP-Api-Key": apiKey
      },
      body: JSON.stringify(paymentData),
    });

    const responseText = await response.text();
    logStep("ChapChapPay response", { status: response.status, body: responseText.substring(0, 500) });

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      logStep("❌ Failed to parse ChapChapPay response");
      return new Response(
        JSON.stringify({ success: false, error: "Erreur de réponse du service de paiement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for errors
    if (!response.ok || result.error) {
      const duration = Date.now() - startTime;
      logStep("❌ ChapChapPay error", { 
        status: response.status,
        error: result.error || result.message,
        duration 
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || result.message || "Échec de l'initialisation du paiement"
        }),
        { status: response.status >= 400 ? response.status : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const duration = Date.now() - startTime;
    logStep("✅ Payment initialized", { 
      transactionId: result.transaction_id,
      orderId,
      duration 
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.transaction_id,
        paymentUrl: result.payment_url,
        status: result.status || "PENDING",
        orderId: orderId,
        amount: body.amount,
        currency: body.currency || "GNF",
        requiresOtp: result.requires_otp || false,
        message: result.message || "Paiement initialisé avec succès"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Erreur interne";
    
    logStep("❌ ERROR", { message: errorMessage, duration });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
