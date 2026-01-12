/**
 * 💰 DJOMY PRODUCTION TEST - Test détaillé de l'API de production
 * Cette fonction permet de vérifier que l'intégration production fonctionne
 * 
 * ⚠️ ATTENTION: Cette fonction teste l'API de PRODUCTION (paiements réels)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { generateXApiKey } from "../_shared/djomy-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[${timestamp}] [DJOMY-PROD-TEST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("💰 Starting Djomy PRODUCTION Detailed Test");

    // Récupérer les credentials
    const clientId = Deno.env.get("DJOMY_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("DJOMY_CLIENT_SECRET")?.trim();
    
    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Credentials PRODUCTION manquantes",
          diagnosis: {
            DJOMY_CLIENT_ID: { exists: !!clientId },
            DJOMY_CLIENT_SECRET: { exists: !!clientSecret }
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Credentials found", { 
      clientId: clientId,
      clientIdLength: clientId.length,
      secretLength: clientSecret.length,
      secretPreview: clientSecret.substring(0, 10) + "..."
    });

    // Générer X-API-KEY
    const xApiKey = await generateXApiKey(clientId, clientSecret);
    logStep("X-API-KEY generated", { 
      xApiKey: xApiKey.substring(0, 50) + "...",
      format: "clientId:hmacSignature"
    });

    // Test direct sur l'API Djomy PRODUCTION
    const productionUrl = "https://api.djomy.africa/v1/auth";
    
    logStep("🔐 Testing authentication on PRODUCTION API", { url: productionUrl });

    const response = await fetch(productionUrl, {
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
    
    logStep("API Response", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      bodyPreview: responseText.substring(0, 500)
    });

    if (response.ok) {
      const data = JSON.parse(responseText);
      return new Response(
        JSON.stringify({
          success: true,
          environment: "PRODUCTION",
          message: "🎉 API PRODUCTION connectée avec succès !",
          tokenObtained: true,
          response: data
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Analyse détaillée de l'erreur
    let errorAnalysis = {
      code: response.status,
      possibleCauses: [] as string[],
      solutions: [] as string[]
    };

    if (response.status === 403) {
      errorAnalysis.possibleCauses = [
        "Le clientId n'est pas reconnu par l'API de production Djomy",
        "Le compte marchand n'est pas activé pour la production",
        "L'adresse IP du serveur Supabase n'est pas autorisée",
        "Les credentials sont pour le sandbox, pas la production"
      ];
      errorAnalysis.solutions = [
        "Vérifiez que vous utilisez bien les credentials de PRODUCTION (pas sandbox)",
        "Contactez Djomy (support@djomy.africa) pour activer votre compte production",
        "Demandez à Djomy de vérifier le whitelisting IP si applicable"
      ];
    } else if (response.status === 401) {
      errorAnalysis.possibleCauses = [
        "Le clientSecret est incorrect",
        "La signature HMAC est mal calculée"
      ];
      errorAnalysis.solutions = [
        "Vérifiez que le clientSecret est correct",
        "Copiez à nouveau le secret depuis le dashboard Djomy"
      ];
    }

    return new Response(
      JSON.stringify({
        success: false,
        environment: "PRODUCTION",
        error: `API returned ${response.status}`,
        requestDetails: {
          url: productionUrl,
          method: "POST",
          xApiKeyFormat: `${clientId.substring(0, 20)}...:hmac_signature`,
          clientIdFull: clientId, // Pour debug
        },
        responseDetails: {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 300)
        },
        errorAnalysis,
        nextSteps: [
          "1. Vérifiez que ces credentials proviennent du dashboard PRODUCTION Djomy",
          "2. Si vous n'avez que des credentials sandbox, demandez à Djomy d'activer votre compte production",
          "3. Contactez support@djomy.africa avec votre clientId pour vérification"
        ]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("❌ Test FAILED", { error: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
