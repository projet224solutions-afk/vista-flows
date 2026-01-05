/**
 * STRIPE WITHDRAWAL - Retrait du wallet vers compte bancaire
 * Edge Function pour effectuer un payout Stripe Connect
 * 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WITHDRAWAL] ${step}${detailsStr}`);
};

// Frais de retrait (1.5%)
const WITHDRAWAL_FEE_RATE = 1.5;
const MIN_WITHDRAWAL = 50000; // 50,000 GNF minimum

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    // Vérifier l'authentification
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
      throw new Error("Non autorisé");
    }
    logStep("User authenticated", { userId: user.id });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les données
    const { amount, currency = 'gnf', bankAccountId } = await req.json();

    if (!amount || amount < MIN_WITHDRAWAL) {
      throw new Error(`Montant minimum de retrait: ${MIN_WITHDRAWAL} ${currency.toUpperCase()}`);
    }

    // Vérifier le solde du wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .eq('currency', currency.toUpperCase())
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet non trouvé");
    }

    if (wallet.balance < amount) {
      throw new Error(`Solde insuffisant. Disponible: ${wallet.balance} ${currency.toUpperCase()}`);
    }

    // Calculer les frais
    const withdrawalFee = Math.round(amount * (WITHDRAWAL_FEE_RATE / 100));
    const netAmount = amount - withdrawalFee;

    logStep("Withdrawal details", { 
      amount, 
      withdrawalFee,
      netAmount,
      walletBalance: wallet.balance
    });

    // Débiter le wallet immédiatement
    const newBalance = wallet.balance - amount;
    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({
        balance: newBalance,
        total_sent: wallet.balance,
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      throw new Error("Erreur lors du débit du wallet");
    }

    // Enregistrer la transaction wallet
    await supabaseAdmin
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        amount: -amount,
        type: 'debit',
        description: `Retrait vers compte bancaire - Frais: ${withdrawalFee} ${currency.toUpperCase()}`,
        reference_type: 'withdrawal',
        status: 'completed',
        balance_after: newBalance,
      });

    // Enregistrer dans stripe_withdrawals
    const { data: withdrawal, error: withdrawalInsertError } = await supabaseAdmin
      .from('stripe_withdrawals')
      .insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount: amount,
        fee_amount: withdrawalFee,
        net_amount: netAmount,
        currency: currency.toUpperCase(),
        status: 'pending',
        bank_account_id: bankAccountId || null,
        metadata: {
          requested_at: new Date().toISOString(),
          fee_rate: WITHDRAWAL_FEE_RATE,
        },
      })
      .select('id')
      .single();

    if (withdrawalInsertError) {
      logStep("Error recording withdrawal", { error: withdrawalInsertError.message });
    }

    logStep("Withdrawal processed", { 
      withdrawalId: withdrawal?.id,
      newBalance 
    });

    // Note: Le payout réel vers le compte bancaire sera fait manuellement par l'admin
    // ou via un processus automatisé séparé avec Stripe Connect

    return new Response(
      JSON.stringify({
        success: true,
        withdrawalId: withdrawal?.id,
        amount: amount,
        withdrawalFee: withdrawalFee,
        netAmount: netAmount,
        newBalance: newBalance,
        status: 'pending',
        message: 'Demande de retrait enregistrée. Le virement sera effectué sous 24-48h.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
