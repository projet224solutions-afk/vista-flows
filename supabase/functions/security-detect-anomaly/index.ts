// 🔍 Security Anomaly Detection - Edge Function (SECURED)
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionRequest {
  type: 'brute_force' | 'rate_limit' | 'geo_anomaly' | 'behavior';
  userId?: string;
  ipAddress?: string;
  endpoint?: string;
  threshold?: number;
}

// Rôles autorisés pour la détection d'anomalies
const ALLOWED_ROLES = ['admin', 'pdg', 'service_role'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 🔐 VALIDATION AUTHENTIFICATION
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé - Token manquant' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Vérifier le token et récupérer l'utilisateur
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Token invalide:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Non autorisé - Token invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 🔐 VALIDATION DU RÔLE - Vérifier dans la table profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Profil non trouvé:', profileError?.message);
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur non trouvé' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Vérifier que l'utilisateur a un rôle autorisé
    if (!ALLOWED_ROLES.includes(profile.role)) {
      console.error('❌ Rôle non autorisé:', profile.role);
      
      // Log l'tentative non autorisée
      await supabaseClient.from('security_audit_logs').insert({
        action: 'unauthorized_anomaly_detection_access',
        actor_id: user.id,
        actor_type: 'user',
        target_type: 'security_detect_anomaly',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        details: { 
          attempted_action: 'detect_anomaly',
          user_role: profile.role 
        }
      });

      return new Response(
        JSON.stringify({ error: 'Accès refusé - Privilèges insuffisants' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`✅ Utilisateur autorisé: ${user.id} (rôle: ${profile.role})`);

    const body: DetectionRequest = await req.json();
    
    // Validation des entrées
    if (!body.type || !['brute_force', 'rate_limit', 'geo_anomaly', 'behavior'].includes(body.type)) {
      return new Response(
        JSON.stringify({ error: 'Type de détection invalide' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validation IP si fournie
    if (body.ipAddress) {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(body.ipAddress)) {
        return new Response(
          JSON.stringify({ error: 'Adresse IP invalide' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Validation UUID si fourni
    if (body.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(body.userId)) {
        return new Response(
          JSON.stringify({ error: 'userId invalide' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    console.log('Anomaly detection:', body.type, 'by:', user.id);

    let anomalyDetected = false;
    let details: any = {};

    switch (body.type) {
      case 'brute_force': {
        if (!body.ipAddress) {
          return new Response(
            JSON.stringify({ error: 'ipAddress requis pour brute_force' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Détecter les tentatives de brute force (5+ échecs login en 5 min)
        const { data: failedAttempts } = await supabaseClient
          .from('security_audit_logs')
          .select('*')
          .eq('action', 'login_failed')
          .eq('ip_address', body.ipAddress)
          .gte('created_at', new Date(Date.now() - 5 * 60000).toISOString())
          .order('created_at', { ascending: false });

        const threshold = body.threshold || 5;
        if (failedAttempts && failedAttempts.length >= threshold) {
          anomalyDetected = true;
          details = {
            attempts: failedAttempts.length,
            threshold,
            timeWindow: '5 minutes',
            ipAddress: body.ipAddress
          };

          // Auto-bloquer l'IP
          await supabaseClient.rpc('block_ip_address', {
            p_ip_address: body.ipAddress,
            p_reason: `Brute force detected: ${failedAttempts.length} failed login attempts`,
            p_expires_hours: 2
          });

          // Créer un incident
          await supabaseClient.rpc('create_security_incident', {
            p_incident_type: 'brute_force',
            p_severity: 'high',
            p_title: 'Brute Force Attack Detected',
            p_description: `${failedAttempts.length} failed login attempts from ${body.ipAddress}`,
            p_source_ip: body.ipAddress,
            p_target_service: 'authentication'
          });
        }
        break;
      }

      case 'rate_limit': {
        if (!body.ipAddress) {
          return new Response(
            JSON.stringify({ error: 'ipAddress requis pour rate_limit' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Détecter dépassement de rate limit
        const { data: recentRequests } = await supabaseClient
          .from('security_audit_logs')
          .select('*')
          .eq('ip_address', body.ipAddress)
          .gte('created_at', new Date(Date.now() - 60000).toISOString());

        const threshold = body.threshold || 100;
        if (recentRequests && recentRequests.length >= threshold) {
          anomalyDetected = true;
          details = {
            requests: recentRequests.length,
            threshold,
            timeWindow: '1 minute',
            ipAddress: body.ipAddress
          };

          // Créer une alerte
          await supabaseClient.from('security_alerts').insert({
            alert_type: 'rate_limit_exceeded',
            severity: 'medium',
            message: `Rate limit exceeded: ${recentRequests.length} requests in 1 minute`,
            source: body.ipAddress,
            auto_action_taken: 'ALERT',
            metadata: details
          });
        }
        break;
      }

      case 'geo_anomaly': {
        if (!body.userId) {
          return new Response(
            JSON.stringify({ error: 'userId requis pour geo_anomaly' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Détecter changement géographique suspect
        const { data: recentLogins } = await supabaseClient
          .from('security_audit_logs')
          .select('*, details')
          .eq('actor_id', body.userId)
          .eq('action', 'login_success')
          .order('created_at', { ascending: false })
          .limit(2);

        if (recentLogins && recentLogins.length === 2) {
          // Simuler détection de pays différents (à implémenter avec vraie géolocalisation)
          const timeDiff = new Date(recentLogins[0].created_at).getTime() - 
                          new Date(recentLogins[1].created_at).getTime();
          
          if (timeDiff < 3600000) { // Moins d'1h entre 2 connexions
            anomalyDetected = true;
            details = {
              userId: body.userId,
              timeDifference: `${Math.round(timeDiff / 60000)} minutes`,
              logins: recentLogins.map(l => ({ created_at: l.created_at, ip: l.ip_address }))
            };

            // Créer une alerte
            await supabaseClient.from('security_alerts').insert({
              alert_type: 'geo_anomaly',
              severity: 'medium',
              message: `Suspicious geographic activity detected for user`,
              auto_action_taken: 'ALERT',
              metadata: { ...details, detected_by: user.id }
            });
          }
        }
        break;
      }

      case 'behavior': {
        if (!body.userId) {
          return new Response(
            JSON.stringify({ error: 'userId requis pour behavior' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Détecter comportement anormal
        const { data: userActions } = await supabaseClient
          .from('security_audit_logs')
          .select('*')
          .eq('actor_id', body.userId)
          .gte('created_at', new Date(Date.now() - 3600000).toISOString());

        const threshold = body.threshold || 500;
        if (userActions && userActions.length >= threshold) {
          anomalyDetected = true;
          details = {
            actions: userActions.length,
            threshold,
            timeWindow: '1 hour',
            userId: body.userId
          };

          // Créer une alerte
          await supabaseClient.from('security_alerts').insert({
            alert_type: 'behavior_anomaly',
            severity: 'medium',
            message: `Abnormal user behavior: ${userActions.length} actions in 1 hour`,
            auto_action_taken: 'ALERT',
            metadata: { ...details, detected_by: user.id }
          });
        }
        break;
      }
    }

    // Log l'opération de détection
    await supabaseClient.from('security_audit_logs').insert({
      action: 'anomaly_detection',
      actor_id: user.id,
      actor_type: 'user',
      target_type: body.type,
      details: {
        detected: anomalyDetected,
        type: body.type,
        parameters: body,
        result: details
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        anomalyDetected, 
        type: body.type,
        details 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Anomaly detection error:', error);
    // Message d'erreur générique pour éviter la fuite d'informations
    return new Response(
      JSON.stringify({ error: 'Une erreur est survenue lors de la détection' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
