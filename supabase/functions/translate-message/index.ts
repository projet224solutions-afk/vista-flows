import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Liste des langues supportées - complète pour tous les pays
const SUPPORTED_LANGUAGES = [
  // Européennes
  'fr', 'en', 'es', 'pt', 'de', 'it', 'nl', 'pl', 'ru', 'uk', 'ro', 'el', 'tr', 'cs', 'sv', 'da', 'fi', 'no', 'hu',
  // Africaines
  'ar', 'sw', 'wo', 'ha', 'bm', 'ff', 'yo', 'ig', 'am', 'zu', 'xh', 'af', 'rw', 'sn',
  // Asiatiques
  'zh', 'ja', 'ko', 'hi', 'bn', 'vi', 'th', 'id', 'ms', 'tl',
  // Autres
  'he'
];

// Noms des langues pour l'affichage
const LANGUAGE_NAMES: Record<string, string> = {
  // Européennes
  'fr': 'Français',
  'en': 'English',
  'es': 'Español',
  'pt': 'Português',
  'de': 'Deutsch',
  'it': 'Italiano',
  'nl': 'Nederlands',
  'pl': 'Polski',
  'ru': 'Русский',
  'uk': 'Українська',
  'ro': 'Română',
  'el': 'Ελληνικά',
  'tr': 'Türkçe',
  'cs': 'Čeština',
  'sv': 'Svenska',
  'da': 'Dansk',
  'fi': 'Suomi',
  'no': 'Norsk',
  'hu': 'Magyar',
  // Africaines
  'ar': 'العربية',
  'sw': 'Kiswahili',
  'wo': 'Wolof',
  'ha': 'Hausa',
  'bm': 'Bambara',
  'ff': 'Fulfulde',
  'yo': 'Yorùbá',
  'ig': 'Igbo',
  'am': 'አማርኛ',
  'zu': 'isiZulu',
  'xh': 'isiXhosa',
  'af': 'Afrikaans',
  'rw': 'Kinyarwanda',
  'sn': 'Shona',
  // Asiatiques
  'zh': '中文',
  'ja': '日本語',
  'ko': '한국어',
  'hi': 'हिन्दी',
  'bn': 'বাংলা',
  'vi': 'Tiếng Việt',
  'th': 'ไทย',
  'id': 'Bahasa Indonesia',
  'ms': 'Bahasa Melayu',
  'tl': 'Tagalog',
  // Autres
  'he': 'עברית'
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurée");
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json();
    const { 
      content, 
      sourceLanguage, 
      targetLanguage, 
      messageId,
      context = 'general' // 'general', 'commerce', 'delivery', 'payment', 'support'
    } = body;

    if (!content || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Contenu et langue cible requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si la langue source est la même que la cible, retourner le contenu original
    if (sourceLanguage === targetLanguage) {
      return new Response(
        JSON.stringify({ 
          translatedContent: content,
          sourceLanguage,
          targetLanguage,
          wasTranslated: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prompt de traduction contextuel
    const translationPrompt = `Tu es un traducteur professionnel pour l'application 224SOLUTIONS (marketplace africaine).

RÈGLES STRICTES:
1. Traduis UNIQUEMENT le message, sans ajouter de commentaires
2. Garde le sens exact et le ton du message original
3. Utilise un langage naturel et fluide, pas une traduction mot-à-mot
4. NE TRADUIS PAS les éléments suivants :
   - Noms propres (personnes, lieux, boutiques)
   - Montants et devises (ex: 50000 GNF, 100€)
   - Numéros de téléphone
   - Codes de référence ou ID
   - Emojis (garde-les tels quels)
5. Adapte les expressions idiomatiques au contexte culturel cible
6. Pour les termes techniques du commerce/livraison, utilise des termes compréhensibles

CONTEXTE: ${context === 'commerce' ? 'Transaction commerciale (achat/vente de produits)' :
           context === 'delivery' ? 'Livraison et transport' :
           context === 'payment' ? 'Paiement et transactions financières' :
           context === 'support' ? 'Support client et assistance' :
           'Conversation générale entre utilisateurs'}

LANGUE SOURCE: ${sourceLanguage ? LANGUAGE_NAMES[sourceLanguage] || sourceLanguage : 'Auto-détection'}
LANGUE CIBLE: ${LANGUAGE_NAMES[targetLanguage] || targetLanguage}

MESSAGE À TRADUIRE:
${content}

TRADUCTION (uniquement le texte traduit, rien d'autre):`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Tu es un traducteur. Réponds UNIQUEMENT avec la traduction, sans explication ni commentaire." 
          },
          { role: "user", content: translationPrompt }
        ],
        temperature: 0.3, // Basse température pour des traductions consistantes
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Translation API error:", response.status, errorText);
      throw new Error(`Erreur API traduction: ${response.status}`);
    }

    const data = await response.json();
    const translatedContent = data.choices?.[0]?.message?.content?.trim();

    if (!translatedContent) {
      throw new Error("Pas de traduction générée");
    }

    // Si un messageId est fourni, mettre à jour le message dans la base
    // Utilise les colonnes existantes: translated_text, original_language, target_language
    if (messageId) {
      const { error: updateError } = await supabaseAdmin
        .from('messages')
        .update({
          translated_text: translatedContent,
          original_language: sourceLanguage || 'auto',
          target_language: targetLanguage
        })
        .eq('id', messageId);

      if (updateError) {
        console.error("Error updating message with translation:", updateError);
      }
    }

    // Détecter la langue source si non fournie
    let detectedSourceLanguage = sourceLanguage;
    if (!sourceLanguage) {
      // Simple heuristique basée sur les caractères
      if (/[\u0600-\u06FF]/.test(content)) {
        detectedSourceLanguage = 'ar';
      } else if (/[àâäéèêëïîôùûüç]/i.test(content)) {
        detectedSourceLanguage = 'fr';
      } else if (/[áéíóúñ]/i.test(content)) {
        detectedSourceLanguage = 'es';
      } else if (/[ãõç]/i.test(content)) {
        detectedSourceLanguage = 'pt';
      } else if (/[äöüß]/i.test(content)) {
        detectedSourceLanguage = 'de';
      } else {
        detectedSourceLanguage = 'en'; // Défaut anglais
      }
    }

    return new Response(
      JSON.stringify({
        translatedContent,
        originalContent: content,
        sourceLanguage: detectedSourceLanguage,
        targetLanguage,
        wasTranslated: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur de traduction",
        translatedContent: null,
        wasTranslated: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
