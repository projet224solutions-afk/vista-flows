/**
 * 🔄 SYNCHRONISATION AUTOMATIQUE DES API SYSTÈME
 * Détecte et enregistre automatiquement les API utilisées par 224SOLUTIONS
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface SystemApi {
  name: string;
  provider: string;
  type: 'payment' | 'sms' | 'email' | 'storage' | 'other';
  keyEnvVar: string;
  baseUrl?: string;
  description: string;
}

const SYSTEM_APIS: SystemApi[] = [
  {
    name: 'Lovable AI Gateway',
    provider: 'Lovable',
    type: 'other',
    keyEnvVar: 'LOVABLE_API_KEY',
    baseUrl: 'https://ai.gateway.lovable.dev',
    description: 'Gateway IA pour Gemini et GPT-5'
  },
  {
    name: 'OpenAI GPT',
    provider: 'OpenAI',
    type: 'other',
    keyEnvVar: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com',
    description: 'API OpenAI pour GPT-5'
  },
  {
    name: 'Stripe Payment',
    provider: 'Stripe',
    type: 'payment',
    keyEnvVar: 'STRIPE_SECRET_KEY',
    baseUrl: 'https://api.stripe.com',
    description: 'Passerelle de paiement'
  },
  {
    name: 'EmailJS',
    provider: 'EmailJS',
    type: 'email',
    keyEnvVar: 'EMAILJS_API_KEY',
    baseUrl: 'https://api.emailjs.com',
    description: 'Service d\'envoi d\'emails'
  }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const syncedApis: string[] = [];
    const errors: string[] = [];

    for (const systemApi of SYSTEM_APIS) {
      try {
        const apiKey = Deno.env.get(systemApi.keyEnvVar);
        
        if (!apiKey) {
          console.log(`⏭️ ${systemApi.name}: Clé non configurée (${systemApi.keyEnvVar})`);
          continue;
        }

        // Vérifier si l'API existe déjà
        const { data: existing } = await supabaseClient
          .from('api_connections')
          .select('id')
          .eq('api_provider', systemApi.provider)
          .eq('api_name', systemApi.name)
          .single();

        if (existing) {
          console.log(`✓ ${systemApi.name}: Déjà enregistrée`);
          syncedApis.push(systemApi.name);
          continue;
        }

        // Chiffrer la clé (simple base64 pour démo, en prod utiliser vraie encryption)
        const encrypted = btoa(apiKey.substring(0, 20) + '***');
        const iv = crypto.randomUUID();

        // Créer l'entrée API
        const { error: insertError } = await supabaseClient
          .from('api_connections')
          .insert({
            api_name: systemApi.name,
            api_provider: systemApi.provider,
            api_type: systemApi.type,
            api_key_encrypted: encrypted,
            encryption_iv: iv,
            base_url: systemApi.baseUrl,
            status: 'active',
            tokens_used: 0,
            metadata: {
              auto_detected: true,
              description: systemApi.description,
              env_var: systemApi.keyEnvVar,
              sync_date: new Date().toISOString()
            }
          });

        if (insertError) throw insertError;

        console.log(`✅ ${systemApi.name}: Enregistrée avec succès`);
        syncedApis.push(systemApi.name);

      } catch (error) {
        console.error(`❌ Erreur ${systemApi.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${systemApi.name}: ${errorMessage}`);
      }
    }

    // Récupérer les statistiques des edge functions
    await syncEdgeFunctionStats(supabaseClient);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedApis,
        errors: errors.length > 0 ? errors : undefined,
        message: `${syncedApis.length} API(s) synchronisée(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur globale:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function syncEdgeFunctionStats(supabaseClient: any) {
  try {
    // Récupérer les stats d'utilisation des edge functions
    // Cette fonction sera améliorée pour récupérer les vraies stats
    console.log('📊 Synchronisation des statistiques edge functions...');
    
    // TODO: Implémenter la récupération des logs edge functions
    // et mettre à jour les tokens_used en conséquence
    
  } catch (error) {
    console.error('Erreur sync stats:', error);
  }
}
