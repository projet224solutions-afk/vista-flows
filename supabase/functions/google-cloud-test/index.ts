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
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
    const serviceAccount = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT');

    if (!projectId || !serviceAccount) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuration manquante',
          hasProjectId: !!projectId,
          hasServiceAccount: !!serviceAccount
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse service account
    let parsedServiceAccount;
    try {
      parsedServiceAccount = JSON.parse(serviceAccount);
    } catch (e) {
      const error = e as Error;
      return new Response(
        JSON.stringify({ 
          error: 'Service account JSON invalide',
          details: error.message
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test Google Cloud configuration
    const result = {
      status: 'success',
      message: 'Configuration Google Cloud valide',
      projectId: projectId,
      serviceAccountEmail: parsedServiceAccount.client_email,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Google Cloud test successful:', result);

    return new Response(
      JSON.stringify(result), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Google Cloud test error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
