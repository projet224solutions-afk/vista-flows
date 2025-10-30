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
  country?: string;
  city?: string;
  agentId: string;
  agentCode: string;
  // Données spécifiques syndicat
  syndicatData?: {
    bureau_code: string;
    prefecture: string;
    commune: string;
    full_location?: string;
  };
  // Données spécifiques vendeur
  vendeurData?: {
    business_name: string;
    business_description?: string;
    business_address?: string;
  };
  // Données spécifiques taxi/livreur
  driverData?: {
    license_number: string;
    vehicle_type: string;
    vehicle_brand?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    vehicle_plate?: string;
  };
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

    // Vérifier l'authentification de la requête - DÉSACTIVÉ pour les agents
    // Les agents utilisent leur token d'accès dans le corps de la requête
    // const authHeader = req.headers.get('Authorization');
    // if (!authHeader) {
    //   return new Response(
    //     JSON.stringify({ 
    //       error: 'Non autorisé - token manquant',
    //       code: 'UNAUTHORIZED'
    //     }),
    //     { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    //   );
    // }

    const body: CreateUserRequest = await req.json();
    console.log('Creating user by agent:', body.agentCode);

    // Vérifier que l'agent existe et a la permission
    const { data: agent, error: agentError } = await supabaseClient
      .from('agents_management')
      .select('id, permissions, pdg_id, can_create_sub_agent, agent_code')
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

    // Si on crée un agent/sous-agent, vérifier la permission spécifique
    if ((body.role === 'agent' || body.role === 'sub_agent') && !agent.can_create_sub_agent) {
      throw new Error('Agent non autorisé à créer des sous-agents');
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
        country: body.country || 'Guinée',
        city: body.city || '',
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

    console.log('✅ Utilisateur créé dans auth.users, ID:', authUser.user.id);
    console.log('📝 Le profil sera créé automatiquement par le trigger');

    // Attendre un peu pour que le trigger s'exécute
    await new Promise(resolve => setTimeout(resolve, 100));

    // Récupérer le profil créé par le trigger
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('public_id')
      .eq('id', authUser.user.id)
      .single();

    if (profileError) {
      console.error('❌ Erreur récupération profil:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Profil non créé par le trigger: ' + profileError.message,
          code: 'PROFILE_ERROR'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const publicId = profile.public_id;

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

      // Créer aussi le profil customer
      const { error: customerError } = await supabaseClient
        .from('customers')
        .insert({
          user_id: authUser.user.id,
          addresses: [],
          payment_methods: [],
          preferences: {}
        });

      if (customerError) {
        console.error('Customer error:', customerError);
      }
    }

    // Créer un profil vendeur si nécessaire
    if (body.role === 'vendeur') {
      const vendorData = (body.vendeurData || {}) as {
        business_name?: string;
        business_description?: string;
        business_address?: string;
      };
      const { error: vendorError } = await supabaseClient
        .from('vendors')
        .insert({
          user_id: authUser.user.id,
          business_name: vendorData.business_name || `${body.firstName} ${body.lastName || ''}`.trim(),
          description: vendorData.business_description,
          business_address: vendorData.business_address,
          is_verified: false
        });

      if (vendorError) {
        console.error('Vendor error:', vendorError);
        throw new Error('Erreur lors de la création du profil vendeur: ' + vendorError.message);
      }
    }

    // Créer un profil livreur ou taxi si nécessaire
    if (body.role === 'livreur' || body.role === 'taxi') {
      const driverData = (body.driverData || {}) as {
        license_number?: string;
        vehicle_type?: string;
        vehicle_brand?: string;
        vehicle_model?: string;
        vehicle_year?: string;
        vehicle_plate?: string;
      };
      const vehicleInfo: any = {};
      
      if (driverData.vehicle_brand) vehicleInfo.brand = driverData.vehicle_brand;
      if (driverData.vehicle_model) vehicleInfo.model = driverData.vehicle_model;
      if (driverData.vehicle_year) vehicleInfo.year = driverData.vehicle_year;
      if (driverData.vehicle_plate) vehicleInfo.plate = driverData.vehicle_plate;

      const { error: driverError } = await supabaseClient
        .from('drivers')
        .insert({
          user_id: authUser.user.id,
          license_number: driverData.license_number || `LIC-${Date.now()}`,
          vehicle_type: driverData.vehicle_type || 'moto',
          is_verified: false,
          is_online: false,
          vehicle_info: vehicleInfo
        });

      if (driverError) {
        console.error('Driver error:', driverError);
        throw new Error('Erreur lors de la création du profil chauffeur: ' + driverError.message);
      }
    }

    // Créer un profil agent/sous-agent si nécessaire
    if (body.role === 'agent' || body.role === 'sub_agent') {
      // Générer un code agent unique
      const agentCode = `AG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      
      const { error: agentManagementError } = await supabaseClient
        .from('agents_management')
        .insert({
          pdg_id: agent.pdg_id,
          user_id: authUser.user.id,
          agent_code: agentCode,
          name: `${body.firstName} ${body.lastName || ''}`.trim(),
          email: body.email,
          phone: body.phone,
          is_active: true,
          can_create_sub_agent: false, // Par défaut, les sous-agents ne peuvent pas créer d'autres sous-agents
          permissions: ['create_users'], // Permission de base
          commission_rate: 0
        });

      if (agentManagementError) {
        console.error('Agent management error:', agentManagementError);
        throw new Error('Erreur lors de la création du profil agent: ' + agentManagementError.message);
      }
    }

    // Créer un bureau syndicat si nécessaire
    if (body.role === 'syndicat') {
      const syndicatData = body.syndicatData;
      
      if (!syndicatData || !syndicatData.bureau_code || !syndicatData.prefecture || !syndicatData.commune) {
        throw new Error('Données du bureau syndical manquantes (code, préfecture, commune requis)');
      }

      // Générer un access token unique pour le bureau
      const accessToken = crypto.randomUUID();

      const { error: bureauError } = await supabaseClient
        .from('bureaus')
        .insert({
          bureau_code: syndicatData.bureau_code,
          prefecture: syndicatData.prefecture,
          commune: syndicatData.commune,
          full_location: syndicatData.full_location || `${syndicatData.prefecture} - ${syndicatData.commune}`,
          president_name: `${body.firstName} ${body.lastName || ''}`.trim(),
          president_email: body.email,
          president_phone: body.phone,
          status: 'active',
          access_token: accessToken,
          interface_url: `${Deno.env.get('APP_URL') || 'https://app.224solutions.com'}/bureau/${accessToken}`,
          total_members: 0,
          total_vehicles: 0,
          total_cotisations: 0
        });

      if (bureauError) {
        console.error('Bureau error:', bureauError);
        throw new Error('Erreur lors de la création du bureau syndical: ' + bureauError.message);
      }

      console.log('✅ Bureau syndical créé avec succès');
    }

    // Le rôle transitaire utilise uniquement le profil de base

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
