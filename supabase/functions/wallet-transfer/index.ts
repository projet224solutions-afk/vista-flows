/**
 * 🔐 WALLET TRANSFER SÉCURISÉ + INTERNATIONAL
 * Avec signature HMAC, verrouillage optimiste, audit et conversion internationale
 * 224Solutions - Règles de sécurité financières
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const ALLOWED_ORIGINS = [
  "https://224solution.net",
  "https://www.224solution.net",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://vista-flows.lovable.app",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const SECURITY_MARGIN = 0.005;
const MIN_TRANSFER_AMOUNT = 100;
const MAX_TRANSFER_AMOUNT = 50000000;

// ✅ Map wallet currency to its origin country for display
// This ensures a user in Spain with a GNF wallet shows as "GN", not "ES"
function currencyToCountry(currency: string): string {
  const map: Record<string, string> = {
    GNF: "GN", XOF: "SN", XAF: "CM", NGN: "NG", GHS: "GH",
    EUR: "FR", USD: "US", GBP: "GB", CHF: "CH", CAD: "CA",
    AUD: "AU", JPY: "JP", CNY: "CN", INR: "IN", AED: "AE",
    MAD: "MA", EGP: "EG", TND: "TN", DZD: "DZ", ZAR: "ZA",
    KES: "KE", TZS: "TZ", UGX: "UG", RWF: "RW", ETB: "ET",
    CDF: "CD", BRL: "BR", MXN: "MX", SAR: "SA", QAR: "QA",
    KWD: "KW", SLL: "SL", LRD: "LR", GMD: "GM", CVE: "CV", MRU: "MR",
  };
  return map[currency?.toUpperCase()] || "GN";
}

const TRANSACTION_SECRET = (() => {
  const secret = Deno.env.get("TRANSACTION_SECRET_KEY");
  if (!secret) {
    console.error("🔴 TRANSACTION_SECRET_KEY non configuré, fallback");
    return "default-fallback-secret-key";
  }
  return secret;
})();

async function generateSignature(transactionId: string, amount: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${transactionId}${amount}`);
  const keyData = encoder.encode(TRANSACTION_SECRET);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function logFinancialAudit(supabase: any, userId: string, action: string, data: any, isSuspicious = false) {
  try {
    await supabase.from("financial_audit_logs").insert({
      user_id: userId,
      action_type: action,
      description: `Wallet transfer: ${action}`,
      request_data: data,
      is_suspicious: isSuspicious
    });
  } catch (e) { console.error("[Audit] Log failed:", e); }
}

// =============================================
// 🌍 INTERNATIONAL TRANSFER HELPERS
// =============================================

interface InternationalSettings {
  commission_conversion_percent: number;
  frais_transaction_international_percent: number;
  delai_verrouillage_taux_seconds: number;
  limite_transfert_quotidien: number;
}

async function loadInternationalSettings(supabase: any): Promise<InternationalSettings> {
  const defaults: InternationalSettings = {
    commission_conversion_percent: 10,
    frais_transaction_international_percent: 2,
    delai_verrouillage_taux_seconds: 60,
    limite_transfert_quotidien: 50000000,
  };

  try {
    const { data, error } = await supabase
      .from("international_transfer_settings")
      .select("setting_key, setting_value");

    if (error || !data) return defaults;

    for (const row of data) {
      if (row.setting_key in defaults) {
        (defaults as any)[row.setting_key] = Number(row.setting_value);
      }
    }
  } catch (_) { /* keep defaults */ }
  return defaults;
}

interface UserGeoInfo {
  detected_country: string | null;
  detected_currency: string | null;
}

async function getUserGeoInfo(supabase: any, userId: string): Promise<UserGeoInfo> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("detected_country, detected_currency")
      .eq("id", userId)
      .maybeSingle();
    return {
      detected_country: data?.detected_country || null,
      detected_currency: data?.detected_currency || null,
    };
  } catch {
    return { detected_country: null, detected_currency: null };
  }
}

