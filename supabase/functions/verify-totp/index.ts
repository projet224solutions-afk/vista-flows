import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base32 decode
function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits: number[] = [];
  
  for (const char of input.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }
  
  return new Uint8Array(bytes);
}

// HMAC-SHA1 using Web Crypto API
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(signature);
}

// Calcule le code TOTP
async function calculateTOTP(secret: string, timestamp?: number): Promise<string> {
  const time = timestamp || Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / 30);
  
  // Convert counter to 8-byte buffer
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  
  // Decode secret
  const secretBytes = base32Decode(secret);
  
  // HMAC-SHA1
  const hmacResult = await hmacSha1(secretBytes, counterBytes);
  
  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const code = (
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, "0");
}

// Vérifie le code avec une fenêtre de tolérance
async function verifyTOTP(secret: string, code: string, window: number = 1): Promise<boolean> {
  const time = Math.floor(Date.now() / 1000);
  
  for (let i = -window; i <= window; i++) {
    const timestamp = time + (i * 30);
    const expectedCode = await calculateTOTP(secret, timestamp);
    if (code === expectedCode) {
      return true;
    }
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, secret, action } = await req.json();
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";

    if (action === "verify-setup") {
      // Vérification initiale avec secret fourni
      if (!secret || !code) {
        return new Response(JSON.stringify({ error: "Secret et code requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isValid = await verifyTOTP(secret, code);
      
      // Logger la tentative
      await supabase.from("totp_verification_attempts").insert({
        user_id: user.id,
        success: isValid,
        ip_address: clientIP || null,
        user_agent: userAgent,
        failure_reason: isValid ? null : "Code invalide",
      });

      return new Response(
        JSON.stringify({ success: isValid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify-login") {
      // Vérification lors de la connexion
      const { data: settings } = await supabase
        .from("user_2fa_settings")
        .select("totp_secret_encrypted, totp_secret_iv, is_enabled")
        .eq("user_id", user.id)
        .single();

      if (!settings?.is_enabled || !settings.totp_secret_encrypted) {
        return new Response(
          JSON.stringify({ error: "2FA non configurée" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!code || code.length !== 6) {
        return new Response(
          JSON.stringify({ error: "Code TOTP requis (6 chiffres)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Déchiffrer le secret TOTP stocké en base
      const encryptionKey = Deno.env.get("TOTP_ENCRYPTION_KEY") || Deno.env.get("VITE_ENCRYPTION_KEY");
      if (!encryptionKey) {
        console.error("Missing TOTP_ENCRYPTION_KEY");
        return new Response(
          JSON.stringify({ error: "Configuration serveur incomplète" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let decryptedSecret: string;
      try {
        // Déchiffrement AES-GCM
        const keyData = new TextEncoder().encode(encryptionKey.padEnd(32, '0').substring(0, 32));
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
        
        const encryptedBytes = Uint8Array.from(atob(settings.totp_secret_encrypted), c => c.charCodeAt(0));
        const ivBytes = Uint8Array.from(atob(settings.totp_secret_iv), c => c.charCodeAt(0));
        
        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: ivBytes },
          cryptoKey,
          encryptedBytes
        );
        decryptedSecret = new TextDecoder().decode(decryptedBuffer);
      } catch (decryptErr) {
        console.error("TOTP decryption failed:", decryptErr);
        return new Response(
          JSON.stringify({ error: "Erreur de déchiffrement" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Vérifier le code TOTP avec le secret déchiffré
      const isValid = await verifyTOTP(decryptedSecret, code);

      // Logger la tentative
      await supabase.from("totp_verification_attempts").insert({
        user_id: user.id,
        success: isValid,
        ip_address: clientIP || null,
        user_agent: userAgent,
        failure_reason: isValid ? null : "Code TOTP invalide",
      });

      if (isValid) {
        await supabase
          .from("user_2fa_settings")
          .update({ last_used_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ success: isValid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Action non reconnue" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erreur vérification TOTP:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
