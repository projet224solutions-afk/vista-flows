import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccount = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT');
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
    const apiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');

    if (!serviceAccount || !projectId) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Google Cloud manquante',
          hasServiceAccount: !!serviceAccount,
          hasProjectId: !!projectId,
          hasApiKey: !!apiKey
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

    // Configuration Firebase pour le client
    const firebaseConfig = {
      apiKey: apiKey || '',
      authDomain: `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
      messagingSenderId: parsedServiceAccount.project_id || projectId,
      appId: parsedServiceAccount.client_id || '',
      databaseURL: `https://${projectId}.firebaseio.com`,
      // Configuration Firestore
      firestoreSettings: {
        cacheSizeBytes: 50000000, // 50MB cache pour offline
        experimentalForceLongPolling: false,
        experimentalAutoDetectLongPolling: true,
      }
    };

    console.log('✅ Firebase configuration generated for project:', projectId);

    return new Response(
      JSON.stringify({ 
        status: 'success',
        config: firebaseConfig,
        serviceAccountEmail: parsedServiceAccount.client_email,
        projectId: projectId,
        offlineEnabled: true,
        timestamp: new Date().toISOString()
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('❌ Firebase config error:', error);
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