async function getFxRate(supabase: any, from: string, to: string): Promise<number> {
  if (from === to) return 1;

  // Try currency_exchange_rates table first
  try {
    const { data } = await supabase
      .from("currency_exchange_rates")
      .select("rate")
      .eq("from_currency", from.toUpperCase())
      .eq("to_currency", to.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (data?.rate && data.rate > 0) return Number(data.rate);
  } catch {}

  // Fallback: fx-rates edge function
  try {
    const fxResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fx-rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ base: from, symbols: [to] }),
    });
    if (fxResponse.ok) {
      const fxData = await fxResponse.json();
      if (fxData.rates?.[to]) return Number(fxData.rates[to]);
    }
  } catch {}

  // Fallback: get_internal_rate RPC
  try {
    const { data } = await supabase.rpc("get_internal_rate", {
      p_from_currency: from,
      p_to_currency: to,
      p_transfer_type: "WALLET_TO_WALLET",
    });
    if (data?.[0]?.rate_public) return Number(data[0].rate_public);
  } catch {}

  throw new Error(`Impossible d'obtenir le taux ${from}→${to}`);
}

// =============================================
// 🔍 RESOLVE RECIPIENT (email, phone, ID, UUID)
// =============================================

async function resolveRecipientId(supabase: any, recipientId: string): Promise<string | null> {
  // UUID direct
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId);
  if (isUUID) return recipientId;

  // user_ids.custom_id
  const { data: userIdData } = await supabase.from('user_ids').select('user_id').eq('custom_id', recipientId.toUpperCase()).maybeSingle();
  if (userIdData) return userIdData.user_id;

  // profiles.public_id
  const { data: profileData } = await supabase.from('profiles').select('id').eq('public_id', recipientId.toUpperCase()).maybeSingle();
  if (profileData) return profileData.id;

  // vendors.public_id
  const { data: vendorData } = await supabase.from('vendors').select('user_id').eq('public_id', recipientId.toUpperCase()).maybeSingle();
  if (vendorData) return vendorData.user_id;

  // Email
  if (recipientId.includes('@')) {
    const { data: emailData } = await supabase.from('profiles').select('id').ilike('email', recipientId.trim()).maybeSingle();
    if (emailData) return emailData.id;
  }

  // Phone
  const phonePattern = /^[0-9+\-\s]{6,}$/;
  if (phonePattern.test(recipientId.trim())) {
    const cleanPhone = recipientId.replace(/[\s\-]/g, '');
    const { data: phoneData } = await supabase
      .from('profiles')
      .select('id')
      .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},phone.ilike.%${cleanPhone}%`)
      .maybeSingle();
    if (phoneData) return phoneData.id;
  }

  return null;
}

// =============================================
// MAIN HANDLER
// =============================================

interface TransferRequest {
  sender_id: string;
  receiver_id: string;
  amount: number;
  description?: string;
}

interface TransferPreviewRequest {
  sender_id: string;
  receiver_id: string;
  amount: number;
}

interface TransferResult {
  success: boolean;
  transfer_id?: string;
  transfer_code?: string;
  amount_sent: number;
  currency_sent: string;
  fee_percentage: number;
  fee_amount: number;
  amount_after_fee: number;
  rate_displayed: number;
  amount_received: number;
  currency_received: string;
  is_international?: boolean;
  sender_country?: string;
  receiver_country?: string;
  commission_conversion?: number;
  frais_international?: number;
  rate_lock_seconds?: number;
  error?: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "transfer";
    const body = await req.json();

    console.log(`💸 Wallet transfer action: ${action}`);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authentification requise");
    }

    if (action === "preview") {
      return await handlePreview(supabase, body, corsHeaders);
    } else if (action === "transfer") {
      return await handleTransfer(supabase, body, req, corsHeaders);
    } else {
      throw new Error("Invalid action");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Transfer error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

// =============================================
// 🔍 PREVIEW (with international detection)
// =============================================

async function handlePreview(supabase: any, body: TransferPreviewRequest, corsHeaders: Record<string, string>) {
  const { sender_id, amount } = body;
  let { receiver_id } = body;

  if (amount < MIN_TRANSFER_AMOUNT) throw new Error(`Montant minimum: ${MIN_TRANSFER_AMOUNT}`);
  if (amount > MAX_TRANSFER_AMOUNT) throw new Error(`Montant maximum: ${MAX_TRANSFER_AMOUNT}`);

  // Resolve receiver by email, phone, ID or UUID
  const resolvedReceiverId = await resolveRecipientId(supabase, receiver_id);
  if (!resolvedReceiverId) throw new Error(`Destinataire "${receiver_id}" introuvable`);
  receiver_id = resolvedReceiverId;

  if (sender_id === receiver_id) throw new Error("Vous ne pouvez pas transférer à vous-même");

  // 🌍 Get profiles.detected_country & wallets for real currency
  const [senderGeo, receiverGeo, intlSettings, senderResult, receiverResult] = await Promise.all([
    getUserGeoInfo(supabase, sender_id),
    getUserGeoInfo(supabase, receiver_id),
    loadInternationalSettings(supabase),
    supabase.from("wallets").select("*").eq("user_id", sender_id).single(),
    supabase.from("wallets").select("*").eq("user_id", receiver_id).single(),
  ]);

  if (senderResult.error) throw new Error("Wallet expéditeur non trouvé");
  if (receiverResult.error) throw new Error("Wallet destinataire non trouvé");

  if (senderResult.data.balance < amount) throw new Error("Solde insuffisant");

  // ✅ Use WALLET currency (actual stored currency), not profile detected_currency
  const senderCurrency = senderResult.data.currency || "GNF";
  const receiverCurrency = receiverResult.data.currency || "GNF";

  // ✅ Derive country from wallet currency, NOT from geolocation
  // A user traveling in Spain with a GNF wallet is still sending from Guinea
  const senderCountry = currencyToCountry(senderCurrency);
  const receiverCountry = currencyToCountry(receiverCurrency);

  // ✅ International = currencies differ, NOT physical location
  const isInternational = senderCurrency !== receiverCurrency;

  console.log(`🌍 Preview: ${senderCountry}(${senderCurrency}) → ${receiverCountry}(${receiverCurrency}) | International: ${isInternational}`);

  let feePercentage = 0;
  let feeAmount = 0;
  let commissionConversion = 0;
  let fraisInternational = 0;
  let ratePublic = 1;
  let amountAfterFee = amount;
  let amountReceived = amount;

  if (isInternational) {
    // 🌍 International: apply commission + frais + conversion
    const commissionPercent = intlSettings.commission_conversion_percent;
    const fraisPercent = intlSettings.frais_transaction_international_percent;

    commissionConversion = Math.round(amount * commissionPercent / 100);
    fraisInternational = Math.round(amount * fraisPercent / 100);
    feeAmount = commissionConversion + fraisInternational;
    feePercentage = commissionPercent + fraisPercent;
    amountAfterFee = amount - feeAmount;

    // Get FX rate from detected currencies
    if (senderCurrency !== receiverCurrency) {
      ratePublic = await getFxRate(supabase, senderCurrency, receiverCurrency);
      amountReceived = Math.round(amountAfterFee * ratePublic * 100) / 100;
    } else {
      amountReceived = amountAfterFee;
    }
  } else {
    // Local transfer: use existing fee logic
    const feeResult = await supabase.rpc("calculate_transfer_fee", {
      p_amount: amount,
      p_currency_from: senderCurrency,
      p_currency_to: receiverCurrency,
    });

    const feeData = feeResult.data?.[0] || { fee_percentage: 1.5, fee_amount: amount * 0.015, amount_after_fee: amount * 0.985 };
    feePercentage = feeData.fee_percentage;
    feeAmount = feeData.fee_amount;
    amountAfterFee = feeData.amount_after_fee;
    amountReceived = amountAfterFee;
  }

  const preview: TransferResult = {
    success: true,
    amount_sent: amount,
    currency_sent: senderCurrency,
    fee_percentage: feePercentage,
    fee_amount: Math.round(feeAmount),
    amount_after_fee: Math.round(amountAfterFee),
    rate_displayed: ratePublic,
    amount_received: Math.round(amountReceived),
    currency_received: receiverCurrency,
    is_international: isInternational,
    sender_country: senderCountry,
    receiver_country: receiverCountry,
    commission_conversion: Math.round(commissionConversion),
    frais_international: Math.round(fraisInternational),
    rate_lock_seconds: isInternational ? intlSettings.delai_verrouillage_taux_seconds : undefined,
  };

  console.log("📊 Transfer preview:", JSON.stringify(preview));

  return new Response(JSON.stringify(preview), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

// =============================================
// 💸 EXECUTE TRANSFER (with international logic)
// =============================================

async function handleTransfer(supabase: any, body: TransferRequest, req: Request, corsHeaders: Record<string, string>) {
  const { sender_id, amount, description } = body;
  let { receiver_id } = body;

  if (!sender_id || !receiver_id || !amount) throw new Error("Paramètres manquants");
  
  // Resolve receiver by email, phone, ID or UUID
  const resolvedReceiverId = await resolveRecipientId(supabase, receiver_id);
  if (!resolvedReceiverId) throw new Error(`Destinataire "${receiver_id}" introuvable`);
  receiver_id = resolvedReceiverId;

  if (sender_id === receiver_id) throw new Error("Impossible de transférer vers soi-même");
  if (amount <= 0) throw new Error("Le montant doit être positif");
  if (amount < MIN_TRANSFER_AMOUNT) throw new Error(`Montant minimum: ${MIN_TRANSFER_AMOUNT}`);
  if (amount > MAX_TRANSFER_AMOUNT) throw new Error(`Montant maximum: ${MAX_TRANSFER_AMOUNT}`);

  const transferCode = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // 🌍 Get geo info from profiles
  // 🌍 Get geo info + wallets in parallel
  const [senderGeo, receiverGeo, intlSettings, senderResult, receiverResult] = await Promise.all([
    getUserGeoInfo(supabase, sender_id),
    getUserGeoInfo(supabase, receiver_id),
    loadInternationalSettings(supabase),
    supabase.from("wallets").select("*").eq("user_id", sender_id).single(),
    supabase.from("wallets").select("*").eq("user_id", receiver_id).single(),
  ]);

  if (senderResult.error) throw new Error("Wallet expéditeur non trouvé");
  if (receiverResult.error) throw new Error("Wallet destinataire non trouvé");

  const senderWallet = senderResult.data;
  const receiverWallet = receiverResult.data;

  // ✅ Use WALLET currency (actual stored currency), not profile detected_currency
  const senderCurrency = senderWallet.currency || "GNF";
  const receiverCurrency = receiverWallet.currency || "GNF";

  // ✅ Derive country from wallet currency, NOT from geolocation
  const senderCountry = currencyToCountry(senderCurrency);
  const receiverCountry = currencyToCountry(receiverCurrency);

  // ✅ International = currencies differ, NOT physical location
  const isInternational = senderCurrency !== receiverCurrency;

  console.log(`🌍 Transfer: ${senderCountry}(${senderCurrency}) → ${receiverCountry}(${receiverCurrency}) | Intl: ${isInternational}`);

  // Check daily limit for international
  if (isInternational) {
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTransfers } = await supabase
      .from("wallet_transfers")
      .select("amount_sent")
      .eq("sender_id", sender_id)
      .eq("status", "completed")
      .gte("created_at", `${today}T00:00:00Z`);

    const totalToday = (todayTransfers || []).reduce((s: number, t: any) => s + (t.amount_sent || 0), 0);
    if (totalToday + amount > intlSettings.limite_transfert_quotidien) {
      throw new Error(`Limite quotidienne de transfert international atteinte (${intlSettings.limite_transfert_quotidien.toLocaleString()})`);
    }
  }

  if (senderWallet.balance < amount) {
    throw new Error(`Solde insuffisant. Disponible: ${senderWallet.balance} ${senderCurrency}`);
  }

  // Calculate fees and conversion
  let feePercentage = 0;
  let feeAmount = 0;
  let ratePublic = 1;
  let rateInternal = 1;
  let amountAfterFee = amount;
  let amountReceivedReal: number;
  let commissionConversion = 0;
  let fraisInternational = 0;

  if (isInternational) {
    const commissionPercent = intlSettings.commission_conversion_percent;
    const fraisPercent = intlSettings.frais_transaction_international_percent;

    commissionConversion = Math.round(amount * commissionPercent / 100);
    fraisInternational = Math.round(amount * fraisPercent / 100);
    feeAmount = commissionConversion + fraisInternational;
    feePercentage = commissionPercent + fraisPercent;
    amountAfterFee = amount - feeAmount;

    if (senderCurrency !== receiverCurrency) {
      ratePublic = await getFxRate(supabase, senderCurrency, receiverCurrency);
      rateInternal = ratePublic * (1 + SECURITY_MARGIN);
      amountReceivedReal = Math.round(amountAfterFee * rateInternal * 100) / 100;
    } else {
      amountReceivedReal = amountAfterFee;
    }
  } else {
    // Local transfer fees
    const feeResult = await supabase.rpc("calculate_transfer_fee", {
      p_amount: amount,
      p_currency_from: senderCurrency,
      p_currency_to: receiverCurrency,
    });
    const feeData = feeResult.data?.[0] || { fee_percentage: 1.5, fee_amount: amount * 0.015, amount_after_fee: amount * 0.985 };
    feePercentage = feeData.fee_percentage;
    feeAmount = feeData.fee_amount;
    amountAfterFee = feeData.amount_after_fee;

    if (senderCurrency !== receiverCurrency) {
      const internalRateResult = await supabase.rpc("get_internal_rate", {
        p_from_currency: senderCurrency,
        p_to_currency: receiverCurrency,
        p_transfer_type: "WALLET_TO_WALLET",
      });
      if (internalRateResult.data?.[0]) {
        ratePublic = internalRateResult.data[0].rate_public || 1;
        rateInternal = internalRateResult.data[0].rate_internal || ratePublic;
      } else {
        ratePublic = await getFxRate(supabase, senderCurrency, receiverCurrency);
        rateInternal = ratePublic * (1 + SECURITY_MARGIN);
      }
      amountReceivedReal = Math.round(amountAfterFee * rateInternal * 100) / 100;
    } else {
      amountReceivedReal = amountAfterFee;
    }
  }

  const amountReceivedDisplayed = senderCurrency !== receiverCurrency
    ? Math.round(amountAfterFee * ratePublic * 100) / 100
    : amountAfterFee;

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  const signature = await generateSignature(transferCode, amount);

  // Create secure_transactions record
  const { error: secureInsertError } = await supabase
    .from("secure_transactions")
    .insert({
      id: transferCode,
      user_id: sender_id,
      requested_amount: amount,
      fee_amount: feeAmount,
      total_amount: amount,
      net_amount: amountAfterFee,
      signature,
      status: "pending",
      transaction_type: isInternational ? "international_transfer" : "wallet_transfer",
      metadata: { receiver_id, senderCurrency, receiverCurrency, ratePublic, isInternational, senderCountry, receiverCountry }
    });

  if (secureInsertError) {
    console.error("Secure transaction insert failed:", secureInsertError);
    throw new Error("Erreur de sécurité transaction");
  }

  // Create wallet_transfers record
  const { data: transfer, error: transferError } = await supabase
    .from("wallet_transfers")
    .insert({
      transfer_code: transferCode,
      sender_id,
      receiver_id,
      sender_wallet_id: senderWallet.id,
      receiver_wallet_id: receiverWallet.id,
      amount_sent: amount,
      currency_sent: senderCurrency,
      fee_percentage: feePercentage,
      fee_amount: feeAmount,
      amount_after_fee: amountAfterFee,
      rate_displayed: ratePublic,
      rate_used: rateInternal,
      amount_received: Math.round(amountReceivedReal * 100) / 100,
      currency_received: receiverCurrency,
      transfer_type: isInternational ? "INTERNATIONAL" : "WALLET_TO_WALLET",
      description,
      status: "processing",
      sender_country: senderCountry,
      receiver_country: receiverCountry,
      ip_address: clientIP,
      user_agent: userAgent,
      signature,
    })
    .select()
    .single();

  if (transferError) {
    console.error("Transfer record creation failed:", transferError);
    await supabase.from("secure_transactions").update({ status: "failed" }).eq("id", transferCode);
    throw new Error("Erreur lors de la création du transfert");
  }

  // Execute atomic transfer
  try {
    // Debit sender
    const { error: debitError } = await supabase
      .from("wallets")
      .update({
        balance: senderWallet.balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", senderWallet.id)
      .eq("balance", senderWallet.balance);

    if (debitError) throw new Error("Échec du débit du wallet expéditeur");

    // Credit receiver with REAL amount
    const { error: creditError } = await supabase
      .from("wallets")
      .update({
        balance: receiverWallet.balance + Math.round(amountReceivedReal * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receiverWallet.id);

    if (creditError) {
      // Rollback debit
      await supabase.from("wallets").update({ balance: senderWallet.balance }).eq("id", senderWallet.id);
      throw new Error("Échec du crédit du wallet destinataire");
    }

    // Mark completed
    await Promise.all([
      supabase.from("wallet_transfers").update({
        status: "completed",
        confirmed_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }).eq("id", transfer.id),
      supabase.from("secure_transactions").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", transferCode),
    ]);

    await logFinancialAudit(supabase, sender_id, isInternational ? "international_transfer_completed" : "transfer_completed", {
      transferCode, amount, receiver_id, amountReceived: amountReceivedReal, isInternational, senderCountry, receiverCountry
    });

    // Create transaction history entries
    await Promise.all([
      supabase.from("wallet_transactions").insert({
        wallet_id: senderWallet.id,
        user_id: sender_id,
        type: "transfer_out",
        amount: -amount,
        currency: senderCurrency,
        description: `${isInternational ? "🌍 Transfert international" : "Transfert"} envoyé: ${transferCode}`,
        status: "completed",
        reference_id: transfer.id,
        metadata: {
          transfer_code: transferCode,
          receiver_id,
          fee_amount: feeAmount,
          rate_displayed: ratePublic,
          is_international: isInternational,
        },
      }),
      supabase.from("wallet_transactions").insert({
        wallet_id: receiverWallet.id,
        user_id: receiver_id,
        type: "transfer_in",
        amount: Math.round(amountReceivedReal * 100) / 100,
        currency: receiverCurrency,
        description: `${isInternational ? "🌍 Transfert international" : "Transfert"} reçu: ${transferCode}`,
        status: "completed",
        reference_id: transfer.id,
        metadata: {
          transfer_code: transferCode,
          sender_id,
          original_amount: amount,
          original_currency: senderCurrency,
          is_international: isInternational,
        },
      }),
    ]);

    console.log(`✅ ${isInternational ? "International" : "Local"} transfer completed: ${transferCode}`);

    const result: TransferResult = {
      success: true,
      transfer_id: transfer.id,
      transfer_code: transferCode,
      amount_sent: amount,
      currency_sent: senderCurrency,
      fee_percentage: feePercentage,
      fee_amount: Math.round(feeAmount),
      amount_after_fee: Math.round(amountAfterFee),
      rate_displayed: ratePublic,
      amount_received: Math.round(amountReceivedReal * 100) / 100,
      currency_received: receiverCurrency,
      is_international: isInternational,
      sender_country: senderCountry,
      receiver_country: receiverCountry,
      commission_conversion: Math.round(commissionConversion),
      frais_international: Math.round(fraisInternational),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (execError: unknown) {
    const errorMessage = execError instanceof Error ? execError.message : "Unknown error";
    await supabase
      .from("wallet_transfers")
      .update({ status: "failed", failed_at: new Date().toISOString(), failure_reason: errorMessage })
      .eq("id", transfer.id);
    throw execError;
  }
}
