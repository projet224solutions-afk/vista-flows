import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, context } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Préparer le contexte système pour l'IA
    const systemContext = `Tu es l'assistant IA du PDG de 224SOLUTIONS. Tu as accès aux données de monitoring en temps réel.

Statistiques actuelles:
- Santé système: ${context.stats?.systemHealth || 'N/A'}%
- Erreurs critiques: ${context.stats?.criticalErrors || 0}
- Erreurs corrigées automatiquement: ${context.stats?.autoFixedErrors || 0}
- Erreurs en attente: ${context.stats?.pendingErrors || 0}
- Interfaces actives: ${context.stats?.activeInterfaces || 0}
- Transactions totales: ${context.stats?.totalTransactions || 0}

État des services:
${context.systemHealth?.services?.map((s: any) => `- ${s.name}: ${s.status} (${s.responseTime}ms, ${s.errorRate}% erreurs)`).join('\n') || 'N/A'}

Erreurs récentes:
${context.recentErrors?.map((e: any) => `- [${e.severity}] ${e.module}: ${e.error_message}`).join('\n') || 'Aucune erreur récente'}

Réponds de manière concise et professionnelle. Fournis des recommandations actionnables.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemContext },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';

    return new Response(
      JSON.stringify({ 
        answer,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in ai-copilot function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
