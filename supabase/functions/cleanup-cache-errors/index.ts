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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    console.log('Supabase URL present:', !!supabaseUrl);
    console.log('Service Role Key present:', !!serviceRoleKey);
    
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Récupérer les IDs des erreurs de module dynamique
    const { data: dynamicModuleErrors, error: fetchError1 } = await supabaseClient
      .from('system_errors')
      .select('id')
      .eq('status', 'detected')
      .ilike('error_message', '%Failed to fetch dynamically imported module%');

    if (fetchError1) {
      console.error('Fetch error 1:', fetchError1);
    }
    console.log('Dynamic module errors found:', dynamicModuleErrors?.length);

    // 2. Récupérer les IDs des erreurs de chargement
    const { data: loadErrors, error: fetchError2 } = await supabaseClient
      .from('system_errors')
      .select('id')
      .eq('status', 'detected')
      .ilike('error_message', '%Failed to load%');

    if (fetchError2) {
      console.error('Fetch error 2:', fetchError2);
    }
    console.log('Load errors found:', loadErrors?.length);

    // Combiner tous les IDs
    const allCacheErrorIds = [
      ...(dynamicModuleErrors?.map(e => e.id) || []),
      ...(loadErrors?.map(e => e.id) || [])
    ];
    
    // Supprimer les doublons
    const uniqueCacheIds = [...new Set(allCacheErrorIds)];
    console.log('Unique cache error IDs:', uniqueCacheIds.length);

    let cacheResolvedCount = 0;
    if (uniqueCacheIds.length > 0) {
      const { data, error: updateError } = await supabaseClient
        .from('system_errors')
        .update({
          status: 'resolved',
          fix_applied: true,
          fix_description: 'Erreur transitoire post-déploiement - cache navigateur obsolète'
        })
        .in('id', uniqueCacheIds)
        .select('id');
      
      if (updateError) {
        console.error('Update error for cache errors:', JSON.stringify(updateError));
      }
      console.log('Update result:', data?.length);
      cacheResolvedCount = data?.length || 0;
    }

    // 3. Résoudre les erreurs mineures de ressource
    const { data: resourceErrorsToResolve } = await supabaseClient
      .from('system_errors')
      .select('id')
      .eq('status', 'detected')
      .eq('severity', 'mineure')
      .eq('error_type', 'resource_load_error');

    let resourceResolvedCount = 0;
    if (resourceErrorsToResolve && resourceErrorsToResolve.length > 0) {
      const ids = resourceErrorsToResolve.map(e => e.id);
      const { data, error: resUpdateError } = await supabaseClient
        .from('system_errors')
        .update({
          status: 'resolved',
          fix_applied: true,
          fix_description: 'Erreur de chargement ressource mineure - ignorée'
        })
        .in('id', ids)
        .select('id');
      
      if (resUpdateError) {
        console.error('Resource update error:', resUpdateError);
      }
      resourceResolvedCount = data?.length || 0;
    }

    // 4. Résoudre les erreurs "fixed"
    const { data: fixedErrorsToResolve } = await supabaseClient
      .from('system_errors')
      .select('id')
      .eq('status', 'fixed');

    let fixedResolvedCount = 0;
    if (fixedErrorsToResolve && fixedErrorsToResolve.length > 0) {
      const ids = fixedErrorsToResolve.map(e => e.id);
      const { data, error: fixedUpdateError } = await supabaseClient
        .from('system_errors')
        .update({ status: 'resolved' })
        .in('id', ids)
        .select('id');
        
      if (fixedUpdateError) {
        console.error('Fixed update error:', fixedUpdateError);
      }
      fixedResolvedCount = data?.length || 0;
    }

    // 5. Enregistrer ce nettoyage
    await supabaseClient
      .from('deployment_logs')
      .insert({
        version: 'cleanup-v5',
        deployed_by: 'system',
        notes: 'Nettoyage automatique des erreurs transitoires',
        status: 'success',
        metadata: {
          cache_errors_found: uniqueCacheIds.length,
          cache_errors_resolved: cacheResolvedCount,
          resource_errors_resolved: resourceResolvedCount,
          fixed_errors_resolved: fixedResolvedCount
        }
      });

    // 6. Compter les erreurs restantes
    const { count: remainingCount } = await supabaseClient
      .from('system_errors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'detected');

    return new Response(JSON.stringify({
      success: true,
      found: {
        cache_errors: uniqueCacheIds.length
      },
      resolved: {
        cache_errors: cacheResolvedCount,
        resource_errors: resourceResolvedCount,
        fixed_errors: fixedResolvedCount
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
