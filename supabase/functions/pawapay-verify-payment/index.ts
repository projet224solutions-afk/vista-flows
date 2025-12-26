import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAWAPAY-VERIFY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const pawapayApiKey = Deno.env.get('PAWAPAY_API_KEY');
    if (!pawapayApiKey) {
      throw new Error('PAWAPAY_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }
    logStep('User authenticated', { userId: userData.user.id });

    // Parser la requête
    const { deposit_id } = await req.json();
    if (!deposit_id) {
      throw new Error('deposit_id is required');
    }
    logStep('Checking deposit', { deposit_id });

    // Déterminer l'environnement (sandbox ou production)
    const baseUrlPrimary = pawapayApiKey.length > 50
      ? 'https://api.pawapay.io'
      : 'https://api.sandbox.pawapay.io';

    const baseUrlFallback = baseUrlPrimary === 'https://api.pawapay.io'
      ? 'https://api.sandbox.pawapay.io'
      : 'https://api.pawapay.io';

    const callPawaPay = async (baseUrl: string) => {
      const response = await fetch(`${baseUrl}/v2/deposits/${deposit_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${pawapayApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const responseText = await response.text();
      logStep('PawaPay response', { status: response.status, body: responseText, baseUrl });
      return { response, responseText };
    };

    // Vérifier le statut auprès de PawaPay (avec fallback si auth error)
    let { response, responseText } = await callPawaPay(baseUrlPrimary);

    if (!response.ok && response.status === 401) {
      let isAuthError = false;
      try {
        const err = JSON.parse(responseText);
        isAuthError =
          err?.errorCode === 2 ||
          /authentication/i.test(err?.errorMessage ?? '') ||
          err?.failureReason?.failureCode === 'AUTHENTICATION_ERROR' ||
          /api token/i.test(err?.failureReason?.failureMessage ?? '') ||
          /invalid/i.test(err?.failureReason?.failureMessage ?? '');
      } catch {
        // ignore parse errors
      }

      if (isAuthError) {
        logStep('Auth error on primary baseUrl, retrying with fallback', { baseUrlFallback });
        ({ response, responseText } = await callPawaPay(baseUrlFallback));
      }
    }

    if (!response.ok) {
      throw new Error(`Failed to verify deposit: ${responseText}`);
    }

    const depositData = JSON.parse(responseText);
    logStep('Deposit status', depositData);

    // Mettre à jour le statut dans la base de données
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabaseAdmin
      .from('pawapay_payments')
      .update({
        status: depositData.status,
        pawapay_response: depositData,
        updated_at: new Date().toISOString(),
      })
      .eq('deposit_id', deposit_id);

    if (updateError) {
      logStep('Warning: Failed to update payment record', updateError);
    }

    // Mapper les statuts PawaPay vers des statuts compréhensibles
    const statusMap: Record<string, string> = {
      'ACCEPTED': 'pending',
      'SUBMITTED': 'pending',
      'PENDING': 'pending',
      'COMPLETED': 'completed',
      'FAILED': 'failed',
      'REJECTED': 'failed',
      'CANCELLED': 'cancelled',
    };

    return new Response(
      JSON.stringify({
        success: true,
        deposit_id: deposit_id,
        status: depositData.status,
        mapped_status: statusMap[depositData.status] || 'unknown',
        amount: depositData.amount,
        currency: depositData.currency,
        correspondent: depositData.correspondent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
