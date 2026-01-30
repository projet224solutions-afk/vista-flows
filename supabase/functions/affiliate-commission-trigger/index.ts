import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Affiliate Commission Trigger
 * À appeler après chaque action payante pour calculer les commissions
 * AMÉLIORÉ: Crédite automatiquement le wallet de l'agent
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
      currency = 'GNF',
      immediate_credit = true // Créditer immédiatement ou attendre validation
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

    // D'abord essayer la fonction SQL unifiée qui vérifie les deux tables
    const { data: sqlResult, error: sqlError } = await supabaseAdmin.rpc('credit_agent_commission', {
      p_user_id: user_id,
      p_amount: amount,
      p_source_type: transaction_type,
      p_transaction_id: transaction_id,
      p_metadata: { currency, source: 'affiliate-commission-trigger' }
    });

    // Si la fonction SQL a trouvé un agent et crédité, retourner le succès
    if (sqlResult?.has_agent) {
      console.log('✅ Commission créditée via SQL:', sqlResult);
      return new Response(
        JSON.stringify({
          success: true,
          commission_created: true,
          method: 'sql_unified',
          details: sqlResult
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: vérifier user_agent_affiliations directement (pour compatibilité)
    const { data: affiliation, error: affError } = await supabaseAdmin
      .from('user_agent_affiliations')
      .select(`
        *,
        agents_management (
          id, pdg_id, commission_rate, is_active, parent_agent_id,
          commission_agent_principal, commission_sous_agent, name
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
    const status = immediate_credit ? 'validated' : 'pending';

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
        status,
        validated_at: immediate_credit ? new Date().toISOString() : null,
        validation_date: new Date(Date.now() + validationDelayHours * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (commError) throw commError;

    // CRITIQUE: Créditer le wallet de l'agent immédiatement si immediate_credit
    if (immediate_credit) {
      const { error: walletError } = await supabaseAdmin.rpc('credit_agent_wallet', {
        p_agent_id: agent.id,
        p_amount: commissionAmount,
        p_description: `Commission ${transaction_type}: ${commissionRate}% de ${amount} ${currency}`
      });

      // Fallback si la fonction RPC n'existe pas
      if (walletError) {
        console.warn('RPC credit_agent_wallet non trouvé, mise à jour directe');
        
        // Vérifier si le wallet existe
        const { data: wallet } = await supabaseAdmin
          .from('agent_wallets')
          .select('id, balance')
          .eq('agent_id', agent.id)
          .single();

        if (wallet) {
          await supabaseAdmin
            .from('agent_wallets')
            .update({ 
              balance: wallet.balance + commissionAmount,
              updated_at: new Date().toISOString()
            })
            .eq('agent_id', agent.id);
        } else {
          await supabaseAdmin
            .from('agent_wallets')
            .insert({
              agent_id: agent.id,
              balance: commissionAmount,
              currency: 'GNF',
              wallet_status: 'active'
            });
        }
      }
    }

    const commissions = [commission];

    // Si c'est un sous-agent, créer aussi une commission pour l'agent parent
    if (agent.parent_agent_id) {
      const parentCommissionRate = agent.commission_agent_principal || 2;
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
          status,
          validated_at: immediate_credit ? new Date().toISOString() : null,
          validation_date: new Date(Date.now() + validationDelayHours * 60 * 60 * 1000).toISOString(),
          notes: `Commission parent depuis sous-agent ${agent.name}`
        })
        .select()
        .single();

      if (parentCommission) {
        commissions.push(parentCommission);

        // Créditer le wallet du parent aussi
        if (immediate_credit) {
          const { data: parentWallet } = await supabaseAdmin
            .from('agent_wallets')
            .select('id, balance')
            .eq('agent_id', agent.parent_agent_id)
            .single();

          if (parentWallet) {
            await supabaseAdmin
              .from('agent_wallets')
              .update({ 
                balance: parentWallet.balance + parentCommissionAmount,
                updated_at: new Date().toISOString()
              })
              .eq('agent_id', agent.parent_agent_id);
          } else {
            await supabaseAdmin
              .from('agent_wallets')
              .insert({
                agent_id: agent.parent_agent_id,
                balance: parentCommissionAmount,
                currency: 'GNF',
                wallet_status: 'active'
              });
          }
        }
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

    console.log('✅ Commission créée et wallet crédité:', {
      agent_id: agent.id,
      commission: commissionAmount,
      wallet_credited: immediate_credit
    });

    return new Response(
      JSON.stringify({
        success: true,
        commission_created: true,
        wallet_credited: immediate_credit,
        method: 'edge_function',
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
