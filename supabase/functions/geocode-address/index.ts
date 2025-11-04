import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, lat, lng, type } = await req.json();
    const GOOGLE_CLOUD_API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');

    if (!GOOGLE_CLOUD_API_KEY) {
      throw new Error('Google Cloud API key not configured');
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
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
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

    let url = '';
    
    // Geocoding : adresse → coordonnées
    if (type === 'geocode' && address) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_CLOUD_API_KEY}`;
    }
    
    // Reverse geocoding : coordonnées → adresse
    else if (type === 'reverse' && lat && lng) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_CLOUD_API_KEY}`;
    }

    console.log(`[geocode-address] Request: type=${type}, address="${address}", lat=${lat}, lng=${lng}`);
    
    const response = await fetch(url);
    const data = await response.json();

    console.log(`[geocode-address] Google API response status: ${data.status}`);

    if (data.status === 'ZERO_RESULTS') {
      return new Response(
        JSON.stringify({ 
          status: 'ZERO_RESULTS',
          results: [],
          message: type === 'geocode' 
            ? `Aucune adresse trouvée pour: "${address}". Veuillez vérifier l'orthographe ou essayez une adresse plus précise (ex: "M'balia, Conakry, Guinée").`
            : `Aucune adresse trouvée pour les coordonnées: ${lat}, ${lng}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (data.status !== 'OK') {
      console.error(`[geocode-address] Google API error: ${data.status}`, data);
      throw new Error(`Geocoding error: ${data.status}`);
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Geocode error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
