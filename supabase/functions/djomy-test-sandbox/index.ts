/**
 * 🧪 DJOMY SANDBOX TEST - Test de l'intégration sans auth
 * Cette fonction permet de tester l'API Djomy en mode sandbox
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createDjomyClient } from "../_shared/djomy-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [DJOMY-TEST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("🧪 Starting Djomy Sandbox Test");

    // Vérifier que les credentials sandbox existent
    const sandboxId = Deno.env.get("DJOMY_CLIENT_ID_SANDBOX");
    const sandboxSecret = Deno.env.get("DJOMY_CLIENT_SECRET_SANDBOX");
    
    logStep("Checking sandbox credentials", { 
      hasId: !!sandboxId, 
      hasSecret: !!sandboxSecret,
      idLength: sandboxId?.length || 0,
      secretLength: sandboxSecret?.length || 0
    });
    
    if (!sandboxId || sandboxId.trim() === "" || !sandboxSecret || sandboxSecret.trim() === "") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Credentials sandbox non configurées ou vides",
          diagnosis: {
            DJOMY_CLIENT_ID_SANDBOX: {
              exists: !!sandboxId,
              isEmpty: !sandboxId || sandboxId.trim() === "",
              length: sandboxId?.length || 0
            },
            DJOMY_CLIENT_SECRET_SANDBOX: {
              exists: !!sandboxSecret,
              isEmpty: !sandboxSecret || sandboxSecret.trim() === "",
              length: sandboxSecret?.length || 0
            }
          },
          instruction: "Ajoutez des valeurs valides pour DJOMY_CLIENT_ID_SANDBOX et DJOMY_CLIENT_SECRET_SANDBOX dans Supabase Edge Functions secrets"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("✅ Sandbox credentials found", { 
      clientIdPrefix: sandboxId.substring(0, Math.min(25, sandboxId.length)) 
    });

    // Parse request body (optional test parameters)
    let testAmount = 1000;
    let testPhone = "224620000000";
    let testMethod = "OM";
    
    try {
      const body = await req.json();
      testAmount = body.amount || testAmount;
      testPhone = body.payerPhone || testPhone;
      testMethod = body.paymentMethod || testMethod;
    } catch {
      // Use defaults if no body
    }

    // Initialize Djomy client in SANDBOX mode
    logStep("🔄 Creating Djomy Sandbox client");
    const djomyClient = createDjomyClient(true); // Force sandbox

    // Test 1: Get authentication token
    logStep("🔐 Test 1: Getting access token...");
    const accessToken = await djomyClient.getAccessToken();
    
    logStep("✅ Test 1 PASSED: Token obtained", { 
      tokenPreview: accessToken.substring(0, 20) + "..." 
    });

    // Test 2: Try to initiate a test payment
    logStep("💳 Test 2: Initiating test payment...", { 
      amount: testAmount, 
      method: testMethod 
    });

    const paymentResult = await djomyClient.initiatePayment({
      paymentMethod: testMethod as 'OM' | 'MOMO' | 'KULU',
      payerIdentifier: testPhone.replace(/\s/g, "").replace(/^\+/, "00"),
      amount: testAmount,
      countryCode: "GN",
      merchantPaymentReference: `TEST-${Date.now()}`,
      description: "Test paiement sandbox 224Solutions",
    });

    if (paymentResult.success) {
      logStep("✅ Test 2 PASSED: Payment initiated", { 
        transactionId: paymentResult.transactionId 
      });
    } else {
      logStep("⚠️ Test 2: Payment init returned error", { 
        error: paymentResult.error 
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        environment: "SANDBOX",
        endpoint: "sandbox-api.djomy.africa",
        tests: {
          authentication: {
            passed: true,
            tokenObtained: true,
          },
          paymentInit: {
            passed: paymentResult.success,
            transactionId: paymentResult.transactionId,
            error: paymentResult.error,
            status: paymentResult.status,
          }
        },
        testParameters: {
          amount: testAmount,
          phone: testPhone,
          method: testMethod,
        },
        message: paymentResult.success 
          ? "🎉 Sandbox test réussi ! L'intégration Djomy fonctionne." 
          : "⚠️ Auth OK mais erreur sur le paiement test. Vérifiez les credentials.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("❌ Test FAILED", { error: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        environment: "SANDBOX",
        error: errorMessage,
        troubleshooting: {
          "403 Forbidden": "Client ID invalide ou non autorisé",
          "401 Unauthorized": "Secret invalide",
          "DJOMY_CLIENT_ID_SANDBOX": "Doit être au format djomy-merchant-XXXXX",
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
