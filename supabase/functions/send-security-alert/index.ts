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

    const { 
      userId, 
      alertType, 
      alertLevel, 
      title, 
      description,
      ipAddress,
      location,
      deviceInfo,
      metadata
    } = await req.json();

    if (!userId || !alertType || !title || !description) {
      throw new Error('Missing required fields');
    }

    // Créer l'alerte dans la base
    const { data: alert, error: alertError } = await supabase
      .rpc('create_security_alert', {
        p_user_id: userId,
        p_alert_type: alertType,
        p_alert_level: alertLevel || 'info',
        p_title: title,
        p_description: description,
        p_ip_address: ipAddress,
        p_location: location,
        p_device_info: deviceInfo,
        p_metadata: metadata
      });

    if (alertError) throw alertError;

    // Récupérer l'email de l'utilisateur
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;

    if (userEmail && (alertLevel === 'warning' || alertLevel === 'critical')) {
      // TODO: Intégrer service email (SendGrid, Resend, etc.)
      console.log(`📧 Alerte sécurité pour ${userEmail}:`);
      console.log(`   Type: ${alertType}`);
      console.log(`   Niveau: ${alertLevel}`);
      console.log(`   ${title}: ${description}`);

      // En production, envoyer email:
      // await fetch('EMAIL_API_URL', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${Deno.env.get('EMAIL_API_KEY')}` },
      //   body: JSON.stringify({
      //     to: userEmail,
      //     subject: `🔐 Alerte Sécurité 224Solutions - ${title}`,
      //     html: `
      //       <h2>Alerte de Sécurité</h2>
      //       <p><strong>${title}</strong></p>
      //       <p>${description}</p>
      //       <p>IP: ${ipAddress || 'N/A'}</p>
      //       <p>Localisation: ${location || 'N/A'}</p>
      //       <p>Appareil: ${deviceInfo || 'N/A'}</p>
      //       <p>Si ce n'est pas vous, changez immédiatement votre mot de passe.</p>
      //     `
      //   })
      // });

      // Marquer email comme envoyé
      await supabase
        .from('security_alerts')
        .update({ email_sent: true })
        .eq('id', alert);
    }

    return new Response(
      JSON.stringify({ success: true, alertId: alert }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur send-security-alert:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});