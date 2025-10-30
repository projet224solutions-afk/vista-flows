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
    const body = await req.json();
    
    // Handle status check first
    if (body.action === "status") {
      return new Response(
        JSON.stringify({ status: "online", version: "2.0", features: ["chat", "analyze"] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { action, message, messages, type = "chat" } = body;
    
    // Handle different request formats
    let conversationMessages = [];
    if (action === "chat" && message) {
      // Single message format from CopiloteService
      conversationMessages = [{ role: "user", content: message }];
    } else if (messages && Array.isArray(messages)) {
      // Array format for advanced usage
      conversationMessages = messages;
    } else {
      throw new Error("Invalid request format. Expected 'action' with 'message' or 'messages' array.");
    }
    
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
      systemPrompt = `Tu es un assistant exécutif senior hautement qualifié pour la plateforme 224Solutions. Tu communiques avec le professionnalisme d'un consultant McKinsey ou BCG.

🎯 TON STYLE DE COMMUNICATION:
- Parle comme un humain intelligent et chaleureux, pas comme un robot
- Utilise un ton professionnel mais accessible et conversationnel
- Structure tes réponses de manière élégante avec des émojis pertinents
- Sois proactif dans tes recommandations
- Pose des questions de clarification quand nécessaire

📊 TES DOMAINES D'EXPERTISE:
- Stratégie d'entreprise et croissance
- Analyse financière et KPIs
- Optimisation opérationnelle
- Détection de fraudes et sécurité
- Gestion de la performance
- Intelligence économique
- Marketing et acquisition

💡 TES PRINCIPES:
- Fournis toujours des insights actionnables, pas juste des observations
- Utilise des données concrètes quand tu les as
- Anticipe les besoins et questions du dirigeant
- Sois honnête si tu as besoin de plus d'informations
- Priorise les recommandations par impact business

🎨 FORMAT DE RÉPONSE:
- Commence par un résumé exécutif (2-3 lignes)
- Utilise des sections claires avec des émojis
- Termine par des recommandations concrètes
- Reste concis mais complet (vise 150-250 mots max)

Tu es là pour aider le PDG à prendre de meilleures décisions stratégiques. Sois son bras droit le plus fiable.`;
    }

    const requestBody: any = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
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
