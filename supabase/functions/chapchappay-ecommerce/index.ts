import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ChapChapPay API - Documentation: https://chapchappay.com/guide/
// NOTE: The public guide states POST /api/ecommerce/operation, but our live calls
// currently return 405 for POST. This function automatically falls back to GET
// (with query params) if POST is not allowed.
const CCP_API_URL = "https://chapchappay.com";

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

const buildQueryUrl = (base: string, data: Record<string, unknown>) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    // ChapChapPay expects snake_case keys (amount, order_id, notify_url, ...)
    params.set(k, String(v));
  }
  return `${base}?${params.toString()}`;
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
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: EcommercePaymentRequest = await req.json();

    logStep("Request received", {
      amount: body.amount,
      orderId: body.orderId,
    });

    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Montant invalide" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // According to guide: POST /api/ecommerce/operation with { amount }
    // Optional: order_id, notify_url, return_url, description
    const paymentData: Record<string, unknown> = {
      amount: body.amount,
    };

    if (body.orderId) paymentData.order_id = body.orderId;
    if (body.notifyUrl) paymentData.notify_url = body.notifyUrl;
    if (body.returnUrl) paymentData.return_url = body.returnUrl;
    if (body.description) paymentData.description = body.description;

    const endpointBase = `${CCP_API_URL}/api/ecommerce/operation`;

    logStep("Calling ChapChapPay API", {
      endpoint: endpointBase,
      amount: body.amount,
      apiKeyPrefix: apiKey.substring(0, 8),
      payload: paymentData,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "CCP-Api-Key": apiKey,
      // Defensive duplicates (some backends incorrectly treat header names as case-sensitive)
      "CCP-API-KEY": apiKey,
      "User-Agent": "Vista-Flows/1.0",
    };

    // Attempt #1: POST JSON body (as per docs)
    let response = await fetch(endpointBase, {
      method: "POST",
      headers,
      body: JSON.stringify(paymentData),
    });

    // Attempt #2: if POST is not allowed, fall back to GET with query params
    if (response.status === 405) {
      const endpointGet = buildQueryUrl(endpointBase, paymentData);
      logStep("POST not allowed, retrying with GET", {
        endpoint: endpointGet.substring(0, 300),
      });

      response = await fetch(endpointGet, {
        method: "GET",
        headers: {
          ...headers,
          // No body for GET
          "Content-Type": "application/json",
        },
      });
    }

    const responseText = await response.text();
    logStep("ChapChapPay response", {
      status: response.status,
      allow: response.headers.get("allow"),
      body: responseText.substring(0, 500),
    });

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      logStep("❌ Failed to parse response", { raw: responseText.substring(0, 200) });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erreur de réponse du service",
          details: responseText.substring(0, 200),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!response.ok || result?.error) {
      const duration = Date.now() - startTime;
      logStep("❌ ChapChapPay error", {
        status: response.status,
        error: result?.error || result?.message,
        duration,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: result?.error || result?.message || "Échec de création du paiement",
          details: result,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const duration = Date.now() - startTime;
    logStep("✅ Payment created", {
      operationId: result.operation_id,
      paymentUrl: result.payment_url,
      duration,
    });

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
        paymentMethods: result.payment_methods,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Erreur interne";

    logStep("❌ ERROR", { message: errorMessage, duration });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
