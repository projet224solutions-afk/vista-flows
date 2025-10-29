// 👤 Create User by Agent - Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone: string;
  role: string;
  agentId: string;
  agentCode: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Client service_role pour les opérations admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Vérifier l'authentification de la requête
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Non autorisé - token manquant',
          code: 'UNAUTHORIZED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body: CreateUserRequest = await req.json();
    console.log('Creating user by agent:', body.agentCode);

    // Vérifier que l'agent existe et a la permission
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents_management')
      .select('id, permissions, pdg_id')
      .eq('id', body.agentId)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent non trouvé ou inactif');
    }

    // Vérifier que l'agent a la permission de créer des utilisateurs
    if (!agent.permissions || !agent.permissions.includes('create_users')) {
      throw new Error('Agent non autorisé à créer des utilisateurs');
    }

    // Créer l'utilisateur dans auth.users
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.firstName,
        last_name: body.lastName || '',
        phone: body.phone,
        role: body.role,
        country: 'Guinée',
        created_by_agent: body.agentCode,
        agent_id: body.agentId
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      // Gérer les erreurs spécifiques
      if (authError.message.includes('already been registered') || 
          authError.message.includes('email_exists')) {
        return new Response(
          JSON.stringify({ 
            error: 'Un utilisateur avec cet email existe déjà',
            code: 'EMAIL_EXISTS'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: authError.message || 'Erreur lors de la création de l\'utilisateur',
          code: 'AUTH_ERROR'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!authUser.user) {
      throw new Error('Erreur lors de la création de l\'utilisateur');
    }

    // Générer les IDs en utilisant la fonction de la base de données
    const customIdPrefix = body.role === 'vendeur' ? 'VND' : 
                          body.role === 'livreur' ? 'DRV' :
                          body.role === 'taxi' ? 'DRV' :
                          body.role === 'admin' ? 'PDG' :
                          body.role === 'syndicat' ? 'SYD' :
                          body.role === 'transitaire' ? 'AGT' :
                          'USR';
    
    // Appeler la fonction generate_sequential_id pour obtenir un ID unique
    const { data: idData, error: idError } = await supabaseClient
      .rpc('generate_sequential_id', { p_prefix: customIdPrefix });
    
    if (idError) {
      console.error('ID generation error:', idError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la génération de l\'ID',
          code: 'ID_GENERATION_ERROR'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const publicId = idData as string;

    // Créer le profil utilisateur avec les IDs générés
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: body.email,
        first_name: body.firstName,
        last_name: body.lastName || '',
        phone: body.phone,
        role: body.role,
        public_id: publicId,
        is_active: true
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Si le profil existe déjà, ne pas échouer
      if (!profileError.message.includes('duplicate') && !profileError.message.includes('already exists')) {
        return new Response(
          JSON.stringify({ 
            error: 'Erreur lors de la création du profil: ' + profileError.message,
            code: 'PROFILE_ERROR'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Supprimer la création dans user_ids car on utilise custom_id directement dans profiles

    // Créer le wallet si c'est un client
    if (body.role === 'client') {
      const { error: walletError } = await supabaseClient
        .from('wallets')
        .insert({
          user_id: authUser.user.id,
          balance: 0
        });

      if (walletError) {
        console.error('Wallet error:', walletError);
      }
    }

    // Créer un profil vendeur si nécessaire
    if (body.role === 'vendeur') {
      const { error: vendorError } = await supabaseClient
        .from('vendors')
        .insert({
          user_id: authUser.user.id,
          business_name: `Business ${body.firstName}`,
          is_verified: false
        });

      if (vendorError) {
        console.error('Vendor error:', vendorError);
      }
    }

    // Créer un profil livreur si nécessaire
    if (body.role === 'livreur') {
      const { error: driverError } = await supabaseClient
        .from('drivers')
        .insert({
          user_id: authUser.user.id,
          license_number: 'TEMP-' + Date.now(),
          vehicle_type: 'motorcycle',
          is_verified: false
        });

      if (driverError) {
        console.error('Driver error:', driverError);
      }
    }

    // Log de l'action
    await supabaseClient.from('audit_logs').insert({
      actor_id: authUser.user.id,
      action: 'USER_CREATED_BY_AGENT',
      target_type: 'user',
      target_id: authUser.user.id,
      data_json: {
        agent_id: body.agentId,
        agent_code: body.agentCode,
        user_role: body.role,
        timestamp: new Date().toISOString()
      }
    });

    // Créer la liaison agent-utilisateur
    await supabaseClient.from('agent_created_users').insert({
      agent_id: body.agentId,
      user_id: authUser.user.id,
      user_role: body.role
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authUser.user.id,
          email: body.email,
          public_id: publicId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Create user by agent error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: 'GENERAL_ERROR'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
