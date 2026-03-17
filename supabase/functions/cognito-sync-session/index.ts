/**
 * 🔄 COGNITO SYNC SESSION
 * Synchronise un utilisateur Cognito avec Supabase Auth
 * Crée l'utilisateur s'il n'existe pas, met à jour le mot de passe sinon
 * Permet le "double login" : Cognito principal + Supabase session pour RLS
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, cognitoUserId, role, firstName, lastName, phone, city, country, customId, mode } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email et mot de passe requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client pour gérer les utilisateurs
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (mode === 'signup') {
      // === MODE INSCRIPTION ===
      // Créer l'utilisateur dans Supabase Auth avec les mêmes credentials
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      if (existingUser) {
        // L'utilisateur existe déjà - mettre à jour le mot de passe
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            role: role || 'client',
            phone,
            city,
            country,
            custom_id: customId,
            cognito_user_id: cognitoUserId,
          },
        });

        return new Response(JSON.stringify({
          success: true,
          userId: existingUser.id,
          action: 'updated',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Créer un nouvel utilisateur
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role: role || 'client',
          phone,
          city,
          country,
          custom_id: customId,
          cognito_user_id: cognitoUserId,
        },
      });

      if (createError) {
        console.error('❌ Erreur création utilisateur Supabase:', createError.message);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        userId: newUser.user?.id,
        action: 'created',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // === MODE CONNEXION ===
      // S'assurer que l'utilisateur existe dans Supabase et que le mot de passe est synchronisé
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);

      if (!existingUser) {
        // L'utilisateur n'existe pas encore dans Supabase - le créer
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            cognito_user_id: cognitoUserId,
            role: role || 'client',
          },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          userId: newUser.user?.id,
          action: 'created',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // L'utilisateur existe - mettre à jour le mot de passe pour synchroniser
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        user_metadata: {
          ...existingUser.user_metadata,
          cognito_user_id: cognitoUserId,
        },
      });

      if (updateError) {
        console.error('❌ Erreur update mot de passe:', updateError.message);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        userId: existingUser.id,
        action: 'synced',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err) {
    console.error('❌ Erreur cognito-sync-session:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
