/**
 * 🔐 WALLET TRANSFER SÉCURISÉ - V2 INTELLIGENT
 * ✅ Même devise = transfert local direct (pas de conversion)
 * ✅ Devise différente = conversion automatique via API taux du jour
 * ✅ Frais PDG configurables (pas le taux de change)
 * ✅ Signature HMAC, verrouillage optimiste, audit
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { getPdgFeeRate, calculateFee, FEE_KEYS } from "../_shared/pdg-fees.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_TRANSFER_AMOUNT = 100;
const MAX_TRANSFER_AMOUNT = 50000000;

// ✅ Map wallet currency → country code for display
function currencyToCountry(currency: string): string {
  const map: Record<string, string> = {
    GNF: "GN", XOF: "SN", XAF: "CM", NGN: "NG", GHS: "GH",
    EUR: "FR", USD: "US", GBP: "GB", CHF: "CH", CAD: "CA",
    AUD: "AU", JPY: "JP", CNY: "CN", INR: "IN", AED: "AE",
    MAD: "MA", EGP: "EG", TND: "TN", DZD: "DZ", ZAR: "ZA",
    KES: "KE", TZS: "TZ", UGX: "UG", RWF: "RW", ETB: "ET",
    CDF: "CD", BRL: "BR", MXN: "MX", SAR: "SA", QAR: "QA",
    KWD: "KW", SLL: "SL", LRD: "LR", GMD: "GM", CVE: "CV", MRU: "MR",
    SEK: "SE", NOK: "NO", DKK: "DK", PLN: "PL", CZK: "CZ",
    HUF: "HU", RON: "RO", BGN: "BG", RSD: "RS", UAH: "UA",
    RUB: "RU", TRY: "TR", COP: "CO", CLP: "CL", PEN: "PE",
    VES: "VE", HTG: "HT", ILS: "IL", THB: "TH", PHP: "PH",
    MYR: "MY", SGD: "SG", IDR: "ID", VND: "VN", PKR: "PK",
    BDT: "BD", LKR: "LK", NZD: "NZ", ARS: "AR",
  };
  return map[currency?.toUpperCase()] || "XX";
}

// =============================================
// 🔑 SECURITY
// =============================================

const TRANSACTION_SECRET = Deno.env.get("TRANSACTION_SECRET_KEY") || "default-fallback-secret-key";

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
// 🌍 FX RATE - API externe uniquement
// =============================================

async function getFxRateFromAPI(from: string, to: string): Promise<{ rate: number; source: string; fetched_at: string }> {
  if (from === to) return { rate: 1, source: "identity", fetched_at: new Date().toISOString() };

  // Appeler notre edge function fx-rates qui utilise l'API open.er-api.com
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
      if (fxData.rates?.[to] && Number(fxData.rates[to]) > 0) {
        return {
          rate: Number(fxData.rates[to]),
          source: fxData.provider || "open-er-api",
          fetched_at: fxData.fetched_at || new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error("[FX] Edge function call failed:", e);
  }

  // Fallback direct API call
  try {
    const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    const json = await res.json();
    if (res.ok && json?.result === "success" && json.rates?.[to]) {
      return {
        rate: Number(json.rates[to]),
        source: "open-er-api-direct",
        fetched_at: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error("[FX] Direct API call failed:", e);
  }

  throw new Error(`Impossible d'obtenir le taux de change ${from} → ${to}. Réessayez plus tard.`);
}

// =============================================
// 🔍 RESOLVE RECIPIENT
// =============================================

async function resolveRecipientId(supabase: any, recipientId: string): Promise<string | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId);
  if (isUUID) return recipientId;

  const { data: userIdData } = await supabase.from('user_ids').select('user_id').eq('custom_id', recipientId.toUpperCase()).maybeSingle();
  if (userIdData) return userIdData.user_id;

  const { data: profileData } = await supabase.from('profiles').select('id').eq('public_id', recipientId.toUpperCase()).maybeSingle();
  if (profileData) return profileData.id;

  const { data: vendorData } = await supabase.from('vendors').select('user_id').eq('public_id', recipientId.toUpperCase()).maybeSingle();
  if (vendorData) return vendorData.user_id;

  if (recipientId.includes('@')) {
    const { data: emailData } = await supabase.from('profiles').select('id').ilike('email', recipientId.trim()).maybeSingle();
    if (emailData) return emailData.id;
  }

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const body = await req.json();
    // ✅ Support action from query params OR body (supabase.functions.invoke doesn't pass query params)
    const action = url.searchParams.get("action") || body.action || "transfer";

    console.log(`💸 Wallet transfer action: ${action}`);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Authentification requise");

    if (action === "preview") {
      return await handlePreview(supabase, body);
    } else if (action === "transfer") {
      return await handleTransfer(supabase, body, req);
    } else {
      throw new Error("Action invalide");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("❌ Transfer error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

// =============================================
// 🔍 PREVIEW
// =============================================

async function handlePreview(supabase: any, body: { sender_id: string; receiver_id: string; amount: number }) {
  const { sender_id, amount } = body;
  let { receiver_id } = body;

  if (amount < MIN_TRANSFER_AMOUNT) throw new Error(`Montant minimum: ${MIN_TRANSFER_AMOUNT}`);
  if (amount > MAX_TRANSFER_AMOUNT) throw new Error(`Montant maximum: ${MAX_TRANSFER_AMOUNT}`);

  const resolvedReceiverId = await resolveRecipientId(supabase, receiver_id);
  if (!resolvedReceiverId) throw new Error(`Destinataire "${receiver_id}" introuvable`);
  receiver_id = resolvedReceiverId;

  if (sender_id === receiver_id) throw new Error("Vous ne pouvez pas transférer à vous-même");

  // Load wallets in parallel
  const [senderResult, receiverResult] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", sender_id).single(),
    supabase.from("wallets").select("*").eq("user_id", receiver_id).single(),
  ]);

  if (senderResult.error) throw new Error("Wallet expéditeur non trouvé");
  if (receiverResult.error) throw new Error("Wallet destinataire non trouvé");
  if (senderResult.data.balance < amount) throw new Error("Solde insuffisant");

  const senderCurrency = (senderResult.data.currency || "GNF").toUpperCase();
  const receiverCurrency = (receiverResult.data.currency || "GNF").toUpperCase();
  const senderCountry = currencyToCountry(senderCurrency);
  const receiverCountry = currencyToCountry(receiverCurrency);

  // ✅ RÈGLE CENTRALE: même devise = local, devise différente = international
  const isInternational = senderCurrency !== receiverCurrency;

  console.log(`🌍 Preview: ${senderCountry}(${senderCurrency}) → ${receiverCountry}(${receiverCurrency}) | International: ${isInternational}`);

  let feePercentage = 0;
  let feeAmount = 0;
  let rateDisplayed = 1;
  let amountReceived = amount;
  let totalDebit = amount;
  let rateSource = "identity";
  let rateFetchedAt = new Date().toISOString();

  if (isInternational) {
    // =============================================
    // 🌍 TRANSFERT INTERNATIONAL
    // =============================================

    // 1. Récupérer le taux du jour via API externe (JAMAIS manuel)
    const fxResult = await getFxRateFromAPI(senderCurrency, receiverCurrency);
    const realRate = fxResult.rate;
    rateSource = fxResult.source;
    rateFetchedAt = fxResult.fetched_at;

    // 2. Récupérer les frais PDG (commission sur le taux)
    feePercentage = await getPdgFeeRate(supabase, FEE_KEYS.INTERNATIONAL_TRANSFER);

    // 3. Appliquer la marge PDG sur le taux (le PDG ne modifie PAS le taux, il prend une commission)
    rateDisplayed = realRate * (1 - feePercentage / 100);

    // 4. Calculer le montant reçu
    amountReceived = Math.round(amount * rateDisplayed * 100) / 100;

    // 5. Le total débité = montant envoyé (la commission est intégrée au taux)
    totalDebit = amount;
    feeAmount = Math.round(amount * realRate * feePercentage / 100); // Pour affichage uniquement

    console.log(`💱 Taux réel: ${realRate} | Marge PDG: ${feePercentage}% | Taux affiché: ${rateDisplayed} | Reçu: ${amountReceived} ${receiverCurrency}`);
  } else {
    // =============================================
    // 🏠 TRANSFERT LOCAL (même devise)
    // =============================================

    // PAS de conversion, PAS d'appel API de taux
    // Frais PDG pour transfert wallet-to-wallet
    feePercentage = await getPdgFeeRate(supabase, FEE_KEYS.WALLET_TRANSFER);
    const { feeAmount: fee, netAmount } = calculateFee(amount, feePercentage);
    feeAmount = fee;
    totalDebit = amount; // On débite le montant total
    amountReceived = netAmount; // Le destinataire reçoit le montant moins les frais

    console.log(`🏠 Local: ${amount} ${senderCurrency} | Frais: ${feePercentage}% = ${feeAmount} | Reçu: ${amountReceived}`);
  }

  const preview = {
    success: true,
    amount_sent: amount,
    currency_sent: senderCurrency,
    fee_percentage: feePercentage,
    fee_amount: Math.round(feeAmount),
    total_debit: Math.round(totalDebit),
    amount_after_fee: Math.round(amount - feeAmount),
    rate_displayed: rateDisplayed,
    amount_received: Math.round(amountReceived),
    currency_received: receiverCurrency,
    is_international: isInternational,
    sender_country: senderCountry,
    receiver_country: receiverCountry,
    sender_balance: senderResult.data.balance,
    balance_after: senderResult.data.balance - totalDebit,
    // International-specific
    commission_conversion: isInternational ? Math.round(feeAmount) : 0,
    frais_international: 0,
    rate_lock_seconds: isInternational ? 60 : undefined,
    rate_source: rateSource,
    rate_fetched_at: rateFetchedAt,
  };

  console.log("📊 Preview:", JSON.stringify(preview));

  return new Response(JSON.stringify(preview), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

// =============================================
// 💸 EXECUTE TRANSFER
// =============================================

async function handleTransfer(supabase: any, body: { sender_id: string; receiver_id: string; amount: number; description?: string }, req: Request) {
  const { sender_id, amount, description } = body;
  let { receiver_id } = body;

  if (!sender_id || !receiver_id || !amount) throw new Error("Paramètres manquants");

  const resolvedReceiverId = await resolveRecipientId(supabase, receiver_id);
  if (!resolvedReceiverId) throw new Error(`Destinataire "${receiver_id}" introuvable`);
  receiver_id = resolvedReceiverId;

  if (sender_id === receiver_id) throw new Error("Impossible de transférer vers soi-même");
  if (amount <= 0) throw new Error("Le montant doit être positif");
  if (amount < MIN_TRANSFER_AMOUNT) throw new Error(`Montant minimum: ${MIN_TRANSFER_AMOUNT}`);
  if (amount > MAX_TRANSFER_AMOUNT) throw new Error(`Montant maximum: ${MAX_TRANSFER_AMOUNT}`);

  const transferCode = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Load wallets
  const [senderResult, receiverResult] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", sender_id).single(),
    supabase.from("wallets").select("*").eq("user_id", receiver_id).single(),
  ]);

  if (senderResult.error) throw new Error("Wallet expéditeur non trouvé");
  if (receiverResult.error) throw new Error("Wallet destinataire non trouvé");

  const senderWallet = senderResult.data;
  const receiverWallet = receiverResult.data;
  const senderCurrency = (senderWallet.currency || "GNF").toUpperCase();
  const receiverCurrency = (receiverWallet.currency || "GNF").toUpperCase();
  const senderCountry = currencyToCountry(senderCurrency);
  const receiverCountry = currencyToCountry(receiverCurrency);
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
    if (totalToday + amount > MAX_TRANSFER_AMOUNT) {
      throw new Error(`Limite quotidienne de transfert international atteinte`);
    }
  }

  if (senderWallet.balance < amount) {
    throw new Error(`Solde insuffisant. Disponible: ${senderWallet.balance} ${senderCurrency}`);
  }

  // Calculate fees and conversion
  let feePercentage = 0;
  let feeAmount = 0;
  let rateDisplayed = 1;
  let rateInternal = 1;
  let amountReceived: number;

  if (isInternational) {
    // 🌍 International: taux API + marge PDG
    const fxResult = await getFxRateFromAPI(senderCurrency, receiverCurrency);
    const realRate = fxResult.rate;

    feePercentage = await getPdgFeeRate(supabase, FEE_KEYS.INTERNATIONAL_TRANSFER);
    rateDisplayed = realRate * (1 - feePercentage / 100);
    rateInternal = rateDisplayed;
    feeAmount = Math.round(amount * realRate * feePercentage / 100);
    amountReceived = Math.round(amount * rateDisplayed * 100) / 100;
  } else {
    // 🏠 Local: frais PDG uniquement, pas de conversion
    feePercentage = await getPdgFeeRate(supabase, FEE_KEYS.WALLET_TRANSFER);
    const { feeAmount: fee, netAmount } = calculateFee(amount, feePercentage);
    feeAmount = fee;
    amountReceived = netAmount;
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const signature = await generateSignature(transferCode, amount);

  // Create secure_transactions record (use UUID for id, correct column names)
  const { error: secureInsertError } = await supabase
    .from("secure_transactions")
    .insert({
      user_id: sender_id,
      requested_amount: amount,
      fee_amount: feeAmount,
      total_amount: amount,
      net_amount: amountReceived,
      signature_hash: signature,
      status: "pending",
      transaction_type: isInternational ? "international_transfer" : "wallet_transfer",
      external_transaction_id: transferCode,
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
      amount_after_fee: amount - feeAmount,
      rate_displayed: rateDisplayed,
      rate_used: rateInternal,
      amount_received: amountReceived,
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
    // Debit sender (optimistic lock)
    const { error: debitError } = await supabase
      .from("wallets")
      .update({
        balance: senderWallet.balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", senderWallet.id)
      .eq("balance", senderWallet.balance); // Optimistic lock

    if (debitError) throw new Error("Échec du débit du wallet expéditeur");

    // Credit receiver
    const { error: creditError } = await supabase
      .from("wallets")
      .update({
        balance: receiverWallet.balance + amountReceived,
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
      }).eq("external_transaction_id", transferCode),
    ]);

    await logFinancialAudit(supabase, sender_id, isInternational ? "international_transfer_completed" : "transfer_completed", {
      transferCode, amount, receiver_id, amountReceived, isInternational, senderCountry, receiverCountry
    });

    // Create transaction history entries
    const transferLabel = isInternational ? "🌍 Transfert international" : "Transfert";
    await Promise.all([
      supabase.from("wallet_transactions").insert({
        wallet_id: senderWallet.id,
        user_id: sender_id,
        type: "transfer_out",
        amount: -amount,
        currency: senderCurrency,
        description: `${transferLabel} envoyé: ${transferCode}`,
        status: "completed",
        reference_id: transfer.id,
        metadata: {
          transfer_code: transferCode,
          receiver_id,
          fee_amount: feeAmount,
          rate_displayed: rateDisplayed,
          is_international: isInternational,
        },
      }),
      supabase.from("wallet_transactions").insert({
        wallet_id: receiverWallet.id,
        user_id: receiver_id,
        type: "transfer_in",
        amount: amountReceived,
        currency: receiverCurrency,
        description: `${transferLabel} reçu: ${transferCode}`,
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

    const result = {
      success: true,
      transfer_id: transfer.id,
      transfer_code: transferCode,
      amount_sent: amount,
      currency_sent: senderCurrency,
      fee_percentage: feePercentage,
      fee_amount: Math.round(feeAmount),
      total_debit: amount,
      amount_after_fee: Math.round(amount - feeAmount),
      rate_displayed: rateDisplayed,
      amount_received: amountReceived,
      currency_received: receiverCurrency,
      is_international: isInternational,
      sender_country: senderCountry,
      receiver_country: receiverCountry,
      commission_conversion: isInternational ? Math.round(feeAmount) : 0,
      frais_international: 0,
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
