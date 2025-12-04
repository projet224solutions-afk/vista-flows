/**
 * 🤖 EDGE FUNCTION: GÉNÉRATION DESCRIPTION PROFESSIONNELLE IA
 * 
 * Utilise OpenAI GPT-4o-mini pour créer des descriptions ultra professionnelles
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  name: string;
  description: string;
  category: string;
  characteristics: {
    brand?: string;
    model?: string;
    color?: string;
    capacity?: string;
    power?: string;
    material?: string;
    condition?: 'new' | 'used' | 'refurbished';
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, description, category, characteristics }: RequestBody = await req.json();
    
    if (!name) {
      return new Response(
        JSON.stringify({ error: "Le nom du produit est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY n'est pas configurée");
    }

    // Construire le prompt IA enrichi
    const prompt = `Tu es un expert en rédaction e-commerce. Génère une description ultra professionnelle pour ce produit:

NOM: ${name}
DESCRIPTION VENDEUR: ${description}
CATÉGORIE: ${category}
CARACTÉRISTIQUES:
${Object.entries(characteristics).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

CONSIGNES:
1. Rédige une description commerciale engageante et professionnelle (2-3 paragraphes)
2. Liste 5-8 points forts concrets
3. Ajoute les caractéristiques techniques structurées
4. Propose le contenu du paquet
5. Ajoute une garantie standard

FORMAT DE RÉPONSE (JSON strict):
{
  "commercial": "description commerciale ici",
  "keyPoints": ["point 1", "point 2", ...],
  "technicalSpecs": {
    "Marque": "...",
    "Modèle": "...",
    ...
  },
  "packageContent": ["article 1", "article 2", ...],
  "warranty": "texte garantie"
}

IMPORTANT: Rédige en français, style professionnel e-commerce, sans fautes, persuasif.`;

    console.log('🔄 Génération description IA pour:', name);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en rédaction de descriptions produits e-commerce professionnelles en français."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    // Parser le JSON
    const enrichedDescription = JSON.parse(generatedText);

    console.log('✅ Description générée avec succès');

    return new Response(
      JSON.stringify(enrichedDescription),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Erreur génération description:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Erreur lors de la génération de la description" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("Erreur AI gateway:", response.status, errorText);
      throw new Error("Erreur lors de la génération de la description");
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content;

    if (!description) {
      throw new Error("Aucune description générée");
    }

    return new Response(
      JSON.stringify({ description: description.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur dans generate-product-description:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Une erreur inattendue s'est produite" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
