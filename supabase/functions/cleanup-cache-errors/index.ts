import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Résoudre les erreurs de modules dynamiques via RPC
    const { data: cacheResult } = await supabaseClient.rpc('resolve_cache_errors', {});

    // 2. Marquer les erreurs mineures de chargement ressource
    const { data: resourceErrors } = await supabaseClient
      .from('system_errors')
      .update({
        status: 'resolved',
        fix_applied: true,
        fix_description: 'Erreur de chargement ressource mineure - ignorée'
      })
      .eq('status', 'detected')
      .eq('severity', 'mineure')
      .eq('error_type', 'resource_load_error')
      .select('id');

    // 3. Marquer les erreurs "fixed" comme résolues
    const { data: fixedErrors } = await supabaseClient
      .from('system_errors')
      .update({
        status: 'resolved'
      })
      .eq('status', 'fixed')
      .select('id');

    // 4. Enregistrer ce nettoyage
    await supabaseClient
      .from('deployment_logs')
      .insert({
        version: 'cleanup-v2',
        deployed_by: 'system',
        notes: 'Nettoyage automatique des erreurs transitoires',
        status: 'success',
        metadata: {
          cache_errors_resolved: cacheResult || 0,
          resource_errors_resolved: resourceErrors?.length || 0,
          fixed_errors_resolved: fixedErrors?.length || 0
        }
      });

    // 5. Compter les erreurs restantes
    const { count: remainingCount } = await supabaseClient
      .from('system_errors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'detected');

    return new Response(JSON.stringify({
      success: true,
      resolved: {
        cache_errors: cacheResult || 0,
        resource_errors: resourceErrors?.length || 0,
        fixed_errors: fixedErrors?.length || 0
      },
      remaining_detected: remainingCount || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Cleanup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
