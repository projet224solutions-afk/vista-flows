import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
      throw new Error('Non autorisé');
    }

    const { operation, amount, recipient_id, description } = await req.json();

    // Vérifier le wallet de l'utilisateur
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error('Wallet introuvable');
    }

    let result;

    switch (operation) {
      case 'deposit':
        // Dépôt
        const newBalanceDeposit = wallet.balance + amount;
        
        const { error: depositError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceDeposit })
          .eq('user_id', user.id);

        if (depositError) throw depositError;

        // Créer la transaction
        const { error: depositTxError } = await supabaseClient
          .from('enhanced_transactions')
          .insert({
            sender_id: user.id,
            receiver_id: user.id,
            amount: amount,
            method: 'deposit',
            status: 'completed',
            currency: 'GNF',
            metadata: { description: description || 'Dépôt sur le wallet' }
          });

        if (depositTxError) throw depositTxError;

        result = { success: true, new_balance: newBalanceDeposit, operation: 'deposit' };
        break;

      case 'withdraw':
        // Retrait
        if (wallet.balance < amount) {
          throw new Error('Solde insuffisant');
        }

        const newBalanceWithdraw = wallet.balance - amount;
        
        const { error: withdrawError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceWithdraw })
          .eq('user_id', user.id);

        if (withdrawError) throw withdrawError;

        // Créer la transaction
        const { error: withdrawTxError } = await supabaseClient
          .from('enhanced_transactions')
          .insert({
            sender_id: user.id,
            receiver_id: user.id,
            amount: amount,
            method: 'withdraw',
            status: 'completed',
            currency: 'GNF',
            metadata: { description: description || 'Retrait du wallet' }
          });

        if (withdrawTxError) throw withdrawTxError;

        result = { success: true, new_balance: newBalanceWithdraw, operation: 'withdraw' };
        break;

      case 'transfer':
        // Transfert
        if (!recipient_id) {
          throw new Error('Destinataire requis');
        }

        if (wallet.balance < amount) {
          throw new Error('Solde insuffisant');
        }

        // Vérifier le wallet du destinataire
        const { data: recipientWallet, error: recipientError } = await supabaseClient
          .from('wallets')
          .select('*')
          .eq('user_id', recipient_id)
          .single();

        if (recipientError || !recipientWallet) {
          throw new Error('Wallet du destinataire introuvable');
        }

        // Débiter l'expéditeur
        const newBalanceSender = wallet.balance - amount;
        const { error: senderUpdateError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceSender })
          .eq('user_id', user.id);

        if (senderUpdateError) throw senderUpdateError;

        // Créditer le destinataire
        const newBalanceRecipient = recipientWallet.balance + amount;
        const { error: recipientUpdateError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceRecipient })
          .eq('user_id', recipient_id);

        if (recipientUpdateError) throw recipientUpdateError;

        // Créer la transaction
        const { error: transferTxError } = await supabaseClient
          .from('enhanced_transactions')
          .insert({
            sender_id: user.id,
            receiver_id: recipient_id,
            amount: amount,
            method: 'wallet',
            status: 'completed',
            currency: 'GNF',
            metadata: { description: description || 'Transfert entre wallets' }
          });

        if (transferTxError) throw transferTxError;

        result = { 
          success: true, 
          new_balance: newBalanceSender, 
          operation: 'transfer',
          recipient_new_balance: newBalanceRecipient
        };
        break;

      default:
        throw new Error('Opération non supportée');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
