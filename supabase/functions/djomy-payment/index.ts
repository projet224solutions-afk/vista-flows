import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[DJOMY-PAYMENT] ${step}${detailsStr}`);
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
  
  logStep("Getting access token", { baseUrl, xApiKey: xApiKey.substring(0, 20) + "..." });
  
  const response = await fetch(`${baseUrl}/v1/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-KEY": xApiKey,
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    logStep("Auth error", { status: response.status, error: errorText });
    throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  logStep("Access token obtained", { tokenLength: data.accessToken?.length });
  return data.accessToken;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const body = await req.json();
    const {
      amount,
      payerPhone,
      paymentMethod, // OM, MOMO, KULU, etc.
      description,
      orderId,
      returnUrl,
      cancelUrl,
      countryCode = "GN",
      useGateway = true, // Use gateway (redirect) or direct payment
      useSandbox = false,
    } = body;

    // Choix des identifiants selon l'environnement
    // - Prod: JOMY_CLIENT_ID_PROD / JOMY_CLIENT_SECRET_PROD (optionnel)
    // - Sandbox: JOMY_CLIENT_ID_SANDBOX / JOMY_CLIENT_SECRET_SANDBOX (optionnel)
    // - Fallback: JOMY_CLIENT_ID / JOMY_CLIENT_SECRET
    const clientId = useSandbox
      ? (Deno.env.get("JOMY_CLIENT_ID_SANDBOX") ?? Deno.env.get("JOMY_CLIENT_ID"))
      : (Deno.env.get("JOMY_CLIENT_ID_PROD") ?? Deno.env.get("JOMY_CLIENT_ID"));

    const clientSecret = useSandbox
      ? (Deno.env.get("JOMY_CLIENT_SECRET_SANDBOX") ?? Deno.env.get("JOMY_CLIENT_SECRET"))
      : (Deno.env.get("JOMY_CLIENT_SECRET_PROD") ?? Deno.env.get("JOMY_CLIENT_SECRET"));

    if (!clientId || !clientSecret) {
      throw new Error("Djomy credentials not configured");
    }

    logStep("Credentials verified", {
      env: useSandbox ? "sandbox" : "production",
      clientIdPrefix: clientId.substring(0, 8) + "...",
    });

    logStep("Payment request received", {
      amount,
      paymentMethod,
      orderId,
      useGateway,
      useSandbox,
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify user authentication (optionnel, on garde userId null si non connecté)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (!userError && userData.user) {
        userId = userData.user.id;
        logStep("User authenticated", { userId });
      }
    }

    // Validate required fields
    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }
    if (!payerPhone) {
      throw new Error("Payer phone number is required");
    }

    // Get access token
    const accessToken = await getAccessToken(clientId, clientSecret, useSandbox);
    
    // Generate API signature
    const signature = await generateHmacSignature(clientId, clientSecret);
    const xApiKey = `${clientId}:${signature}`;

    const baseUrl = useSandbox 
      ? "https://sandbox-api.djomy.africa" 
      : "https://api.djomy.africa";

    let paymentResponse;
    
    if (useGateway) {
      // Payment with redirect to Djomy portal
      logStep("Initiating gateway payment");
      
      const gatewayPayload = {
        amount: amount,
        countryCode: countryCode,
        payerNumber: payerPhone.replace(/\s/g, ""),
        description: description || `Paiement commande ${orderId}`,
        merchantPaymentReference: orderId || `224SOL-${Date.now()}`,
        returnUrl: returnUrl,
        cancelUrl: cancelUrl || returnUrl,
      };

      logStep("Gateway payload", gatewayPayload);

      const response = await fetch(`${baseUrl}/v1/payments/gateway`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "X-API-KEY": xApiKey,
        },
        body: JSON.stringify(gatewayPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logStep("Gateway payment error", { status: response.status, error: errorText });
        throw new Error(`Payment initiation failed: ${response.status} - ${errorText}`);
      }

      paymentResponse = await response.json();
      logStep("Gateway payment response", paymentResponse);

    } else {
      // Direct payment (without redirect)
      if (!paymentMethod) {
        throw new Error("Payment method is required for direct payments");
      }

      logStep("Initiating direct payment", { paymentMethod });
      
      const directPayload = {
        paymentMethod: paymentMethod, // OM, MOMO, KULU
        payerIdentifier: payerPhone.replace(/\s/g, ""),
        amount: amount,
        countryCode: countryCode,
        description: description || `Paiement commande ${orderId}`,
        merchantPaymentReference: orderId || `224SOL-${Date.now()}`,
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
      };

      logStep("Direct payload", directPayload);

      const response = await fetch(`${baseUrl}/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "X-API-KEY": xApiKey,
        },
        body: JSON.stringify(directPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logStep("Direct payment error", { status: response.status, error: errorText });
        throw new Error(`Payment initiation failed: ${response.status} - ${errorText}`);
      }

      paymentResponse = await response.json();
      logStep("Direct payment response", paymentResponse);
    }

    // Save payment record to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: insertError } = await supabaseAdmin
      .from("djomy_payments")
      .insert({
        user_id: userId,
        transaction_id: paymentResponse.transactionId || paymentResponse.id,
        amount: amount,
        currency: "GNF",
        payment_method: paymentMethod || "gateway",
        status: "pending",
        order_id: orderId,
        payer_phone: payerPhone,
        country_code: countryCode,
        redirect_url: paymentResponse.redirectUrl || paymentResponse.paymentUrl,
        response_data: paymentResponse,
      });

    if (insertError) {
      logStep("Database insert error (non-blocking)", { error: insertError.message });
    } else {
      logStep("Payment record saved to database");
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: paymentResponse.transactionId || paymentResponse.id,
        redirectUrl: paymentResponse.redirectUrl || paymentResponse.paymentUrl,
        status: paymentResponse.status || "pending",
        data: paymentResponse,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessageRaw = error instanceof Error ? error.message : String(error);

    // Rendre le message lisible côté UI (Supabase invoke masque souvent les erreurs non-2xx)
    let errorMessage = errorMessageRaw;
    if (errorMessageRaw.includes('Authentication failed: 403')) {
      errorMessage = "Authentification Djomy refusée (403). Vérifiez vos identifiants (clientId/clientSecret) et l'environnement (sandbox vs production).";
    } else if (errorMessageRaw.includes('Authentication failed: 401')) {
      errorMessage = "Authentification Djomy refusée (401). Vérifiez vos identifiants (clientId/clientSecret).";
    }

    logStep("ERROR", { message: errorMessageRaw });

    // IMPORTANT: on renvoie 200 pour que le frontend reçoive le JSON d'erreur (au lieu d'un 'non-2xx status code')
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
