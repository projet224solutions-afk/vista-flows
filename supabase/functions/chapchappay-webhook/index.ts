import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ccp-signature, ccp-timestamp",
};

function verifySignature(payload: string, signature: string, timestamp: string, secretKey: string): boolean {
  const data = `${payload}${timestamp}`;
  const hmac = createHmac("sha256", secretKey);
  hmac.update(data);
  const expectedSignature = hmac.digest("hex");
  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const encryptionKey = Deno.env.get("CCP_ENCRYPTION_KEY");
    
    if (!encryptionKey) {
      console.error("❌ CCP_ENCRYPTION_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signature = req.headers.get("ccp-signature") || req.headers.get("CCP-Signature");
    const timestamp = req.headers.get("ccp-timestamp") || req.headers.get("CCP-Timestamp");
    
    const bodyText = await req.text();
    
    console.log("🔔 [ChapChapPay Webhook] Received:", bodyText);

    // Verify signature if provided
    if (signature && timestamp) {
      const isValid = verifySignature(bodyText, signature, timestamp, encryptionKey);
      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return new Response(
          JSON.stringify({ success: false, error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("✅ Webhook signature verified");
    }

    const payload = JSON.parse(bodyText);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Store the webhook event
    const { error: insertError } = await supabase
      .from("chapchappay_webhooks")
      .insert({
        transaction_id: payload.transaction_id,
        order_id: payload.order_id,
        status: payload.status,
        event_type: payload.event || "payment_update",
        amount: payload.amount,
        currency: payload.currency || "GNF",
        payment_method: payload.payment_method,
        raw_payload: payload
      });

    if (insertError) {
      console.error("❌ Error storing webhook:", insertError);
    } else {
      console.log("✅ Webhook stored in database");
    }

    // Process based on status
    switch (payload.status) {
      case "success":
      case "completed":
        console.log("✅ Payment successful:", payload.transaction_id);
        // You can add custom logic here (update order, send notification, etc.)
        break;
      
      case "failed":
      case "cancelled":
        console.log("❌ Payment failed/cancelled:", payload.transaction_id);
        break;
      
      case "pending":
        console.log("⏳ Payment pending:", payload.transaction_id);
        break;
      
      default:
        console.log("ℹ️ Payment status:", payload.status);
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [ChapChapPay Webhook] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Webhook processing failed";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
