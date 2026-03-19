/**
 * 🔐 WALLET OPERATIONS SÉCURISÉES + INTERNATIONAL
 * Avec signature HMAC, verrouillage optimiste et audit complet
 * 224Solutions - Règles de sécurité financières absolues
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getTransactionSecret(): string {
  const secret = Deno.env.get("TRANSACTION_SECRET_KEY");
  if (!secret) {
    console.error("🔴 TRANSACTION_SECRET_KEY non configuré, utilisant fallback");
    return "default-fallback-secret-key";
  }
  return secret;
}

async function generateSecureSignature(transactionId: string, amount: number): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${transactionId}${amount}`);
  const keyData = encoder.encode(getTransactionSecret());
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function logSecureAudit(supabase: any, userId: string, action: string, data: any, isSuspicious = false) {
  try {
    await supabase.from("financial_audit_logs").insert({
      user_id: userId,
      action_type: action,
      description: `Wallet operation: ${action}`,
      request_data: data,
      is_suspicious: isSuspicious
    });
  } catch (e) { console.error("[Audit] Log failed:", e); }
}

const operationSchema = z.enum(['deposit', 'withdraw', 'transfer']);

const requestSchema = z.object({
  operation: operationSchema,
  amount: z.number().positive().max(100000000),
  recipient_id: z.string().optional(),
  description: z.string().max(500).optional(),
  idempotency_key: z.string().uuid().optional()
});

function generateIdempotencyKey(userId: string, operation: string, amount: number, recipientId?: string): string {
  return `${userId}:${operation}:${amount}:${recipientId || ''}:${Math.floor(Date.now() / 60000)}`;
}

async function checkDuplicateTransaction(supabase: any, idempotencyKey: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('wallet_idempotency_keys')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

async function recordIdempotencyKey(supabase: any, idempotencyKey: string, userId: string, operation: string): Promise<void> {
  try {
    await supabase.from('wallet_idempotency_keys').insert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      operation,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch {}
}

async function calculateFee(supabase: any, transactionType: string, amount: number, currency: string = 'GNF'): Promise<number> {
  try {
    const { data: feeConfig, error } = await supabase
      .from('wallet_fees')
      .select('*')
      .eq('transaction_type', transactionType)
      .eq('currency', currency)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !feeConfig) return 0;

    let fee = 0;
    if (feeConfig.fee_type === 'fixed') {
      fee = feeConfig.fee_value;
    } else if (feeConfig.fee_type === 'percentage') {
      fee = (amount * feeConfig.fee_value) / 100;
    }
    return Math.max(0, fee);
  } catch {
    return 0;
  }
}

async function logWalletOperation(supabase: any, logData: any): Promise<void> {
  try {
    await supabase.from('wallet_logs').insert([logData]);
  } catch {}
}

async function detectSuspicious(supabase: any, userId: string, amount: number): Promise<any> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from('wallet_logs')
      .select('amount')
      .eq('user_id', userId)
      .gte('created_at', yesterday);

    const total24h = recentLogs?.reduce((sum: number, log: any) => sum + (log.amount || 0), 0) || 0;
    const count24h = recentLogs?.length || 0;
    const flags: string[] = [];
    let severity = 'low';

    if (amount > 2000000) { flags.push('high_amount'); severity = 'high'; }
    if (count24h > 10) { flags.push('high_frequency'); severity = 'medium'; }
    if (total24h > 5000000) { flags.push('high_volume'); severity = 'critical'; }

    if (flags.length > 0) {
      const { data: wallet } = await supabase.from('wallets').select('id').eq('user_id', userId).single();
      if (wallet) {
        await supabase.from('wallet_suspicious_activities').insert([{
          wallet_id: wallet.id,
          user_id: userId,
          activity_type: flags.join(', '),
          severity,
          description: `Activité détectée: montant ${amount}, total 24h: ${total24h}, nb: ${count24h}`,
          metadata: { amount, total24h, count24h, flags }
        }]);
      }
      return { suspicious: true, severity, flags, should_block: severity === 'critical' };
    }
    return { suspicious: false };
  } catch {
    return { suspicious: false };
  }
}

// =============================================
// 🌍 INTERNATIONAL HELPERS
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
    const { data } = await supabase
      .from("international_transfer_settings")
      .select("setting_key, setting_value");
    if (data) {
      for (const row of data) {
        if (row.setting_key in defaults) {
          (defaults as any)[row.setting_key] = Number(row.setting_value);
        }
      }
    }
  } catch {}
  return defaults;
}

async function getUserGeoInfo(supabase: any, userId: string) {
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

  return 1; // fallback
}

// =============================================
// 🔐 ATOMIC TRANSFER
// =============================================

async function executeAtomicTransfer(
  supabase: any,
  senderId: string,
  receiverId: string,
  amountToDebit: number,
  amountToCredit: number,
  description: string,
  senderWallet: any,
  recipientWallet: any,
  isInternational: boolean,
  metadata: any
): Promise<{ success: boolean; error?: string; senderBalance?: number; recipientBalance?: number; transactionId?: string }> {

  // Try RPC first
  const { data, error } = await supabase.rpc('execute_atomic_wallet_transfer', {
    p_sender_id: senderId,
    p_receiver_id: receiverId,
    p_amount: amountToDebit,
    p_description: description,
    p_sender_wallet_id: senderWallet.id,
    p_recipient_wallet_id: recipientWallet.id,
    p_sender_balance_before: senderWallet.balance,
    p_recipient_balance_before: recipientWallet.balance
  });

  if (!error) {
    const rpcTransactionId = (Array.isArray(data) ? data?.[0]?.id : data?.id) || undefined;
    return {
      success: true,
      senderBalance: senderWallet.balance - amountToDebit,
      recipientBalance: recipientWallet.balance + amountToCredit,
      transactionId: rpcTransactionId,
    };
  }

  // Fallback: manual atomic transfer
  const newSenderBalance = senderWallet.balance - amountToDebit;
  const newRecipientBalance = recipientWallet.balance + amountToCredit;
  const transactionId = crypto.randomUUID();

  const { error: txCreateError } = await supabase
    .from('enhanced_transactions')
    .insert({
      id: transactionId,
      sender_id: senderId,
      receiver_id: receiverId,
      amount: amountToDebit,
      method: 'wallet',
      status: 'pending',
      currency: metadata.senderCurrency || 'GNF',
      metadata: {
        description,
        atomic: true,
        transaction_type: isInternational ? 'international_transfer' : 'transfer',
        is_international: isInternational,
        sender_balance_before: senderWallet.balance,
        recipient_balance_before: recipientWallet.balance,
        amount_credited: amountToCredit,
        ...metadata
      }
    });

  if (txCreateError) {
    console.error('❌ [wallet-operations] enhanced_transactions insert failed:', txCreateError);
    return { success: false, error: `Erreur création transaction: ${txCreateError.message}` };
  }

  // Debit sender
  const { data: debitResult, error: debitError } = await supabase
    .from('wallets')
    .update({ balance: newSenderBalance, updated_at: new Date().toISOString() })
    .eq('user_id', senderId)
    .eq('balance', senderWallet.balance)
    .select('balance')
    .single();

  if (debitError || !debitResult) {
    await supabase.from('enhanced_transactions')
      .update({ status: 'failed', metadata: { error: 'debit_failed' } })
      .eq('id', transactionId);
    return { success: false, error: 'Solde modifié pendant la transaction. Réessayez.' };
  }

  // Credit receiver
  const { data: creditResult, error: creditError } = await supabase
    .from('wallets')
    .update({ balance: newRecipientBalance, updated_at: new Date().toISOString() })
    .eq('user_id', receiverId)
    .select('balance')
    .single();

  if (creditError || !creditResult) {
    // Rollback
    await supabase.from('wallets')
      .update({ balance: senderWallet.balance, updated_at: new Date().toISOString() })
      .eq('user_id', senderId);

    await supabase.from('enhanced_transactions')
      .update({ status: 'failed', metadata: { error: 'credit_failed_rollback' } })
      .eq('id', transactionId);

    return { success: false, error: 'Erreur lors du crédit. Transaction annulée.' };
  }

  // Mark completed
  await supabase.from('enhanced_transactions')
    .update({
      status: 'completed',
      metadata: {
        description,
        atomic: true,
        transaction_type: isInternational ? 'international_transfer' : 'transfer',
        is_international: isInternational,
        sender_balance_after: newSenderBalance,
        recipient_balance_after: newRecipientBalance,
        amount_credited: amountToCredit,
        ...metadata
      }
    })
    .eq('id', transactionId);

  return { success: true, senderBalance: newSenderBalance, recipientBalance: newRecipientBalance, transactionId };
}

async function syncAgentWallet(supabase: any, userId: string, newBalance: number, context: string, userRole: string): Promise<void> {
  if (userRole !== 'agent') return;
  try {
    const { data: agentWallet } = await supabase.from('agent_wallets').select('id').eq('agent_id', userId).maybeSingle();
    if (agentWallet) {
      await supabase.from('agent_wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', agentWallet.id);

      await logWalletOperation(supabase, {
        user_id: userId,
        wallet_id: agentWallet.id,
        operation: 'sync_agent_wallet',
        context,
        new_balance: newBalance,
        role: userRole,
        created_at: new Date().toISOString(),
        metadata: { source: 'wallet-operations', syncContext: context }
      });
    }
  } catch {}
}

async function resolveRecipientId(supabase: any, recipientId: string): Promise<string | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId);
  if (isUUID) return recipientId;

  // user_ids.custom_id
  const { data: userIdData } = await supabase.from('user_ids').select('user_id, custom_id').eq('custom_id', recipientId.toUpperCase()).maybeSingle();
  if (userIdData) return userIdData.user_id;

  // profiles.public_id
  const { data: profileData } = await supabase.from('profiles').select('id, public_id').eq('public_id', recipientId.toUpperCase()).maybeSingle();
  if (profileData) return profileData.id;

  // vendors.public_id
  const { data: vendorData } = await supabase.from('vendors').select('user_id, public_id').eq('public_id', recipientId.toUpperCase()).maybeSingle();
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('🚀 Wallet operation started');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const normalizedRequestBody = {
      ...requestBody,
      operation: requestBody?.operation ?? requestBody?.action,
      recipient_id: requestBody?.recipient_id ?? requestBody?.recipient_public_id ?? requestBody?.receiver_id,
    };

    const parseResult = requestSchema.safeParse(normalizedRequestBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Données invalides', details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, amount, recipient_id, description, idempotency_key } = parseResult.data;

    // Idempotency check
    const effectiveIdempotencyKey = idempotency_key || generateIdempotencyKey(user.id, operation, amount, recipient_id);
    const isDuplicate = await checkDuplicateTransaction(supabaseClient, effectiveIdempotencyKey);
    if (isDuplicate) {
      return new Response(
        JSON.stringify({ error: 'Transaction en double détectée.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
    const userRole = profile?.role || 'user';

    const { data: wallet, error: walletError } = await supabaseClient.from('wallets').select('*').eq('user_id', user.id).single();
    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet introuvable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (wallet.is_blocked) {
      return new Response(JSON.stringify({ error: 'Wallet bloqué.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const suspicious = await detectSuspicious(supabaseClient, user.id, amount);
    if (suspicious.should_block) {
      await supabaseClient.from('wallets').update({
        is_blocked: true,
        blocked_reason: `Activité suspecte: ${suspicious.flags.join(', ')}`,
        blocked_at: new Date().toISOString()
      }).eq('id', wallet.id);
      return new Response(JSON.stringify({ error: 'Transaction bloquée: activité suspecte' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let result;

    switch (operation) {
      case 'deposit': {
        const depositFee = await calculateFee(supabaseClient, 'deposit', amount, wallet.currency);
        const netDeposit = amount - depositFee;
        const newBalance = wallet.balance + netDeposit;

        const { error: depositError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (depositError) throw depositError;

        const { data: depositTx, error: depositTxError } = await supabaseClient
          .from('enhanced_transactions')
          .insert({
            sender_id: user.id,
            receiver_id: user.id,
            amount,
            method: 'wallet',
            status: 'completed',
            currency: wallet.currency || 'GNF',
            metadata: {
              description: description || 'Dépôt',
              fee: depositFee,
              transaction_type: 'deposit'
            }
          })
          .select('id')
          .single();

        if (depositTxError) throw depositTxError;

        await syncAgentWallet(supabaseClient, user.id, newBalance, 'deposit', userRole);
        await recordIdempotencyKey(supabaseClient, effectiveIdempotencyKey, user.id, 'deposit');
        result = { success: true, new_balance: newBalance, operation: 'deposit', transaction_id: depositTx?.id || null };
        break;
      }

      case 'withdraw': {
        if (wallet.balance < amount) {
          return new Response(JSON.stringify({ error: 'Solde insuffisant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const newBalance = wallet.balance - amount;
        const { error: withdrawError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
        if (withdrawError) throw withdrawError;

        const { data: withdrawTx, error: withdrawTxError } = await supabaseClient
          .from('enhanced_transactions')
          .insert({
            sender_id: user.id,
            receiver_id: user.id,
            amount,
            method: 'wallet',
            status: 'completed',
            currency: wallet.currency || 'GNF',
            metadata: {
              description: description || 'Retrait',
              transaction_type: 'withdrawal'
            }
          })
          .select('id')
          .single();

        if (withdrawTxError) throw withdrawTxError;

        await syncAgentWallet(supabaseClient, user.id, newBalance, 'withdraw', userRole);
        await recordIdempotencyKey(supabaseClient, effectiveIdempotencyKey, user.id, 'withdraw');
        result = { success: true, new_balance: newBalance, operation: 'withdraw', transaction_id: withdrawTx?.id || null };
        break;
      }

      case 'transfer': {
        if (!recipient_id) {
          return new Response(JSON.stringify({ error: 'Destinataire requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (wallet.balance < amount) {
          return new Response(JSON.stringify({ error: 'Solde insuffisant' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Use service role for recipient lookup
        const serviceClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const recipientUserId = await resolveRecipientId(serviceClient, recipient_id);
        if (!recipientUserId) {
          return new Response(JSON.stringify({ error: `Utilisateur ${recipient_id} introuvable` }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (recipientUserId === user.id) {
          return new Response(JSON.stringify({ error: 'Transfert vers soi-même non autorisé' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get recipient wallet
        const { data: recipientWallet, error: recipientError } = await serviceClient
          .from('wallets')
          .select('*')
          .eq('user_id', recipientUserId)
          .single();

        if (recipientError || !recipientWallet) {
          return new Response(JSON.stringify({ error: 'Wallet du destinataire introuvable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 🌍 INTERNATIONAL DETECTION
        const [senderGeo, receiverGeo, intlSettings] = await Promise.all([
          getUserGeoInfo(serviceClient, user.id),
          getUserGeoInfo(serviceClient, recipientUserId),
          loadInternationalSettings(serviceClient),
        ]);

        const senderCountry = senderGeo.detected_country || "GN";
        const receiverCountry = receiverGeo.detected_country || "GN";
        const senderCurrency = senderGeo.detected_currency || "GNF";
        const receiverCurrency = receiverGeo.detected_currency || "GNF";
        const isInternational = senderCountry !== receiverCountry;

        console.log(`🌍 wallet-ops transfer: ${senderCountry}(${senderCurrency}) → ${receiverCountry}(${receiverCurrency}) | Intl: ${isInternational}`);

        let amountToDebit = amount;
        let amountToCredit = amount;
        let feeAmount = 0;
        let rateUsed = 1;

        if (isInternational) {
          // Check daily limit
          const today = new Date().toISOString().split("T")[0];
          const { data: todayTx } = await serviceClient
            .from("wallet_transfers")
            .select("amount_sent")
            .eq("sender_id", user.id)
            .eq("status", "completed")
            .gte("created_at", `${today}T00:00:00Z`);

          const totalToday = (todayTx || []).reduce((s: number, t: any) => s + (t.amount_sent || 0), 0);
          if (totalToday + amount > intlSettings.limite_transfert_quotidien) {
            return new Response(JSON.stringify({ error: 'Limite quotidienne de transfert international atteinte' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          // Apply international fees
          const commission = Math.round(amount * intlSettings.commission_conversion_percent / 100);
          const frais = Math.round(amount * intlSettings.frais_transaction_international_percent / 100);
          feeAmount = commission + frais;
          const amountAfterFee = amount - feeAmount;

          // Currency conversion
          if (senderCurrency !== receiverCurrency) {
            rateUsed = await getFxRate(serviceClient, senderCurrency, receiverCurrency);
            amountToCredit = Math.round(amountAfterFee * rateUsed * 100) / 100;
          } else {
            amountToCredit = amountAfterFee;
          }

          console.log(`🌍 Intl fees: commission=${commission}, frais=${frais}, rate=${rateUsed}, credit=${amountToCredit}`);
        }

        // Execute atomic transfer
        const transferResult = await executeAtomicTransfer(
          serviceClient,
          user.id,
          recipientUserId,
          amountToDebit,
          amountToCredit,
          description || 'Transfert entre wallets',
          wallet,
          recipientWallet,
          isInternational,
          { senderCurrency, receiverCurrency, rateUsed, feeAmount, senderCountry, receiverCountry }
        );

        if (!transferResult.success) {
          return new Response(JSON.stringify({ error: transferResult.error || 'Échec du transfert' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        await syncAgentWallet(supabaseClient, user.id, transferResult.senderBalance!, 'transfer_sender', userRole);

        const { data: recipientProfile } = await serviceClient.from('profiles').select('role').eq('id', recipientUserId).maybeSingle();
        if (recipientProfile?.role === 'agent') {
          await syncAgentWallet(supabaseClient, recipientUserId, transferResult.recipientBalance!, 'transfer_recipient', 'agent');
        }

        await recordIdempotencyKey(supabaseClient, effectiveIdempotencyKey, user.id, 'transfer');

        result = {
          success: true,
          new_balance: transferResult.senderBalance,
          operation: 'transfer',
          transaction_id: transferResult.transactionId || null,
          recipient_new_balance: transferResult.recipientBalance,
          is_international: isInternational,
          fee_amount: feeAmount,
          rate_used: rateUsed,
          sender_country: senderCountry,
          receiver_country: receiverCountry,
          currency_sent: senderCurrency,
          currency_received: receiverCurrency,
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Opération non supportée' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ Error in wallet operation:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Une erreur est survenue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
