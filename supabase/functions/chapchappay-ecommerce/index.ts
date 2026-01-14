/**
 * 🛒 CHAPCHAPPAY E-COMMERCE - Paiement avec redirection
 * Edge Function pour créer une session de paiement e-commerce
 * 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createChapChapPayClient } from "../_shared/chapchappay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [CCP-ECOM] ${step}${detailsStr}`);
};

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

    const body = await req.json();
    const {
      amount,
      currency = "GNF",
      orderId,
      description,
      customerName,
      customerPhone,
      returnUrl,
      cancelUrl,
      useSandbox = false,
      metadata = {},
    } = body;

    logStep("Request received", { amount, orderId, useSandbox });

    // Validation
    if (!amount || amount <= 0) {
      throw new Error("Montant invalide - doit être supérieur à 0");
    }
    if (!returnUrl) {
      throw new Error("returnUrl requis pour le paiement e-commerce");
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user (optional)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const supabaseAnon = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAnon.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        logStep("User authenticated", { userId });
      }
    }

    // Generate unique order ID
    const finalOrderId = orderId || `CCP-ECOM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create transaction record
    const { data: newTransaction, error: insertError } = await supabaseAdmin
      .from("mobile_money_transactions")
      .insert({
        order_id: finalOrderId,
        user_id: userId,
        amount,
        currency,
        payment_type: "ecommerce",
        status: "pending",
        customer_phone: customerPhone?.replace(/\s/g, ""),
        customer_name: customerName,
        description: description || `Paiement E-Commerce - ${finalOrderId}`,
        provider: "chapchappay",
        metadata: metadata,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      })
      .select()
      .single();

    if (insertError) {
      logStep("DB insert error", { error: insertError.message });
    } else {
      logStep("Transaction created", { id: newTransaction?.id, orderId: finalOrderId });
    }

    // Initialize ChapChapPay client
    const ccpClient = createChapChapPayClient(useSandbox);

    // Get webhook URL
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/chapchappay-webhook`;

    // Call ChapChapPay E-Commerce API
    const ccpResult = await ccpClient.createEcommercePayment({
      amount,
      currency,
      customerPhone,
      customerName,
      description: description || `Paiement 224Solutions - ${finalOrderId}`,
      orderId: finalOrderId,
      returnUrl,
      cancelUrl: cancelUrl || returnUrl,
      webhookUrl,
      metadata,
      paymentMethod: 'orange_money', // Default, user can choose on ChapChapPay page
    });

    logStep("ChapChapPay API response", { 
      success: ccpResult.success, 
      transactionId: ccpResult.transactionId,
      paymentUrl: ccpResult.paymentUrl 
    });

    if (!ccpResult.success) {
      if (newTransaction?.id) {
        await supabaseAdmin
          .from("mobile_money_transactions")
          .update({
            status: "failed",
            error_message: ccpResult.error,
            updated_at: new Date().toISOString(),
          })
          .eq("id", newTransaction.id);
      }

      throw new Error(ccpResult.error || "Erreur ChapChapPay inconnue");
    }

    // Update transaction
    if (newTransaction?.id) {
      await supabaseAdmin
        .from("mobile_money_transactions")
        .update({
          status: "processing",
          provider_transaction_id: ccpResult.transactionId,
          provider_response: ccpResult.data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", newTransaction.id);
    }

    const totalDuration = Date.now() - startTime;
    logStep("✅ E-Commerce session created", { 
      transactionId: newTransaction?.id, 
      ccpId: ccpResult.transactionId,
      totalDuration 
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: newTransaction?.id || ccpResult.transactionId,
        ccpTransactionId: ccpResult.transactionId,
        orderId: finalOrderId,
        paymentUrl: ccpResult.paymentUrl,
        status: "processing",
        message: "Redirection vers la page de paiement ChapChapPay",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;
    
    logStep("❌ ERROR", { message: errorMessage, duration });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
