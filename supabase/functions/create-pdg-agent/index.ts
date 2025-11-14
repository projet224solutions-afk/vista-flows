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

    // Client service role pour toutes les opérations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier l'authentification avec le token
    const token = authHeader.replace('Bearer ', '');
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
      password,
      type_agent,
      parent_agent_id,
      commission_agent_principal,
      commission_sous_agent
    } = await req.json();

    // 1. Vérifier si l'email existe déjà
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Vérifier si cet utilisateur est déjà un agent
      const { data: existingAgent } = await supabaseAdmin
        .from('agents_management')
        .select('id, name, is_active')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingAgent && existingAgent.is_active) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Cet email est déjà utilisé par l'agent actif: ${existingAgent.name}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingAgent && !existingAgent.is_active) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Cet email appartient à un agent inactif. Veuillez le réactiver depuis la liste des agents.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // L'utilisateur existe mais n'est pas agent - le convertir en agent
      console.log('✅ Utilisateur existant trouvé, conversion en agent:', existingUser.id);
      userId = existingUser.id;
      
      // Mettre à jour les métadonnées pour ajouter le rôle agent
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          role: 'agent',
          phone: phone || existingUser.user_metadata?.phone
        }
      });

    } else {
      // 2. Créer un nouvel utilisateur dans auth
      const { data: authUser, error: authError2 } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: password || `Agent${Math.random().toString(36).slice(2, 10)}!`,
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

      console.log('✅ Nouvel utilisateur créé:', authUser.user?.id);
      userId = authUser.user!.id;
      isNewUser = true;
    }

    // 3. Générer un code agent unique au format AGP-XXXX ou SAG-XXXX
    const agentType = type_agent || 'principal';
    const { data: agentCode, error: idError } = await supabaseAdmin
      .rpc('generate_agent_id', { p_type_agent: agentType });

    if (idError || !agentCode) {
      console.error('❌ Erreur génération ID agent:', idError);
      // Supprimer seulement si c'est un nouvel utilisateur
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erreur génération ID agent: ${idError?.message || 'Aucun ID généré'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Code agent généré:', agentCode);

    // 4. Créer l'agent dans agents_management
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents_management')
      .insert({
        pdg_id: pdgProfile.id,
        user_id: userId,
        agent_code: agentCode,
        name,
        full_name: name,
        email,
        phone,
        type_agent: agentType,
        parent_agent_id: parent_agent_id || null,
        permissions: permissions || [],
        commission_rate: commission_rate || 10,
        commission_agent_principal: commission_agent_principal || 15,
        commission_sous_agent: commission_sous_agent || 15,
        can_create_sub_agent: can_create_sub_agent || false,
        is_active: true,
      })
      .select()
      .single();

    if (agentError) {
      console.error('❌ Erreur création agent:', agentError);
      // Supprimer l'utilisateur auth seulement si c'est un nouvel utilisateur
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
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

    // 6. Créer aussi un wallet général pour l'utilisateur (si c'est un nouvel utilisateur)
    if (isNewUser) {
      const { error: walletError } = await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0,
          currency: 'GNF'
        });

      if (walletError) {
        console.warn('⚠️ Erreur création wallet général:', walletError);
        // Ne pas bloquer si le wallet général échoue
      }
    } else {
      console.log('ℹ️ Utilisateur existant - wallet général déjà présent');
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
