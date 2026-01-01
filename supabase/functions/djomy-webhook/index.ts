import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[DJOMY-WEBHOOK] ${step}${detailsStr}`);
};

// Verify HMAC signature from webhook
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Signature format: v1:signature
    const signatureParts = signature.split(":");
    if (signatureParts.length !== 2 || signatureParts[0] !== "v1") {
      logStep("Invalid signature format");
      return false;
    }
    
    const providedSignature = signatureParts[1];
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    
    const isValid = computedSignature === providedSignature;
    logStep("Signature verification", { isValid });
    
    return isValid;
  } catch (error) {
    logStep("Signature verification error", { error: String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const clientSecret = Deno.env.get("JOMY_CLIENT_SECRET");
    if (!clientSecret) {
      logStep("Client secret not configured");
      // Still process but log warning
    }

    // Get signature from header
    const webhookSignature = req.headers.get("X-Webhook-Signature");
    logStep("Webhook signature header", { hasSignature: !!webhookSignature });

    // Get raw body for signature verification
    const rawBody = await req.text();
    logStep("Webhook payload received", { bodyLength: rawBody.length });

    // Verify signature if provided
    if (webhookSignature && clientSecret) {
      const isValid = await verifyWebhookSignature(rawBody, webhookSignature, clientSecret);
      if (!isValid) {
        logStep("Invalid webhook signature - rejecting");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    logStep("Webhook payload parsed", {
      eventType: payload.eventType,
      eventId: payload.eventId,
      transactionId: payload.data?.transactionId,
      status: payload.data?.status,
    });

    const {
      eventType,
      eventId,
      data,
      paymentLinkReference,
      timestamp,
      message,
    } = payload;

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Map Djomy status to our internal status
    const statusMap: Record<string, string> = {
      "payment.created": "created",
      "payment.redirected": "redirected",
      "payment.pending": "pending",
      "payment.success": "completed",
      "payment.failed": "failed",
      "payment.cancelled": "cancelled",
    };

    const internalStatus = statusMap[eventType] || "unknown";
    logStep("Status mapped", { eventType, internalStatus });

    // Update payment record in database
    if (data?.transactionId) {
      const { error: updateError } = await supabaseAdmin
        .from("djomy_payments")
        .update({
          status: internalStatus,
          paid_amount: data.paidAmount,
          received_amount: data.receivedAmount,
          fees: data.fees,
          webhook_event_id: eventId,
          webhook_received_at: new Date().toISOString(),
          response_data: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", data.transactionId);

      if (updateError) {
        logStep("Database update error", { error: updateError.message });
      } else {
        logStep("Payment record updated");
      }

      // If payment is successful, update related order/wallet
      if (eventType === "payment.success" && data.paidAmount) {
        logStep("Payment successful - processing completion", {
          transactionId: data.transactionId,
          amount: data.paidAmount,
        });

        // Get the payment record to find the user and order
        const { data: paymentRecord, error: fetchError } = await supabaseAdmin
          .from("djomy_payments")
          .select("user_id, order_id")
          .eq("transaction_id", data.transactionId)
          .single();

        if (!fetchError && paymentRecord) {
          // Update wallet balance if user exists
          if (paymentRecord.user_id) {
            const { data: wallet, error: walletError } = await supabaseAdmin
              .from("wallets")
              .select("id, balance")
              .eq("user_id", paymentRecord.user_id)
              .single();

            if (!walletError && wallet) {
              // Create wallet transaction
              await supabaseAdmin
                .from("wallet_transactions")
                .insert({
                  wallet_id: wallet.id,
                  user_id: paymentRecord.user_id,
                  type: "deposit",
                  amount: data.receivedAmount || data.paidAmount,
                  description: `Recharge via Djomy - ${data.paymentMethod || "Mobile Money"}`,
                  status: "completed",
                  reference: data.transactionId,
                  metadata: {
                    provider: "djomy",
                    payment_method: data.paymentMethod,
                    fees: data.fees,
                    payer_identifier: data.payerIdentifier,
                  },
                });

              logStep("Wallet transaction created");
            }
          }

          // Update order status if applicable
          if (paymentRecord.order_id) {
            await supabaseAdmin
              .from("orders")
              .update({
                payment_status: "paid",
                updated_at: new Date().toISOString(),
              })
              .eq("id", paymentRecord.order_id);

            logStep("Order updated to paid");
          }
        }
      }
    }

    // Log webhook event
    await supabaseAdmin
      .from("djomy_webhook_logs")
      .insert({
        event_id: eventId,
        event_type: eventType,
        transaction_id: data?.transactionId,
        payload: payload,
        processed_at: new Date().toISOString(),
      });

    logStep("Webhook processed successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { message: errorMessage });
    
    // Still return 200 to prevent Djomy from retrying
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
