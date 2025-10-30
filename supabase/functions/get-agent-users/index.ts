import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const agentToken = body.agentToken || body.agent_access_token;

    if (!agentToken) {
      return new Response(
        JSON.stringify({ error: 'Token agent requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer un client Supabase avec service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Vérifier que le token agent est valide
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents_management')
      .select('id, pdg_id, is_active, permissions')
      .eq('access_token', agentToken)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Token agent invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agent.is_active) {
      return new Response(
        JSON.stringify({ error: 'Agent inactif' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les IDs des utilisateurs créés par cet agent
    const { data: agentUsers, error: agentUsersError } = await supabaseAdmin
      .from('agent_created_users')
      .select('user_id, user_role, created_at')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false });

    if (agentUsersError) {
      throw agentUsersError;
    }

    if (!agentUsers || agentUsers.length === 0) {
      return new Response(
        JSON.stringify({ users: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les détails des profils utilisateurs
    const userIds = agentUsers.map(u => u.user_id);
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, phone, role, is_active, public_id, created_at, country, city')
      .in('id', userIds);

    if (profilesError) {
      throw profilesError;
    }

    // Fusionner les données
    const users = agentUsers.map((agentUser: any) => {
      const profile = profiles?.find(p => p.id === agentUser.user_id);
      return {
        ...profile,
        created_by_agent: true,
        user_role: agentUser.user_role,
        agent_created_at: agentUser.created_at
      };
    }).filter(user => user.id); // Filtrer les utilisateurs sans profil

    return new Response(
      JSON.stringify({ users }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
