import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🔧 FONCTIONS HELPER

/**
 * Calculer les frais de transaction
 */
async function calculateFee(supabase: any, transactionType: string, amount: number, currency: string = 'GNF'): Promise<number> {
  try {
    const { data: feeConfig, error } = await supabase
      .from('wallet_fees')
      .select('*')
      .eq('transaction_type', transactionType)
      .eq('currency', currency)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !feeConfig) {
      return 0;
    }

    let fee = 0;
    if (feeConfig.fee_type === 'fixed') {
      fee = feeConfig.fee_value;
    } else if (feeConfig.fee_type === 'percentage') {
      fee = (amount * feeConfig.fee_value) / 100;
    }

    return Math.max(0, fee);
  } catch (error) {
    console.error('⚠️ Erreur calculateFee:', error);
    return 0;
  }
}

/**
 * Logger une opération wallet
 */
async function logWalletOperation(supabase: any, logData: any): Promise<void> {
  try {
    await supabase.from('wallet_logs').insert([logData]);
  } catch (error) {
    console.error('⚠️ Erreur logging:', error);
  }
}

/**
 * Détecter activité suspecte
 */
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

    const flags = [];
    let severity = 'low';

    if (amount > 2000000) {
      flags.push('high_amount');
      severity = 'high';
    }

    if (count24h > 10) {
      flags.push('high_frequency');
      severity = 'medium';
    }

    if (total24h > 5000000) {
      flags.push('high_volume');
      severity = 'critical';
    }

    if (flags.length > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallet_suspicious_activities')
          .insert([{
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
  } catch (error) {
    console.error('⚠️ Erreur detectSuspicious:', error);
    return { suspicious: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    
    console.log('👤 User authenticated:', { userId: user?.id });
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      throw new Error('Non autorisé');
    }

    const requestBody = await req.json();
    const { operation, amount, recipient_id, description } = requestBody;
    
    console.log('📝 Request:', { operation, amount, recipient_id, description });

    // Validation
    if (!operation) {
      throw new Error('Opération requise');
    }
    
    if (!amount || amount <= 0) {
      throw new Error('Montant invalide');
    }

    // Vérifier le wallet de l'utilisateur
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('💰 Wallet data:', { wallet, walletError });

    if (walletError || !wallet) {
      throw new Error('Wallet introuvable');
    }

    let result;

    // 🔍 Détecter activités suspectes
    const suspicious = await detectSuspicious(supabaseClient, user.id, amount);
    if (suspicious.should_block) {
      // Bloquer le wallet automatiquement
      await supabaseClient
        .from('wallets')
        .update({ 
          is_blocked: true, 
          blocked_reason: `Activité suspecte: ${suspicious.flags.join(', ')}`,
          blocked_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      throw new Error('Transaction bloquée: activité suspecte détectée');
    }

    // Vérifier si le wallet est bloqué
    if (wallet.is_blocked) {
      throw new Error('Wallet bloqué. Contactez le support.');
    }

    switch (operation) {
      case 'deposit':
        console.log('➕ Processing deposit...');
        
        // Calculer frais
        const depositFee = await calculateFee(supabaseClient, 'deposit', amount, wallet.currency);
        const netDeposit = amount - depositFee;
        
        const balanceBeforeDeposit = wallet.balance;
        const newBalanceDeposit = balanceBeforeDeposit + netDeposit;
        
        const { error: depositError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceDeposit })
          .eq('user_id', user.id);

        if (depositError) {
          console.error('❌ Deposit error:', depositError);
          throw depositError;
        }

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

        if (depositTxError) {
          console.error('❌ Deposit transaction error:', depositTxError);
          throw depositTxError;
        }

        console.log('✅ Deposit successful:', { newBalance: newBalanceDeposit });
        result = { success: true, new_balance: newBalanceDeposit, operation: 'deposit' };
        break;

      case 'withdraw':
        console.log('➖ Processing withdraw...');
        // Retrait
        if (wallet.balance < amount) {
          throw new Error('Solde insuffisant');
        }

        const newBalanceWithdraw = wallet.balance - amount;
        
        const { error: withdrawError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceWithdraw })
          .eq('user_id', user.id);

        if (withdrawError) {
          console.error('❌ Withdraw error:', withdrawError);
          throw withdrawError;
        }

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

        if (withdrawTxError) {
          console.error('❌ Withdraw transaction error:', withdrawTxError);
          throw withdrawTxError;
        }

        console.log('✅ Withdraw successful:', { newBalance: newBalanceWithdraw });
        result = { success: true, new_balance: newBalanceWithdraw, operation: 'withdraw' };
        break;

      case 'transfer':
        console.log('💸 Processing transfer...');
        // Transfert
        if (!recipient_id) {
          throw new Error('Destinataire requis');
        }

        if (wallet.balance < amount) {
          throw new Error('Solde insuffisant');
        }

        // 🔍 Détecter si c'est un UUID ou un custom_id
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipient_id);
        let recipientUserId = recipient_id;

        if (!isUUID) {
          // C'est un public_id standardisé, chercher l'user_id correspondant
          console.log('🔍 Recherche par public_id:', recipient_id);
          
          const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('public_id', recipient_id.toUpperCase())
            .single();

          console.log('👤 User profile lookup:', { profileData, profileError });

          if (profileError || !profileData) {
            throw new Error(`Utilisateur avec l'ID ${recipient_id} introuvable`);
          }

          recipientUserId = profileData.id;
          console.log('✅ User ID trouvé:', recipientUserId);
        }

        // 🛡️ DÉTECTION DE FRAUDE (NOUVEAU - comme Amazon)
        console.log('🛡️ Running fraud detection...');
        try {
          const fraudCheckResult = await supabaseClient.functions.invoke('fraud-detection', {
            body: {
              userId: user.id,
              amount,
              recipientId: recipientUserId,
              method: 'wallet',
              metadata: { description, currency: wallet.currency }
            }
          });

          console.log('🔍 Fraud check result:', fraudCheckResult.data);

          if (fraudCheckResult.data) {
            const { riskLevel, requiresMFA, flags } = fraudCheckResult.data;

            // Bloquer si risque critique
            if (riskLevel === 'critical') {
              console.error('❌ TRANSACTION BLOCKED - Critical risk detected');
              throw new Error(`Transaction bloquée pour raison de sécurité: ${flags.join(', ')}`);
            }

            // Avertir si risque élevé (mais autoriser)
            if (riskLevel === 'high') {
              console.warn('⚠️ HIGH RISK TRANSACTION - Proceeding with caution');
              // TODO: Demander MFA si requiresMFA = true
            }
          }
        } catch (fraudError: any) {
          // Si le service de fraud detection échoue, on continue mais on log
          console.warn('⚠️ Fraud detection failed, proceeding anyway:', fraudError);
        }

        // Vérifier le wallet du destinataire
        const { data: recipientWallet, error: recipientError } = await supabaseClient
          .from('wallets')
          .select('*')
          .eq('user_id', recipientUserId)
          .single();

        console.log('👥 Recipient wallet:', { recipientWallet, recipientError });

        if (recipientError || !recipientWallet) {
          throw new Error('Wallet du destinataire introuvable');
        }

        // Débiter l'expéditeur
        const newBalanceSender = wallet.balance - amount;
        const { error: senderUpdateError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceSender })
          .eq('user_id', user.id);

        if (senderUpdateError) {
          console.error('❌ Sender update error:', senderUpdateError);
          throw senderUpdateError;
        }

        // Créditer le destinataire
        const newBalanceRecipient = recipientWallet.balance + amount;
        const { error: recipientUpdateError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalanceRecipient })
          .eq('user_id', recipientUserId);

        if (recipientUpdateError) {
          console.error('❌ Recipient update error:', recipientUpdateError);
          throw recipientUpdateError;
        }

        // Créer la transaction
        const { error: transferTxError } = await supabaseClient
          .from('enhanced_transactions')
          .insert({
            sender_id: user.id,
            receiver_id: recipientUserId,
            amount: amount,
            method: 'wallet',
            status: 'completed',
            currency: 'GNF',
            metadata: { description: description || 'Transfert entre wallets' }
          });

        if (transferTxError) {
          console.error('❌ Transfer transaction error:', transferTxError);
          throw transferTxError;
        }

        console.log('✅ Transfer successful:', { 
          newBalanceSender, 
          newBalanceRecipient 
        });
        
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

    console.log('✅ Operation completed successfully:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    console.error('❌ Error in wallet operation:', errorMessage, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        message: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
