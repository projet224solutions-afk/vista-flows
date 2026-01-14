import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ChapChapPay API - Documentation: https://chapchappay.com/guide/
const CCP_API_URL = "https://chapchappay.com/api";

interface EcommercePaymentRequest {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
  notifyUrl?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [CCP-ECOM] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    logStep("E-Commerce payment started");

    const apiKey = Deno.env.get("CCP_API_KEY");
    
    if (!apiKey) {
      logStep("❌ CCP_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Service de paiement non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EcommercePaymentRequest = await req.json();
    
    logStep("Request received", {
      amount: body.amount,
      orderId: body.orderId
    });

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Montant invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // According to documentation: POST /api/ecommerce/operation with { amount: number }
    const paymentData: Record<string, unknown> = {
      amount: body.amount
    };

    // Optional fields
    if (body.orderId) {
      paymentData.order_id = body.orderId;
    }
    if (body.notifyUrl) {
      paymentData.notify_url = body.notifyUrl;
    }
    if (body.returnUrl) {
      paymentData.return_url = body.returnUrl;
    }
    if (body.description) {
      paymentData.description = body.description;
    }

    logStep("Calling ChapChapPay API", { endpoint: "/ecommerce/operation", amount: body.amount });

    const response = await fetch(`${CCP_API_URL}/ecommerce/operation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CCP-Api-Key": apiKey
      },
      body: JSON.stringify(paymentData)
    });

    const responseText = await response.text();
    logStep("ChapChapPay response", { status: response.status, body: responseText.substring(0, 500) });

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      logStep("❌ Failed to parse response", { raw: responseText.substring(0, 200) });
      return new Response(
        JSON.stringify({ success: false, error: "Erreur de réponse du service", details: responseText.substring(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok || result.error) {
      const duration = Date.now() - startTime;
      logStep("❌ ChapChapPay error", { 
        status: response.status,
        error: result.error || result.message,
        duration 
      });
      return new Response(
        JSON.stringify({ success: false, error: result.error || result.message || "Échec de création du paiement" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const duration = Date.now() - startTime;
    logStep("✅ Payment created", { 
      operationId: result.operation_id,
      paymentUrl: result.payment_url,
      duration 
    });

    // Response format from documentation:
    // {
    //   "business_name": "Ma Boutique",
    //   "operation_id": "2db401d7-cad3-449f-9e3e-ec2cf9e48472",
    //   "order_id": "ORD12345",
    //   "amount": 10000,
    //   "amount_formatted": "10 000 GNF",
    //   "payment_url": "https://chapchappay.com/pay/...",
    //   "payment_methods": ["paycard", "orange_money", "mtn_momo"]
    // }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.operation_id,
        paymentUrl: result.payment_url,
        orderId: result.order_id || body.orderId,
        amount: result.amount || body.amount,
        amountFormatted: result.amount_formatted,
        currency: "GNF",
        businessName: result.business_name,
        paymentMethods: result.payment_methods
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
