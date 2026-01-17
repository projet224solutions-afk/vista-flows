/**
 * 🤖 EDGE FUNCTION: GÉNÉRATION DESCRIPTION PROFESSIONNELLE IA (OpenAI GPT-4o)
 * 
 * Utilise OpenAI GPT-4o pour créer des descriptions professionnelles
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const name = body.name || body.productName;
    const category = body.category || '';
    const price = body.price || '';
    
    if (!name) {
      console.log('❌ Paramètres reçus:', JSON.stringify(body));
      return new Response(
        JSON.stringify({ error: "Le nom du produit est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY n'est pas configurée");
    }

    const productType = body.productType || '';
    
    const prompt = `Tu es un expert en rédaction e-commerce. Génère une description professionnelle et vendeuse pour ce produit:

NOM: ${name}
${category ? `CATÉGORIE: ${category}` : ''}
${productType ? `TYPE: ${productType}` : ''}
${price ? `PRIX: ${price} GNF` : ''}

CONSIGNES:
Tu dois générer EXACTEMENT ce format JSON (sans markdown, sans backticks):
{
  "shortDescription": "Une phrase accrocheuse de 10-15 mots maximum qui résume le produit",
  "description": "Description commerciale complète de 2-3 paragraphes (150-200 mots)"
}

IMPORTANT:
- La description courte doit être percutante et donner envie d'en savoir plus
- La description complète doit détailler les avantages et bénéfices
- Utilise un ton professionnel mais accessible
- Réponds UNIQUEMENT avec le JSON, sans aucun texte avant ou après`;

    console.log('🔄 Génération description OpenAI pour:', name);

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
            content: "Tu es un expert en rédaction de descriptions produits e-commerce professionnelles en français. Tu réponds UNIQUEMENT en JSON valide, sans markdown ni backticks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Clé API OpenAI invalide ou expirée.' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';

    if (!generatedText) {
      throw new Error('Aucune description générée');
    }

    console.log('✅ Description OpenAI générée avec succès');
    console.log('📝 Contenu brut:', generatedText);

    // Parser le JSON retourné par l'IA
    let parsedContent;
    try {
      // Nettoyer le texte des éventuels backticks markdown
      const cleanedText = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsedContent = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      parsedContent = null;
    }

    const normalized = (parsedContent && typeof parsedContent === 'object') ? parsedContent as Record<string, unknown> : {};

    const description = String(
      (normalized.description ?? normalized.longDescription ?? normalized.fullDescription ?? '')
    ).trim() || generatedText.trim();

    let shortDescription = String(
      (normalized.shortDescription ?? normalized.short_description ?? normalized.short ?? normalized.summary ?? normalized.resume ?? '')
    ).trim();

    if (!shortDescription) {
      const firstSentence = (description.split(/(?<=[.!?])\s+/)[0] || description).replace(/\s+/g, ' ').trim();
      const words = firstSentence.split(' ').filter(Boolean).slice(0, 15).join(' ');
      shortDescription = words ? (/[.!?]$/.test(words) ? words : `${words}.`) : '';
    }

    return new Response(
      JSON.stringify({ 
        shortDescription,
        description,
        provider: 'openai',
        model: 'gpt-4o-mini'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("❌ Erreur génération description OpenAI:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur lors de la génération de la description";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
