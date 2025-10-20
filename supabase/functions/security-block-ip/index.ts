// 🚫 Security IP Blocker - Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlockRequest {
  action: 'block' | 'unblock' | 'check';
  ipAddress: string;
  reason?: string;
  incidentId?: string;
  expiresHours?: number;
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

    const body: BlockRequest = await req.json();
    console.log('IP block action:', body.action, body.ipAddress);

    let result: any = {};

    switch (body.action) {
      case 'block': {
        // Bloquer une IP
        const { data: blockId, error: blockError } = await supabaseClient
          .rpc('block_ip_address', {
            p_ip_address: body.ipAddress,
            p_reason: body.reason || 'Manual block',
            p_incident_id: body.incidentId,
            p_expires_hours: body.expiresHours || 24
          });

        if (blockError) throw blockError;

        // Créer une alerte
        await supabaseClient.from('security_alerts').insert({
          alert_type: 'ip_blocked',
          severity: 'high',
          message: `IP ${body.ipAddress} has been blocked: ${body.reason}`,
          source: body.ipAddress,
          auto_action_taken: 'IP_BLOCK',
          metadata: { expires_hours: body.expiresHours || 24 }
        });

        result = { 
          blocked: true, 
          ipAddress: body.ipAddress, 
          blockId,
          expiresAt: new Date(Date.now() + (body.expiresHours || 24) * 3600000).toISOString()
        };
        break;
      }

      case 'unblock': {
        // Débloquer une IP
        const { error: unblockError } = await supabaseClient
          .from('blocked_ips')
          .update({ is_active: false })
          .eq('ip_address', body.ipAddress);

        if (unblockError) throw unblockError;

        // Log audit
        await supabaseClient.from('security_audit_logs').insert({
          action: 'ip_unblocked',
          actor_type: 'user',
          target_type: 'blocked_ip',
          ip_address: body.ipAddress,
          details: { reason: 'Manual unblock' }
        });

        result = { unblocked: true, ipAddress: body.ipAddress };
        break;
      }

      case 'check': {
        // Vérifier si une IP est bloquée
        const { data: blockedIp, error: checkError } = await supabaseClient
          .from('blocked_ips')
          .select('*')
          .eq('ip_address', body.ipAddress)
          .eq('is_active', true)
          .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        result = { 
          isBlocked: !!blockedIp,
          ipAddress: body.ipAddress,
          blockDetails: blockedIp || null
        };
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('IP block error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
