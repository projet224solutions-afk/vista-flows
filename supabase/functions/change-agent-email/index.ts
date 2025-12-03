import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { agent_id, new_email, current_password } = await req.json();

    if (!agent_id || !new_email || !current_password) {
      return new Response(
        JSON.stringify({ success: false, error: "Données manquantes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Format d'email invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agent data
    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents_management")
      .select("user_id, email")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ success: false, error: "Agent non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify current password by attempting sign in
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: agent.email,
      password: current_password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ success: false, error: "Mot de passe incorrect" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingAgent } = await supabaseAdmin
      .from("agents_management")
      .select("id")
      .eq("email", new_email)
      .neq("id", agent_id)
      .single();

    if (existingAgent) {
      return new Response(
        JSON.stringify({ success: false, error: "Cet email est déjà utilisé par un autre agent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update email in Supabase Auth
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
      agent.user_id,
      { email: new_email }
    );

    if (authUpdateError) {
      console.error("Auth update error:", authUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la mise à jour de l'authentification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update email in agents_management table
    const { error: dbUpdateError } = await supabaseAdmin
      .from("agents_management")
      .update({ email: new_email, updated_at: new Date().toISOString() })
      .eq("id", agent_id);

    if (dbUpdateError) {
      console.error("DB update error:", dbUpdateError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la mise à jour de la base de données" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email modifié avec succès" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
