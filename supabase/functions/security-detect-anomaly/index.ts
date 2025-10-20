// 🔍 Security Anomaly Detection - Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: DetectionRequest = await req.json();
    console.log('Anomaly detection:', body.type);

    let anomalyDetected = false;
    let details: any = {};

    switch (body.type) {
      case 'brute_force': {
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
              logins: recentLogins
            };

            // Créer une alerte
            await supabaseClient.from('security_alerts').insert({
              alert_type: 'geo_anomaly',
              severity: 'medium',
              message: `Suspicious geographic activity detected for user ${body.userId}`,
              auto_action_taken: 'ALERT',
              metadata: details
            });
          }
        }
        break;
      }

      case 'behavior': {
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
            metadata: details
          });
        }
        break;
      }
    }

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
    console.error('Anomaly detection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
