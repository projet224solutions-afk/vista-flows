import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service } = await req.json();
    const results: Record<string, any> = {};

    // AWS Backend Health Check (server-side, no CORS issue)
    if (!service || service === 'aws-backend') {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('https://api.224solution.net/health', {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const rt = Date.now() - start;
        results['aws-backend'] = {
          status: res.ok ? (rt > 2000 ? 'degraded' : 'operational') : 'degraded',
          responseTime: rt,
          message: res.ok ? `OK - ${rt}ms` : `HTTP ${res.status}`,
          httpStatus: res.status,
        };
      } catch (e: any) {
        results['aws-backend'] = {
          status: 'outage',
          responseTime: Date.now() - start,
          message: e?.name === 'AbortError' ? 'Timeout (>8s)' : `Serveur inaccessible: ${e?.message || 'Erreur réseau'}`,
        };
      }
    }

    // AWS Cognito Check (server-side)
    if (!service || service === 'aws-cognito') {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('https://api.224solution.net/api/cognito/validate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'health-check' }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const rt = Date.now() - start;
        // 401 is expected for invalid token = service is up
        results['aws-cognito'] = {
          status: (res.ok || res.status === 401 || res.status === 400) ? 'operational' : 'degraded',
          responseTime: rt,
          message: `Cognito accessible - ${rt}ms`,
          httpStatus: res.status,
        };
      } catch (e: any) {
        results['aws-cognito'] = {
          status: 'outage',
          responseTime: Date.now() - start,
          message: e?.name === 'AbortError' ? 'Timeout' : `Inaccessible: ${e?.message || 'Erreur'}`,
        };
      }
    }

    return new Response(JSON.stringify({ 
      status: 'success', 
      results,
      timestamp: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});