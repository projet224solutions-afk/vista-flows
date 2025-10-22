/**
 * 🔧 EDGE FUNCTION: GÉNÉRATION D'ID UNIQUE
 * Génère des IDs uniques au format LLLDDDD (3 lettres + 4 chiffres)
 * Compatible avec tout le système 224SOLUTIONS
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Génère un ID aléatoire au format LLLDDDD
 */
function generateId(): string {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ"; // Sans I, L, O
  const digits = "0123456789";
  
  const randomLetter = () => letters[Math.floor(Math.random() * letters.length)];
  const randomDigit = () => digits[Math.floor(Math.random() * digits.length)];
  
  return (
    randomLetter() + randomLetter() + randomLetter() +
    randomDigit() + randomDigit() + randomDigit() + randomDigit()
  );
}

/**
 * Génère un ID unique avec vérification et réservation
 */
async function generateUniqueId(
  supabase: any,
  scope: string,
  userId: string | null
): Promise<string> {
  const maxAttempts = 10;
  let attempt = 0;

  console.log(`🔄 Génération ID pour scope: ${scope}, user: ${userId}`);

  while (attempt < maxAttempts) {
    const newId = generateId();
    attempt++;

    try {
      // Vérifier si l'ID existe déjà
      const { data: existing, error: checkError } = await supabase
        .from('ids_reserved')
        .select('public_id')
        .eq('public_id', newId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Erreur vérification:', checkError);
        continue;
      }

      if (existing) {
        console.log(`⚠️  ID ${newId} existe déjà, tentative ${attempt}/${maxAttempts}`);
        continue;
      }

      // Réserver l'ID
      const { data, error } = await supabase
        .from('ids_reserved')
        .insert([{
          public_id: newId,
          scope: scope,
          created_by: userId
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Violation unicité
          console.log(`⚠️  Collision ${newId}, tentative ${attempt}/${maxAttempts}`);
          continue;
        }
        throw error;
      }

      console.log(`✅ ID généré: ${newId} (${scope})`);
      return newId;

    } catch (error: any) {
      console.error(`❌ Erreur tentative ${attempt}:`, error?.message || error);
      if (attempt >= maxAttempts) {
        throw new Error(`Échec génération après ${maxAttempts} tentatives`);
      }
    }
  }

  throw new Error(`Impossible de générer un ID unique après ${maxAttempts} tentatives`);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Récupérer l'utilisateur authentifié
    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
      }
    }

    const { scope = 'general', batch = 1 } = await req.json();

    // Validation
    if (!scope || typeof scope !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Le paramètre "scope" est requis' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (batch > 10) {
      return new Response(
        JSON.stringify({ error: 'Maximum 10 IDs par requête' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Générer les IDs
    const ids: string[] = [];
    for (let i = 0; i < batch; i++) {
      const id = await generateUniqueId(supabaseClient, scope, userId);
      ids.push(id);
    }

    console.log(`✅ ${ids.length} ID(s) généré(s) pour ${scope}`);

    return new Response(
      JSON.stringify({
        success: true,
        ids: ids,
        scope: scope,
        count: ids.length
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Erreur Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Erreur lors de la génération d\'ID',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
