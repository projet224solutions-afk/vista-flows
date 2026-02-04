import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé - en-tête Authorization manquant' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

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
      .select('*')
      .eq('id', agent_id)
      .eq('pdg_id', pdgProfile.id)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent non trouvé ou vous n\'avez pas les permissions');
    }

    console.log('🗑️ Suppression de l\'agent:', agent.name, agent.agent_code);

    // 1.5. Archiver les données de l'agent avant suppression
    console.log('📦 Archivage des données agent...');
    
    // Récupérer le profil lié
    let profileData = null;
    let walletData = null;
    let userIdsData = null;
    
    if (agent.user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', agent.user_id)
        .maybeSingle();
      profileData = profile;
      
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', agent.user_id)
        .maybeSingle();
      walletData = wallet;
      
      const { data: userIds } = await supabaseAdmin
        .from('user_ids')
        .select('*')
        .eq('user_id', agent.user_id)
        .maybeSingle();
      userIdsData = userIds;
    }
    
    // Récupérer le wallet agent
    const { data: agentWallet } = await supabaseAdmin
      .from('agent_wallets')
      .select('*')
      .eq('agent_id', agent.id)
      .maybeSingle();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const archiveData = {
      original_user_id: agent.user_id || agent.id,
      email: agent.email || null,
      phone: agent.phone || null,
      full_name: agent.full_name || agent.name || null,
      role: 'agent',
      public_id: agent.agent_code || null,
      profile_data: profileData || { agent_data: agent },
      wallet_data: walletData ? { ...walletData, agent_wallet: agentWallet } : { agent_wallet: agentWallet },
      user_ids_data: userIdsData || null,
      role_specific_data: agent,
      deletion_reason: 'Suppression agent via interface PDG',
      deletion_method: 'edge_function_pdg_agent',
      deleted_by: user.id,
      expires_at: expiresAt.toISOString(),
      original_created_at: agent.created_at || null,
      is_restored: false
    };
    
    const { error: archiveError } = await supabaseAdmin
      .from('deleted_users_archive')
      .insert(archiveData);
    
    if (archiveError) {
      console.warn('⚠️ Erreur archivage (non bloquante):', archiveError.message);
    } else {
      console.log('✅ Données agent archivées');
    }

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
