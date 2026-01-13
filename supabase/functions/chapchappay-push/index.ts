import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CCP_API_URL = "https://api.chapchappay.com";

interface PushPaymentRequest {
  amount: number;
  currency?: string;
  paymentMethod: "orange_money" | "mtn_momo" | "paycard";
  recipientPhone: string;
  recipientName?: string;
  description?: string;
  orderId?: string;
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

    const body: PushPaymentRequest = await req.json();
    
    console.log("📤 [ChapChapPay PUSH] Sending money:", {
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      recipientPhone: body.recipientPhone?.slice(-4)
    });

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.recipientPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "Recipient phone required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.paymentMethod) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment method required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = body.orderId || `PUSH-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Generate HMAC signature
    const signatureData = `${orderId}${body.amount}${timestamp}`;
    const signature = generateSignature(signatureData, encryptionKey);

    const paymentData = {
      amount: body.amount,
      currency: body.currency || "GNF",
      payment_method: body.paymentMethod,
      recipient_phone: body.recipientPhone,
      recipient_name: body.recipientName,
      description: body.description || "Transfert PUSH",
      order_id: orderId,
      timestamp: timestamp
    };

    const response = await fetch(`${CCP_API_URL}/v1/push/send`, {
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
      console.error("❌ ChapChapPay PUSH error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || "Transfer failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [ChapChapPay PUSH] Transfer completed:", result);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: result.transaction_id,
        status: result.status,
        orderId: orderId,
        amount: body.amount,
        message: result.message
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [ChapChapPay PUSH] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
