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
    const { agentToken, name, email, phone, commission_rate, permissions, pdgId } = body;

    if (!agentToken) {
      return new Response(
        JSON.stringify({ error: 'Token agent requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ error: 'Nom, email et téléphone requis' }),
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

    // Vérifier que le token agent est valide et que l'agent a la permission
    const { data: parentAgent, error: agentError } = await supabaseAdmin
      .from('agents_management')
      .select('id, pdg_id, is_active, can_create_sub_agent, permissions')
      .eq('access_token', agentToken)
      .single();

    if (agentError || !parentAgent) {
      console.error('Agent non trouvé:', agentError);
      return new Response(
        JSON.stringify({ error: 'Token agent invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parentAgent.is_active) {
      return new Response(
        JSON.stringify({ error: 'Agent parent inactif' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parentAgent.can_create_sub_agent) {
      return new Response(
        JSON.stringify({ error: 'Vous n\'avez pas la permission de créer des sous-agents' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si l'email existe déjà
    const { data: existingAgent } = await supabaseAdmin
      .from('agents_management')
      .select('id')
      .eq('email', email)
      .single();

    if (existingAgent) {
      return new Response(
        JSON.stringify({ error: 'Cet email est déjà utilisé par un autre agent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer un code agent unique
    const agentCode = `SA-${Date.now().toString().slice(-6)}`;
    
    // Générer un token d'accès unique
    const accessToken = crypto.randomUUID();

    // Créer le sous-agent
    const { data: newSubAgent, error: createError } = await supabaseAdmin
      .from('agents_management')
      .insert({
        pdg_id: pdgId || parentAgent.pdg_id,
        name,
        email,
        phone,
        agent_code: agentCode,
        commission_rate: commission_rate || 5,
        permissions: permissions || ['create_users', 'view_reports'],
        can_create_sub_agent: false, // Les sous-agents ne peuvent pas créer d'autres sous-agents par défaut
        is_active: true,
        access_token: accessToken,
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur création sous-agent:', createError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du sous-agent' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sous-agent créé avec succès:', newSubAgent.agent_code);

    return new Response(
      JSON.stringify({ 
        success: true, 
        agent: newSubAgent,
        message: 'Sous-agent créé avec succès',
        accessUrl: `/agent/${accessToken}`
      }),
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
