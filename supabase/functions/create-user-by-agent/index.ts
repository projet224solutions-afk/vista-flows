// 👤 Create User by Agent - Edge Function
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Headers de sécurité renforcés
const securityHeaders = {
  ...corsHeaders,
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://esm.sh; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https:; font-src 'self' data:;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), microphone=(), camera=()'
};

// Schéma de validation Zod avec règles de sécurité strictes
const CreateUserSchema = z.object({
  email: z.string()
    .email({ message: 'Format email invalide' })
    .max(255, { message: 'Email trop long (max 255 caractères)' })
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, { message: 'Mot de passe minimum 8 caractères' })
    .max(100, { message: 'Mot de passe trop long (max 100 caractères)' }),
  firstName: z.string()
    .trim()
    .min(1, { message: 'Prénom requis' })
    .max(100, { message: 'Prénom trop long (max 100 caractères)' })
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, { message: 'Caractères invalides dans le prénom' }),
  lastName: z.string()
    .trim()
    .max(100, { message: 'Nom trop long (max 100 caractères)' })
    .regex(/^[a-zA-ZÀ-ÿ\s'-]*$/, { message: 'Caractères invalides dans le nom' })
    .optional(),
  phone: z.string()
    .regex(/^\+?[0-9]{8,15}$/, { message: 'Format téléphone invalide (8-15 chiffres)' })
    .trim(),
  role: z.enum(['client', 'vendeur', 'livreur', 'taxi', 'agent', 'sub_agent', 'syndicat'], {
    errorMap: () => ({ message: 'Rôle invalide' })
  }),
  country: z.string()
    .max(100, { message: 'Nom pays trop long' })
    .trim()
    .optional(),
  city: z.string()
    .max(100, { message: 'Nom ville trop long' })
    .trim()
    .optional(),
  agentId: z.string()
    .uuid({ message: 'Format agentId invalide (UUID requis)' }),
  agentCode: z.string()
    .max(50, { message: 'Code agent trop long' })
    .trim(),
  access_token: z.string().optional(),
  syndicatData: z.object({
    bureau_code: z.string().max(50).trim(),
    prefecture: z.string().max(100).trim(),
    commune: z.string().max(100).trim(),
    full_location: z.string().max(500).trim().optional(),
  }).optional(),
  vendeurData: z.object({
    business_name: z.string().max(200).trim(),
    business_description: z.string().max(1000).trim().optional(),
    business_address: z.string().max(500).trim().optional(),
  }).optional(),
  driverData: z.object({
    license_number: z.string().max(50).trim(),
    vehicle_type: z.string().max(50).trim(),
    vehicle_brand: z.string().max(100).trim().optional(),
    vehicle_model: z.string().max(100).trim().optional(),
    vehicle_year: z.string().max(4).regex(/^\d{4}$/).optional(),
    vehicle_plate: z.string().max(20).trim().optional(),
  }).optional(),
});

