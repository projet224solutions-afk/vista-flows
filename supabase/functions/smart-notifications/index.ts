import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  type: 'order' | 'promotion' | 'system' | 'security' | 'recommendation';
  title: string;
  message: string;
  actionUrl?: string;
  data?: any;
  sendPush?: boolean;
  sendEmail?: boolean;
  sendSMS?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationRequest = await req.json();
    console.log('📬 Smart notification request:', payload);

    // 1️⃣ VÉRIFIER LES PRÉFÉRENCES UTILISATEUR
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('notification_preferences')
      .eq('id', payload.userId)
      .single();

    const preferences = profile?.notification_preferences || {};

    // 2️⃣ ENREGISTRER LA NOTIFICATION DANS LA DB
    const { data: notification, error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        action_url: payload.actionUrl,
        data: payload.data
      })
      .select()
      .single();

    if (notifError) throw notifError;

    console.log('✅ Notification created:', notification.id);

    // 3️⃣ ENVOYER PUSH NOTIFICATION (si activé)
    if (payload.sendPush && preferences.pushEnabled !== false) {
      // TODO: Intégrer Firebase Cloud Messaging ou OneSignal
      console.log('📱 Push notification would be sent');
    }

    // 4️⃣ ENVOYER EMAIL (si activé)
    if (payload.sendEmail && preferences.emailEnabled !== false) {
      try {
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('email, full_name')
          .eq('id', payload.userId)
          .single();

        if (userData?.email) {
          // Intégrer avec le service d'email existant
          await supabaseClient.functions.invoke('send-communication-notification', {
            body: {
              to: userData.email,
              subject: payload.title,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #333;">${payload.title}</h1>
                  <p style="color: #666; font-size: 16px;">${payload.message}</p>
                  ${payload.actionUrl ? `
                    <a href="${payload.actionUrl}" 
                       style="display: inline-block; background: #4CAF50; color: white; 
                              padding: 12px 24px; text-decoration: none; border-radius: 4px; 
                              margin-top: 16px;">
                      Voir les détails
                    </a>
                  ` : ''}
                </div>
              `
            }
          });
          console.log('📧 Email sent to:', userData.email);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    // 5️⃣ ENVOYER SMS (si activé et critique)
    if (payload.sendSMS && payload.type === 'security' && preferences.smsEnabled !== false) {
      try {
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('phone')
          .eq('id', payload.userId)
          .single();

        if (userData?.phone) {
          await supabaseClient.functions.invoke('send-sms', {
            body: {
              to: userData.phone,
              message: `${payload.title}: ${payload.message}`
            }
          });
          console.log('📲 SMS sent to:', userData.phone);
        }
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
      }
    }

    // 6️⃣ ANALYTICS - Tracker l'engagement notification
    await supabaseClient
      .from('security_audit_logs')
      .insert({
        event_type: 'notification_sent',
        user_id: payload.userId,
        severity: 'info',
        description: `Notification sent: ${payload.type}`,
        metadata: {
          notificationId: notification.id,
          channels: {
            push: payload.sendPush,
            email: payload.sendEmail,
            sms: payload.sendSMS
          }
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationId: notification.id,
        channels: {
          app: true,
          email: payload.sendEmail,
          sms: payload.sendSMS,
          push: payload.sendPush
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Smart notifications error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
