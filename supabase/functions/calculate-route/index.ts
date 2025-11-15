import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination } = await req.json();

    if (!origin || !destination) {
      throw new Error('Origin and destination are required');
    }

    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured');
    }

    // Appel à l'API Google Directions
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.lat},${origin.lng}&` +
      `destination=${destination.lat},${destination.lng}&` +
      `mode=driving&` +
      `key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(directionsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Directions API error: ${data.status}`);
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    // Décoder le polyline pour obtenir les coordonnées de la route
    const routeCoordinates = decodePolyline(route.overview_polyline.points);

    // Calculer la distance en km et la durée en minutes
    const distanceKm = leg.distance.value / 1000;
    const durationMin = Math.ceil(leg.duration.value / 60);

    return new Response(
      JSON.stringify({
        success: true,
        route: routeCoordinates,
        distance: distanceKm,
        duration: durationMin,
        distanceText: leg.distance.text,
        durationText: leg.duration.text,
        startAddress: leg.start_address,
        endAddress: leg.end_address
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Calculate route error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});

// Fonction pour décoder le polyline de Google Maps
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5]);
  }

  return coordinates;
}
