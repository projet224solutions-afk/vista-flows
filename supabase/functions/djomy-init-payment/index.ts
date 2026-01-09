import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [DJOMY-INIT] ${step}${detailsStr}`);
};

// ============= DJOMY AUTHENTICATION =============
// Documentation: https://developers.djomy.africa

interface DjomyTokenData {
  accessToken: string;
  expiresAt: number;
}

const tokenCache: Record<string, DjomyTokenData> = {};

// Génère la signature HMAC-SHA256 pour X-API-KEY
async function generateHmacSignature(clientId: string, clientSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(clientSecret);
  const messageData = encoder.encode(clientId);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

// Génère un Bearer token via /v1/auth avec X-API-KEY
async function generateDjomyToken(clientId: string, clientSecret: string, useSandbox: boolean): Promise<DjomyTokenData> {
  const baseUrl = useSandbox 
    ? "https://sandbox-api.djomy.africa" 
    : "https://api.djomy.africa";
  
  logStep("🔐 Generating HMAC signature", { clientId });
  const hmacSignature = await generateHmacSignature(clientId, clientSecret);
  const xApiKey = `${clientId}:${hmacSignature}`;
  
  logStep("🔑 Requesting Bearer token from /v1/auth", { baseUrl });
  
  const response = await fetch(`${baseUrl}/v1/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-KEY": xApiKey,
      "User-Agent": "224Solutions/2.0",
    },
    body: JSON.stringify({}),
  });
  
  const responseText = await response.text();
  logStep("Token response", { status: response.status, bodyPreview: responseText.substring(0, 200) });
  
  if (!response.ok) {
    throw new Error(`Djomy authentication failed: ${response.status} - ${responseText}`);
  }
  
  const data = JSON.parse(responseText);
  const expiresIn = data.expires_in || data.expiresIn || 3600;
  const expiresAt = Date.now() + (expiresIn - 300) * 1000;
  
  return {
    accessToken: data.access_token || data.accessToken,
    expiresAt
  };
}

// Récupère un token valide (cache ou génère nouveau)
async function getAccessToken(clientId: string, clientSecret: string, useSandbox: boolean): Promise<string> {
  const cacheKey = `${useSandbox ? 'sandbox' : 'prod'}_${clientId}`;
  const cachedToken = tokenCache[cacheKey];
  
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    const remainingMinutes = Math.round((cachedToken.expiresAt - Date.now()) / 60000);
    logStep("♻️ Using cached token", { remainingMinutes });
    return cachedToken.accessToken;
  }
  
  logStep("🔄 Token expired or missing, generating new one");
  const newToken = await generateDjomyToken(clientId, clientSecret, useSandbox);
  tokenCache[cacheKey] = newToken;
  
  return newToken.accessToken;
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

    // Get Djomy credentials with validation
    const clientId = Deno.env.get("DJOMY_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("DJOMY_CLIENT_SECRET")?.trim();

    if (!clientId || !clientSecret) {
      logStep("❌ Credentials missing", { 
        hasClientId: !!clientId, 
        hasSecret: !!clientSecret 
      });
      throw new Error("🔴 Credentials Djomy manquants. Vérifiez DJOMY_CLIENT_ID et DJOMY_CLIENT_SECRET dans les secrets Supabase.");
    }

    // Validate Client ID format (must be djomy-merchant-XXXXX)
    if (!clientId.startsWith("djomy-merchant-")) {
      logStep("⚠️ Invalid Client ID format", { 
        clientIdPrefix: clientId.substring(0, 15),
        expected: "djomy-merchant-XXXXX" 
      });
      throw new Error(`🔴 Format Client ID invalide: "${clientId.substring(0, 20)}..." doit commencer par "djomy-merchant-". Contactez support@djomy.africa pour obtenir vos vrais identifiants marchands.`);
    }

    logStep("✅ Credentials validated", { 
      clientIdPrefix: clientId.substring(0, 20),
      environment: useSandbox ? "sandbox" : "production"
    });

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

    // Get Djomy access token (avec régénération automatique)
    const accessToken = await getAccessToken(clientId, clientSecret, useSandbox);
    
    // Generate X-API-KEY header (required for all API calls)
    const hmacSignature = await generateHmacSignature(clientId, clientSecret);
    const xApiKey = `${clientId}:${hmacSignature}`;

    const baseUrl = useSandbox 
      ? "https://sandbox-api.djomy.africa" 
      : "https://api.djomy.africa";

    // Prepare Djomy payment request
    const djomyPayload = {
      paymentMethod: paymentMethod,
      payerIdentifier: payerPhone.replace(/\s/g, ""),
      amount: amount,
      countryCode: countryCode,
      merchantPaymentReference: finalOrderId,
      description: description || `Paiement 224Solutions - ${finalOrderId}`,
    };

    logStep("💳 Calling Djomy API", { payload: djomyPayload });

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
        "User-Agent": "224Solutions/2.0",
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
    
    // Categorize errors for better user experience
    let errorCode = "UNKNOWN";
    let userFriendlyMessage = errorMessage;

    if (errorMessage.includes("Djomy API error: 403")) {
      errorCode = "DJOMY_AUTH_403";
      userFriendlyMessage = "🔴 Accès refusé par Djomy (403). Vos credentials ne sont pas valides ou votre serveur n'est pas autorisé. Contactez support@djomy.africa.";
    } else if (errorMessage.includes("Djomy API error: 401")) {
      errorCode = "DJOMY_AUTH_401";
      userFriendlyMessage = "🔴 Authentification Djomy échouée (401). Vérifiez vos DJOMY_CLIENT_ID et DJOMY_CLIENT_SECRET.";
    } else if (errorMessage.includes("Djomy authentication failed")) {
      errorCode = "DJOMY_AUTH_FAILED";
      userFriendlyMessage = "🔴 Impossible de s'authentifier auprès de Djomy. Vérifiez vos credentials et votre connexion internet.";
    } else if (errorMessage.includes("Format Client ID invalide")) {
      errorCode = "INVALID_CLIENT_ID";
      userFriendlyMessage = errorMessage; // Déjà user-friendly
    } else if (errorMessage.includes("Credentials Djomy manquants")) {
      errorCode = "MISSING_CREDENTIALS";
      userFriendlyMessage = errorMessage; // Déjà user-friendly
    } else if (errorMessage.includes("Montant invalide")) {
      errorCode = "INVALID_AMOUNT";
      userFriendlyMessage = "⚠️ Montant invalide. Le montant doit être supérieur à 0.";
    } else if (errorMessage.includes("Numéro de téléphone invalide")) {
      errorCode = "INVALID_PHONE";
      userFriendlyMessage = "⚠️ Numéro de téléphone invalide. Minimum 8 chiffres requis.";
    } else if (errorMessage.includes("Méthode de paiement invalide")) {
      errorCode = "INVALID_METHOD";
      userFriendlyMessage = "⚠️ Méthode de paiement invalide. Utilisez: OM (Orange Money), MOMO (MTN), ou KULU.";
    }
    
    logStep("ERROR", { 
      code: errorCode,
      message: errorMessage, 
      duration,
      userMessage: userFriendlyMessage
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: userFriendlyMessage,
        errorCode: errorCode,
        details: errorMessage !== userFriendlyMessage ? errorMessage : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
