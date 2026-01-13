import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CCP_API_URL = "https://api.chapchappay.com";

interface PullPaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod: "orange_money" | "mtn_momo" | "paycard" | "card";
  customerPhone: string;
  customerName?: string;
  description?: string;
  orderId?: string;
  otp?: string; // Required for some payment methods
}

function generateSignature(data: string, secretKey: string): string {
  const hmac = createHmac("sha256", secretKey);
  hmac.update(data);
  return hmac.digest("hex");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CCP_API_KEY");
    const encryptionKey = Deno.env.get("CCP_ENCRYPTION_KEY");
    
    if (!apiKey || !encryptionKey) {
      console.error("❌ CCP API keys not configured");
      return new Response(
        JSON.stringify({ success: false, error: "API keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PullPaymentRequest = await req.json();
    
    console.log("📥 [ChapChapPay PULL] Initiating payment:", {
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      phone: body.customerPhone?.slice(-4)
    });

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.customerPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "Customer phone required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.paymentMethod) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment method required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = body.orderId || `PULL-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Generate HMAC signature
    const signatureData = `${orderId}${body.amount}${timestamp}`;
    const signature = generateSignature(signatureData, encryptionKey);

    const paymentData = {
      amount: body.amount,
      currency: body.currency || "GNF",
      payment_method: body.paymentMethod,
      customer_phone: body.customerPhone,
      customer_name: body.customerName,
      description: body.description || "Paiement PULL",
      order_id: orderId,
      otp: body.otp,
      timestamp: timestamp
    };

    const response = await fetch(`${CCP_API_URL}/v1/pull/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CCP-Api-Key": apiKey,
        "CCP-Signature": signature,
        "CCP-Timestamp": timestamp
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ ChapChapPay PULL error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || "Payment initiation failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [ChapChapPay PULL] Payment initiated:", result);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.transaction_id,
        status: result.status,
        orderId: orderId,
        amount: body.amount,
        requiresOtp: result.requires_otp || false,
        message: result.message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [ChapChapPay PULL] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
