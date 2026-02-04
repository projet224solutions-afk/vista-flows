import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DataStatus {
  exists: boolean;
  data?: unknown;
  count?: number;
}

interface UserDataAnalysis {
  profile: DataStatus;
  wallet: DataStatus;
  user_ids: DataStatus;
  agent: DataStatus;
  vendor: DataStatus;
  orders: DataStatus;
  transactions: DataStatus;
  archived: DataStatus;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé - token manquant' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé - token invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Vérifier permissions PDG/Admin/CEO
    const { data: pdgRow } = await supabaseAdmin
      .from('pdg_management')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!pdgRow) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = (profile?.role || '').toString().toLowerCase();
      if (!['admin', 'ceo', 'pdg'].includes(role)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permissions insuffisantes - PDG/Admin requis' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    }

    const body = await req.json();
    const { archive_id, search_query, restoration_notes } = body;

    // ======== MODE RECHERCHE ========
    if (search_query && !archive_id) {
      console.log('🔍 Recherche utilisateur:', search_query);
      
      const query = search_query.trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUUID = uuidRegex.test(query);
      
      // 1. Chercher dans profiles
      let profileFilter = `public_id.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`;
      if (isValidUUID) {
        profileFilter += `,id.eq.${query}`;
      }
      
      const { data: foundProfiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, phone, first_name, last_name, role, public_id, avatar_url, city, country, is_active, created_at')
        .or(profileFilter)
        .limit(10);
      
      if (profileError) {
        console.warn('⚠️ Erreur recherche profiles:', profileError.message);
      }

      // 2. Chercher dans user_ids
      const { data: foundUserIds } = await supabaseAdmin
        .from('user_ids')
        .select('user_id, custom_id')
        .ilike('custom_id', `%${query}%`)
        .limit(10);

      // 3. Chercher dans agents_management
      const { data: foundAgents } = await supabaseAdmin
        .from('agents_management')
        .select('id, user_id, name, email, phone, agent_code')
        .or(`agent_code.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(10);
      
      // 4. Chercher dans les archives
      let archiveFilter = `public_id.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,full_name.ilike.%${query}%`;
      if (isValidUUID) {
        archiveFilter += `,original_user_id.eq.${query}`;
      }
      
      const { data: archives } = await supabaseAdmin
        .from('deleted_users_archive')
        .select('*')
        .or(archiveFilter)
        .eq('is_restored', false)
        .order('deleted_at', { ascending: false })
        .limit(20);

      // Collecter tous les user_ids trouvés pour analyse complète
      const userIdsToAnalyze = new Set<string>();
      
      // Depuis profiles
      foundProfiles?.forEach(p => userIdsToAnalyze.add(p.id));
      
      // Depuis user_ids
      foundUserIds?.forEach(u => userIdsToAnalyze.add(u.user_id));
      
      // Depuis agents
      foundAgents?.filter(a => a.user_id).forEach(a => userIdsToAnalyze.add(a.user_id!));

      // Analyser chaque utilisateur trouvé
      const analyzedUsers = await Promise.all(
        Array.from(userIdsToAnalyze).map(async (userId) => {
          const analysis = await analyzeUserData(supabaseAdmin, userId, query);
          return { userId, ...analysis };
        })
      );

      // Construire les résultats enrichis
      const enrichedProfiles = foundProfiles?.map(profile => {
        const analysis = analyzedUsers.find(a => a.userId === profile.id);
        const archiveMatch = archives?.find(
          a => a.original_user_id === profile.id || 
               a.email === profile.email || 
               a.public_id === profile.public_id
        );
        
        return {
          ...profile,
          data_analysis: analysis || null,
          has_archived_data: !!archiveMatch,
          archived_data: archiveMatch || null
        };
      }) || [];

      // Ajouter les utilisateurs trouvés via user_ids mais pas dans profiles
      const additionalFromUserIds = foundUserIds?.filter(
        u => !foundProfiles?.some(p => p.id === u.user_id)
      ) || [];

      for (const uid of additionalFromUserIds) {
        const analysis = analyzedUsers.find(a => a.userId === uid.user_id);
        if (analysis?.profile?.exists) {
          const profileData = analysis.profile.data as Record<string, unknown>;
          enrichedProfiles.push({
            id: uid.user_id,
            email: (profileData?.email as string) || null,
            phone: (profileData?.phone as string) || null,
            first_name: (profileData?.first_name as string) || null,
            last_name: (profileData?.last_name as string) || null,
            role: (profileData?.role as string) || null,
            public_id: uid.custom_id,
            avatar_url: (profileData?.avatar_url as string) || null,
            city: (profileData?.city as string) || null,
            country: (profileData?.country as string) || null,
            is_active: (profileData?.is_active as boolean) ?? null,
            created_at: (profileData?.created_at as string) || null,
            data_analysis: analysis,
            has_archived_data: false,
            archived_data: null
          });
        }
      }

      console.log(`✅ ${enrichedProfiles.length} profil(s), ${archives?.length || 0} archive(s)`);

      return new Response(
        JSON.stringify({
          success: true,
          active_profiles: enrichedProfiles,
          archived_users: archives || [],
          agents_found: foundAgents || [],
          total_active: enrichedProfiles.length,
          total_archived: archives?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ======== MODE RESTAURATION ========
    if (!archive_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'archive_id ou search_query requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('deleted_users_archive')
      .select('*')
      .eq('id', archive_id)
      .single();

    if (archiveError || !archive) {
      return new Response(
        JSON.stringify({ success: false, error: 'Archive non trouvée' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (archive.is_restored) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cet utilisateur a déjà été restauré' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('🔄 Début restauration:', archive.email || archive.public_id);

    const profileData = archive.profile_data as Record<string, unknown> | null;
    const walletData = archive.wallet_data as Record<string, unknown> | null;
    const userIdsData = archive.user_ids_data as Record<string, unknown> | null;
    
    let restoredUserId = archive.original_user_id;
    let newUserCreated = false;

    // Vérifier si l'utilisateur existe dans auth
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserById(archive.original_user_id);
    
    if (!existingAuthUser?.user) {
      console.log('📝 Création nouveau compte auth...');
      
      if (!archive.email) {
        return new Response(
          JSON.stringify({ success: false, error: "Impossible de restaurer: email manquant" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === archive.email?.toLowerCase());
      
      if (emailExists) {
        return new Response(
          JSON.stringify({ success: false, error: `L'email ${archive.email} est déjà utilisé` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}!${Date.now()}`;
      
      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: archive.email,
        password: tempPassword,
        email_confirm: true,
        phone: archive.phone || undefined,
        user_metadata: {
          first_name: profileData?.first_name || '',
          last_name: profileData?.last_name || '',
          role: archive.role || 'client',
          restored_from_archive: true,
          original_user_id: archive.original_user_id
        }
      });

      if (createAuthError) {
        return new Response(
          JSON.stringify({ success: false, error: `Erreur création compte: ${createAuthError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      restoredUserId = newAuthUser.user.id;
      newUserCreated = true;
      console.log('✅ Nouveau compte auth créé:', restoredUserId);
    }

    // Restaurer le profil
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', restoredUserId)
      .maybeSingle();

    if (!existingProfile && profileData) {
      console.log('📝 Restauration profil...');
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: restoredUserId,
          email: archive.email,
          phone: archive.phone,
          first_name: profileData.first_name || null,
          last_name: profileData.last_name || null,
          role: archive.role || 'client',
          public_id: archive.public_id,
          avatar_url: profileData.avatar_url || null,
          city: profileData.city || null,
          country: profileData.country || 'Guinée',
          is_active: true,
          created_at: archive.original_created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn('⚠️ Erreur restauration profil:', profileError.message);
      } else {
        console.log('✅ Profil restauré');
      }
    }

    // Restaurer user_ids
    if (userIdsData && archive.public_id) {
      const { data: existingUserIds } = await supabaseAdmin
        .from('user_ids')
        .select('id')
        .eq('user_id', restoredUserId)
        .maybeSingle();

      if (!existingUserIds) {
        console.log('📝 Restauration user_ids...');
        
        const { error: userIdsError } = await supabaseAdmin
          .from('user_ids')
          .insert({
            user_id: restoredUserId,
            custom_id: archive.public_id,
            created_at: new Date().toISOString()
          });

        if (userIdsError) {
          console.warn('⚠️ Erreur restauration user_ids:', userIdsError.message);
        } else {
          console.log('✅ user_ids restauré');
        }
      }
    }

    // Restaurer le wallet
    if (walletData) {
      const { data: existingWallet } = await supabaseAdmin
        .from('wallets')
        .select('id')
        .eq('user_id', restoredUserId)
        .maybeSingle();

      if (!existingWallet) {
        console.log('📝 Restauration wallet...');
        
        const { error: walletError } = await supabaseAdmin
          .from('wallets')
          .insert({
            user_id: restoredUserId,
            balance: walletData.balance || 0,
            currency: walletData.currency || 'GNF',
            wallet_status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (walletError) {
          console.warn('⚠️ Erreur restauration wallet:', walletError.message);
        } else {
          console.log('✅ Wallet restauré');
        }
      }
    }

    // Marquer comme restauré
    await supabaseAdmin
      .from('deleted_users_archive')
      .update({
        is_restored: true,
        restored_at: new Date().toISOString(),
        restored_by: user.id,
        restoration_notes: restoration_notes || 'Restauration via Edge Function'
      })
      .eq('id', archive_id);

    console.log('✅ Restauration terminée');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Utilisateur ${archive.public_id || archive.email} restauré avec succès`,
        data: {
          restored_user_id: restoredUserId,
          new_user_created: newUserCreated,
          original_user_id: archive.original_user_id,
          public_id: archive.public_id,
          email: archive.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Fonction d'analyse complète des données utilisateur
async function analyzeUserData(
  supabase: ReturnType<typeof createClient>, 
  userId: string,
  searchQuery?: string
): Promise<{ analysis: UserDataAnalysis; missing_data: string[]; has_issues: boolean }> {
  
  const missing_data: string[] = [];
  
  // 1. Profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  const profileStatus: DataStatus = { exists: !!profile, data: profile };
  if (!profile) missing_data.push('Profil utilisateur');

  // 2. Wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  const walletStatus: DataStatus = { exists: !!wallet, data: wallet };
  if (!wallet) missing_data.push('Portefeuille');

  // 3. User IDs
  const { data: userIds } = await supabase
    .from('user_ids')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  const userIdsStatus: DataStatus = { exists: !!userIds, data: userIds };
  if (!userIds) missing_data.push('Identifiant public');

  // 4. Agent (si applicable)
  const { data: agent } = await supabase
    .from('agents_management')
    .select('id, name, agent_code, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  
  const agentStatus: DataStatus = { exists: !!agent, data: agent };

  // 5. Vendor (si applicable)
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, shop_name, status')
    .eq('user_id', userId)
    .maybeSingle();
  
  const vendorStatus: DataStatus = { exists: !!vendor, data: vendor };

  // 6. Commandes
  const { data: orders, count: ordersCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .limit(1);
  
  const ordersStatus: DataStatus = { exists: (ordersCount || 0) > 0, count: ordersCount || 0 };

  // 7. Transactions
  const { data: transactions, count: transactionsCount } = await supabase
    .from('wallet_transactions')
    .select('id', { count: 'exact' })
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .limit(1);
  
  const transactionsStatus: DataStatus = { exists: (transactionsCount || 0) > 0, count: transactionsCount || 0 };

  // 8. Archives
  const { data: archived } = await supabase
    .from('deleted_users_archive')
    .select('id, deleted_at, deletion_reason, is_restored')
    .eq('original_user_id', userId)
    .eq('is_restored', false)
    .maybeSingle();
  
  const archivedStatus: DataStatus = { exists: !!archived, data: archived };

  const analysis: UserDataAnalysis = {
    profile: profileStatus,
    wallet: walletStatus,
    user_ids: userIdsStatus,
    agent: agentStatus,
    vendor: vendorStatus,
    orders: ordersStatus,
    transactions: transactionsStatus,
    archived: archivedStatus
  };

  // Déterminer s'il y a des problèmes
  const has_issues = missing_data.length > 0 || archivedStatus.exists;

  return { analysis, missing_data, has_issues };
}
