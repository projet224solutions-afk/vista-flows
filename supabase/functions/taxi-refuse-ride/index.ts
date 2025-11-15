/**
 * TAXI-MOTO: Refus de course
 * Ajoute le conducteur à la liste declined_drivers et notifie le prochain
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Authentication failed");

    const { rideId, driverId } = await req.json();
    if (!rideId || !driverId) throw new Error("rideId and driverId required");

    // Ajouter à declined_drivers - get current then append
    const { data: currentRide } = await supabaseClient
      .from('taxi_trips')
      .select('declined_drivers')
      .eq('id', rideId)
      .single();

    const declinedList = currentRide?.declined_drivers || [];
    if (!declinedList.includes(driverId)) {
      declinedList.push(driverId);
    }

    await supabaseClient
      .from('taxi_trips')
      .update({ declined_drivers: declinedList })
      .eq('id', rideId);

    // Audit
    await supabaseClient.rpc('log_taxi_action', {
      p_action_type: 'ride_refused',
      p_actor_id: user.id,
      p_actor_type: 'driver',
      p_resource_type: 'ride',
      p_resource_id: rideId,
      p_details: { driverId }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TAXI-REFUSE] ERROR:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});