import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getVendorReceivableAmount(payload: unknown, fallbackAmount: number): number {
  if (payload && typeof payload === "object" && "vendor_amount" in payload) {
    const vendorAmount = Number((payload as Record<string, unknown>).vendor_amount);
    if (Number.isFinite(vendorAmount)) {
      return vendorAmount;
    }
  }

  return fallbackAmount;
}

async function getOrCreateWallet(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  currency: string,
) {
  const { data: existingWallet, error: walletError } = await supabase
    .from("wallets")
    .select("id, user_id, balance, currency, wallet_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (walletError) {
    throw walletError;
  }

  if (existingWallet) {
    return existingWallet;
  }

  const { data: createdWallet, error: createWalletError } = await supabase
    .from("wallets")
    .insert({
      user_id: userId,
      balance: 0,
      currency,
      wallet_status: "active",
    })
    .select("id, user_id, balance, currency, wallet_status")
    .single();

  if (createWalletError || !createdWallet) {
    throw createWalletError || new Error("Unable to create wallet");
  }

  return createdWallet;
}

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

    // Idempotence: if funds were already released during a previous attempt,
    // treat the action as successful and only ensure the order state is aligned.
    if (escrow.status === 'released') {
      const isCashOnDelivery = order.payment_method === 'cash' && order.shipping_address?.is_cod === true;

      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          status: 'completed',
          payment_status: isCashOnDelivery ? 'paid' : order.payment_status,
          metadata: {
            ...(order.metadata || {}),
            delivered_at: order.metadata?.delivered_at || new Date().toISOString(),
            buyer_confirmed_delivery: true,
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", order_id);

      if (updateError) {
        console.error("❌ Error aligning already released order:", updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          already_confirmed: true,
          message: "Delivery already confirmed",
        }),
        {
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

    const vendorUserId = escrow.receiver_id || escrow.seller_id;
    if (!vendorUserId) {
      throw new Error("Seller user ID missing on escrow transaction");
    }

    const escrowAmount = Number(escrow.amount || 0);
    const commissionAmount = Number(
      escrow.commission_amount && Number.isFinite(Number(escrow.commission_amount))
        ? escrow.commission_amount
        : escrowAmount * 0.025,
    );
    const vendorAmount = Math.max(escrowAmount - commissionAmount, 0);
    const currency = escrow.currency || "GNF";

    const vendorWallet = await getOrCreateWallet(supabase, vendorUserId, currency);

    const { error: vendorWalletUpdateError } = await supabase
      .from("wallets")
      .update({
        balance: Number(vendorWallet.balance || 0) + vendorAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vendorWallet.id);

    if (vendorWalletUpdateError) {
      console.error("❌ Error crediting vendor wallet:", vendorWalletUpdateError);
      throw vendorWalletUpdateError;
    }

    const { data: activePdg } = await supabase
      .from("pdg_management")
      .select("user_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (activePdg?.user_id && commissionAmount > 0) {
      const pdgWallet = await getOrCreateWallet(supabase, activePdg.user_id, currency);
      const { error: pdgWalletUpdateError } = await supabase
        .from("wallets")
        .update({
          balance: Number(pdgWallet.balance || 0) + commissionAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pdgWallet.id);

      if (pdgWalletUpdateError) {
        console.error("⚠️ Error crediting PDG wallet:", pdgWalletUpdateError);
      }
    }

    const txId = `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error: walletTxError } = await supabase
      .from("wallet_transactions")
      .insert({
        transaction_id: txId,
        receiver_wallet_id: vendorWallet.id,
        receiver_user_id: vendorUserId,
        amount: escrowAmount,
        fee: commissionAmount,
        net_amount: vendorAmount,
        currency,
        transaction_type: "payment",
        status: "completed",
        description: `Libération escrow commande ${order.order_number}`,
        reference_id: escrow.id,
        metadata: {
          escrow_id: escrow.id,
          order_id,
          order_number: order.order_number,
          confirmed_by: user.id,
          release_source: "confirm-delivery",
        },
      });

    if (walletTxError) {
      console.error("❌ Error creating wallet transaction:", walletTxError);
      throw walletTxError;
    }

    const { error: escrowUpdateError } = await supabase
      .from("escrow_transactions")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: "Livraison confirmée par le client",
      })
      .eq("id", escrow.id);

    if (escrowUpdateError) {
      console.error("❌ Error updating escrow:", escrowUpdateError);
      throw escrowUpdateError;
    }

    const { error: escrowLogError } = await supabase
      .from("escrow_logs")
      .insert({
        escrow_id: escrow.id,
        action: "customer_release",
        performed_by: user.id,
        note: "Livraison confirmée par le client",
        metadata: {
          order_id,
          order_number: order.order_number,
          vendor_amount: vendorAmount,
          commission_amount: commissionAmount,
          transaction_id: txId,
        },
      });

    if (escrowLogError) {
      console.error("⚠️ Error creating escrow log:", escrowLogError);
    }

    const isCashOnDelivery = order.payment_method === 'cash' && order.shipping_address?.is_cod === true;

    // orders.delivered_at does not exist in the current schema.
    // Persist the confirmation inside metadata while marking the order completed.
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: 'completed',
        payment_status: isCashOnDelivery ? 'paid' : order.payment_status,
        metadata: {
          ...(order.metadata || {}),
          delivered_at: new Date().toISOString(),
          buyer_confirmed_delivery: true,
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", order_id);

    if (updateError) {
      console.error("❌ Error updating order:", updateError);
    }

    console.log(`✅ Delivery confirmed for order: ${order_id}`);

    const releasedVendorAmount = getVendorReceivableAmount({ vendor_amount: vendorAmount }, escrowAmount);

    if (!vendorUserId) {
      console.warn("⚠️ Vendor user ID missing on escrow transaction, skipping vendor notification");
    } else {
      const { error: vendorNotificationError } = await supabase.from("vendor_notifications").insert({
        vendor_id: vendorUserId,
        type: "order",
        title: "Livraison confirmée",
        message: `Le client a confirmé la réception de la commande #${order.order_number}. ${releasedVendorAmount} ${escrow.currency || 'GNF'} ont été libérés.`,
        data: {
          order_id,
          order_number: order.order_number,
          escrow_id: escrow.id,
          amount: releasedVendorAmount,
          currency: escrow.currency || 'GNF',
          source: 'confirm-delivery',
        },
        read: false,
      });

      if (vendorNotificationError) {
        console.error("⚠️ Vendor notification failed after successful release:", vendorNotificationError);
      } else {
        console.log("📧 Vendor notification sent (vendor_id:", vendorUserId, ")");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Delivery confirmed and funds released",
        vendor_amount: releasedVendorAmount,
        currency: escrow.currency || 'GNF',
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
