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
    // Récupérer et vérifier le token d'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Client admin pour vérifier l'authentification et toutes les opérations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );
    
    // Vérifier l'authentification avec le token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Vérifier que l'utilisateur est PDG
    const { data: pdgProfile, error: pdgError } = await supabaseAdmin
      .from('pdg_management')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (pdgError || !pdgProfile) {
      console.error('❌ PDG check failed:', pdgError);
      return new Response(
        JSON.stringify({ success: false, error: 'Vous devez être PDG pour créer des agents' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ PDG verified:', pdgProfile.id);

    const { 
      name, 
      email, 
      phone, 
      permissions, 
      commission_rate, 
      can_create_sub_agent,
      password 
    } = await req.json();

    // Validation du mot de passe
    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Le mot de passe doit contenir au moins 8 caractères' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Vérifier si l'email existe déjà
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Vérifier si cet utilisateur est déjà un agent
      const { data: existingAgent } = await supabaseAdmin
        .from('agents_management')
        .select('id, name')
        .eq('user_id', existingUser.id)
        .single();

      if (existingAgent) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Cet email est déjà utilisé par l'agent: ${existingAgent.name}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cet email est déjà enregistré dans le système. Veuillez utiliser un autre email.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Créer l'utilisateur dans auth avec mot de passe hashé
    const { data: authUser, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        phone: phone,
        role: 'agent',
        country: 'Guinée'
      }
    });

    if (authError2) {
      console.error('❌ Erreur création auth:', authError2);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erreur création utilisateur: ${authError2.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Utilisateur créé avec mot de passe sécurisé:', authUser.user?.id);

    // Hash le mot de passe avec bcrypt pour stockage dans agents table
    let passwordHash = password;
    try {
      const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts');
      passwordHash = await bcrypt.hash(password);
      console.log('✅ Mot de passe hashé avec bcrypt');
    } catch (bcryptError) {
      console.warn('⚠️ Erreur bcrypt, mot de passe stocké en clair (à éviter):', bcryptError);
    }

    // 3. Générer un code agent unique au format AGT0001
    const { data: agentCode, error: idError } = await supabaseAdmin
      .rpc('generate_sequential_id', { p_prefix: 'AGT' });

    if (idError || !agentCode) {
      console.error('❌ Erreur génération ID agent:', idError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user!.id);
      return new Response(
    // 4. Créer l'agent dans agents_management ET dans agents (pour authentification MFA)
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents_management')
      .insert({
        pdg_id: pdgProfile.id,
        user_id: authUser.user!.id,
        agent_code: agentCode,
        name,
        email,
        phone,
        permissions: permissions || [],
        commission_rate: commission_rate || 10,
        can_create_sub_agent: can_create_sub_agent || false,
        is_active: true,
      })
      .select()
      .single();

    if (agentError) {
      console.error('❌ Erreur création agent:', agentError);
      // Supprimer l'utilisateur auth si la création de l'agent échoue
      await supabaseAdmin.auth.admin.deleteUser(authUser.user!.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erreur création agent: ${agentError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Agent créé dans agents_management:', agent.id);

    // 4b. Créer aussi dans la table agents (pour authentification MFA)
    const { error: agentsTableError } = await supabaseAdmin
      .from('agents')
      .insert({
        id: authUser.user!.id, // Utiliser le même UUID que auth.users
        email,
        phone,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || '',
        agent_type: 'pdg_agent',
        password_hash: passwordHash,
        is_active: true,
        failed_login_attempts: 0,
      });

    if (agentsTableError) {
      console.warn('⚠️ Erreur création dans agents table:', agentsTableError);
      // Ne pas bloquer si agents table échoue (peut ne pas exister encore)
    } else {
      console.log('✅ Agent créé dans agents table pour auth MFA');
    }User(authUser.user!.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erreur création agent: ${agentError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Agent créé:', agent.id);

    // 5. Vérifier que le wallet a été créé automatiquement
    const { data: wallet } = await supabaseAdmin
      .from('agent_wallets')
      .select('id, balance, currency')
      .eq('agent_id', agent.id)
      .single();

    console.log('✅ Wallet agent:', wallet);

    // 6. Créer aussi un wallet général pour l'utilisateur
    const { error: walletError } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: authUser.user!.id,
        balance: 0,
        currency: 'GNF'
      });

    if (walletError) {
      console.warn('⚠️ Erreur création wallet général:', walletError);
      // Ne pas bloquer si le wallet général échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        agent,
        wallet,
        message: 'Agent créé avec succès'
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
