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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { dispute_id } = body;

    if (!dispute_id) {
      return new Response(JSON.stringify({ error: 'Missing dispute_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch dispute with related data
    const { data: dispute, error: fetchError } = await supabaseAdmin
      .from('disputes')
      .select(`
        *,
        client:client_id(id, email),
        vendor:vendor_id(id, email),
        escrow:escrow_id(*),
        messages:dispute_messages(*),
        actions:dispute_actions(*)
      `)
      .eq('id', dispute_id)
      .single();

    if (fetchError || !dispute) {
      return new Response(JSON.stringify({ error: 'Dispute not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // AI Analysis Logic
    const analysis = {
      evidence_quality: dispute.evidence_urls?.length || 0,
      negotiation_attempts: dispute.messages?.length || 0,
      vendor_response_time: dispute.vendor_response_date ? 
        (new Date(dispute.vendor_response_date).getTime() - new Date(dispute.created_at).getTime()) / (1000 * 60 * 60) : null,
      dispute_type: dispute.dispute_type,
      request_type: dispute.request_type
    };

    let ai_decision = 'manual_review';
    let ai_justification = '';
    let confidence = 0.5;

    // Decision logic based on analysis
    if (dispute.dispute_type === 'not_received') {
      if (analysis.evidence_quality >= 2) {
        ai_decision = 'refund_full';
        ai_justification = 'Client a fourni des preuves solides de non-réception. Remboursement complet recommandé.';
        confidence = 0.85;
      } else if (dispute.vendor_response && dispute.vendor_response.includes('livré')) {
        ai_decision = 'require_return';
        ai_justification = 'Vendeur affirme livraison. Preuve de retour requise.';
        confidence = 0.70;
      }
    } else if (dispute.dispute_type === 'defective') {
      if (analysis.evidence_quality >= 3) {
        ai_decision = 'refund_partial';
        ai_justification = 'Produit défectueux confirmé par photos. Remboursement partiel recommandé.';
        confidence = 0.80;
      } else {
        ai_decision = 'require_return';
        ai_justification = 'Preuves insuffisantes. Retour du produit nécessaire pour inspection.';
        confidence = 0.65;
      }
    } else if (dispute.dispute_type === 'incomplete') {
      ai_decision = 'refund_partial';
      ai_justification = 'Commande incomplète. Remboursement de la différence recommandé.';
      confidence = 0.75;
    }

    // If vendor never responded and deadline passed
    if (!dispute.vendor_response && analysis.vendor_response_time && analysis.vendor_response_time > 72) {
      ai_decision = 'refund_full';
      ai_justification = 'Vendeur n\'a pas répondu dans les délais. Remboursement automatique au client.';
      confidence = 0.95;
    }

    // Update dispute with AI decision
    const { data: updatedDispute, error: updateError } = await supabaseAdmin
      .from('disputes')
      .update({
        status: 'ai_review',
        ai_decision,
        ai_justification,
        ai_confidence: confidence,
        ai_analysis: analysis,
        arbitrated_at: new Date().toISOString()
      })
      .eq('id', dispute_id)
      .select()
      .single();

    if (updateError) {
      console.error('[dispute-ai-arbitrate] Error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log action
    await supabaseAdmin.from('dispute_actions').insert({
      dispute_id,
      action_type: 'ai_arbitration',
      details: { ai_decision, ai_justification, confidence, analysis }
    });

    // Notify both parties
    await Promise.all([
      supabaseAdmin.from('communication_notifications').insert({
        user_id: dispute.client_id,
        type: 'dispute',
        title: 'Décision IA sur votre litige',
        body: `L'IA a analysé votre litige ${dispute.dispute_number}. Décision: ${ai_decision}`,
        metadata: { dispute_id, ai_decision, confidence }
      }),
      supabaseAdmin.from('communication_notifications').insert({
        user_id: dispute.vendor_id,
        type: 'dispute',
        title: 'Décision IA sur le litige',
        body: `L'IA a analysé le litige ${dispute.dispute_number}. Décision: ${ai_decision}`,
        metadata: { dispute_id, ai_decision, confidence }
      })
    ]);

    console.log('[dispute-ai-arbitrate] AI decision made:', dispute_id, ai_decision);

    return new Response(JSON.stringify({ 
      success: true, 
      dispute: updatedDispute,
      analysis,
      ai_decision,
      ai_justification,
      confidence
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[dispute-ai-arbitrate] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});