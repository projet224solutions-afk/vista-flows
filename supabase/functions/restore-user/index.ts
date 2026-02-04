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

    // Vérifier que l'utilisateur est PDG ou Admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['pdg', 'admin', 'ceo'].includes(profile.role?.toLowerCase() || '')) {
      throw new Error('Permissions insuffisantes - PDG/Admin requis');
    }

    const { archive_id, restoration_notes } = await req.json();

    if (!archive_id) {
      throw new Error('ID archive requis');
    }

    // Récupérer les données archivées
    const { data: archive, error: archiveError } = await supabaseAdmin
      .from('deleted_users_archive')
      .select('*')
      .eq('id', archive_id)
      .single();

    if (archiveError || !archive) {
      throw new Error('Archive non trouvée');
    }

    if (archive.is_restored) {
      throw new Error('Cet utilisateur a déjà été restauré');
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
        throw new Error('Impossible de restaurer: email manquant dans l\'archive');
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
        throw new Error(`Erreur création auth: ${createAuthError.message}`);
      }

      restoredUserId = newAuthUser.user.id;
      newUserCreated = true;
      console.log('✅ Nouveau compte auth créé:', restoredUserId);
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
        restoration_notes: restoration_notes || 'Restauration automatique via Edge Function'
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
          public_id: archive.public_id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur restauration:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
