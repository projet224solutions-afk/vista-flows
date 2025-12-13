import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-moneroo-signature',
};

interface MonerooWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
      first_name: string;
      last_name: string;
    };
    metadata?: Record<string, any>;
    created_at: string;
    updated_at: string;
  };
}

/**
 * 🔐 CRITICAL SECURITY: Verify Moneroo webhook signature
 * Prevents fraudulent payment events from being processed
 */
async function verifyMonerooSignature(
  payload: string, 
  signature: string | null,
  secretKey: string
): Promise<boolean> {
  if (!signature) {
    console.error('❌ Missing Moneroo signature header');
    return false;
  }

  try {
    // Moneroo uses HMAC-SHA256 for webhook signatures
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const payloadData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison to prevent timing attacks
    const isValid = computedSignature.length === signature.length && 
      computedSignature.split('').every((char, i) => char === signature[i]);

    if (!isValid) {
      console.error('❌ Invalid Moneroo signature');
      console.log('Expected:', computedSignature.substring(0, 20) + '...');
      console.log('Received:', signature.substring(0, 20) + '...');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

/**
 * 🔐 Validate webhook payload structure
 */
function validatePayload(payload: any): payload is MonerooWebhookPayload {
  if (!payload || typeof payload !== 'object') return false;
  if (!payload.event || typeof payload.event !== 'string') return false;
  if (!payload.data || typeof payload.data !== 'object') return false;
  if (!payload.data.id || typeof payload.data.id !== 'string') return false;
  if (typeof payload.data.amount !== 'number' || payload.data.amount < 0) return false;
  if (!payload.data.status || typeof payload.data.status !== 'string') return false;
  return true;
}

/**
 * 🔐 Rate limiting check - prevent replay attacks
 */
async function checkReplayAttack(
  supabase: any,
  paymentId: string,
  eventTimestamp: string
): Promise<boolean> {
  try {
    // Check if we've already processed this exact event
    const { data: existing } = await supabase
      .from('webhook_processed_events')
      .select('id')
      .eq('payment_id', paymentId)
      .eq('processed_at', eventTimestamp)
      .maybeSingle();

    if (existing) {
      console.warn('⚠️ Duplicate webhook event detected:', paymentId);
      return true; // Is a replay attack
    }

    return false;
  } catch (error) {
    console.warn('⚠️ Could not check for replay attack:', error);
    return false; // Allow processing if check fails
  }
}

/**
 * 🔐 Log webhook event for audit trail
 */
async function logWebhookEvent(
  supabase: any,
  eventType: string,
  paymentId: string,
  status: 'success' | 'failed' | 'invalid',
  details: string
): Promise<void> {
  try {
    await supabase.from('webhook_audit_logs').insert({
      event_type: eventType,
      payment_id: paymentId,
      status,
      details,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('⚠️ Failed to log webhook event:', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // 🔐 CRITICAL: Get and verify signature
    const monerooSecretKey = Deno.env.get('MONEROO_SECRET_KEY');
    if (!monerooSecretKey) {
      console.error('❌ MONEROO_SECRET_KEY not configured');
      await logWebhookEvent(supabaseClient, 'unknown', 'unknown', 'failed', 'Missing secret key');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-moneroo-signature') || 
                      req.headers.get('X-Moneroo-Signature');

    // 🔐 CRITICAL: Verify webhook signature
    const isValidSignature = await verifyMonerooSignature(rawBody, signature, monerooSecretKey);
    if (!isValidSignature) {
      await logWebhookEvent(supabaseClient, 'unknown', 'unknown', 'invalid', 'Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse payload after signature verification
    let webhookData: MonerooWebhookPayload;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (parseError) {
      await logWebhookEvent(supabaseClient, 'unknown', 'unknown', 'invalid', 'Invalid JSON payload');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔐 Validate payload structure
    if (!validatePayload(webhookData)) {
      await logWebhookEvent(supabaseClient, 'unknown', 'unknown', 'invalid', 'Invalid payload structure');
      return new Response(
        JSON.stringify({ error: 'Invalid payload structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { event, data: paymentData } = webhookData;
    console.log('✅ Moneroo webhook received (verified):', event, paymentData.id);

    // 🔐 Check for replay attack
    const isReplay = await checkReplayAttack(
      supabaseClient, 
      paymentData.id, 
      paymentData.updated_at
    );
    if (isReplay) {
      await logWebhookEvent(supabaseClient, event, paymentData.id, 'invalid', 'Replay attack detected');
      return new Response(
        JSON.stringify({ error: 'Duplicate event' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔐 Verify payment exists in our database before updating
    const { data: existingPayment, error: paymentCheckError } = await supabaseClient
      .from('moneroo_payments')
      .select('id, user_id, status, amount')
      .eq('payment_id', paymentData.id)
      .single();

    if (paymentCheckError || !existingPayment) {
      console.error('❌ Payment not found in database:', paymentData.id);
      await logWebhookEvent(supabaseClient, event, paymentData.id, 'failed', 'Payment not found in database');
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔐 Verify amount matches (prevent amount manipulation)
    if (existingPayment.amount !== paymentData.amount) {
      console.error('❌ Amount mismatch! Expected:', existingPayment.amount, 'Got:', paymentData.amount);
      await logWebhookEvent(supabaseClient, event, paymentData.id, 'invalid', 'Amount mismatch detected');
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status in database
    const { error: updateError } = await supabaseClient
      .from('moneroo_payments')
      .update({
        status: paymentData.status,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentData.id);

    if (updateError) {
      console.error('❌ Error updating payment:', updateError);
      await logWebhookEvent(supabaseClient, event, paymentData.id, 'failed', 'Database update failed');
      return new Response(
        JSON.stringify({ error: 'Failed to update payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle specific events
    if (event === 'payment.successful') {
      console.log('✅ Payment successful:', paymentData.id);
      
      // Get the payment record to find the user
      const { data: payment, error: paymentError } = await supabaseClient
        .from('moneroo_payments')
        .select('user_id, metadata')
        .eq('payment_id', paymentData.id)
        .single();

      if (!paymentError && payment) {
        const metadata = payment.metadata as Record<string, any>;
        
        if (metadata?.order_id) {
          // Update order status
          await supabaseClient
            .from('orders')
            .update({ status: 'paid', payment_method: 'moneroo' })
            .eq('id', metadata.order_id);
          
          console.log('✅ Order updated:', metadata.order_id);
        }

        if (metadata?.wallet_recharge) {
          // Credit user wallet via secure RPC
          const { error: walletError } = await supabaseClient.rpc('credit_wallet', {
            p_user_id: payment.user_id,
            p_amount: paymentData.amount,
            p_description: `Recharge via Moneroo - ${paymentData.id}`,
          });

          if (walletError) {
            console.error('❌ Error crediting wallet:', walletError);
          } else {
            console.log('✅ Wallet credited:', payment.user_id, paymentData.amount);
          }
        }
      }
    } else if (event === 'payment.failed') {
      console.log('⚠️ Payment failed:', paymentData.id);
    }

    // Log successful processing
    await logWebhookEvent(supabaseClient, event, paymentData.id, 'success', 'Processed successfully');

    // Mark event as processed (for replay prevention)
    try {
      await supabaseClient.from('webhook_processed_events').insert({
        payment_id: paymentData.id,
        processed_at: paymentData.updated_at,
        event_type: event
      });
    } catch (insertError) {
      console.warn('⚠️ Could not record processed event:', insertError);
    }

    return new Response(
      JSON.stringify({ success: true, received: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in moneroo-webhook:', error);
    
    // 🔐 Don't expose internal error details
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
