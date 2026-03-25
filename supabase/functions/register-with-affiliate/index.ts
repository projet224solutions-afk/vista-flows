import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Register User with Affiliate Link
 * Crée un utilisateur et l'associe automatiquement à l'agent affilié
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      email, 
      password, 
      phone, 
      first_name, 
      last_name, 
      role, // 'client', 'vendeur', 'service'
      affiliate_token,
      device_fingerprint 
    } = body;

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Email, mot de passe et rôle requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Extraire l'IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('cf-connecting-ip') || 
               null;

    let agentId: string | null = null;
    let linkId: string | null = null;
    let commissionRate: number | null = null;

    // Valider le token d'affiliation si fourni
    if (affiliate_token) {
      const { data: link, error: linkError } = await supabaseAdmin
        .from('agent_affiliate_links')
        .select(`
          *,
          agents_management (id, is_active, commission_rate)
        `)
        .eq('token', affiliate_token)
        .eq('is_active', true)
        .single();

      if (!linkError && link) {
        // Vérifier que le lien n'est pas expiré
        if (!link.expires_at || new Date(link.expires_at) > new Date()) {
          // Vérifier que l'agent est actif
          if (link.agents_management?.is_active) {
            // Vérifier le target_role
            if (link.target_role === 'all' || link.target_role === role) {
              agentId = link.agent_id;
              linkId = link.id;
              commissionRate = link.commission_override || link.agents_management?.commission_rate;

              // Anti-fraude: Vérifier les inscriptions multiples depuis la même IP
              if (ip) {
                const { count: sameIpCount } = await supabaseAdmin
                  .from('user_agent_affiliations')
                  .select('*', { count: 'exact', head: true })
                  .eq('registration_ip', ip)
                  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

                if (sameIpCount && sameIpCount >= 5) {
                  // Logger la fraude potentielle
                  await supabaseAdmin.from('affiliate_fraud_logs').insert({
                    agent_id: agentId,
                    link_id: linkId,
                    fraud_type: 'ip_abuse',
                    severity: 'high',
                    details: { ip, count: sameIpCount, email },
                    ip_address: ip,
                    device_fingerprint
                  });

                  // Ne pas bloquer l'inscription mais ne pas comptabiliser l'affiliation
                  agentId = null;
                  linkId = null;
                }
              }

              // Anti-fraude: Vérifier le device fingerprint
              if (device_fingerprint && agentId) {
                const { count: sameDeviceCount } = await supabaseAdmin
                  .from('user_agent_affiliations')
                  .select('*', { count: 'exact', head: true })
                  .eq('device_fingerprint', device_fingerprint)
                  .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

                if (sameDeviceCount && sameDeviceCount >= 3) {
                  await supabaseAdmin.from('affiliate_fraud_logs').insert({
                    agent_id: agentId,
                    link_id: linkId,
                    fraud_type: 'device_abuse',
                    severity: 'medium',
                    details: { fingerprint: device_fingerprint, count: sameDeviceCount, email },
                    ip_address: ip,
                    device_fingerprint
                  });

                  // Marquer comme suspect mais continuer
                }
              }
            }
          }
        }
      }
    }

    // Créer l'utilisateur via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone,
        role,
        affiliate_agent_id: agentId
      }
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('Échec de création utilisateur');
    }

    // Créer le profil
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      phone,
      first_name,
      last_name,
      role,
      is_active: true
    });

    // Si affiliation valide, créer l'association
    if (agentId && linkId) {
      // Créer l'affiliation
      const { error: affiliationError } = await supabaseAdmin
        .from('user_agent_affiliations')
        .insert({
          user_id: userId,
          agent_id: agentId,
          affiliate_link_id: linkId,
          affiliate_token,
          registration_ip: ip,
          device_fingerprint,
          is_verified: false,
          fraud_score: 0
        });

      if (!affiliationError) {
        // Incrémenter le compteur d'inscriptions
        await supabaseAdmin.rpc('increment_registrations_count', { 
          p_link_id: linkId 
        }).catch(() => {
          // Si la RPC n'existe pas, faire manuellement
          supabaseAdmin
            .from('agent_affiliate_links')
            .select('registrations_count')
            .eq('id', linkId)
            .single()
            .then(({ data }) => {
              supabaseAdmin
                .from('agent_affiliate_links')
                .update({ registrations_count: (data?.registrations_count || 0) + 1 })
                .eq('id', linkId);
            });
        });

        // Enregistrer aussi dans agent_created_users pour compatibilité
        await supabaseAdmin.from('agent_created_users').insert({
          agent_id: agentId,
          user_id: userId,
          user_role: role
        });

        // Si bonus d'inscription configuré, utiliser credit_agent_commission
        const { data: rule } = await supabaseAdmin
          .from('agent_commission_rules')
          .select('*')
          .eq('transaction_type', 'registration_bonus')
          .eq('is_active', true)
          .single();

        if (rule) {
          const bonusAmount = rule.default_rate * 100; // Bonus fixe
          await supabaseAdmin.rpc('credit_agent_commission', {
            p_user_id: userId,
            p_amount: bonusAmount,
            p_source_type: 'registration_bonus',
            p_transaction_id: null,
            p_metadata: { currency: 'GNF', source: 'register-with-affiliate' }
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        affiliated_to_agent: !!agentId,
        message: agentId 
          ? 'Inscription réussie ! Vous êtes affilié à un agent partenaire.'
          : 'Inscription réussie !'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur inscription:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
