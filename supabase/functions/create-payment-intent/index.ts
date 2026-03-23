/**
 * EDGE FUNCTION: create-payment-intent
 * Création d'ordre PayPal pour paiement carte (VISA/Mastercard)
 * 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPdgFeeRate, FEE_KEYS } from "../_shared/pdg-fees.ts";
import { getInternalFxRate } from "../_shared/fx-internal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYPAL_API_BASE = "https://api-m.paypal.com";
const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  "AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "HKD", "HUF", "ILS",
  "JPY", "MYR", "MXN", "TWD", "NZD", "NOK", "PHP", "PLN", "GBP", "SGD",
  "SEK", "CHF", "THB", "USD", "RUB"
]);
const PAYPAL_NO_DECIMAL_CURRENCIES = new Set(["JPY", "HUF", "TWD"]);

interface FxResolution {
  rate: number;
  source: string;
}

const json = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getPayPalAccessToken(clientId: string, secretKey: string): Promise<string> {
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secretKey}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function resolveFxRate(supabaseAdmin: any, fromCurrency: string, toCurrency: string): Promise<FxResolution> {
  const result = await getInternalFxRate(supabaseAdmin, fromCurrency, toCurrency);
  return { rate: result.rate, source: result.source };
}

async function resolvePayPalAmount(
  supabaseAdmin: any,
  amount: number,
  sourceCurrency: string,
  preferredPayPalCurrency?: string,
) {
  const source = sourceCurrency.toUpperCase();
  const preferred = (preferredPayPalCurrency || "").toUpperCase();

  let target = source;
  if (!PAYPAL_SUPPORTED_CURRENCIES.has(target)) {
    target = PAYPAL_SUPPORTED_CURRENCIES.has(preferred) ? preferred : "USD";
  }

  const fx = await resolveFxRate(supabaseAdmin, source, target);
  const convertedNumeric = amount * fx.rate;

  if (!Number.isFinite(convertedNumeric) || convertedNumeric <= 0) {
    throw new Error(`Conversion invalide ${source}→${target}`);
  }

  const normalizedValue = PAYPAL_NO_DECIMAL_CURRENCIES.has(target)
    ? Math.max(1, Math.round(convertedNumeric)).toString()
    : Math.max(1, Math.round(convertedNumeric * 100) / 100).toFixed(2);

  return {
    targetCurrency: target,
    paypalValue: normalizedValue,
    convertedNumeric,
    fxRate: fx.rate,
    fxSource: fx.source,
    wasConverted: source !== target,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Auth utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ success: false, error: "Unauthorized" });
    }

    const {
      amount,
      currency = "GNF",
      seller_id,
      order_id,
      service_id,
      product_id,
      metadata = {},
      preferred_paypal_currency,
    } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return json({ success: false, error: "Invalid amount" });
    }

    if (!seller_id) {
      return json({ success: false, error: "seller_id is required" });
    }

    // Vérifier vendeur
    const { data: seller, error: sellerError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", seller_id)
      .single();

    if (sellerError || !seller) {
      return json({ success: false, error: "Seller not found" });
    }

    const validVendorRoles = ["VENDOR", "vendeur", "Vendeur", "vendor"];
    if (!validVendorRoles.includes(seller.role)) {
      return json({ success: false, error: "User is not a vendor", actual_role: seller.role });
    }

    // Commission dynamique depuis pdg_settings
    const commissionRate = await getPdgFeeRate(supabase, FEE_KEYS.PURCHASE_COMMISSION);
    const sourceAmount = Number(amount);
    const commissionAmount = Math.round((sourceAmount * commissionRate) / 100);
    const totalAmountWithCommission = sourceAmount + commissionAmount;
    const sellerNetAmount = sourceAmount;

    // Conversion professionnelle vers devise PayPal supportée
    const conversion = await resolvePayPalAmount(
      supabase,
      totalAmountWithCommission,
      String(currency),
      preferred_paypal_currency,
    );

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalSecretKey = Deno.env.get("PAYPAL_SECRET_KEY");

    if (!paypalClientId || !paypalSecretKey) {
      return json({ success: false, error: "PayPal credentials not configured" });
    }

    const accessToken = await getPayPalAccessToken(paypalClientId, paypalSecretKey);

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: conversion.targetCurrency,
            value: conversion.paypalValue,
          },
          description: `Paiement 224Solutions - ${seller.full_name || "Vendeur"}`,
          custom_id: JSON.stringify({
            buyer_id: user.id,
            seller_id,
            order_id: order_id || "",
            product_id: product_id || "",
            source_currency: String(currency).toUpperCase(),
            source_total: totalAmountWithCommission,
          }),
        },
      ],
      application_context: {
        brand_name: "224Solutions",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        // Ouvre directement le formulaire carte au lieu de l'écran d'intermédiation
        landing_page: "BILLING",
      },
    };

    const paypalResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(orderPayload),
    });

    const paypalOrder = await paypalResponse.json();

    if (!paypalResponse.ok) {
      console.error("❌ PayPal Order error:", JSON.stringify(paypalOrder));
      return json({
        success: false,
        error: "PayPal order creation failed",
        details: paypalOrder,
      });
    }

    // Logging transaction (backward-compatible table)
    const { data: transaction } = await supabase
      .from("stripe_transactions")
      .insert({
        stripe_payment_intent_id: `paypal_${paypalOrder.id}`,
        buyer_id: user.id,
        seller_id,
        amount: totalAmountWithCommission,
        currency: String(currency).toUpperCase(),
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_net_amount: sellerNetAmount,
        status: "PENDING",
        order_id,
        service_id,
        product_id,
        payment_method: "paypal_card",
        metadata: {
          paypal_order_id: paypalOrder.id,
          paypal_currency: conversion.targetCurrency,
          paypal_amount: conversion.paypalValue,
          fx_rate: conversion.fxRate,
          fx_source: conversion.fxSource,
          was_converted: conversion.wasConverted,
          product_amount: sourceAmount,
          total_amount: totalAmountWithCommission,
          ...metadata,
        },
      })
      .select("id")
      .single();

    return json({
      success: true,
      paypal_order_id: paypalOrder.id,
      transaction_id: transaction?.id,
      status: paypalOrder.status,
      product_amount: sourceAmount,
      commission_amount: commissionAmount,
      total_amount: totalAmountWithCommission,
      seller_net_amount: sellerNetAmount,
      conversion: {
        source_currency: String(currency).toUpperCase(),
        source_amount: totalAmountWithCommission,
        paypal_currency: conversion.targetCurrency,
        paypal_amount: conversion.paypalValue,
        fx_rate: conversion.fxRate,
        fx_source: conversion.fxSource,
        was_converted: conversion.wasConverted,
      },
    });
  } catch (error) {
    console.error("❌ Error in create-payment-intent:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return json({ success: false, error: "Payment creation failed", details: message });
  }
});
