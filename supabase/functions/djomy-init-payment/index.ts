import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [DJOMY-INIT] ${step}${detailsStr}`);
};

// Generate HMAC-SHA256 signature
async function generateHmacSignature(clientId: string, clientSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(clientSecret);
  const messageData = encoder.encode(clientId);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Get Bearer token from Djomy
async function getAccessToken(clientId: string, clientSecret: string, useSandbox: boolean): Promise<string> {
  const baseUrl = useSandbox 
    ? "https://sandbox-api.djomy.africa" 
    : "https://api.djomy.africa";
  
  const signature = await generateHmacSignature(clientId, clientSecret);
  const xApiKey = `${clientId}:${signature}`;
  
  logStep("Getting access token", { baseUrl, useSandbox });
  
  const startTime = Date.now();
  const response = await fetch(`${baseUrl}/v1/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "224solutions/2.0",
      "X-API-KEY": xApiKey,
    },
    body: JSON.stringify({}),
  });
  
  const duration = Date.now() - startTime;
  const responseText = await response.text();
  
  logStep("Auth response", { status: response.status, duration });
  
  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} - ${responseText}`);
  }
  
  const data = JSON.parse(responseText);
  return data.accessToken;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    logStep("Payment init started");

    // Validate input
    const body = await req.json();
    const {
      amount,
      payerPhone,
      paymentMethod, // OM, MOMO, KULU
      vendorId,
      orderId,
      description,
      countryCode = "GN",
      useSandbox = false,
      idempotencyKey,
    } = body;

    // Input validation
    if (!amount || amount <= 0) {
      throw new Error("Montant invalide");
    }
    if (!payerPhone || payerPhone.length < 8) {
      throw new Error("Numéro de téléphone invalide");
    }
    if (!paymentMethod || !["OM", "MOMO", "KULU"].includes(paymentMethod)) {
      throw new Error("Méthode de paiement invalide (OM, MOMO, KULU)");
    }

    // Get Djomy credentials
    const clientId = Deno.env.get("DJOMY_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("DJOMY_CLIENT_SECRET")?.trim();

    if (!clientId || !clientSecret) {
      throw new Error("Djomy credentials not configured");
    }

    // Initialize Supabase clients
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAnon.auth.getUser(token);
      if (userData.user) {
        userId = userData.user.id;
        logStep("User authenticated", { userId });
      }
    }

    // Check idempotency
    if (idempotencyKey) {
      const { data: existing } = await supabaseAdmin
        .from("djomy_transactions")
        .select("id, status, djomy_transaction_id")
        .eq("idempotency_key", idempotencyKey)
        .single();

      if (existing) {
        logStep("Idempotent request - returning existing", { existing });
        return new Response(
          JSON.stringify({
            success: true,
            transactionId: existing.id,
            djomyTransactionId: existing.djomy_transaction_id,
            status: existing.status,
            message: "Transaction existante",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    // Generate unique order ID
    const finalOrderId = orderId || `224SOL-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create transaction record (PENDING)
    const { data: newTransaction, error: insertError } = await supabaseAdmin
      .from("djomy_transactions")
      .insert({
        order_id: finalOrderId,
        user_id: userId,
        vendor_id: vendorId || null,
        amount,
        currency: "GNF",
        payment_method: paymentMethod,
        status: "PENDING",
        payer_phone: payerPhone.replace(/\s/g, ""),
        country_code: countryCode,
        description: description || `Paiement ${paymentMethod} - ${finalOrderId}`,
        idempotency_key: idempotencyKey || null,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      })
      .select()
      .single();

    if (insertError) {
      logStep("DB insert error", { error: insertError.message });
      throw new Error("Erreur lors de la création de la transaction");
    }

    logStep("Transaction created", { id: newTransaction.id, orderId: finalOrderId });

    // Get Djomy access token
    const accessToken = await getAccessToken(clientId, clientSecret, useSandbox);
    
    // Generate API signature
    const signature = await generateHmacSignature(clientId, clientSecret);
    const xApiKey = `${clientId}:${signature}`;

    const baseUrl = useSandbox 
      ? "https://sandbox-api.djomy.africa" 
      : "https://api.djomy.africa";

    // Prepare Djomy payment request (direct payment without redirect)
    const djomyPayload = {
      paymentMethod: paymentMethod,
      payerIdentifier: payerPhone.replace(/\s/g, ""),
      amount: amount,
      countryCode: countryCode,
      merchantPaymentReference: finalOrderId,
      description: description || `Paiement 224Solutions - ${finalOrderId}`,
    };

    logStep("Calling Djomy API", { payload: djomyPayload });

    // Log API request
    const apiLogId = await supabaseAdmin
      .from("djomy_api_logs")
      .insert({
        request_type: "INIT_PAYMENT",
        endpoint: "/v1/payments",
        request_payload: djomyPayload,
        transaction_id: newTransaction.id,
      })
      .select("id")
      .single();

    const djomyStartTime = Date.now();
    const djomyResponse = await fetch(`${baseUrl}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "224solutions/2.0",
        "Authorization": `Bearer ${accessToken}`,
        "X-API-KEY": xApiKey,
      },
      body: JSON.stringify(djomyPayload),
    });
    const djomyDuration = Date.now() - djomyStartTime;

    const djomyResponseText = await djomyResponse.text();
    logStep("Djomy response", { status: djomyResponse.status, duration: djomyDuration });

    // Update API log
    await supabaseAdmin
      .from("djomy_api_logs")
      .update({
        response_status: djomyResponse.status,
        response_payload: djomyResponseText ? JSON.parse(djomyResponseText) : null,
        duration_ms: djomyDuration,
        error_message: !djomyResponse.ok ? djomyResponseText : null,
      })
      .eq("id", apiLogId.data?.id);

    if (!djomyResponse.ok) {
      // Update transaction status to FAILED
      await supabaseAdmin
        .from("djomy_transactions")
        .update({
          status: "FAILED",
          error_message: djomyResponseText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", newTransaction.id);

      throw new Error(`Djomy API error: ${djomyResponse.status} - ${djomyResponseText}`);
    }

    const djomyData = JSON.parse(djomyResponseText);

    // Update transaction with Djomy response
    await supabaseAdmin
      .from("djomy_transactions")
      .update({
        status: "PROCESSING",
        djomy_transaction_id: djomyData.transactionId || djomyData.id,
        djomy_response: djomyData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newTransaction.id);

    const totalDuration = Date.now() - startTime;
    logStep("Payment init completed", { 
      transactionId: newTransaction.id, 
      djomyId: djomyData.transactionId,
      totalDuration 
    });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: newTransaction.id,
        djomyTransactionId: djomyData.transactionId || djomyData.id,
        status: "PROCESSING",
        message: "Paiement initié - en attente de confirmation",
        orderId: finalOrderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;
    
    logStep("ERROR", { message: errorMessage, duration });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
