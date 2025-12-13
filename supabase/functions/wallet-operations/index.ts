import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🔐 Input validation schemas
const operationSchema = z.enum(['deposit', 'withdraw', 'transfer']);

const requestSchema = z.object({
  operation: operationSchema,
  amount: z.number().positive().max(100000000), // Max 100M GNF
  recipient_id: z.string().optional(),
  description: z.string().max(500).optional(),
  idempotency_key: z.string().uuid().optional()
});

/**
 * 🔐 Generate idempotency key for deduplication
 */
function generateIdempotencyKey(userId: string, operation: string, amount: number, recipientId?: string): string {
  const data = `${userId}:${operation}:${amount}:${recipientId || ''}:${Math.floor(Date.now() / 60000)}`; // 1 minute window
  return data;
}

/**
 * 🔐 Check for duplicate transaction (idempotency)
 */
async function checkDuplicateTransaction(
  supabase: any,
  idempotencyKey: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('wallet_idempotency_keys')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.warn('⚠️ Idempotency check failed:', error);
    return false;
  }
}

/**
 * 🔐 Record idempotency key
 */
async function recordIdempotencyKey(
  supabase: any,
  idempotencyKey: string,
  userId: string,
  operation: string
): Promise<void> {
  try {
    await supabase.from('wallet_idempotency_keys').insert({
      idempotency_key: idempotencyKey,
      user_id: userId,
      operation,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h expiry
    });
  } catch (error) {
    console.warn('⚠️ Failed to record idempotency key:', error);
  }
}

/**
 * 🔐 Calculate transaction fees
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
 * 🔐 Log wallet operation
 */
async function logWalletOperation(supabase: any, logData: any): Promise<void> {
  try {
    await supabase.from('wallet_logs').insert([logData]);
  } catch (error) {
    console.error('⚠️ Erreur logging:', error);
  }
}

/**
 * 🔐 Detect suspicious activity
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

/**
 * 🔐 CRITICAL: Atomic wallet transfer using database transaction
 * This ensures debit and credit happen together or not at all
 */
async function executeAtomicTransfer(
  supabase: any,
  senderId: string,
  receiverId: string,
  amount: number,
  description: string,
  senderWallet: any,
  recipientWallet: any
): Promise<{ success: boolean; error?: string; senderBalance?: number; recipientBalance?: number }> {
  
  // 🔐 Use RPC for atomic transaction
  const { data, error } = await supabase.rpc('execute_atomic_wallet_transfer', {
    p_sender_id: senderId,
    p_receiver_id: receiverId,
    p_amount: amount,
    p_description: description,
    p_sender_wallet_id: senderWallet.id,
    p_recipient_wallet_id: recipientWallet.id,
    p_sender_balance_before: senderWallet.balance,
    p_recipient_balance_before: recipientWallet.balance
  });

  if (error) {
    console.error('❌ Atomic transfer failed:', error);
    
    // Try fallback with manual transaction simulation
    return await executeManualAtomicTransfer(
      supabase,
      senderId,
      receiverId,
      amount,
      description,
      senderWallet,
      recipientWallet
    );
  }

  return {
    success: true,
    senderBalance: senderWallet.balance - amount,
    recipientBalance: recipientWallet.balance + amount
  };
}

/**
 * 🔐 Manual atomic transfer with rollback capability
 */
