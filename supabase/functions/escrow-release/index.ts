import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔓 [Escrow Release] Starting release");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get request body
    const { escrow_id, notes } = await req.json();

    if (!escrow_id) {
      console.error("❌ Missing escrow_id");
      return new Response(
        JSON.stringify({
          success: false,
          error: "escrow_id is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📝 Releasing escrow: ${escrow_id} by admin: ${user.id}`);

    // Get escrow details before release
    const { data: escrow, error: fetchError } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("id", escrow_id)
      .single();

    if (fetchError || !escrow) {
      console.error("❌ Escrow not found");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Escrow transaction not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call the database function to release funds
    const { data, error } = await supabase.rpc("release_escrow_funds", {
      p_escrow_id: escrow_id,
      p_admin_id: user.id,
      p_notes: notes || null,
    });

    if (error) {
      console.error("❌ Error releasing escrow:", error);
      throw error;
    }

    console.log(`✅ Escrow released: ${escrow_id}`);

    // Send notification to buyer
    await supabase.from("communication_notifications").insert({
      user_id: escrow.buyer_id,
      type: "escrow_released",
      title: "Paiement débloqué",
      body: `Votre paiement de ${escrow.amount} ${escrow.currency} vient d'être débloqué.`,
      metadata: {
        escrow_id,
        amount: escrow.amount,
        currency: escrow.currency,
      },
    });

    // Send notification to seller
    await supabase.from("communication_notifications").insert({
      user_id: escrow.seller_id,
      type: "escrow_released",
      title: "Fonds reçus",
      body: `Vous avez reçu ${escrow.amount} ${escrow.currency} de votre vente.`,
      metadata: {
        escrow_id,
        amount: escrow.amount,
        currency: escrow.currency,
      },
    });

    console.log("📧 Notifications sent");

    return new Response(
      JSON.stringify({
        success: true,
        status: "released",
        released_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Escrow release error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
