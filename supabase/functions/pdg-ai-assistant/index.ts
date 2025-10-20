import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, type = "chat" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    
    if (type === "analyze") {
      systemPrompt = `Tu es un assistant IA avancé pour la plateforme 224Solutions. 
      
Ton rôle est d'analyser les données de la plateforme et de fournir des insights actionnables aux dirigeants.

Concentre-toi sur:
- La détection d'anomalies et de fraudes potentielles
- L'analyse des tendances de revenus et d'utilisation
- Les recommandations d'optimisation
- Les alertes critiques nécessitant une attention immédiate
- Les opportunités de croissance

Fournis des réponses concises, claires et actionnables. Utilise des données chiffrées quand c'est pertinent.`;
    } else {
      systemPrompt = `Tu es un assistant IA intelligent pour la plateforme 224Solutions, spécialisé dans l'aide aux décisions stratégiques et l'analyse de données.

Tu aides les dirigeants avec:
- L'analyse des performances de la plateforme
- Les recommandations stratégiques
- L'interprétation des données financières
- La détection de problèmes et opportunités
- Les prévisions et tendances

Sois concis, professionnel et orienté action. Utilise des données concrètes dans tes réponses.`;
    }

    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    };

    // Pour l'analyse, on utilise l'extraction structurée
    if (type === "analyze") {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "provide_insights",
            description: "Fournir des insights et recommandations pour la plateforme",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: ["warning", "info", "success"],
                        description: "Type d'insight"
                      },
                      message: {
                        type: "string",
                        description: "Message de l'insight"
                      },
                      priority: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                        description: "Priorité de l'insight"
                      }
                    },
                    required: ["type", "message", "priority"],
                    additionalProperties: false
                  }
                }
              },
              required: ["insights"],
              additionalProperties: false
            }
          }
        }
      ];
      requestBody.tool_choice = { type: "function", function: { name: "provide_insights" } };
    } else {
      requestBody.stream = true;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de taux dépassée. Veuillez réessayer plus tard." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédit insuffisant. Veuillez ajouter des crédits à votre workspace Lovable AI." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Pour l'analyse, renvoyer le JSON
    if (type === "analyze") {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pour le chat, streamer la réponse
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("pdg-ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
