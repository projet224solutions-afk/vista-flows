import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      throw new Error('Non autorisé');
    }

    // Vérifier que l'utilisateur est PDG
    const { data: pdgProfile, error: pdgError } = await supabaseAdmin
      .from('pdg_management')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (pdgError || !pdgProfile) {
      throw new Error('Vous devez être PDG pour supprimer des agents');
    }

    const { agent_id } = await req.json();

    if (!agent_id) {
      throw new Error('ID agent requis');
    }

    // 1. Récupérer les informations de l'agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents_management')
      .select('id, user_id, agent_code, name, pdg_id')
      .eq('id', agent_id)
      .eq('pdg_id', pdgProfile.id)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent non trouvé ou vous n\'avez pas les permissions');
    }

    console.log('🗑️ Suppression de l\'agent:', agent.name, agent.agent_code);

    // 2. Supprimer le wallet de l'agent
    const { error: walletError } = await supabaseAdmin
      .from('agent_wallets')
      .delete()
      .eq('agent_id', agent.id);

    if (walletError) {
      console.warn('⚠️ Erreur suppression wallet agent:', walletError);
    } else {
      console.log('✅ Wallet agent supprimé');
    }

    // 3. Supprimer le wallet général si existe
    if (agent.user_id) {
      const { error: generalWalletError } = await supabaseAdmin
        .from('wallets')
        .delete()
        .eq('user_id', agent.user_id);

      if (generalWalletError) {
        console.warn('⚠️ Erreur suppression wallet général:', generalWalletError);
      } else {
        console.log('✅ Wallet général supprimé');
      }
    }

    // 4. Supprimer les permissions de l'agent
    const { error: permissionsError } = await supabaseAdmin
      .from('agent_permissions')
      .delete()
      .eq('agent_id', agent.id);

    if (permissionsError) {
      console.warn('⚠️ Erreur suppression permissions:', permissionsError);
    } else {
      console.log('✅ Permissions supprimées');
    }

    // 5. Supprimer l'agent de la table agents_management
    const { error: deleteAgentError } = await supabaseAdmin
      .from('agents_management')
      .delete()
      .eq('id', agent.id)
      .eq('pdg_id', pdgProfile.id);

    if (deleteAgentError) {
      throw new Error(`Erreur suppression agent: ${deleteAgentError.message}`);
    }

    console.log('✅ Agent supprimé de la base');

    // 6. Supprimer l'utilisateur de auth.users
    if (agent.user_id) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
        agent.user_id
      );

      if (authDeleteError) {
        console.warn('⚠️ Erreur suppression utilisateur auth:', authDeleteError);
      } else {
        console.log('✅ Utilisateur auth supprimé');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Agent ${agent.name} (${agent.agent_code}) supprimé définitivement`,
        deleted: {
          agent_id: agent.id,
          user_id: agent.user_id,
          agent_code: agent.agent_code
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
