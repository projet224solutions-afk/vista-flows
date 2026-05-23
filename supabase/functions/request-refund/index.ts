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
    console.log("💸 [Request Refund] Starting refund request");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id, reason, requested_amount, evidence_text } = await req.json();

    if (!order_id || !reason) {
      return new Response(
        JSON.stringify({ success: false, error: "order_id and reason are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Refund request for order: ${order_id} by user: ${user.id}`);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Commande non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let isBuyer = false;

    if (order.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("user_id")
        .eq("id", order.customer_id)
        .maybeSingle();

      isBuyer = customer?.user_id === user.id;
    }

    if (!isBuyer) {
      const { data: escrowBuyer } = await supabase
        .from("escrow_transactions")
        .select("buyer_id")
        .eq("order_id", order_id)
        .maybeSingle();

      isBuyer = escrowBuyer?.buyer_id === user.id;
    }

    // Fallback: check if the authenticated user IS the buyer directly
    if (!isBuyer) {
      isBuyer = order.buyer_id === user.id;
    }

    if (!isBuyer) {
      return new Response(
        JSON.stringify({ success: false, error: "Non autorisé pour cette commande" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get escrow transaction — use maybeSingle to avoid crash if 0 or 2+ rows
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle();

    if (escrowError) {
      console.error("❌ Escrow query error:", escrowError);
    }

    if (!escrow) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucune transaction escrow trouvée pour cette commande"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if escrow is still in a refundable state
    if (!["pending", "held", "released"].includes(escrow.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Cette transaction escrow ne peut plus être remboursée"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if dispute already exists — use maybeSingle to avoid crash if 0 rows
    const { data: existingDispute } = await supabase
      .from("disputes")
      .select("id, status")
      .eq("escrow_id", escrow.id)
      .maybeSingle();

    if (existingDispute && existingDispute.status !== "resolved") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Un litige est déjà en cours pour cette commande"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a dispute for the refund request
    // dispute_number has a DB DEFAULT so no need to provide it
    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert({
        escrow_id: escrow.id,
        client_id: order.customer_id || null,
        vendor_id: order.vendor_id,
        order_id: order.id,
        dispute_type: "refund_request",
        request_type: "full_refund",
        requested_amount: requested_amount || escrow.amount,
        description: `${reason}${evidence_text ? '\n\nDétails: ' + evidence_text : ''}`,
        status: "open"
      })
      .select()
      .single();

    if (disputeError) {
      console.error("❌ Dispute creation error:", disputeError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la création du litige" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Dispute created: ${dispute.id}`);

    // Block auto-release: mark dispute_status on escrow so jobQueue skips it
    await supabase
      .from("escrow_transactions")
      .update({ dispute_status: "open" })
      .eq("id", escrow.id);

    // Add evidence if provided
    if (evidence_text) {
      await supabase.from("dispute_evidence").insert({
        dispute_id: dispute.id,
        submitted_by: user.id,
        evidence_type: "text",
        evidence_data: { description: evidence_text }
      });
    }

    // Log action
    await supabase.from("dispute_actions").insert({
      dispute_id: dispute.id,
      actor_id: user.id,
      action_type: "opened",
      notes: reason
    });

    // Notify vendor — look up vendor's profile ID first
    try {
      const { data: vendorProfile } = await supabase
        .from("vendors")
        .select("user_id")
        .eq("id", order.vendor_id)
        .maybeSingle();

      if (vendorProfile?.user_id) {
        await supabase.from("vendor_notifications").insert({
          vendor_id: vendorProfile.user_id,
          type: "payment",
          title: "Demande de remboursement",
          message: `Un client a demandé un remboursement pour la commande ${order.order_number}. Raison: ${reason}`,
          data: {
            order_id: order.id,
            dispute_id: dispute.id,
            escrow_id: escrow.id
          }
        });
      }
    } catch (notifErr) {
      // Notification failure must not block the refund request
      console.warn("⚠️ Vendor notification failed (non-blocking):", notifErr);
    }

    console.log("✅ Refund request created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demande de remboursement envoyée",
        dispute_id: dispute.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur interne"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
