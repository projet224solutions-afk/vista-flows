import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CCP_API_URL = "https://api.chapchappay.com";

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

    const { transactionId, orderId } = await req.json();
    
    if (!transactionId && !orderId) {
      return new Response(
        JSON.stringify({ success: false, error: "transactionId or orderId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔍 [ChapChapPay Status] Checking:", { transactionId, orderId });

    const queryParam = transactionId 
      ? `transaction_id=${transactionId}` 
      : `order_id=${orderId}`;

    const response = await fetch(`${CCP_API_URL}/v1/transaction/status?${queryParam}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "CCP-Api-Key": apiKey
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ ChapChapPay status error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || "Status check failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [ChapChapPay Status] Result:", result);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.transaction_id,
        orderId: result.order_id,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        paymentMethod: result.payment_method,
        createdAt: result.created_at,
        completedAt: result.completed_at
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [ChapChapPay Status] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
