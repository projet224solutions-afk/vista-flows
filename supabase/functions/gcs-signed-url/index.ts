import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
}

interface SignedUrlRequest {
  action: 'upload' | 'download';
  fileName: string;
  contentType?: string;
  folder?: string;
  expiresInMinutes?: number;
}

/**
 * Génère une URL signée pour Google Cloud Storage
 * Compatible avec V4 signing
 */
async function generateSignedUrl(
  serviceAccount: ServiceAccount,
  bucketName: string,
  objectPath: string,
  options: {
    method: 'GET' | 'PUT';
    contentType?: string;
    expiresInSeconds: number;
  }
): Promise<string> {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const datestamp = timestamp.slice(0, 8);
  
  const credentialScope = `${datestamp}/auto/storage/goog4_request`;
  const credential = `${serviceAccount.client_email}/${credentialScope}`;

  // Headers signés
  const signedHeaders = 'host';
  const host = `${bucketName}.storage.googleapis.com`;

  // Paramètres de requête canoniques
  const queryParams: Record<string, string> = {
    'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
    'X-Goog-Credential': credential,
    'X-Goog-Date': timestamp,
    'X-Goog-Expires': options.expiresInSeconds.toString(),
    'X-Goog-SignedHeaders': signedHeaders,
  };

  // Trier les paramètres
  const sortedParams = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedParams
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
    .join('&');

  // Headers canoniques
  const canonicalHeaders = `host:${host}\n`;

  // Requête canonique
  const canonicalRequest = [
    options.method,
    `/${encodeURIComponent(objectPath).replace(/%2F/g, '/')}`,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  // String to sign
  const encoder = new TextEncoder();
  const canonicalRequestHash = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(canonicalRequest)
  );
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const stringToSign = [
    'GOOG4-RSA-SHA256',
    timestamp,
    credentialScope,
    canonicalRequestHashHex,
  ].join('\n');

  // Importer la clé privée et signer
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(stringToSign)
  );

  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Construire l'URL finale
  const signedUrl = `https://${host}/${encodeURIComponent(objectPath).replace(/%2F/g, '/')}?${canonicalQueryString}&X-Goog-Signature=${signatureHex}`;

  return signedUrl;
}

/**
 * Génère un nom de fichier unique
 */
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-');
  return `${baseName}-${timestamp}-${random}.${extension}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: SignedUrlRequest = await req.json();
    const { 
      action, 
      fileName, 
      contentType = 'application/octet-stream', 
      folder = '',
      expiresInMinutes = 15 
    } = request;

    // Validation
    if (!action || !fileName) {
      return new Response(
        JSON.stringify({ error: 'action and fileName are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!['upload', 'download'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'action must be "upload" or "download"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Récupérer la configuration
    const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT');
    const bucketName = Deno.env.get('GCS_BUCKET_NAME') || '224solutions-media';

    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Cloud configuration missing',
          instructions: ['Configurez GOOGLE_CLOUD_SERVICE_ACCOUNT avec le JSON du compte de service']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Générer le chemin de l'objet
    const uniqueFileName = action === 'upload' 
      ? generateUniqueFileName(fileName) 
      : fileName;
    
    const objectPath = folder 
      ? `${folder}/${uniqueFileName}` 
      : uniqueFileName;

    console.log(`[gcs-signed-url] Generating ${action} URL for: ${objectPath}`);

    // Générer l'URL signée
    const signedUrl = await generateSignedUrl(
      serviceAccount,
      bucketName,
      objectPath,
      {
        method: action === 'upload' ? 'PUT' : 'GET',
        contentType: action === 'upload' ? contentType : undefined,
        expiresInSeconds: expiresInMinutes * 60,
      }
    );

    console.log(`[gcs-signed-url] Generated ${action} URL successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl,
        objectPath,
        bucket: bucketName,
        expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
        // Pour l'upload, on renvoie aussi l'URL publique finale (si le bucket est configuré pour)
        publicUrl: `https://storage.googleapis.com/${bucketName}/${objectPath}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[gcs-signed-url] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