interface CreateUserRequest extends z.infer<typeof CreateUserSchema> {}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: securityHeaders });
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

    // Récupérer et valider le body avec Zod
    const rawBody = await req.json();
    
    // Validation stricte avec Zod
    const validationResult = CreateUserSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error('❌ Validation échouée:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Données invalides',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }),
        { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const body: CreateUserRequest = validationResult.data;

    // ==========================================
    // ✅ DUAL AUTH: JWT Supabase OU Token Agent
    // ==========================================
    let agent: any = null;
    let isPdg = false;
    let effectivePdgId: string = '';
    let effectivePermissions: string[] = [];
    let canCreateSubAgent = false;
    let authenticatedVia = '';

    const authHeader = req.headers.get('Authorization');

    // MÉTHODE 1: Authentification par token d'agent (access_token dans le body)
    if (body.access_token) {
      console.log('🔑 Tentative auth par access_token agent...');
      
      // Chercher dans agents_management (seuls les agents ont access_token)
      const { data: agentByToken, error: agentTokenError } = await supabaseClient
        .from('agents_management')
        .select('id, permissions, pdg_id, can_create_sub_agent, agent_code, name, is_active')
        .eq('access_token', body.access_token)
        .eq('is_active', true)
        .maybeSingle();

      if (agentByToken) {
        agent = agentByToken;
        effectivePdgId = agent.pdg_id;
        effectivePermissions = Array.isArray(agent.permissions) ? agent.permissions : ['create_users'];
        canCreateSubAgent = agent.can_create_sub_agent || false;
        authenticatedVia = 'agent_token';
        console.log('✅ Agent authentifié par token:', agent.id, agent.name);
      } else {
        console.error('❌ Token agent invalide ou agent inactif');
        return new Response(
          JSON.stringify({ 
            error: 'Token d\'authentification invalide ou agent inactif',
            code: 'INVALID_TOKEN'
          }),
          { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }
    }
    // MÉTHODE 2: Authentification par JWT Supabase
    else if (authHeader) {
      console.log('🔐 Tentative auth par JWT Supabase...');
      
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: jwtAuthError } = await supabaseAuth.auth.getUser();
      
      if (jwtAuthError || !user) {
        console.error('❌ JWT invalide:', jwtAuthError);
        return new Response(
          JSON.stringify({ 
            error: 'Non authentifié - JWT invalide',
            code: 'UNAUTHENTICATED'
          }),
          { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      console.log('✅ JWT validé pour user:', user.id);

      // Vérifier si c'est un PDG
      const { data: pdg, error: pdgError } = await supabaseClient
        .from('pdg_management')
        .select('id, permissions')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (pdg) {
        isPdg = true;
        effectivePdgId = pdg.id;
        effectivePermissions = Array.isArray(pdg.permissions) ? pdg.permissions : ['all'];
        canCreateSubAgent = true;
        authenticatedVia = 'jwt_pdg';
        console.log('✅ PDG authentifié par JWT:', pdg.id);
      } else {
        // Vérifier si c'est un agent
        const { data: agentData, error: agentError } = await supabaseClient
          .from('agents_management')
          .select('id, permissions, pdg_id, can_create_sub_agent, agent_code')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (agentData) {
          agent = agentData;
          effectivePdgId = agent.pdg_id;
          effectivePermissions = Array.isArray(agent.permissions) ? agent.permissions : ['create_users'];
          canCreateSubAgent = agent.can_create_sub_agent || false;
          authenticatedVia = 'jwt_agent';
          console.log('✅ Agent authentifié par JWT:', agent.id);
        } else {
          console.error('❌ Ni PDG ni Agent trouvé pour user:', user.id);
          return new Response(
            JSON.stringify({ 
              error: 'Utilisateur non autorisé (ni PDG ni Agent actif)',
              code: 'UNAUTHORIZED'
            }),
            { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
      }
    }
    // Aucune authentification
    else {
      console.error('❌ Aucune méthode d\'authentification fournie');
      return new Response(
        JSON.stringify({ 
          error: 'Non autorisé - authentification requise (JWT ou access_token)',
          code: 'UNAUTHORIZED'
        }),
        { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('🔒 Authentification réussie via:', authenticatedVia, '| PDG:', isPdg, '| Permissions:', effectivePermissions);

    // Vérifier que l'utilisateur a la permission de créer des utilisateurs
    const hasCreateUsersPermission = 
      effectivePermissions.includes('create_users') || 
      effectivePermissions.includes('all') ||
      effectivePermissions.includes('all_modules');

    if (!hasCreateUsersPermission) {
      console.error('❌ Permission manquante: create_users', effectivePermissions);
      return new Response(
        JSON.stringify({ 
          error: 'Permission insuffisante pour créer des utilisateurs',
          code: 'INSUFFICIENT_PERMISSIONS',
          permissions: effectivePermissions
        }),
        { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Si on crée un agent/sous-agent, vérifier la permission spécifique
    if ((body.role === 'agent' || body.role === 'sub_agent') && !canCreateSubAgent) {
      console.error('❌ Permission manquante: créer des sous-agents');
      return new Response(
        JSON.stringify({ 
          error: 'Permission insuffisante pour créer des agents',
          code: 'CANNOT_CREATE_AGENTS'
        }),
        { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Créer l'utilisateur dans auth.users
    console.log('🔄 Tentative de création utilisateur:', body.email, 'rôle:', body.role);
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
      // Vérifier le code d'erreur directement (plus fiable)
      if (authError.code === 'email_exists' || 
          authError.code === 'user_already_exists' ||
          authError.message?.includes('already been registered') || 
          authError.message?.includes('email_exists')) {
        console.log('⚠️ Email déjà utilisé:', body.email);
        return new Response(
          JSON.stringify({ 
            error: 'Un utilisateur avec cet email existe déjà',
            code: 'EMAIL_EXISTS'
          }),
          { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }
      
      console.error('❌ Erreur auth non gérée:', authError.code, authError.message);
      return new Response(
        JSON.stringify({ 
          error: authError.message || 'Erreur lors de la création de l\'utilisateur',
          code: authError.code || 'AUTH_ERROR',
          details: authError
        }),
        { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 400 }
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
        { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 500 }
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
      console.log('📦 Création profil vendeur pour:', authUser.user.id);
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
          address: vendorData.business_address, // Correction: 'address' au lieu de 'business_address'
          is_verified: false
        });

      if (vendorError) {
        console.error('❌ Vendor error:', vendorError);
        throw new Error('Erreur lors de la création du profil vendeur: ' + vendorError.message);
      }
      console.log('✅ Profil vendeur créé avec succès');
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
          pdg_id: effectivePdgId,
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
      console.log('🏢 Création bureau syndicat pour:', authUser.user.id);
      const syndicatData = body.syndicatData;
      
      if (!syndicatData || !syndicatData.bureau_code || !syndicatData.prefecture || !syndicatData.commune) {
        const errorMsg = 'Données du bureau syndical manquantes (code, préfecture, commune requis)';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('📋 Données bureau:', syndicatData);

      // Générer un access token unique pour le bureau
      const accessToken = crypto.randomUUID();
      console.log('🔑 Access token généré:', accessToken);

      const bureauData = {
        bureau_code: syndicatData.bureau_code,
        prefecture: syndicatData.prefecture,
        commune: syndicatData.commune,
        full_location: syndicatData.full_location || `${syndicatData.prefecture} - ${syndicatData.commune}`,
        president_name: `${body.firstName} ${body.lastName || ''}`.trim(),
        president_email: body.email,
        president_phone: body.phone,
        status: 'active',
        access_token: accessToken,
        interface_url: `${Deno.env.get('APP_URL') || 'https://a00e0cf7-bf68-445f-848b-f2c774cf80ce.lovableproject.com'}/bureau/${accessToken}`,
        total_members: 0,
        total_vehicles: 0,
        total_cotisations: 0
      };

      console.log('💾 Insertion bureau dans la base de données...');
      const { error: bureauError, data: bureauResult } = await supabaseClient
        .from('bureaus')
        .insert(bureauData)
        .select();

      if (bureauError) {
        console.error('❌ Bureau error:', bureauError);
        console.error('❌ Bureau error details:', JSON.stringify(bureauError));
        throw new Error('Erreur lors de la création du bureau syndical: ' + bureauError.message);
      }

      console.log('✅ Bureau syndical créé avec succès:', bureauResult);
    }

    // Le rôle transitaire utilise uniquement le profil de base

    // Déterminer l'agent_id effectif pour le tracking
    // IMPORTANT: Toujours utiliser l'ID de l'agent authentifié s'il existe
    // Si authentifié par token: agent.id est l'ID de l'agent
    // Si PDG: utiliser body.agentId (l'agent choisi) ou le PDG lui-même
    let effectiveAgentId: string | null = null;
    
    if (agent?.id) {
      // Authentification par agent (token ou JWT)
      effectiveAgentId = agent.id;
    } else if (isPdg && body.agentId) {
      // PDG créant pour un agent spécifique
      effectiveAgentId = body.agentId;
    }
    // Si PDG sans agentId spécifié, on ne track pas vers un agent
    
    console.log('📊 Tracking création utilisateur:', {
      isPdg,
      authenticatedVia,
      bodyAgentId: body.agentId,
      agentId: agent?.id,
      effectiveAgentId,
      userId: authUser.user.id
    });

    // Log de l'action
    const { error: auditError } = await supabaseClient.from('audit_logs').insert({
      actor_id: agent?.id || effectivePdgId, // L'agent ou PDG qui fait l'action
      action: 'USER_CREATED_BY_AGENT',
      target_type: 'user',
      target_id: authUser.user.id,
      data_json: {
        agent_id: effectiveAgentId,
        agent_code: body.agentCode,
        user_role: body.role,
        created_by_pdg: isPdg,
        timestamp: new Date().toISOString()
      }
    });

    if (auditError) {
      console.warn('⚠️ Erreur audit_logs (non bloquant):', auditError);
    }

    // Créer la liaison agent-utilisateur SEULEMENT si on a un agent_id valide
    if (effectiveAgentId) {
      const { error: linkError } = await supabaseClient.from('agent_created_users').insert({
        agent_id: effectiveAgentId,
        user_id: authUser.user.id,
        user_role: body.role
      });
      
      if (linkError) {
        console.error('❌ Erreur création liaison agent_created_users:', linkError);
        // Ne pas bloquer la création, juste logger l'erreur
      } else {
        console.log('✅ Liaison agent_created_users créée');
      }
    } else {
      console.warn('⚠️ Pas d\'agent_id valide pour créer la liaison agent_created_users');
    }

    console.log('✅ Utilisateur créé avec succès:', {
      id: authUser.user.id,
      email: body.email,
      role: body.role,
      public_id: publicId
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authUser.user.id,
          email: body.email,
          public_id: publicId,
          role: body.role
        },
        message: `Utilisateur ${body.role} créé avec succès`
      }),
      { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Create user by agent error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: 'GENERAL_ERROR'
      }),
      { headers: { ...securityHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

