import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agora Token Privileges
const Privileges = {
  kJoinChannel: 1,
  kPublishAudioStream: 2,
  kPublishVideoStream: 3,
  kPublishDataStream: 4,
};

// Role constants
const Role = {
  PUBLISHER: 1,
  SUBSCRIBER: 2,
};

/**
 * Generate Agora RTC Token
 * Based on Agora's official token generation algorithm
 */
function generateRtcToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: string,
  role: number,
  privilegeExpiredTs: number
): string {
  const version = "006";
  const randomInt = Math.floor(Math.random() * 0xFFFFFFFF);
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Build message
  const message: Record<number, number> = {};
  message[Privileges.kJoinChannel] = privilegeExpiredTs;
  
  if (role === Role.PUBLISHER) {
    message[Privileges.kPublishAudioStream] = privilegeExpiredTs;
    message[Privileges.kPublishVideoStream] = privilegeExpiredTs;
    message[Privileges.kPublishDataStream] = privilegeExpiredTs;
  }

  // Pack message
  const messageBytes = packMessage(message);
  
  // Build signature
  const toSign = new Uint8Array([
    ...new TextEncoder().encode(appId),
    ...new TextEncoder().encode(channelName),
    ...new TextEncoder().encode(uid),
    ...messageBytes
  ]);
  
  const signature = hmacSha256(new TextEncoder().encode(appCertificate), toSign);
  
  // Pack content
  const content = new Uint8Array([
    ...packString(signature),
    ...packUint32(randomInt >>> 0),
    ...packUint32(timestamp >>> 0),
    ...packUint16(messageBytes.length),
    ...messageBytes
  ]);
  
  // Encode token
  const token = version + appId + base64Encode(content.buffer);
  
  return token;
}

function packMessage(message: Record<number, number>): Uint8Array {
  const entries = Object.entries(message);
  const parts: Uint8Array[] = [packUint16(entries.length)];
  
  for (const [key, value] of entries) {
    parts.push(packUint16(parseInt(key)));
    parts.push(packUint32(value >>> 0));
  }
  
  return concatArrays(parts);
}

function packString(str: Uint8Array | string): Uint8Array {
  const bytes = typeof str === 'string' ? new TextEncoder().encode(str) : str;
  return concatArrays([packUint16(bytes.length), bytes]);
}

function packUint16(value: number): Uint8Array {
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint16(0, value, true); // little endian
  return new Uint8Array(buffer);
}

function packUint32(value: number): Uint8Array {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, true); // little endian
  return new Uint8Array(buffer);
}

function concatArrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  // Simple HMAC-SHA256 implementation using Web Crypto API would require async
  // For now, we'll use a simplified approach that works for Agora tokens
  const crypto = globalThis.crypto;
  
  // XOR key with ipad/opad
  const blockSize = 64;
  let keyToUse = key;
  
  if (key.length > blockSize) {
    keyToUse = sha256(key);
  }
  
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyToUse);
  
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }
  
  const inner = sha256(concatArrays([ipad, data]));
  return sha256(concatArrays([opad, inner]));
}

function sha256(data: Uint8Array): Uint8Array {
  // Simple SHA-256 implementation
  // For production, use async crypto.subtle.digest
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;
  const ch = (x: number, y: number, z: number) => ((x & y) ^ (~x & z)) >>> 0;
  const maj = (x: number, y: number, z: number) => ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
  const sigma0 = (x: number) => (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
  const sigma1 = (x: number) => (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
  const gamma0 = (x: number) => (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
  const gamma1 = (x: number) => (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0;

  // Padding
  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const padLen = ((msgLen % 64) < 56 ? 56 : 120) - (msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(data);
  padded[msgLen] = 0x80;
  
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);

  // Process blocks
  for (let i = 0; i < padded.length; i += 64) {
    const W = new Uint32Array(64);
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      W[t] = (gamma1(W[t - 2]) + W[t - 7] + gamma0(W[t - 15]) + W[t - 16]) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let t = 0; t < 64; t++) {
      const T1 = (h + sigma1(e) + ch(e, f, g) + K[t] + W[t]) >>> 0;
      const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + T1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) >>> 0;
    }

    H = [
      (H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0,
      (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0
    ];
  }

  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  for (let i = 0; i < 8; i++) {
    resultView.setUint32(i * 4, H[i], false);
  }
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Configuration Supabase manquante (SUPABASE_URL/SUPABASE_ANON_KEY)');
      throw new Error('Configuration Supabase manquante');
    }

    // Vérifier le header d'autorisation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Header Authorization manquant');
      throw new Error('Non autorisé');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      console.error('Token vide');
      throw new Error('Non autorisé');
    }

    // Extraire le user_id depuis le JWT (la validité est ensuite confirmée via un appel DB)
    const parseJwtPayload = (jwt: string): any => {
      const parts = jwt.split('.');
      if (parts.length !== 3) throw new Error('JWT invalide');
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json);
    };

    const claims = parseJwtPayload(token);
    const userId = typeof claims?.sub === 'string' ? claims.sub : null;
    const exp = typeof claims?.exp === 'number' ? claims.exp : null;

    if (!userId) {
      console.error('JWT sans sub');
      throw new Error('Non autorisé');
    }

    if (exp && exp <= Math.floor(Date.now() / 1000)) {
      console.error('JWT expiré');
      throw new Error('Non autorisé');
    }

    // Confirmer le token via une requête DB (PostgREST valide la signature JWT)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Validation token DB échouée:', profileError?.message);
      throw new Error('Non autorisé');
    }

    console.log('Utilisateur authentifié (DB):', userId);

    const { channel, uid: requestedUid, role = 'publisher' } = await req.json();

    if (!channel) {
      throw new Error('Channel requis');
    }

    // On impose l'UID Agora = userId authentifié (évite usurpation)
    const uid = userId;
    if (requestedUid && requestedUid !== uid) {
      console.warn('UID demandé différent du userId authentifié; override.', { requestedUid, uid });
    }
    const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID');
    const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      throw new Error('Configuration Agora manquante');
    }

    // Token expire dans 24 heures
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 86400;
    const roleValue = role === 'publisher' ? Role.PUBLISHER : Role.SUBSCRIBER;

    // Générer le token RTC
    const rtcToken = generateRtcToken(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channel,
      uid,
      roleValue,
      privilegeExpiredTs
    );

    console.log('✅ Token Agora généré pour channel:', channel, 'uid:', uid);

    return new Response(
      JSON.stringify({
        appId: AGORA_APP_ID,
        token: rtcToken,
        channel,
        uid,
        role,
        expiresAt: privilegeExpiredTs
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erreur génération token Agora:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const status = errorMessage === 'Non autorisé' ? 401 : 400;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      }
    );
  }
});
