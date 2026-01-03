import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [DJOMY-WEBHOOK-SECURE] ${step}${detailsStr}`);
};

// Verify HMAC signature from Djomy webhook
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Signature format from Djomy: v1:signature
    const signatureParts = signature.split(":");
    if (signatureParts.length !== 2 || signatureParts[0] !== "v1") {
      logStep("Invalid signature format", { signatureParts });
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
    logStep("Signature verification", { isValid, providedLength: providedSignature.length });
    
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

  const startTime = Date.now();
  
  try {
    logStep("Webhook received", {
      method: req.method,
      url: req.url,
      contentType: req.headers.get("content-type"),
    });

    const clientSecret = Deno.env.get("DJOMY_CLIENT_SECRET")?.trim();
    
    // Get signature from header
    const webhookSignature = req.headers.get("X-Webhook-Signature");
    const sourceIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip");
    
    logStep("Webhook headers", { 
      hasSignature: !!webhookSignature,
      sourceIp,
    });

    // Get raw body for signature verification
    const rawBody = await req.text();
    logStep("Webhook body received", { bodyLength: rawBody.length });

    // Verify signature if provided
    let signatureValid = false;
    if (webhookSignature && clientSecret) {
      signatureValid = await verifyWebhookSignature(rawBody, webhookSignature, clientSecret);
      if (!signatureValid) {
        logStep("SECURITY: Invalid webhook signature - rejecting");
        
        // Log failed attempt
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        
        await supabaseAdmin
          .from("djomy_webhook_logs")
          .insert({
            event_type: "SIGNATURE_INVALID",
            payload: { raw: rawBody.substring(0, 500) },
            signature_valid: false,
            ip_address: sourceIp,
            error_message: "Invalid webhook signature",
          });

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
    } = payload;

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check for duplicate webhook (idempotency)
    if (eventId) {
      const { data: existingLog } = await supabaseAdmin
        .from("djomy_webhook_logs")
        .select("id, processed")
        .eq("event_id", eventId)
        .single();

      if (existingLog?.processed) {
        logStep("Duplicate webhook - already processed", { eventId });
        return new Response(
          JSON.stringify({ success: true, message: "Already processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Log webhook event
    const { data: webhookLog, error: logError } = await supabaseAdmin
      .from("djomy_webhook_logs")
      .insert({
        event_id: eventId,
        event_type: eventType,
        transaction_id: data?.transactionId,
        payload: payload,
        signature_valid: signatureValid,
        ip_address: sourceIp,
        processed: false,
      })
      .select()
      .single();

    if (logError) {
      logStep("Webhook log error", { error: logError.message });
    }

    // Map Djomy event types to our status
    const statusMap: Record<string, string> = {
      "payment.created": "PROCESSING",
      "payment.redirected": "PROCESSING",
      "payment.pending": "PROCESSING",
      "payment.success": "SUCCESS",
      "payment.failed": "FAILED",
      "payment.cancelled": "CANCELLED",
    };

    const internalStatus = statusMap[eventType] || "PROCESSING";
    logStep("Status mapping", { eventType, internalStatus });

    // Find and update transaction
    if (data?.transactionId) {
      // Find by djomy_transaction_id
      const { data: transaction, error: findError } = await supabaseAdmin
        .from("djomy_transactions")
        .select("*")
        .eq("djomy_transaction_id", data.transactionId)
        .single();

      if (findError || !transaction) {
        // Try by merchantPaymentReference (our order_id)
        const { data: txByOrder } = await supabaseAdmin
          .from("djomy_transactions")
          .select("*")
          .eq("order_id", data.merchantPaymentReference)
          .single();

        if (!txByOrder) {
          logStep("Transaction not found", { 
            djomyId: data.transactionId,
            orderRef: data.merchantPaymentReference 
          });
          
          // Mark webhook as processed anyway
          await supabaseAdmin
            .from("djomy_webhook_logs")
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString(),
              error_message: "Transaction not found"
            })
            .eq("id", webhookLog?.id);

          return new Response(
            JSON.stringify({ success: true, message: "Transaction not found but logged" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }

      const tx = transaction || (await supabaseAdmin
        .from("djomy_transactions")
        .select("*")
        .eq("order_id", data.merchantPaymentReference)
        .single()).data;

      if (tx) {
        // Update transaction
        const updateData: Record<string, unknown> = {
          status: internalStatus,
          djomy_response: payload,
          updated_at: new Date().toISOString(),
        };

        if (data.paidAmount) updateData.received_amount = data.paidAmount;
        if (data.fees) updateData.fees = data.fees;
        if (internalStatus === "SUCCESS" || internalStatus === "FAILED" || internalStatus === "CANCELLED") {
          updateData.completed_at = new Date().toISOString();
        }

        await supabaseAdmin
          .from("djomy_transactions")
          .update(updateData)
          .eq("id", tx.id);

        logStep("Transaction updated", { txId: tx.id, status: internalStatus });

        // If SUCCESS, process blocked funds or wallet credit
        if (eventType === "payment.success") {
          logStep("Processing successful payment", { 
            txId: tx.id, 
            amount: data.paidAmount || data.receivedAmount || tx.amount,
            vendorId: tx.vendor_id 
          });

          // Call the stored procedure to handle funds
          const { data: result, error: procError } = await supabaseAdmin.rpc(
            "process_djomy_success",
            {
              p_transaction_id: tx.id,
              p_djomy_response: payload,
            }
          );

          if (procError) {
            logStep("Process success error", { error: procError.message });
          } else {
            logStep("Process success result", { result });
          }
        }
      }
    }

    // Mark webhook as processed
    await supabaseAdmin
      .from("djomy_webhook_logs")
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq("id", webhookLog?.id);

    const duration = Date.now() - startTime;
    logStep("Webhook processed successfully", { duration });

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;
    
    logStep("ERROR processing webhook", { message: errorMessage, duration });
    
    // Still return 200 to prevent Djomy from retrying indefinitely
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
