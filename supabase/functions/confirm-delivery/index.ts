import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log("📦 [Confirm Delivery] Starting confirmation");

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

    console.log(`✅ User authenticated: ${user.id}`);

    // Get request body
    const { order_id } = await req.json();

    if (!order_id) {
      console.error("❌ Missing order_id");
      return new Response(
        JSON.stringify({
          success: false,
          error: "order_id is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📝 Confirming delivery for order: ${order_id}`);

    // Verify this is the customer's order
    const { data: customerData } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!customerData) {
      return new Response(
        JSON.stringify({ success: false, error: "Customer not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("customer_id", customerData.id)
      .single();

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found or unauthorized" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get escrow details
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (escrowError || !escrow) {
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

    // Check escrow status
    if (escrow.status !== 'pending' && escrow.status !== 'held') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Escrow already processed",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`💰 Releasing escrow: ${escrow.id}`);

    // Call the database function to release funds with 2.5% commission
    const { data: releaseData, error: releaseError } = await supabase.rpc("confirm_delivery_and_release_escrow", {
      p_escrow_id: escrow.id,
      p_customer_id: user.id,
      p_notes: "Livraison confirmée par le client",
    });

    if (releaseError) {
      console.error("❌ Error releasing escrow:", releaseError);
      throw releaseError;
    }

    // Update order status to delivered
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("❌ Error updating order:", updateError);
    }

    console.log(`✅ Delivery confirmed for order: ${order_id}`);

    // Send notification to vendor using receiver_id from escrow (which is the vendor's user_id)
    // NOTE: order.vendor_id is the ID in the vendors table, NOT the user_id
    await supabase.from("communication_notifications").insert({
      user_id: escrow.receiver_id, // This is the vendor's user_id
      type: "delivery_confirmed",
      title: "Livraison confirmée",
      body: `Le client a confirmé la réception de la commande #${order.order_number}. Les fonds ont été libérés.`,
      metadata: {
        order_id,
        order_number: order.order_number,
        escrow_id: escrow.id,
        amount: escrow.amount,
      },
    });

    console.log("📧 Notification sent to vendor (user_id:", escrow.receiver_id, ")");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Delivery confirmed and funds released",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Confirm delivery error:", error);
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
