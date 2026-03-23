// ============================================================================
// PDG MFA - SERVER-SIDE CODE GENERATION & VERIFICATION
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user is PDG/admin/ceo
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile?.role || '').toString().toLowerCase();
    if (!['admin', 'pdg', 'ceo'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Access denied - PDG only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action } = await req.json();

    if (action === 'send') {
      // Generate a 6-digit code server-side
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      // Store code in DB (use audit_logs or a dedicated table)
      // We'll use a simple approach: store hashed code in user metadata via service role
      // For security, we store the code server-side only
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'MFA_CODE_GENERATED',
        target_type: 'pdg_mfa',
        target_id: user.id,
        data_json: {
          code_hash: await hashCode(code),
          expires_at: expiresAt,
          email: user.email,
        }
      });

      // Send email via Resend if configured, otherwise log
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: Deno.env.get('FROM_EMAIL') || 'noreply@224solutions.com',
              to: [user.email],
              subject: '🔐 Code MFA PDG - 224Solutions',
              html: generateMfaEmail(code),
            }),
          });
        } catch (emailErr) {
          console.error('Email send error:', emailErr);
        }
      } else {
        console.log(`[DEV MODE] MFA code for ${user.email}: ${code}`);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'MFA code sent',
        // In dev mode without Resend, include the code for testing
        ...(resendKey ? {} : { dev_code: code }),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'verify') {
      const { code } = await req.json();
      if (!code || code.length !== 6) {
        return new Response(JSON.stringify({ error: 'Invalid code format' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find the latest MFA code for this user
      const { data: logs } = await adminClient
        .from('audit_logs')
        .select('data_json, created_at')
        .eq('actor_id', user.id)
        .eq('action', 'MFA_CODE_GENERATED')
        .eq('target_type', 'pdg_mfa')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!logs || logs.length === 0) {
        return new Response(JSON.stringify({ error: 'No MFA code found. Request a new one.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const latestLog = logs[0];
      const dataJson = latestLog.data_json as any;

      // Check expiry
      if (new Date(dataJson.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Code expired. Request a new one.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Verify code hash
      const inputHash = await hashCode(code);
      if (inputHash !== dataJson.code_hash) {
        // Log failed attempt
        await adminClient.from('audit_logs').insert({
          actor_id: user.id,
          action: 'MFA_VERIFICATION_FAILED',
          target_type: 'pdg_mfa',
          target_id: user.id,
          data_json: { timestamp: new Date().toISOString() }
        });
        return new Response(JSON.stringify({ error: 'Invalid MFA code' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Log successful verification
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'MFA_VERIFIED',
        target_type: 'pdg_mfa',
        target_id: user.id,
        data_json: { timestamp: new Date().toISOString() }
      });

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        message: 'MFA verification successful',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "send" or "verify".' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('MFA error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + (Deno.env.get('MFA_SALT') || 'pdg224solutions'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateMfaEmail(code: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;padding:40px 30px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <h1 style="color:#3b82f6;text-align:center;margin:0 0 8px;">224SOLUTIONS</h1>
    <p style="color:#64748b;text-align:center;font-size:14px;">Authentification Multi-Facteurs PDG</p>
    <div style="background:#f8fafc;padding:35px 25px;border-radius:12px;text-align:center;margin:30px 0;border:2px solid #e2e8f0;">
      <p style="color:#475569;font-size:15px;margin:0 0 15px;">Votre code de vérification :</p>
      <div style="font-size:42px;font-weight:bold;color:#3b82f6;letter-spacing:12px;font-family:'Courier New',monospace;">${code}</div>
      <p style="color:#64748b;font-size:13px;margin:15px 0 0;">Valide pendant 10 minutes</p>
    </div>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:6px;">
      <p style="margin:0;color:#92400e;font-size:14px;">⚠️ Ne partagez jamais ce code.</p>
    </div>
  </div>
</body>
</html>`;
}
