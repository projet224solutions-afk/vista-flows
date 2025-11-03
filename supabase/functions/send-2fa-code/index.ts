import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phoneNumber, userId } = await req.json();

    if (!phoneNumber || !userId) {
      throw new Error('Phone number and userId required');
    }

    // Générer code 2FA (6 chiffres)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Stocker le code dans la base
    const { error: insertError } = await supabase
      .from('user_2fa_codes')
      .insert({
        user_id: userId,
        code: code,
        phone_number: phoneNumber,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) throw insertError;

    // TODO: Intégrer SMS Gateway (Orange Money SMS API, Twilio, etc.)
    // Pour l'instant, on retourne le code en développement
    console.log(`📱 Code 2FA pour ${phoneNumber}: ${code}`);
    
    // En production, envoyer SMS via API
    // const smsResponse = await fetch('SMS_API_URL', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${Deno.env.get('SMS_API_KEY')}` },
    //   body: JSON.stringify({
    //     to: phoneNumber,
    //     message: `Votre code 224Solutions: ${code}. Valide 10 minutes.`
    //   })
    // });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Code 2FA envoyé',
        // En dev seulement, supprimer en production:
        devCode: code 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur send-2fa-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});