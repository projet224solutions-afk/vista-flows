import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Schéma de validation
const DeleteUserSchema = z.object({
  userId: z.string().uuid({ message: 'userId doit être un UUID valide' })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ✅ JWT Authentication enabled
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé - token JWT manquant' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation avec Zod
    const rawBody = await req.json();
    const validationResult = DeleteUserSchema.safeParse(rawBody);
    
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { userId } = validationResult.data;
    console.log('✅ Validation réussie - Deleting user:', userId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ✅ Verify authenticated user is an active agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents_management')
      .select('id, is_active, permissions')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({ error: 'Agent non trouvé ou inactif' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agent.permissions.includes('manage_users')) {
      return new Response(
        JSON.stringify({ error: 'Permission refusée' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user was created by this agent
    const { data: createdUser, error: createdUserError } = await supabaseAdmin
      .from('agent_created_users')
      .select('user_id')
      .eq('agent_id', agent.id)
      .eq('user_id', userId)
      .single();

    if (createdUserError || !createdUser) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé ou non créé par cet agent' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================
    // ARCHIVAGE AVANT SUPPRESSION AUTH
    // ========================================
    try {
      console.log('📦 Archivage utilisateur (agent-delete-user)...');

      const { data: authToDelete } = await supabaseAdmin.auth.admin.getUserById(userId);
      const email = authToDelete?.user?.email ?? null;
      const phone = authToDelete?.user?.phone ?? null;

      const { data: profileToArchive } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: walletData } = await supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: userIdsData } = await supabaseAdmin
        .from('user_ids')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const fullName = profileToArchive?.first_name && profileToArchive?.last_name
        ? `${profileToArchive.first_name} ${profileToArchive.last_name}`.trim()
        : profileToArchive?.first_name || profileToArchive?.last_name || null;

      const { error: archiveError } = await supabaseAdmin
        .from('deleted_users_archive')
        .insert({
          original_user_id: userId,
          email,
          phone,
          full_name: fullName,
          role: profileToArchive?.role ?? null,
          public_id: profileToArchive?.public_id ?? null,
          profile_data: profileToArchive ?? null,
          wallet_data: walletData ?? null,
          user_ids_data: userIdsData ?? null,
          role_specific_data: { agent_id: agent.id },
          deletion_reason: 'Suppression via agent',
          deletion_method: 'agent-delete-user',
          deleted_by: user.id,
          expires_at: expiresAt.toISOString(),
          original_created_at: profileToArchive?.created_at ?? null,
          is_restored: false,
        });

      if (archiveError) {
        console.warn('⚠️ Archivage échoué (non bloquant):', archiveError.message);
      } else {
        console.log('✅ Archivage OK');
      }
    } catch (e) {
      console.warn('⚠️ Archivage exception (non bloquant):', e instanceof Error ? e.message : String(e));
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: agent.id,
      action: 'USER_DELETED',
      target_type: 'user',
      target_id: userId
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
