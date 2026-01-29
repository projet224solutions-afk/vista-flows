import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Affiliate Commission Trigger
 * À appeler après chaque action payante pour calculer les commissions
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      user_id, 
      transaction_type, // 'subscription', 'sale', 'service_payment', etc.
      amount, 
      transaction_id,
      currency = 'GNF'
    } = body;

    if (!user_id || !transaction_type || amount === undefined) {
      return new Response(
        JSON.stringify({ error: 'user_id, transaction_type et amount requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Trouver l'affiliation de l'utilisateur
    const { data: affiliation, error: affError } = await supabaseAdmin
      .from('user_agent_affiliations')
      .select(`
        *,
        agents_management (
          id, pdg_id, commission_rate, is_active, parent_agent_id,
          commission_agent_principal, commission_sous_agent
        )
      `)
      .eq('user_id', user_id)
      .eq('is_verified', true)
      .single();

    if (affError || !affiliation) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Utilisateur non affilié ou affiliation non vérifiée',
          commission_created: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agent = affiliation.agents_management;
    if (!agent?.is_active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Agent inactif',
          commission_created: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la règle de commission pour ce type
    const { data: rule } = await supabaseAdmin
      .from('agent_commission_rules')
      .select('*')
      .eq('pdg_id', agent.pdg_id)
      .eq('transaction_type', transaction_type)
      .eq('is_active', true)
      .single();

    // Calculer le taux de commission
    let commissionRate = agent.commission_rate || 5;
    if (rule) {
      commissionRate = Math.min(
        Math.max(commissionRate, rule.min_rate || 0),
        rule.max_rate || 50
      );
    }

    const commissionAmount = (amount * commissionRate) / 100;
    const validationDelayHours = rule?.validation_delay_hours || 72;

    // Créer la commission pour l'agent principal
    const { data: commission, error: commError } = await supabaseAdmin
      .from('agent_affiliate_commissions')
      .insert({
        agent_id: agent.id,
        user_id,
        affiliation_id: affiliation.id,
        transaction_id,
        transaction_type,
        transaction_amount: amount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        currency,
        status: 'pending',
        validation_date: new Date(Date.now() + validationDelayHours * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (commError) throw commError;

    const commissions = [commission];

    // Si c'est un sous-agent, créer aussi une commission pour l'agent parent
    if (agent.parent_agent_id) {
      const parentCommissionRate = agent.commission_agent_principal || 2; // 2% par défaut
      const parentCommissionAmount = (amount * parentCommissionRate) / 100;

      const { data: parentCommission } = await supabaseAdmin
        .from('agent_affiliate_commissions')
        .insert({
          agent_id: agent.parent_agent_id,
          user_id,
          affiliation_id: affiliation.id,
          transaction_id,
          transaction_type: `${transaction_type}_parent`,
          transaction_amount: amount,
          commission_rate: parentCommissionRate,
          commission_amount: parentCommissionAmount,
          currency,
          status: 'pending',
          validation_date: new Date(Date.now() + validationDelayHours * 60 * 60 * 1000).toISOString(),
          notes: `Commission parent depuis sous-agent ${agent.id}`
        })
        .select()
        .single();

      if (parentCommission) {
        commissions.push(parentCommission);
      }
    }

    // Logger dans agent_commissions_log pour compatibilité
    await supabaseAdmin.from('agent_commissions_log').insert({
      agent_id: agent.id,
      amount: commissionAmount,
      source_type: transaction_type,
      related_user_id: user_id,
      transaction_id,
      description: `Commission ${transaction_type}: ${commissionRate}% de ${amount} ${currency}`
    });

    return new Response(
      JSON.stringify({
        success: true,
        commission_created: true,
        commissions: commissions.map(c => ({
          id: c.id,
          agent_id: c.agent_id,
          amount: c.commission_amount,
          rate: c.commission_rate,
          status: c.status,
          validation_date: c.validation_date
        }))
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur calcul commission:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
