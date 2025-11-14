import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Client service role pour bypasser les RLS lors de l'insertion
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      pdg_id,
      parent_agent_id, 
      agent_code, 
      name, 
      email, 
      phone, 
      permissions, 
      commission_rate,
      access_token // Token d'accès pour l'interface publique
    } = await req.json();

    // Vérifier l'authentification (soit via JWT, soit via access_token)
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseServiceClient.auth.getUser(token);
      
      if (user) {
        authenticatedUserId = user.id;
        console.log('✅ User authenticated via JWT:', user.id);
      }
    }
    
    if (!authenticatedUserId && access_token) {
      // Vérifier le token d'accès de l'agent
      const { data: tokenAgent, error: tokenError } = await supabaseServiceClient
        .from("agents_management")
        .select("id, user_id, pdg_id")
        .eq("access_token", access_token)
        .eq("id", parent_agent_id)
        .single();

      if (tokenError || !tokenAgent) {
        console.error("Token d'accès invalide:", tokenError);
        return new Response(
          JSON.stringify({ error: "Token d'accès invalide" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      authenticatedUserId = tokenAgent.user_id;
      console.log('✅ User authenticated via access_token');
    } else if (!authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validation des données
    if (!pdg_id || !parent_agent_id || !name || !email || !phone) {
      return new Response(
        JSON.stringify({ error: "Données manquantes (pdg_id, parent_agent_id, name, email, phone requis)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'agent parent existe
    const { data: parentAgent, error: parentError } = await supabaseServiceClient
      .from("agents_management")
      .select("*")
      .eq("id", parent_agent_id)
      .single();

    if (parentError || !parentAgent) {
      console.error("Agent parent non trouvé:", parentError);
      return new Response(
        JSON.stringify({ error: "Agent parent non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur connecté est autorisé (soit l'agent lui-même, soit le PDG)
    const isAgentOwner = parentAgent.user_id && parentAgent.user_id === authenticatedUserId;
    
    // Vérifier si l'utilisateur est le PDG de cet agent (seulement si authenticatedUserId existe)
    let isPdgOwner = false;
    if (authenticatedUserId) {
      const { data: pdgProfile } = await supabaseServiceClient
        .from("profiles")
        .select("id, role")
        .eq("id", authenticatedUserId)
        .eq("role", "admin")
        .maybeSingle();
      
      isPdgOwner = !!(pdgProfile && parentAgent.pdg_id === authenticatedUserId);
    }

    // Pour l'interface publique avec access_token, on autorise si l'agent correspond
    const isValidAccessToken = access_token && parentAgent.id === parent_agent_id;

    if (!isAgentOwner && !isPdgOwner && !isValidAccessToken) {
      console.error("Utilisateur non autorisé - authenticatedUserId:", authenticatedUserId, "agent.user_id:", parentAgent.user_id, "agent.pdg_id:", parentAgent.pdg_id);
      return new Response(
        JSON.stringify({ error: "Vous n'êtes pas autorisé à créer des sous-agents pour cet agent" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'agent parent a la permission de créer des sous-agents
    if (!parentAgent.can_create_sub_agent) {
      return new Response(
        JSON.stringify({ error: "Vous n'avez pas la permission de créer des sous-agents" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'agent parent est actif
    if (!parentAgent.is_active) {
      return new Response(
        JSON.stringify({ error: "Votre compte agent est inactif" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'email n'est pas déjà utilisé
    const { data: existingAgent } = await supabaseClient
      .from("agents_management")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingAgent) {
      return new Response(
        JSON.stringify({ error: "Cet email est déjà utilisé par un autre agent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Générer un access token unique pour le sous-agent
    const subAgentAccessToken = crypto.randomUUID();

    // Créer le sous-agent avec le service role client
    const { data: newAgent, error: insertError } = await supabaseServiceClient
      .from("agents_management")
      .insert({
        pdg_id: pdg_id,
        parent_agent_id: parent_agent_id,
        agent_code: agent_code,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        permissions: permissions || [],
        commission_rate: commission_rate || 5,
        can_create_sub_agent: false, // Les sous-agents ne peuvent pas créer d'autres sous-agents
        is_active: true,
        access_token: subAgentAccessToken, // Token d'accès unique
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erreur création sous-agent:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log de l'action dans audit_logs (seulement si un user_id est disponible)
    if (authenticatedUserId) {
      await supabaseServiceClient
        .from("audit_logs")
        .insert({
          actor_id: authenticatedUserId,
          action: "SUB_AGENT_CREATED",
          target_type: "agent",
          target_id: newAgent.id,
          data_json: {
            agent_code: agent_code,
            name: name,
            email: email,
            parent_agent_id: parent_agent_id,
          },
        });
    }

    console.log("Sous-agent créé avec succès:", newAgent.agent_code);

    return new Response(
      JSON.stringify({ success: true, agent: newAgent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur create-sub-agent:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
