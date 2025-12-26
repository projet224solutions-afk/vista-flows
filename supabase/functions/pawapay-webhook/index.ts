import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAWAPAY-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Webhook received');

    const body = await req.json();
    logStep('Webhook payload', body);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PawaPay envoie des callbacks pour les dépôts
    const depositId = body.depositId;
    const status = body.status;

    if (!depositId) {
      logStep('No depositId in webhook');
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    logStep('Processing deposit callback', { depositId, status });

    // Mettre à jour le statut du paiement
    const { data: payment, error: fetchError } = await supabaseAdmin
      .from('pawapay_payments')
      .select('*')
      .eq('deposit_id', depositId)
      .single();

    if (fetchError) {
      logStep('Payment not found', { depositId, error: fetchError });
      return new Response(
        JSON.stringify({ received: true, message: 'Payment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Mettre à jour le paiement
    const { error: updateError } = await supabaseAdmin
      .from('pawapay_payments')
      .update({
        status: status,
        pawapay_response: body,
        updated_at: new Date().toISOString(),
        completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
      })
      .eq('deposit_id', depositId);

    if (updateError) {
      logStep('Failed to update payment', updateError);
    } else {
      logStep('Payment updated successfully', { depositId, status });
    }

    // Si le paiement est complété, on peut déclencher d'autres actions
    if (status === 'COMPLETED') {
      logStep('Payment completed, triggering post-payment actions');
      
      // Ici vous pouvez ajouter des actions comme:
      // - Créditer le wallet de l'utilisateur
      // - Mettre à jour le statut de la commande
      // - Envoyer une notification
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        depositId,
        status 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    
    // Toujours retourner 200 pour éviter les retries de webhook
    return new Response(
      JSON.stringify({ 
        received: true, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
