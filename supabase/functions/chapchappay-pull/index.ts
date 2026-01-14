import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ChapChapPay API - Documentation: https://chapchappay.com/guide/
const CCP_API_URL = "https://chapchappay.com/api";

interface PullPaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod: "orange_money" | "mtn_momo" | "paycard" | "card";
  customerPhone: string;
  customerName?: string;
  description?: string;
  orderId?: string;
  notifyUrl?: string;
}

/**
 * Generate HMAC-SHA256 signature as required by ChapChapPay
 */
async function generateHmacSignature(data: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
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

    // Get ChapChapPay API credentials
    const apiKey = Deno.env.get("CCP_API_KEY");
    const encryptionKey = Deno.env.get("CCP_ENCRYPTION_KEY");
    
    if (!apiKey) {
      logStep("❌ CCP_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Service de paiement non configuré (API Key manquante)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!encryptionKey) {
      logStep("❌ CCP_ENCRYPTION_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Service de paiement non configuré (Clé HMAC manquante)" }),
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

    // Clean phone number - format for Guinea (224)
    let cleanPhone = body.customerPhone.replace(/\s/g, "").replace(/^\+/, "");
    if (!cleanPhone.startsWith("224")) {
      cleanPhone = "224" + cleanPhone;
    }
    
    // Generate unique order ID
    const orderId = body.orderId || `PULL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    logStep("Input validated", { 
      amount: body.amount, 
      paymentMethod: body.paymentMethod, 
      phone: cleanPhone.slice(0, 6) + "...",
      orderId
    });

    // Prepare ChapChapPay PULL payment payload
    const paymentData = {
      amount: body.amount,
      phone: cleanPhone,
      method: body.paymentMethod, // orange_money, mtn_momo, paycard
      order_id: orderId,
      description: body.description || `Paiement - ${orderId}`,
      notify_url: body.notifyUrl || Deno.env.get("SUPABASE_URL") + "/functions/v1/chapchappay-webhook"
    };

    // Generate HMAC signature for the request
    // The signature is typically calculated on a canonical string of the request data
    const signatureData = `${paymentData.amount}${paymentData.phone}${paymentData.order_id}${timestamp}`;
    const hmacSignature = await generateHmacSignature(signatureData, encryptionKey);

    logStep("ChapChapPay payload prepared", { 
      orderId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      hasSignature: !!hmacSignature
    });

    // Call ChapChapPay PULL API
    const response = await fetch(`${CCP_API_URL}/pull/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CCP-Api-Key": apiKey,
        "CCP-HMAC-Signature": hmacSignature,
        "CCP-Timestamp": timestamp
      },
      body: JSON.stringify(paymentData),
    });

    const responseText = await response.text();
    logStep("ChapChapPay response", { status: response.status, body: responseText.substring(0, 500) });

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      logStep("❌ Failed to parse ChapChapPay response", { raw: responseText.substring(0, 200) });
      return new Response(
        JSON.stringify({ success: false, error: "Erreur de réponse du service de paiement", details: responseText.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for errors
    if (!response.ok || result.error || result.status === "error") {
      const duration = Date.now() - startTime;
      logStep("❌ ChapChapPay error", { 
        status: response.status,
        error: result.error || result.message,
        duration 
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || result.message || "Échec de l'initialisation du paiement",
          details: result
        }),
        { status: response.status >= 400 ? response.status : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const duration = Date.now() - startTime;
    logStep("✅ Payment initialized", { 
      operationId: result.operation_id,
      orderId,
      duration 
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.operation_id || result.transaction_id,
        paymentUrl: result.payment_url,
        status: result.status || "PENDING",
        orderId: orderId,
        amount: body.amount,
        currency: "GNF",
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
