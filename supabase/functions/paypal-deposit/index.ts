/**
 * PAYPAL DEPOSIT - Dépôt via PayPal vers wallet
 * Crée un order PayPal, puis capture le paiement et crédite le wallet
 * 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PAYPAL-DEPOSIT] ${step}${detailsStr}`);
};

const DEPOSIT_FEE_RATE = 2; // 2%
const PAYPAL_API_BASE = "https://api-m.paypal.com";

// PayPal supported currencies
const PAYPAL_SUPPORTED_CURRENCIES = [
  "AUD","BRL","CAD","CNY","CZK","DKK","EUR","HKD","HUF","ILS",
  "JPY","MYR","MXN","TWD","NZD","NOK","PHP","PLN","GBP","SGD",
  "SEK","CHF","THB","USD","RUB"
];

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_SECRET_KEY");
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${clientId}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Auth - validate JWT using getClaims (verify_jwt=false on Lovable Cloud)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Non autorisé - header manquant");
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Auth failed", { error: claimsError?.message });
      throw new Error("Non autorisé - token invalide");
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated via getClaims", { userId });

    const { amount, currency = "USD", action = "create", orderId, returnUrl } = await req.json();

    const accessToken = await getPayPalAccessToken();
    logStep("PayPal access token obtained");

    // --- ACTION: CREATE ORDER ---
    if (action === "create") {
      if (!amount || amount <= 0) throw new Error("Montant invalide");

      // Force USD if currency not supported by PayPal
      const upperCurrency = currency.toUpperCase();
      const paypalCurrency = PAYPAL_SUPPORTED_CURRENCIES.includes(upperCurrency) ? upperCurrency : "USD";
      
      const depositFee = Math.round(amount * (DEPOSIT_FEE_RATE / 100) * 100) / 100;
      const netAmount = Math.round((amount - depositFee) * 100) / 100;

      logStep("Creating PayPal order", { amount, depositFee, netAmount, originalCurrency: upperCurrency, paypalCurrency });

      const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: {
              currency_code: paypalCurrency,
              value: amount.toFixed(2),
            },
            description: `Dépôt wallet - 224Solutions`,
            custom_id: userId,
          }],
          application_context: {
            brand_name: "224Solutions",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: returnUrl || "https://vista-flows.lovable.app/wallet?paypal=success",
            cancel_url: returnUrl || "https://vista-flows.lovable.app/wallet?paypal=cancel",
          },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.text();
        throw new Error(`PayPal create order failed [${orderRes.status}]: ${err}`);
      }

      const order = await orderRes.json();
      const approveLink = order.links?.find((l: any) => l.rel === "approve")?.href 
        || `https://www.paypal.com/checkoutnow?token=${order.id}`;
      logStep("PayPal order created", { orderId: order.id, status: order.status, approveLink });

      return new Response(JSON.stringify({
        success: true,
        orderId: order.id,
        status: order.status,
        approveUrl: approveLink,
        amount,
        depositFee,
        netAmount,
        paypalCurrency,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACTION: CHECK STATUS ---
    if (action === "check-status") {
      if (!orderId) throw new Error("orderId requis");
      const statusRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      if (!statusRes.ok) throw new Error("Impossible de vérifier le statut");
      const statusData = await statusRes.json();
      logStep("Order status check", { orderId, status: statusData.status });
      return new Response(JSON.stringify({
        success: true,
        orderId,
        status: statusData.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ACTION: CAPTURE ORDER ---
    if (action === "capture") {
      if (!orderId) throw new Error("orderId requis pour capture");

      // Check order status first
      const checkRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        logStep("Pre-capture status check", { orderId, status: checkData.status });
        if (checkData.status !== "APPROVED") {
          throw new Error(`L'ordre n'est pas encore approuvé (statut: ${checkData.status}). Veuillez d'abord approuver le paiement dans PayPal.`);
        }
      }

      logStep("Capturing PayPal order", { orderId });

      const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!captureRes.ok) {
        const err = await captureRes.text();
        throw new Error(`PayPal capture failed [${captureRes.status}]: ${err}`);
      }

      const captureData = await captureRes.json();
      logStep("PayPal capture result", { status: captureData.status });

      if (captureData.status !== "COMPLETED") {
        throw new Error(`Capture non complétée: ${captureData.status}`);
      }

      // Extract captured amount
      const capturedAmount = parseFloat(
        captureData.purchase_units[0].payments.captures[0].amount.value
      );
      const capturedCurrency = captureData.purchase_units[0].payments.captures[0].amount.currency_code;
      const depositFee = Math.round(capturedAmount * (DEPOSIT_FEE_RATE / 100) * 100) / 100;
      const netAmount = Math.round((capturedAmount - depositFee) * 100) / 100;

      // Credit wallet
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Get or create wallet
      let { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("id, balance")
        .eq("user_id", userId)
        .single();

      if (!wallet) {
        const { data: newWallet, error: createErr } = await supabaseAdmin
          .from("wallets")
          .insert({ user_id: userId, balance: 0, currency: capturedCurrency, wallet_status: "active" })
          .select("id, balance")
          .single();
        if (createErr) throw new Error("Impossible de créer le wallet");
        wallet = newWallet;
      }

      const newBalance = (wallet!.balance || 0) + netAmount;
      const referenceNumber = `PP-DEP-${Date.now()}`;

      // Update balance + insert transaction
      await supabaseAdmin.from("wallets").update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }).eq("id", wallet!.id);

      await supabaseAdmin.from("wallet_transactions").insert({
        transaction_id: referenceNumber,
        transaction_type: "deposit",
        wallet_id: wallet!.id,
        amount: netAmount,
        net_amount: netAmount,
        fee: depositFee,
        currency: capturedCurrency,
        status: "completed",
        description: `Dépôt PayPal - Order ${orderId}`,
        receiver_wallet_id: wallet!.id,
        receiver_user_id: userId,
        metadata: {
          paypal_order_id: orderId,
          paypal_capture_id: captureData.purchase_units[0].payments.captures[0].id,
          gross_amount: capturedAmount,
          fee_rate: DEPOSIT_FEE_RATE,
        },
      } as any);

      logStep("Wallet credited", { walletId: wallet!.id, newBalance, netAmount });

      return new Response(JSON.stringify({
        success: true,
        orderId,
        capturedAmount,
        depositFee,
        netAmount,
        newBalance,
        message: "Dépôt PayPal réussi !",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Action inconnue: ${action}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
