import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, name, bureau_code, access_token, permissions } = await req.json();
    
    const baseUrl = "https://a00e0cf7-bf68-445f-848b-f2c774cf80ce.lovableproject.com";
    const interfaceUrl = type === 'bureau' 
      ? `${baseUrl}/bureau/${access_token}`
      : `${baseUrl}/worker/${access_token}`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "224Solutions <onboarding@resend.dev>",
        to: [email],
        subject: type === 'bureau' ? `Votre bureau syndical ${bureau_code || ''} est prêt` : `Votre accès au bureau syndical`,
        html: `<h1>Bienvenue ${name}!</h1><p>Votre lien d'accès: <a href="${interfaceUrl}">${interfaceUrl}</a></p>`,
      }),
    });

    const result = await emailResponse.json();
    console.log("Email envoyé:", result);

    return new Response(
      JSON.stringify({ success: true, interface_url: interfaceUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
