import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('[escrow-dispute] Unauthorized:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { escrow_id, reason } = body;

    if (!escrow_id) {
      return new Response(JSON.stringify({ error: 'escrow_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[escrow-dispute] Opening dispute for escrow:', escrow_id);

    // Get user profile to check role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'ceo';

    // Get escrow transaction details
    const { data: escrow, error: escrowFetchError } = await supabaseClient
      .from('escrow_transactions')
      .select('*, receiver:vendors!escrow_transactions_receiver_id_fkey(user_id)')
      .eq('id', escrow_id)
      .single();

    if (escrowFetchError || !escrow) {
      console.error('[escrow-dispute] Escrow not found:', escrowFetchError);
      return new Response(JSON.stringify({ error: 'Escrow transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if status allows dispute
    if (!['pending', 'held'].includes(escrow.status)) {
      return new Response(JSON.stringify({ error: `Cannot dispute escrow with status: ${escrow.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check permissions - only admin/ceo or the payer can open a dispute
    if (!isAdmin && user.id !== escrow.payer_id) {
      return new Response(JSON.stringify({ error: 'Not authorized to dispute this escrow' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update escrow status to dispute
    const { error: updateError } = await supabaseClient
      .from('escrow_transactions')
      .update({ 
        status: 'dispute',
        dispute_reason: reason || 'Dispute opened',
        updated_at: new Date().toISOString()
      })
      .eq('id', escrow_id);

    if (updateError) {
      console.error('[escrow-dispute] Error updating escrow:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the action
    await supabaseClient.from('escrow_logs').insert({
      escrow_id: escrow_id,
      action: 'dispute_opened',
      performed_by: user.id,
      note: reason || 'Litige ouvert',
      metadata: { reason, opened_by_role: profile?.role }
    });

    // Send notifications
    const notifications = [];
    
    // Notify the receiver (vendor)
    if (escrow.receiver?.user_id) {
      notifications.push({
        user_id: escrow.receiver.user_id,
        type: 'escrow_dispute',
        title: '⚠️ Litige ouvert',
        body: `Un litige a été ouvert pour votre transaction escrow de ${escrow.amount} ${escrow.currency}`,
        data: { escrow_id, type: 'escrow_dispute' }
      });
    }

    // Notify the payer if admin opened the dispute
    if (isAdmin && user.id !== escrow.payer_id) {
      notifications.push({
        user_id: escrow.payer_id,
        type: 'escrow_dispute',
        title: '⚠️ Litige ouvert',
        body: `Un litige a été ouvert pour votre transaction escrow de ${escrow.amount} ${escrow.currency}`,
        data: { escrow_id, type: 'escrow_dispute' }
      });
    }

    if (notifications.length > 0) {
      await supabaseClient.from('communication_notifications').insert(notifications);
    }

    console.log('[escrow-dispute] Dispute opened successfully:', escrow_id);

    return new Response(JSON.stringify({ success: true, escrow_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[escrow-dispute] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
