/**
 * 🤖 EDGE FUNCTION: GÉNÉRATION DESCRIPTION PROFESSIONNELLE IA
 * 
 * Utilise Lovable AI Gateway (Gemini) pour créer des descriptions professionnelles
 */

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
    // Support both 'name' and 'productName' for backwards compatibility
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY n'est pas configurée");
    }

    // Construire le prompt IA enrichi
    const prompt = `Tu es un expert en rédaction e-commerce. Génère une description professionnelle et vendeuse pour ce produit:

NOM: ${name}
${category ? `CATÉGORIE: ${category}` : ''}
${price ? `PRIX: ${price} GNF` : ''}

CONSIGNES:
- Rédige une description commerciale engageante et professionnelle (2-3 paragraphes)
- Le texte doit donner envie d'acheter
- Mentionne les avantages et bénéfices du produit
- Utilise un ton professionnel mais accessible
- Maximum 200 mots

Réponds uniquement avec le texte de la description, sans introduction ni conclusion.`;

    console.log('🔄 Génération description IA pour:', name);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en rédaction de descriptions produits e-commerce professionnelles en français. Tu réponds uniquement avec le texte de la description, sans aucune introduction ou explication."
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
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits IA insuffisants. Veuillez recharger votre compte.' }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || '';

    if (!generatedText) {
      throw new Error('Aucune description générée');
    }

    console.log('✅ Description générée avec succès');

    return new Response(
      JSON.stringify({ description: generatedText.trim() }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: unknown) {
    console.error("❌ Erreur génération description:", error);
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
