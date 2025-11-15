// 🛡️ Security Incident Response - Edge Function
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncidentRequest {
  action: 'create' | 'update' | 'contain' | 'resolve';
  incidentId?: string;
  incidentType?: string;
  severity?: string;
  title?: string;
  description?: string;
  sourceIp?: string;
  targetService?: string;
  indicators?: any;
  autoActions?: boolean;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const body: IncidentRequest = await req.json();
    console.log('Security incident action:', body.action);

    let result: any = {};

    switch (body.action) {
      case 'create': {
        // Créer un incident
        const { data: incident, error: incidentError } = await supabaseClient
          .rpc('create_security_incident', {
            p_incident_type: body.incidentType,
            p_severity: body.severity,
            p_title: body.title,
            p_description: body.description,
            p_source_ip: body.sourceIp,
            p_target_service: body.targetService,
            p_indicators: body.indicators || {}
          });

        if (incidentError) throw incidentError;

        // Actions automatiques si demandées
        if (body.autoActions) {
          // Bloquer l'IP source si présente
          if (body.sourceIp && body.severity === 'critical') {
            await supabaseClient.rpc('block_ip_address', {
              p_ip_address: body.sourceIp,
              p_reason: `Auto-blocked: ${body.title}`,
              p_incident_id: incident,
              p_expires_hours: 24
            });
            console.log('Auto-blocked IP:', body.sourceIp);
          }

          // Créer un snapshot si incident critique
          if (body.severity === 'critical') {
            await supabaseClient.from('security_snapshots').insert({
              snapshot_type: 'system_state',
              incident_id: incident,
              storage_path: `/snapshots/${incident}_${Date.now()}.json`,
              metadata: { auto_created: true, timestamp: new Date().toISOString() }
            });
            console.log('Auto-created forensic snapshot');
          }
        }

        result = { incidentId: incident, action: 'created' };
        break;
      }

      case 'contain': {
        // Contenir un incident
        const { error: containError } = await supabaseClient
          .from('security_incidents')
          .update({
            status: 'contained',
            contained_at: new Date().toISOString()
          })
          .eq('id', body.incidentId);

        if (containError) throw containError;

        // Log audit
        await supabaseClient.from('security_audit_logs').insert({
          action: 'incident_contained',
          actor_type: 'user',
          target_type: 'incident',
          target_id: body.incidentId,
          incident_id: body.incidentId,
          details: { timestamp: new Date().toISOString() }
        });

        result = { incidentId: body.incidentId, action: 'contained' };
        break;
      }

      case 'resolve': {
        // Résoudre un incident
        const { error: resolveError } = await supabaseClient
          .from('security_incidents')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .eq('id', body.incidentId);

        if (resolveError) throw resolveError;

        // Log audit
        await supabaseClient.from('security_audit_logs').insert({
          action: 'incident_resolved',
          actor_type: 'user',
          target_type: 'incident',
          target_id: body.incidentId,
          incident_id: body.incidentId,
          details: { timestamp: new Date().toISOString() }
        });

        // Mettre à jour les métriques
        const today = new Date().toISOString().split('T')[0];
        await supabaseClient.rpc('update_security_metrics', { p_date: today });

        result = { incidentId: body.incidentId, action: 'resolved' };
        break;
      }

      case 'update': {
        // Mettre à jour un incident
        const { error: updateError } = await supabaseClient
          .from('security_incidents')
          .update({
            title: body.title,
            description: body.description,
            severity: body.severity,
            indicators: body.indicators
          })
          .eq('id', body.incidentId);

        if (updateError) throw updateError;

        result = { incidentId: body.incidentId, action: 'updated' };
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Security incident response error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
