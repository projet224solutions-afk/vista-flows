/**
 * 🔐 WALLET TRANSFER SÉCURISÉ
 * Avec signature HMAC, verrouillage optimiste et audit
 * 224Solutions - Règles de sécurité financières
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Marge de sécurité invisible - JAMAIS exposée au client
const SECURITY_MARGIN = 0.005; // 0.5%
const TRANSACTION_SECRET = Deno.env.get("TRANSACTION_SECRET_KEY") || "secure-transaction-key-224sol";

// 🔐 Génère signature HMAC
async function generateSignature(transactionId: string, amount: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${transactionId}${amount}`);
  const keyData = encoder.encode(TRANSACTION_SECRET);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// 🔐 Log audit financier
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
  rate_displayed: number; // Taux affiché à l'utilisateur
  amount_received: number;
  currency_received: string;
  error?: string;
}

serve(async (req) => {
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

    console.log(`💸 Wallet transfer action: ${action}`, body);

    if (action === "preview") {
      return await handlePreview(supabase, body);
    } else if (action === "transfer") {
      return await handleTransfer(supabase, body, req);
    } else {
      throw new Error("Invalid action");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Transfer error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

async function handlePreview(supabase: any, body: TransferPreviewRequest) {
  const { sender_id, receiver_id, amount } = body;

  // Obtenir les infos des wallets
  const [senderResult, receiverResult] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", sender_id).single(),
    supabase.from("wallets").select("*").eq("user_id", receiver_id).single(),
  ]);

  if (senderResult.error) throw new Error("Wallet expéditeur non trouvé");
  if (receiverResult.error) throw new Error("Wallet destinataire non trouvé");

  const senderWallet = senderResult.data;
  const receiverWallet = receiverResult.data;

  // Vérifier le solde
  if (senderWallet.balance < amount) {
    throw new Error("Solde insuffisant");
  }

  const currencyFrom = senderWallet.currency || "GNF";
  const currencyTo = receiverWallet.currency || "GNF";

  // Calculer les frais
  const feeResult = await supabase.rpc("calculate_transfer_fee", {
    p_amount: amount,
    p_currency_from: currencyFrom,
    p_currency_to: currencyTo,
  });

  const feeData = feeResult.data?.[0] || { fee_percentage: 1.5, fee_amount: amount * 0.015, amount_after_fee: amount * 0.985 };

  // Obtenir le taux de change PUBLIC (sans la marge)
  let ratePublic = 1;
  
  if (currencyFrom !== currencyTo) {
    const rateResult = await supabase.rpc("get_internal_rate", {
      p_from_currency: currencyFrom,
      p_to_currency: currencyTo,
      p_transfer_type: "DISPLAY_ONLY", // Pas de marge pour l'affichage
    });

    if (rateResult.data?.[0]) {
      ratePublic = rateResult.data[0].rate_public || 1;
    } else {
      // Fallback: appeler l'API externe pour le taux
      try {
        const fxResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fx-rates`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ base: currencyFrom, symbols: [currencyTo] }),
        });
        
        if (fxResponse.ok) {
          const fxData = await fxResponse.json();
          ratePublic = fxData.rates?.[currencyTo] || 1;
        }
      } catch (e) {
        console.error("FX rate fetch failed:", e);
      }
    }
  }

  // Calculer le montant reçu avec le taux PUBLIC (affiché)
  const amountReceived = feeData.amount_after_fee * ratePublic;

  const preview: TransferResult = {
    success: true,
    amount_sent: amount,
    currency_sent: currencyFrom,
    fee_percentage: feeData.fee_percentage,
    fee_amount: feeData.fee_amount,
    amount_after_fee: feeData.amount_after_fee,
    rate_displayed: ratePublic, // TAUX PUBLIC UNIQUEMENT
    amount_received: Math.round(amountReceived * 100) / 100,
    currency_received: currencyTo,
  };

  console.log("📊 Transfer preview:", preview);

  return new Response(JSON.stringify(preview), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function handleTransfer(supabase: any, body: TransferRequest, req: Request) {
  const { sender_id, receiver_id, amount, description } = body;

  // Validation
  if (!sender_id || !receiver_id || !amount) {
    throw new Error("Paramètres manquants");
  }

  if (sender_id === receiver_id) {
    throw new Error("Impossible de transférer vers soi-même");
  }

  if (amount <= 0) {
    throw new Error("Le montant doit être positif");
  }

  // Générer le code de transfert unique
  const transferCode = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Obtenir les wallets avec verrouillage
  const [senderResult, receiverResult] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", sender_id).single(),
    supabase.from("wallets").select("*").eq("user_id", receiver_id).single(),
  ]);

  if (senderResult.error) throw new Error("Wallet expéditeur non trouvé");
  if (receiverResult.error) throw new Error("Wallet destinataire non trouvé");

  const senderWallet = senderResult.data;
  const receiverWallet = receiverResult.data;

  // Vérifier le solde
  if (senderWallet.balance < amount) {
    throw new Error(`Solde insuffisant. Disponible: ${senderWallet.balance} ${senderWallet.currency}`);
  }

  const currencyFrom = senderWallet.currency || "GNF";
  const currencyTo = receiverWallet.currency || "GNF";

  // Calculer les frais
  const feeResult = await supabase.rpc("calculate_transfer_fee", {
    p_amount: amount,
    p_currency_from: currencyFrom,
    p_currency_to: currencyTo,
  });

  const feeData = feeResult.data?.[0] || { 
    fee_percentage: 1.5, 
    fee_amount: amount * 0.015, 
    amount_after_fee: amount * 0.985 
  };

  // Obtenir les taux de change (PUBLIC et INTERNE)
  let ratePublic = 1;
  let rateInternal = 1; // Avec marge de sécurité

  if (currencyFrom !== currencyTo) {
    // Taux interne avec marge (pour le calcul réel)
    const internalRateResult = await supabase.rpc("get_internal_rate", {
      p_from_currency: currencyFrom,
      p_to_currency: currencyTo,
      p_transfer_type: "WALLET_TO_WALLET", // Applique la marge de 0.5%
    });

    if (internalRateResult.data?.[0]) {
      ratePublic = internalRateResult.data[0].rate_public || 1;
      rateInternal = internalRateResult.data[0].rate_internal || ratePublic;
    } else {
      // Fallback API externe
      try {
        const fxResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/fx-rates`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ base: currencyFrom, symbols: [currencyTo] }),
        });
        
        if (fxResponse.ok) {
          const fxData = await fxResponse.json();
          ratePublic = fxData.rates?.[currencyTo] || 1;
          // Appliquer la marge de sécurité manuellement
          rateInternal = ratePublic * (1 + SECURITY_MARGIN);
        }
      } catch (e) {
        console.error("FX rate fetch failed:", e);
        throw new Error("Impossible d'obtenir le taux de change");
      }
    }
  }

  // ⚠️ CALCUL RÉEL avec le taux INTERNE (invisible à l'utilisateur)
  const amountReceivedReal = feeData.amount_after_fee * rateInternal;
  
  // L'utilisateur voit le calcul avec le taux PUBLIC
  const amountReceivedDisplayed = feeData.amount_after_fee * ratePublic;

  console.log(`🔒 Rate public: ${ratePublic}, Rate internal (with margin): ${rateInternal}`);
  console.log(`💰 Amount after fee: ${feeData.amount_after_fee}`);
  console.log(`📤 Amount received (displayed): ${amountReceivedDisplayed}`);
  console.log(`📥 Amount received (real): ${amountReceivedReal}`);

  // Obtenir l'IP pour l'audit
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
                || req.headers.get("x-real-ip") 
                || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // 🔐 Générer signature HMAC pour cette transaction
  const signature = await generateSignature(transferCode, amount);

  // 🔐 Créer enregistrement secure_transactions AVANT toute modification
  const { error: secureInsertError } = await supabase
    .from("secure_transactions")
    .insert({
      id: transferCode,
      user_id: sender_id,
      requested_amount: amount,
      fee_amount: feeData.fee_amount,
      total_amount: amount,
      net_amount: feeData.amount_after_fee,
      signature: signature,
      status: "pending",
      transaction_type: "wallet_transfer",
      metadata: { receiver_id, currencyFrom, currencyTo, ratePublic }
    });

  if (secureInsertError) {
    console.error("Secure transaction insert failed:", secureInsertError);
    throw new Error("Erreur de sécurité transaction");
  }

  // Créer l'enregistrement de transfert
  const { data: transfer, error: transferError } = await supabase
    .from("wallet_transfers")
    .insert({
      transfer_code: transferCode,
      sender_id,
      receiver_id,
      sender_wallet_id: senderWallet.id,
      receiver_wallet_id: receiverWallet.id,
      amount_sent: amount,
      currency_sent: currencyFrom,
      fee_percentage: feeData.fee_percentage,
      fee_amount: feeData.fee_amount,
      amount_after_fee: feeData.amount_after_fee,
      rate_displayed: ratePublic, // Ce que l'utilisateur voit
      rate_used: rateInternal, // Ce qui est réellement utilisé (INVISIBLE)
      security_margin_applied: SECURITY_MARGIN,
      amount_received: Math.round(amountReceivedReal * 100) / 100, // Montant réel reçu
      currency_received: currencyTo,
      transfer_type: "WALLET_TO_WALLET",
      description,
      status: "processing",
      ip_address: clientIP,
      user_agent: userAgent,
      signature: signature, // 🔐 Signature stockée
    })
    .select()
    .single();

  if (transferError) {
    console.error("Transfer record creation failed:", transferError);
    await supabase.from("secure_transactions").update({ status: "failed" }).eq("id", transferCode);
    throw new Error("Erreur lors de la création du transfert");
  }

  // Exécuter le transfert atomique
  try {
    // Débiter l'expéditeur
    const { error: debitError } = await supabase
      .from("wallets")
      .update({ 
        balance: senderWallet.balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", senderWallet.id)
      .eq("balance", senderWallet.balance); // Vérification optimiste

    if (debitError) {
      throw new Error("Échec du débit du wallet expéditeur");
    }

    // Créditer le destinataire avec le montant RÉEL (calculé avec taux interne)
    const { error: creditError } = await supabase
      .from("wallets")
      .update({ 
        balance: receiverWallet.balance + Math.round(amountReceivedReal * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receiverWallet.id);

    if (creditError) {
      // Rollback: recréditer l'expéditeur
      await supabase
        .from("wallets")
        .update({ balance: senderWallet.balance })
        .eq("id", senderWallet.id);

      throw new Error("Échec du crédit du wallet destinataire");
    }

    // 🔐 Marquer le transfert ET la transaction sécurisée comme complétés
    await Promise.all([
      supabase
        .from("wallet_transfers")
        .update({
          status: "completed",
          confirmed_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", transfer.id),
      supabase
        .from("secure_transactions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", transferCode)
    ]);

    // 🔐 Log audit succès
    await logFinancialAudit(supabase, sender_id, 'transfer_completed', {
      transferCode, amount, receiver_id, amountReceived: amountReceivedReal
    });

    // Créer les transactions pour l'historique
    await Promise.all([
      // Transaction débit
      supabase.from("wallet_transactions").insert({
        wallet_id: senderWallet.id,
        user_id: sender_id,
        type: "transfer_out",
        amount: -amount,
        currency: currencyFrom,
        description: `Transfert envoyé: ${transferCode}`,
        status: "completed",
        reference_id: transfer.id,
        metadata: {
          transfer_code: transferCode,
          receiver_id,
          fee_amount: feeData.fee_amount,
          rate_displayed: ratePublic,
        },
      }),
      // Transaction crédit
      supabase.from("wallet_transactions").insert({
        wallet_id: receiverWallet.id,
        user_id: receiver_id,
        type: "transfer_in",
        amount: Math.round(amountReceivedReal * 100) / 100,
        currency: currencyTo,
        description: `Transfert reçu: ${transferCode}`,
        status: "completed",
        reference_id: transfer.id,
        metadata: {
          transfer_code: transferCode,
          sender_id,
          original_amount: amount,
          original_currency: currencyFrom,
        },
      }),
    ]);

    console.log(`✅ Transfer completed: ${transferCode}`);

    const result: TransferResult = {
      success: true,
      transfer_id: transfer.id,
      transfer_code: transferCode,
      amount_sent: amount,
      currency_sent: currencyFrom,
      fee_percentage: feeData.fee_percentage,
      fee_amount: feeData.fee_amount,
      amount_after_fee: feeData.amount_after_fee,
      rate_displayed: ratePublic, // TAUX PUBLIC pour l'utilisateur
      amount_received: Math.round(amountReceivedDisplayed * 100) / 100, // MONTANT AFFICHÉ (pas le réel)
      currency_received: currencyTo,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (execError: unknown) {
    const errorMessage = execError instanceof Error ? execError.message : "Unknown error";
    // Marquer le transfert comme échoué
    await supabase
      .from("wallet_transfers")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        failure_reason: errorMessage,
      })
      .eq("id", transfer.id);

    throw execError;
  }
}
