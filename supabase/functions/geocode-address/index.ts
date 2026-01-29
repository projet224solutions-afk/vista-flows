import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type GoogleKeyCandidate = {
  name: 'GOOGLE_CLOUD_API_KEY' | 'GOOGLE_MAPS_API_KEY';
  value: string;
};

function isNumberLike(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v);
}

function looksLikeDeniedOrExpired(status: unknown, errorMessage: unknown): boolean {
  if (status !== 'REQUEST_DENIED') return false;
  if (typeof errorMessage !== 'string') return true;
  const msg = errorMessage.toLowerCase();
  return msg.includes('expired') || msg.includes('invalid') || msg.includes('denied') || msg.includes('not authorized');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, lat, lng, type } = await req.json();
    
    // Clés candidates (on essaie GOOGLE_CLOUD_API_KEY puis fallback GOOGLE_MAPS_API_KEY)
    const GOOGLE_CLOUD_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    const GOOGLE_MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

    const candidates: GoogleKeyCandidate[] = [
      ...(GOOGLE_CLOUD_KEY ? [{ name: 'GOOGLE_CLOUD_API_KEY' as const, value: GOOGLE_CLOUD_KEY }] : []),
      ...(GOOGLE_MAPS_KEY ? [{ name: 'GOOGLE_MAPS_API_KEY' as const, value: GOOGLE_MAPS_KEY }] : []),
    ];

    console.log('[geocode-address] GOOGLE_CLOUD_API_KEY:', GOOGLE_CLOUD_KEY ? 'Present' : 'Missing');
    console.log('[geocode-address] GOOGLE_MAPS_API_KEY:', GOOGLE_MAPS_KEY ? 'Present' : 'Missing');

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'CONFIG_ERROR',
          error: 'Google API key not configured',
          message: 'Aucune clé API Google n\'est configurée (GOOGLE_CLOUD_API_KEY ou GOOGLE_MAPS_API_KEY).',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Validation des paramètres
    if (type === 'geocode') {
      if (!address || address.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Address is required for geocoding' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else if (type === 'reverse') {
      if (!isNumberLike(lat) || !isNumberLike(lng)) {
        return new Response(
          JSON.stringify({ error: 'Valid latitude and longitude are required for reverse geocoding' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid request type. Use "geocode" or "reverse"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[geocode-address] Request: type=${type}, address="${address}", lat=${lat}, lng=${lng}`);

    const attemptedKeys: string[] = [];
    let lastGooglePayload: any = null;

    for (const candidate of candidates) {
      attemptedKeys.push(candidate.name);

      let url = '';
      if (type === 'geocode' && address) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${candidate.value}`;
      } else if (type === 'reverse') {
        url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${candidate.value}`;
      }

      console.log(`[geocode-address] Trying key: ${candidate.name}`);
      const response = await fetch(url);
      const data = await response.json();
      lastGooglePayload = data;

      console.log(`[geocode-address] Google API response status (${candidate.name}): ${data.status}`);

      if (data.status === 'ZERO_RESULTS') {
        return new Response(
          JSON.stringify({
            status: 'ZERO_RESULTS',
            results: [],
            message:
              type === 'geocode'
                ? `Aucune adresse trouvée pour: "${address}". Veuillez vérifier l'orthographe ou essayez une adresse plus précise (ex: "M'balia, Conakry, Guinée").`
                : `Aucune adresse trouvée pour les coordonnées: ${lat}, ${lng}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      if (data.status === 'OK') {
        const result = data.results?.[0];
        const location = result?.geometry?.location;

        const formattedResponse = {
          status: 'OK',
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          formatted_address: result?.formatted_address ?? null,
          place_id: result?.place_id ?? null,
          address_components: result?.address_components ?? [],
          results: data.results ?? [],
        };

        console.log(`[geocode-address] Success (${candidate.name}): lat=${formattedResponse.lat}, lng=${formattedResponse.lng}`);

        return new Response(JSON.stringify(formattedResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Si la clé semble refusée/expirée, on tente l'autre clé si disponible.
      if (looksLikeDeniedOrExpired(data.status, data.error_message)) {
        console.error(`[geocode-address] Key refused (${candidate.name}):`, {
          status: data.status,
          error_message: data.error_message,
        });
        continue;
      }

      // Autres erreurs: on ne casse pas en 500 (évite écran blanc), on renvoie un diagnostic
      console.error(`[geocode-address] Google API error (${candidate.name}): ${data.status}`, data);
      return new Response(
        JSON.stringify({
          status: data.status,
          error: 'GEOCODING_ERROR',
          message: `Erreur Google Geocoding: ${data.status}`,
          error_message: data.error_message ?? null,
          attempted_keys: attemptedKeys,
          googleResponse: data,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Toutes les clés ont échoué (souvent expirées)
    return new Response(
      JSON.stringify({
        status: lastGooglePayload?.status ?? 'REQUEST_DENIED',
        error: 'REQUEST_DENIED',
        message:
          'Google a refusé la requête (clé expirée/invalide ou API non activée). Les deux clés configurées ont été testées.',
        error_message: lastGooglePayload?.error_message ?? null,
        attempted_keys: attemptedKeys,
        instructions: [
          'Vérifiez dans Google Cloud Console que la Geocoding API est activée.',
          'Vérifiez les restrictions de la clé (API restrictions / Application restrictions).',
          'Si le message dit "expired", régénérez une clé et remplacez le secret correspondant côté Supabase.',
        ],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error: any) {
    console.error('Geocode error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
