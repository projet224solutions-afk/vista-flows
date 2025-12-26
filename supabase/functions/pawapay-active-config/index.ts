import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAWAPAY-CONFIG] ${step}${detailsStr}`);
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

    // Try both environments
    const environments = [
      { name: 'production', url: 'https://api.pawapay.io' },
      { name: 'sandbox', url: 'https://api.sandbox.pawapay.io' },
    ];

    const results: any[] = [];

    for (const env of environments) {
      try {
        logStep(`Checking ${env.name}`, { url: env.url });
        
        const response = await fetch(`${env.url}/v2/active-conf`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${pawapayApiKey}`,
            'Accept': 'application/json',
          },
        });

        const responseText = await response.text();
        logStep(`${env.name} response`, { status: response.status });

        if (response.ok) {
          const config = JSON.parse(responseText);
          results.push({
            environment: env.name,
            status: 'success',
            countries: config.countries || [],
            providers: config.countries?.flatMap((c: any) => 
              c.providers?.map((p: any) => ({
                country: c.country,
                provider: p.provider,
                currency: c.currency,
                operationTypes: p.operationTypes,
              })) || []
            ) || [],
          });
        } else {
          results.push({
            environment: env.name,
            status: 'error',
            error: responseText,
          });
        }
      } catch (error) {
        results.push({
          environment: env.name,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logStep('Results', results);

    return new Response(
      JSON.stringify({
        success: true,
        configurations: results,
        message: 'Use the providers list to see which countries/providers are available on your PawaPay account',
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
