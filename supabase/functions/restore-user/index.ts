import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const token = authHeader.substring(7); // Remove 'Bearer '
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Non autorisé - token invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Vérifier que l'utilisateur est PDG (table pdg_management) OU Admin/CEO
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

    // Mode recherche: chercher par ID ou email
    if (search_query && !archive_id) {
      console.log('🔍 Recherche utilisateur:', search_query);
      
      const query = search_query.trim();
      
      // Chercher dans les archives
      const { data: archives, error: searchError } = await supabaseAdmin
        .from('deleted_users_archive')
        .select('*')
        .or(`public_id.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,original_user_id.eq.${query}`)
        .eq('is_restored', false)
        .order('deleted_at', { ascending: false })
        .limit(20);

      if (searchError) {
        console.error('❌ Erreur recherche:', searchError.message);
        throw new Error(`Erreur recherche: ${searchError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: archives || [],
          count: archives?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Mode restauration
    if (!archive_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'archive_id ou search_query requis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Récupérer les données archivées
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('deleted_users_archive')
      .select('*')
      .eq('id', archive_id)
      .single();

    if (archiveError || !archive) {
      console.error('❌ Archive non trouvée:', archiveError?.message);
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

    // Vérifier si l'utilisateur existe encore dans auth
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserById(archive.original_user_id);
    
    if (!existingAuthUser?.user) {
      // L'utilisateur n'existe plus, on doit le recréer
      console.log('📝 Création nouveau compte auth...');
      
      if (!archive.email) {
        return new Response(
          JSON.stringify({ success: false, error: "Impossible de restaurer: email manquant dans l'archive" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Vérifier si l'email n'est pas déjà utilisé
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === archive.email?.toLowerCase());
      
      if (emailExists) {
        return new Response(
          JSON.stringify({ success: false, error: `L'email ${archive.email} est déjà utilisé par un autre compte` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Créer un nouveau compte auth
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
        console.error('❌ Erreur création auth:', createAuthError.message);
        return new Response(
          JSON.stringify({ success: false, error: `Erreur création compte: ${createAuthError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      restoredUserId = newAuthUser.user.id;
      newUserCreated = true;
      console.log('✅ Nouveau compte auth créé:', restoredUserId);
    } else {
      console.log('✅ Compte auth existant trouvé:', restoredUserId);
    }

    // Vérifier si le profil existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', restoredUserId)
      .maybeSingle();

    if (!existingProfile && profileData) {
      // Restaurer le profil
      console.log('📝 Restauration profil...');
      
      const profileToRestore = {
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
      };

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(profileToRestore);

      if (profileError) {
        console.warn('⚠️ Erreur restauration profil:', profileError.message);
      } else {
        console.log('✅ Profil restauré');
      }
    } else if (existingProfile) {
      console.log('✅ Profil existant trouvé');
    }

    // Restaurer user_ids si nécessaire
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

    // Restaurer le wallet si nécessaire
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

    // Marquer comme restauré dans l'archive
    const { error: updateError } = await supabaseAdmin
      .from('deleted_users_archive')
      .update({
        is_restored: true,
        restored_at: new Date().toISOString(),
        restored_by: user.id,
        restoration_notes: restoration_notes || 'Restauration via Edge Function'
      })
      .eq('id', archive_id);

    if (updateError) {
      console.warn('⚠️ Erreur mise à jour archive:', updateError.message);
    }

    console.log('✅ Restauration terminée pour:', archive.email || archive.public_id);

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
    console.error('❌ Erreur restauration:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
