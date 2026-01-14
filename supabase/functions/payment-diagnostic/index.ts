/**
 * 🔍 DIAGNOSTIC PAIEMENT MOBILE MONEY - 224SOLUTIONS
 * Vérifie la configuration des APIs de paiement
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier les secrets disponibles
    const secrets = {
      // CinetPay
      CINETPAY_API_KEY: Deno.env.get("CINETPAY_API_KEY") ? `${Deno.env.get("CINETPAY_API_KEY")?.substring(0, 10)}...` : "❌ Non configuré",
      CINETPAY_SITE_ID: Deno.env.get("CINETPAY_SITE_ID") ? `${Deno.env.get("CINETPAY_SITE_ID")?.substring(0, 10)}...` : "❌ Non configuré",
      
      // ChapChapPay/CCP
      CCP_API_KEY: Deno.env.get("CCP_API_KEY") ? `${Deno.env.get("CCP_API_KEY")?.substring(0, 10)}...` : "❌ Non configuré",
      CCP_ENCRYPTION_KEY: Deno.env.get("CCP_ENCRYPTION_KEY") ? `${Deno.env.get("CCP_ENCRYPTION_KEY")?.substring(0, 10)}...` : "❌ Non configuré",
      CCP_MERCHANT_ID: Deno.env.get("CCP_MERCHANT_ID") ? `${Deno.env.get("CCP_MERCHANT_ID")?.substring(0, 10)}...` : "❌ Non configuré",
      
      // Djomy
      DJOMY_CLIENT_ID: Deno.env.get("DJOMY_CLIENT_ID") ? `${Deno.env.get("DJOMY_CLIENT_ID")?.substring(0, 15)}...` : "❌ Non configuré",
      DJOMY_CLIENT_SECRET: Deno.env.get("DJOMY_CLIENT_SECRET") ? "✅ Configuré" : "❌ Non configuré",
    };

    // Tester CinetPay avec un appel de test
    let cinetpayTest = "Non testé";
    const cinetpayApiKey = Deno.env.get("CINETPAY_API_KEY");
    const cinetpaySiteId = Deno.env.get("CINETPAY_SITE_ID");
    
    if (cinetpayApiKey && cinetpaySiteId) {
      try {
        // Vérifier si ce sont des vraies valeurs ou des hash
        const isHash = cinetpayApiKey.length === 64 && /^[a-f0-9]+$/.test(cinetpayApiKey);
        
        if (isHash) {
          cinetpayTest = "⚠️ La clé API semble être un hash, pas une vraie clé CinetPay";
        } else {
          // Tester avec un appel de vérification de solde ou statut
          const testPayload = {
            apikey: cinetpayApiKey,
            site_id: cinetpaySiteId,
            transaction_id: "TEST-DIAG-001", // Transaction fictive
          };

          const response = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testPayload),
          });

          const data = await response.json();
          
          if (data.code === "00" || data.code === "627" || data.code === "664") {
            // 627 = transaction not found (normal for test)
            // 664 = transaction not found (normal for test)
            cinetpayTest = "✅ API CinetPay répond correctement";
          } else if (data.code === "APIKEY_INVALID" || data.code === "401") {
            cinetpayTest = "❌ Clé API CinetPay invalide";
          } else if (data.code === "SITE_ID_INVALID") {
            cinetpayTest = "❌ Site ID CinetPay invalide";
          } else {
            cinetpayTest = `⚠️ Réponse: ${data.code} - ${data.message || ""}`;
          }
        }
      } catch (e) {
        cinetpayTest = `❌ Erreur: ${e.message}`;
      }
    }

    // Construire le rapport
    const report = {
      timestamp: new Date().toISOString(),
      status: "Diagnostic terminé",
      secrets,
      tests: {
        cinetpay: cinetpayTest,
      },
      recommendations: [] as string[],
    };

    // Ajouter des recommandations
    if (!cinetpayApiKey || cinetpayApiKey.length === 64) {
      report.recommendations.push(
        "Configurer CINETPAY_API_KEY avec la vraie clé API (pas un hash)"
      );
    }
    if (!cinetpaySiteId || cinetpaySiteId.length === 64) {
      report.recommendations.push(
        "Configurer CINETPAY_SITE_ID avec le vrai ID de site (généralement numérique)"
      );
    }

    return new Response(
      JSON.stringify(report, null, 2),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
