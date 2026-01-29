import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * MARKETPLACE PRODUCT ROTATION
 * 
 * Rotation automatique des produits toutes les 30 minutes
 * - Les produits sont divisés en lots (batches)
 * - Le dernier lot remonte en tête, les autres descendent
 * - Les produits sponsorisés restent toujours en tête
 * - Rotation déterministe et équitable
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Starting marketplace product rotation...");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Appeler la fonction de rotation
    const { data, error } = await supabase.rpc("rotate_marketplace_products");

    if (error) {
      console.error("❌ Rotation error:", error);
      throw error;
    }

    console.log("✅ Rotation completed:", JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        result: data,
        rotated_at: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("❌ Marketplace rotation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
