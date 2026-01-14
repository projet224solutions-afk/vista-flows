import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CinetPay API configuration
const CINETPAY_API_URL = "https://api-checkout.cinetpay.com/v2/payment";

interface PullPaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod: "orange_money" | "mtn_momo" | "paycard" | "card";
  customerPhone: string;
  customerName?: string;
  description?: string;
  orderId?: string;
  useSandbox?: boolean;
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

    // Get CinetPay credentials
    const apiKey = Deno.env.get("CINETPAY_API_KEY");
    const siteId = Deno.env.get("CINETPAY_SITE_ID");
    const notifyUrl = Deno.env.get("CINETPAY_NOTIFY_URL") || Deno.env.get("SUPABASE_URL") + "/functions/v1/chapchappay-webhook";
    
    if (!apiKey || !siteId) {
      logStep("❌ CinetPay credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PullPaymentRequest = await req.json();
    logStep("Request received", { 
      amount: body.amount, 
      paymentMethod: body.paymentMethod,
      useSandbox: body.useSandbox || false
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

    logStep("Input validated", { 
      amount: body.amount, 
      paymentMethod: body.paymentMethod, 
      phone: body.customerPhone.slice(0, 6) + "..." 
    });

    // Initialize Supabase client for auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        logStep("User authenticated", { userId });
      }
    }

    // Generate unique transaction ID
    const transactionId = body.orderId || `PULL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Clean phone number - remove spaces and ensure proper format
    let cleanPhone = body.customerPhone.replace(/\s/g, "").replace(/^\+/, "");
    
    // Map payment method to CinetPay channel
    // For mobile money, use MOBILE_MONEY channel
    const channels = body.paymentMethod === "card" || body.paymentMethod === "paycard" 
      ? "CREDIT_CARD" 
      : "MOBILE_MONEY";

    // Prepare CinetPay payment payload with ALL required fields
    const cinetPayPayload = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
      amount: body.amount,
      currency: body.currency || "GNF",
      channels: channels, // REQUIRED: MOBILE_MONEY, CREDIT_CARD, WALLET, or ALL
      description: body.description || `Paiement Mobile Money - ${transactionId}`,
      notify_url: notifyUrl,
      return_url: notifyUrl,
      customer_name: body.customerName || "Client",
      customer_surname: body.customerName?.split(" ")[1] || "224Solutions",
      customer_email: "client@224solutions.com",
      customer_phone_number: cleanPhone,
      customer_address: "Conakry",
      customer_city: "Conakry",
      customer_country: "GN",
      customer_state: "GN",
      customer_zip_code: "00224",
      // Lock phone to prevent modification
      lock_phone_number: true,
      // Metadata
      metadata: JSON.stringify({
        userId: userId,
        paymentMethod: body.paymentMethod,
        orderId: body.orderId,
        source: "chapchappay-pull"
      })
    };

    logStep("CinetPay payload prepared", { 
      transactionId,
      amount: body.amount,
      currency: cinetPayPayload.currency,
      channels: channels,
      phone: cleanPhone.slice(0, 6) + "..."
    });

    // Call CinetPay API
    const response = await fetch(CINETPAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cinetPayPayload),
    });

    const responseText = await response.text();
    logStep("CinetPay response", { status: response.status, body: responseText.substring(0, 500) });

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      logStep("❌ Failed to parse CinetPay response");
      return new Response(
        JSON.stringify({ success: false, error: "Erreur de réponse du service de paiement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for CinetPay error codes
    if (result.code && result.code !== "201") {
      const duration = Date.now() - startTime;
      logStep("❌ CinetPay error", { 
        code: result.code, 
        message: result.message,
        description: result.description,
        duration 
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || "Échec de l'initialisation du paiement",
          details: result.description
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - extract payment URL and data
    const paymentUrl = result.data?.payment_url;
    const paymentToken = result.data?.payment_token;

    const duration = Date.now() - startTime;
    logStep("✅ Payment initialized", { 
      transactionId,
      hasPaymentUrl: !!paymentUrl,
      duration 
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transactionId,
        paymentUrl: paymentUrl,
        paymentToken: paymentToken,
        status: "PENDING",
        orderId: body.orderId,
        amount: body.amount,
        currency: body.currency || "GNF",
        requiresOtp: false, // CinetPay handles OTP internally
        message: "Paiement initialisé - Suivez le lien pour compléter"
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