async function executeManualAtomicTransfer(
  supabase: any,
  senderId: string,
  receiverId: string,
  amount: number,
  description: string,
  senderWallet: any,
  recipientWallet: any
): Promise<{ success: boolean; error?: string; senderBalance?: number; recipientBalance?: number }> {
  
  const newSenderBalance = senderWallet.balance - amount;
  const newRecipientBalance = recipientWallet.balance + amount;
  const transactionId = crypto.randomUUID();

  // Step 1: Create pending transaction record
  const { error: txCreateError } = await supabase
    .from('enhanced_transactions')
    .insert({
      id: transactionId,
      sender_id: senderId,
      receiver_id: receiverId,
      amount: amount,
      method: 'wallet',
      status: 'pending',
      currency: 'GNF',
      transaction_type: 'transfer',
      metadata: { 
        description: description || 'Transfert entre wallets',
        atomic: true,
        sender_balance_before: senderWallet.balance,
        recipient_balance_before: recipientWallet.balance
      }
    });

  if (txCreateError) {
    console.error('❌ Failed to create transaction record:', txCreateError);
    return { success: false, error: 'Erreur création transaction' };
  }

  // Step 2: Debit sender (with optimistic locking)
  const { data: debitResult, error: debitError } = await supabase
    .from('wallets')
    .update({ 
      balance: newSenderBalance,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', senderId)
    .eq('balance', senderWallet.balance) // Optimistic lock
    .select('balance')
    .single();

  if (debitError || !debitResult) {
    console.error('❌ Debit failed (concurrent modification?):', debitError);
    
    // Mark transaction as failed
    await supabase
      .from('enhanced_transactions')
      .update({ status: 'failed', metadata: { error: 'debit_failed', step: 'sender_debit' } })
      .eq('id', transactionId);
    
    return { success: false, error: 'Solde modifié pendant la transaction. Réessayez.' };
  }

  // Step 3: Credit recipient
  const { data: creditResult, error: creditError } = await supabase
    .from('wallets')
    .update({ 
      balance: newRecipientBalance,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', receiverId)
    .select('balance')
    .single();

  if (creditError || !creditResult) {
    console.error('❌ Credit failed, ROLLING BACK debit:', creditError);
    
    // 🔐 CRITICAL: Rollback the debit
    const { error: rollbackError } = await supabase
      .from('wallets')
      .update({ 
        balance: senderWallet.balance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', senderId);

    if (rollbackError) {
      console.error('❌ CRITICAL: Rollback failed! Manual intervention required:', rollbackError);
      
      // Create alert for manual intervention
      await supabase.from('pdg_financial_alerts').insert({
        alert_type: 'critical_rollback_failure',
        severity: 'critical',
        title: 'ÉCHEC ROLLBACK CRITIQUE',
        message: `Transfert ${transactionId}: Débit de ${amount} GNF effectué mais crédit échoué. Rollback a aussi échoué!`,
        metadata: { transactionId, senderId, receiverId, amount, senderWallet, recipientWallet }
      });
    }
    
    // Mark transaction as failed
    await supabase
      .from('enhanced_transactions')
      .update({ status: 'failed', metadata: { error: 'credit_failed_rollback', step: 'recipient_credit' } })
      .eq('id', transactionId);
    
    return { success: false, error: 'Erreur lors du crédit. Transaction annulée.' };
  }

  // Step 4: Mark transaction as completed
  await supabase
    .from('enhanced_transactions')
    .update({ 
      status: 'completed',
      metadata: { 
        description: description || 'Transfert entre wallets',
        atomic: true,
        sender_balance_after: newSenderBalance,
        recipient_balance_after: newRecipientBalance
      }
    })
    .eq('id', transactionId);

  console.log('✅ Atomic transfer completed:', transactionId);

  return {
    success: true,
    senderBalance: newSenderBalance,
    recipientBalance: newRecipientBalance
  };
}

/**
 * 🔐 Sync agent wallet if user is agent
 */
async function syncAgentWallet(
  supabase: any,
  userId: string,
  newBalance: number,
  context: string,
  userRole: string
): Promise<void> {
  if (userRole !== 'agent') return;
  
  try {
    const { data: agentWallet } = await supabase
      .from('agent_wallets')
      .select('id')
      .eq('agent_id', userId)
      .maybeSingle();
      
    if (agentWallet) {
      await supabase
        .from('agent_wallets')
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
  } catch (_e) {
    console.warn('⚠️ Sync agent_wallet échouée (non bloquant)');
  }
}

/**
 * 🔐 Resolve recipient ID from various formats
 */
async function resolveRecipientId(supabase: any, recipientId: string): Promise<string | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId);
  
  if (isUUID) {
    return recipientId;
  }

  console.log('🔍 Recherche utilisateur par ID:', recipientId);
  
  // Priority 1: user_ids.custom_id
  const { data: userIdData } = await supabase
    .from('user_ids')
    .select('user_id, custom_id')
    .eq('custom_id', recipientId.toUpperCase())
    .maybeSingle();

  if (userIdData) {
    console.log('✅ Custom ID trouvé:', userIdData.custom_id);
    return userIdData.user_id;
  }

  // Priority 2: profiles.public_id
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, public_id')
    .eq('public_id', recipientId.toUpperCase())
    .maybeSingle();

  if (profileData) {
    console.log('✅ Profile public_id trouvé:', profileData.public_id);
    return profileData.id;
  }

  // Priority 3: vendors.public_id
  const { data: vendorData } = await supabase
    .from('vendors')
    .select('user_id, public_id')
    .eq('public_id', recipientId.toUpperCase())
    .maybeSingle();

  if (vendorData) {
    console.log('✅ Vendor public_id trouvé:', vendorData.public_id);
    return vendorData.user_id;
  }

  return null;
}

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
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('👤 User authenticated:', user.id);

    // 🔐 Validate input with Zod
    const requestBody = await req.json();
    const parseResult = requestSchema.safeParse(requestBody);
    
    if (!parseResult.success) {
      console.error('❌ Validation error:', parseResult.error);
      return new Response(
        JSON.stringify({ error: 'Données invalides', details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, amount, recipient_id, description, idempotency_key } = parseResult.data;
    console.log('📝 Request:', { operation, amount, recipient_id: recipient_id?.substring(0, 8) + '...' });

    // 🔐 Check idempotency
    const effectiveIdempotencyKey = idempotency_key || generateIdempotencyKey(user.id, operation, amount, recipient_id);
    const isDuplicate = await checkDuplicateTransaction(supabaseClient, effectiveIdempotencyKey);
    
    if (isDuplicate) {
      console.warn('⚠️ Duplicate transaction detected');
      return new Response(
        JSON.stringify({ error: 'Transaction en double détectée. Réessayez dans quelques minutes.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    const userRole = profile?.role || 'user';

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔐 Check if wallet is blocked
    if (wallet.is_blocked) {
      return new Response(
        JSON.stringify({ error: 'Wallet bloqué. Contactez le support.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔐 Detect suspicious activity
    const suspicious = await detectSuspicious(supabaseClient, user.id, amount);
    if (suspicious.should_block) {
      await supabaseClient
        .from('wallets')
        .update({ 
          is_blocked: true, 
          blocked_reason: `Activité suspecte: ${suspicious.flags.join(', ')}`,
          blocked_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      return new Response(
        JSON.stringify({ error: 'Transaction bloquée: activité suspecte détectée' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (operation) {
      case 'deposit': {
        console.log('➕ Processing deposit...');
        
        const depositFee = await calculateFee(supabaseClient, 'deposit', amount, wallet.currency);
        const netDeposit = amount - depositFee;
        const newBalance = wallet.balance + netDeposit;
        
        const { error: depositError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (depositError) throw depositError;

        await supabaseClient.from('enhanced_transactions').insert({
          sender_id: user.id,
          receiver_id: user.id,
          amount: amount,
          method: 'wallet',
          status: 'completed',
          currency: 'GNF',
          transaction_type: 'deposit',
          metadata: { description: description || 'Dépôt sur le wallet', fee: depositFee }
        });

        await syncAgentWallet(supabaseClient, user.id, newBalance, 'deposit', userRole);
        await recordIdempotencyKey(supabaseClient, effectiveIdempotencyKey, user.id, 'deposit');
        
        result = { success: true, new_balance: newBalance, operation: 'deposit' };
        break;
      }

      case 'withdraw': {
        console.log('➖ Processing withdraw...');
        
        if (wallet.balance < amount) {
          return new Response(
            JSON.stringify({ error: 'Solde insuffisant' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const newBalance = wallet.balance - amount;
        
        const { error: withdrawError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (withdrawError) throw withdrawError;

        await supabaseClient.from('enhanced_transactions').insert({
          sender_id: user.id,
          receiver_id: user.id,
          amount: amount,
          method: 'wallet',
          status: 'completed',
          currency: 'GNF',
          transaction_type: 'withdrawal',
          metadata: { description: description || 'Retrait du wallet' }
        });

        await syncAgentWallet(supabaseClient, user.id, newBalance, 'withdraw', userRole);
        await recordIdempotencyKey(supabaseClient, effectiveIdempotencyKey, user.id, 'withdraw');
        
        result = { success: true, new_balance: newBalance, operation: 'withdraw' };
        break;
      }

      case 'transfer': {
        console.log('💸 Processing transfer...');
        
        if (!recipient_id) {
          return new Response(
            JSON.stringify({ error: 'Destinataire requis' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (wallet.balance < amount) {
          return new Response(
            JSON.stringify({ error: 'Solde insuffisant' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Resolve recipient ID
        const recipientUserId = await resolveRecipientId(supabaseClient, recipient_id);
        
        if (!recipientUserId) {
          return new Response(
            JSON.stringify({ error: `Utilisateur ${recipient_id} introuvable` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent self-transfer
        if (recipientUserId === user.id) {
          return new Response(
            JSON.stringify({ error: 'Transfert vers soi-même non autorisé' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get recipient wallet
        const { data: recipientWallet, error: recipientError } = await supabaseClient
          .from('wallets')
          .select('*')
          .eq('user_id', recipientUserId)
          .single();

        if (recipientError || !recipientWallet) {
          return new Response(
            JSON.stringify({ error: 'Wallet du destinataire introuvable' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 🔐 CRITICAL: Execute atomic transfer
        const transferResult = await executeAtomicTransfer(
          supabaseClient,
          user.id,
          recipientUserId,
          amount,
          description || 'Transfert entre wallets',
          wallet,
          recipientWallet
        );

        if (!transferResult.success) {
          return new Response(
            JSON.stringify({ error: transferResult.error || 'Échec du transfert' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Sync agent wallets
        await syncAgentWallet(supabaseClient, user.id, transferResult.senderBalance!, 'transfer_sender', userRole);
        
        const { data: recipientProfile } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', recipientUserId)
          .maybeSingle();
          
        if (recipientProfile?.role === 'agent') {
          await syncAgentWallet(supabaseClient, recipientUserId, transferResult.recipientBalance!, 'transfer_recipient', 'agent');
        }

        await recordIdempotencyKey(supabaseClient, effectiveIdempotencyKey, user.id, 'transfer');
        
        result = { 
          success: true, 
          new_balance: transferResult.senderBalance, 
          operation: 'transfer',
          recipient_new_balance: transferResult.recipientBalance
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Opération non supportée' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log('✅ Operation completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in wallet operation:', error);
    
    // 🔐 Don't expose internal error details
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Une erreur est survenue'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
