import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  agentName: string;
  agentEmail: string;
  invitationLink: string;
  pdgName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentName, agentEmail, invitationLink, pdgName }: InvitationEmailRequest = await req.json();

    console.log('📧 Sending agent invitation email to:', agentEmail);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Envoyer l'email via l'API Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "224Solutions <onboarding@resend.dev>",
        to: [agentEmail],
        subject: "Invitation Agent - 224Solutions",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
                }
                .content {
                  background: #f9f9f9;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                }
                .button {
                  display: inline-block;
                  background: #667eea;
                  color: white;
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                  font-weight: bold;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  color: #666;
                  font-size: 12px;
                }
                .info-box {
                  background: white;
                  padding: 15px;
                  border-left: 4px solid #667eea;
                  margin: 20px 0;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🎉 Bienvenue chez 224Solutions</h1>
              </div>
              <div class="content">
                <h2>Bonjour ${agentName},</h2>
                <p>${pdgName} vous a invité à rejoindre l'équipe d'agents 224Solutions !</p>
                
                <div class="info-box">
                  <h3>📋 Votre Mission</h3>
                  <p>En tant qu'agent, vous aurez accès à:</p>
                  <ul>
                    <li>✅ Création et gestion d'utilisateurs</li>
                    <li>✅ Dashboard de performance en temps réel</li>
                    <li>✅ Suivi des commissions</li>
                    <li>✅ Création de sous-agents (si autorisé)</li>
                    <li>✅ Rapports et statistiques détaillés</li>
                  </ul>
                </div>

                <p><strong>Pour activer votre compte agent, cliquez sur le bouton ci-dessous:</strong></p>
                
                <div style="text-align: center;">
                  <a href="${invitationLink}" class="button">
                    🚀 Activer mon compte agent
                  </a>
                </div>

                <p style="margin-top: 30px;">Ou copiez ce lien dans votre navigateur:</p>
                <p style="background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 5px; word-break: break-all;">
                  ${invitationLink}
                </p>

                <div class="info-box" style="margin-top: 30px;">
                  <p><strong>⚠️ Important:</strong></p>
                  <ul>
                    <li>Ce lien expire dans 7 jours</li>
                    <li>Utilisez ce lien pour configurer votre compte</li>
                    <li>Vos identifiants seront créés lors de l'activation</li>
                  </ul>
                </div>
              </div>
              
              <div class="footer">
                <p>Cet email a été envoyé par 224Solutions</p>
                <p>Si vous n'avez pas demandé cette invitation, ignorez ce message.</p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    const responseData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("❌ Resend API error:", responseData);
      throw new Error(responseData.message || "Failed to send email");
    }

    console.log("✅ Email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("❌ Error sending agent invitation:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
