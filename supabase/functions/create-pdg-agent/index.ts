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
      throw new Error('Vous devez être PDG pour créer des agents');
    }

    const { 
      name, 
      email, 
      phone, 
      permissions, 
      commission_rate, 
      can_create_sub_agent,
      password 
    } = await req.json();

    // 1. Créer l'utilisateur dans auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

    if (authError) {
      console.error('❌ Erreur création auth:', authError);
      throw new Error(`Erreur création utilisateur: ${authError.message}`);
    }

    console.log('✅ Utilisateur créé:', authUser.user?.id);

    // 2. Générer un code agent unique au format AGT0001
    const { data: agentCode, error: idError } = await supabaseAdmin
      .rpc('generate_sequential_id', { p_prefix: 'AGT' });

    if (idError || !agentCode) {
      console.error('❌ Erreur génération ID agent:', idError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user!.id);
      throw new Error(`Erreur génération ID agent: ${idError?.message || 'Aucun ID généré'}`);
    }

    console.log('✅ Code agent généré:', agentCode);

    // 3. Créer l'agent dans agents_management
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
      throw new Error(`Erreur création agent: ${agentError.message}`);
    }

    console.log('✅ Agent créé:', agent.id);

    // 4. Vérifier que le wallet a été créé automatiquement
    const { data: wallet } = await supabaseAdmin
      .from('agent_wallets')
      .select('id, balance, currency')
      .eq('agent_id', agent.id)
      .single();

    console.log('✅ Wallet agent:', wallet);

    // 5. Créer aussi un wallet général pour l'utilisateur
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
