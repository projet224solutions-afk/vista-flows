import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "pdg", "ceo"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { dispute_id, resolution, resolution_notes } = await req.json();
    if (!dispute_id || !resolution || !["release_to_seller", "refund_to_buyer"].includes(resolution)) {
      return new Response(JSON.stringify({ error: "dispute_id et resolution (release_to_seller|refund_to_buyer) requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get dispute
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from("escrow_disputes")
      .select("id, escrow_id, status, initiator_user_id")
      .eq("id", dispute_id)
      .single();

    if (disputeError || !dispute) {
      return new Response(JSON.stringify({ error: "Litige introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dispute.status === "resolved") {
      return new Response(JSON.stringify({ error: "Litige déjà résolu" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get escrow
    const { data: escrow } = await supabaseAdmin
      .from("escrow_transactions")
      .select("id, payer_id, receiver_id, amount, currency, order_id")
      .eq("id", dispute.escrow_id)
      .single();

    if (!escrow) {
      return new Response(JSON.stringify({ error: "Escrow introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    if (resolution === "release_to_seller") {
      // Release escrow to seller
      const commissionPercent = 2.5;
      try {
        await supabaseAdmin.rpc("release_escrow", {
          p_escrow_id: escrow.id,
          p_commission_percent: commissionPercent,
          p_admin_id: user.id,
        });
      } catch {
        // Fallback: update directly
        await supabaseAdmin.from("escrow_transactions").update({
          status: "released",
          released_at: now,
          released_by: user.id,
          dispute_status: "resolved",
          admin_action: "dispute_release_to_seller",
          admin_id: user.id,
        }).eq("id", escrow.id);
      }

      if (escrow.order_id) {
        await supabaseAdmin.from("orders").update({
          status: "delivered",
          payment_status: "paid",
          updated_at: now,
        }).eq("id", escrow.order_id);
      }
    } else {
      // Refund to buyer
      await supabaseAdmin.from("escrow_transactions").update({
        status: "refunded",
        refunded_at: now,
        dispute_status: "resolved",
        admin_action: "dispute_refund_to_buyer",
        admin_id: user.id,
      }).eq("id", escrow.id);

      if (escrow.order_id) {
        await supabaseAdmin.from("orders").update({
          status: "cancelled",
          payment_status: "refunded",
          updated_at: now,
        }).eq("id", escrow.order_id);
      }
    }

    // Update dispute record
    await supabaseAdmin.from("escrow_disputes").update({
      status: "resolved",
      resolution,
      resolution_notes: resolution_notes || null,
      resolved_by: user.id,
      resolved_at: now,
    }).eq("id", dispute_id);

    // Log action
    try {
      await supabaseAdmin.rpc("log_escrow_action", {
        p_escrow_id: escrow.id,
        p_action: `dispute_resolved_${resolution}`,
        p_actor_id: user.id,
        p_notes: resolution_notes || `Litige résolu: ${resolution}`,
      });
    } catch { /* ok */ }

    // Notify both parties
    const resolutionMsg = resolution === "release_to_seller"
      ? "Les fonds ont été libérés au vendeur."
      : "Les fonds ont été remboursés à l'acheteur.";

    await supabaseAdmin.from("notifications").insert([
      {
        user_id: escrow.payer_id,
        title: "Litige résolu",
        message: resolutionMsg,
        type: "escrow_dispute",
        metadata: { dispute_id, escrow_id: escrow.id, resolution },
      },
      {
        user_id: escrow.receiver_id,
        title: "Litige résolu",
        message: resolutionMsg,
        type: "escrow_dispute",
        metadata: { dispute_id, escrow_id: escrow.id, resolution },
      },
    ]);

    console.log(`✅ Dispute ${dispute_id} resolved: ${resolution}`);

    return new Response(JSON.stringify({ success: true, resolution }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ resolve-dispute error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
