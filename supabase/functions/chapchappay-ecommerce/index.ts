import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CCP_API_URL = "https://api.chapchappay.com";

interface EcommercePaymentRequest {
  amount: number;
  currency?: string;
  description?: string;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CCP_API_KEY");
    
    if (!apiKey) {
      console.error("❌ CCP_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EcommercePaymentRequest = await req.json();
    
    console.log("🛒 [ChapChapPay E-Commerce] Creating payment:", {
      amount: body.amount,
      currency: body.currency || "GNF",
      orderId: body.orderId
    });

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create E-Commerce payment session
    const paymentData = {
      amount: body.amount,
      currency: body.currency || "GNF",
      description: body.description || "Paiement",
      order_id: body.orderId || `ORDER-${Date.now()}`,
      customer_name: body.customerName,
      customer_phone: body.customerPhone,
      return_url: body.returnUrl || "https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/chapchappay-webhook",
      cancel_url: body.cancelUrl,
      webhook_url: body.webhookUrl || "https://uakkxaibujzxdiqzpnpr.supabase.co/functions/v1/chapchappay-webhook"
    };

    const response = await fetch(`${CCP_API_URL}/v1/ecommerce/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CCP-Api-Key": apiKey
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ ChapChapPay API error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || "Payment creation failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [ChapChapPay E-Commerce] Payment created:", result);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.transaction_id,
        paymentUrl: result.payment_url,
        orderId: paymentData.order_id,
        amount: body.amount,
        currency: paymentData.currency
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [ChapChapPay E-Commerce] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
