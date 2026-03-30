import { Router } from "express";
import { supabaseAdmin } from "../../config/supabase";
import { getBearerToken } from "../../middlewares/auth";
import Stripe from "stripe";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

// Middleware to extract and validate bearer token
const validateBearerToken = async (req: any, res: any, next: any) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, error: "Missing bearer token" });

    const { data: user, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ success: false, error: "Invalid token" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: "Token validation failed" });
  }
};

// Helper: Get PayPal access token
const getPayPalAccessToken = async (): Promise<string> => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  return data.access_token;
};

// 1. Create PayPal Order
router.post("/create-paypal-order", validateBearerToken, async (req: any, res: any) => {
  try {
    const { amount, currency = "GNF", seller_id, order_id, service_id, product_id, metadata } = req.body;

    if (!amount || !seller_id) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id, vendor_id")
      .eq("user_id", req.user.id)
      .single();

    // Get seller info
    const { data: seller } = await supabaseAdmin
      .from("profiles")
      .select("user_id, vendor_id")
      .eq("user_id", seller_id)
      .single();

    if (!seller) {
      return res.status(404).json({ success: false, error: "Seller not found" });
    }

    // Get PDG fee rate via RPC
    const { data: feeData } = await supabaseAdmin.rpc("getPdgFeeRate", {
      p_amount: amount,
    });

    const commissionRate = feeData?.fee_rate || 0.025; // Default 2.5%
    const commissionAmount = amount * commissionRate;

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Determine PayPal currency (convert GNF appropriately)
    const paypalCurrency = currency === "GNF" ? "XOF" : currency;
    const paypalAmount = amount.toString(); // Assume conversion done client-side

    // Create PayPal order
    const paypalOrderResponse = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: paypalCurrency,
              value: paypalAmount,
            },
            reference_id: order_id || "marketplace_order",
          },
        ],
      }),
    });

    if (!paypalOrderResponse.ok) {
      throw new Error("PayPal order creation failed");
    }

    const paypalOrder = await paypalOrderResponse.json();

    // Store transaction in Supabase
    const { data: transaction } = await supabaseAdmin
      .from("stripe_transactions")
      .insert({
        user_id: profile?.user_id,
        seller_id,
        amount,
        currency,
        status: "pending",
        payment_method: "paypal",
        paypal_order_id: paypalOrder.id,
        order_id,
        service_id,
        product_id,
        metadata: {
          ...metadata,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    return res.json({
      success: true,
      paypal_order_id: paypalOrder.id,
      links: paypalOrder.links,
      client_secret: paypalOrder.id, // Use PayPal order ID as reference
      transaction_id: transaction?.id,
    });
  } catch (err: any) {
    console.error("create-paypal-order error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Marketplace Escrow Payment (Stripe)
router.post("/marketplace-escrow-payment", validateBearerToken, async (req: any, res: any) => {
  try {
    const { amount, currency = "gnf", cartItems, description } = req.body;

    if (!amount || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", req.user.id)
      .single();

    // Get PDG fee rate
    const { data: feeData } = await supabaseAdmin.rpc("getPdgFeeRate", {
      p_amount: amount,
    });

    const commissionRate = feeData?.fee_rate || 0.025;
    const commissionAmount = amount * commissionRate;
    const totalAmount = amount + commissionAmount;

    // Create Stripe PaymentIntent with manual capture (escrow)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method_types: ["card"],
      capture_method: "manual", // Escrow mode
      statement_descriptor: "Vista Flows Marketplace",
      metadata: {
        buyer_id: profile?.user_id,
        order_type: "escrow",
        cart_items: cartItems.length.toString(),
      },
    });

    // Create escrow transactions for each vendor
    const escrowRecords = [];
    for (const item of cartItems) {
      const { data: escrow } = await supabaseAdmin
        .from("escrow_transactions")
        .insert({
          payment_intent_id: paymentIntent.id,
          buyer_id: profile?.user_id,
          seller_id: item.vendorId,
          amount: item.price * item.quantity,
          currency,
          status: "pending",
          auto_release_enabled: true,
          auto_release_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      escrowRecords.push(escrow);
    }

    // Store in stripe_transactions
    await supabaseAdmin
      .from("stripe_transactions")
      .insert({
        user_id: profile?.user_id,
        amount,
        currency,
        status: "pending",
        payment_method: "stripe",
        payment_intent_id: paymentIntent.id,
        metadata: {
          cart_items: cartItems,
          vendor_summary: cartItems.map((item: any) => ({
            vendor_id: item.vendorId,
            amount: item.price * item.quantity,
          })),
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          escrow_mode: true,
        },
        created_at: new Date().toISOString(),
      });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: paymentIntent.id,
      commissionRate,
      commissionAmount,
      totalAmount,
    });
  } catch (err: any) {
    console.error("marketplace-escrow-payment error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Stripe Marketplace Payment (Standard)
router.post("/stripe-marketplace-payment", validateBearerToken, async (req: any, res: any) => {
  try {
    const { amount, currency = "gnf", cartItems, description } = req.body;

    if (!amount || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", req.user.id)
      .single();

    // Get PDG fee rate
    const { data: feeData } = await supabaseAdmin.rpc("getPdgFeeRate", {
      p_amount: amount,
    });

    const commissionRate = feeData?.fee_rate || 0.025;
    const commissionAmount = amount * commissionRate;
    const totalAmount = amount + commissionAmount;

    // Create Stripe PaymentIntent with automatic capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: currency.toLowerCase(),
      payment_method_types: ["card"],
      capture_method: "automatic",
      statement_descriptor: "Vista Flows Marketplace",
      metadata: {
        buyer_id: profile?.user_id,
        order_type: "standard",
        cart_items: cartItems.length.toString(),
      },
    });

    // Store in stripe_transactions
    const { data: transaction } = await supabaseAdmin
      .from("stripe_transactions")
      .insert({
        user_id: profile?.user_id,
        amount,
        currency,
        status: "pending",
        payment_method: "stripe",
        payment_intent_id: paymentIntent.id,
        metadata: {
          cart_items: cartItems,
          vendor_summary: cartItems.map((item: any) => ({
            vendor_id: item.vendorId,
            amount: item.price * item.quantity,
          })),
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          escrow_mode: false,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: transaction?.id,
      commissionRate,
      commissionAmount,
      totalAmount,
      productAmount: amount,
    });
  } catch (err: any) {
    console.error("stripe-marketplace-payment error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Cancel Order
router.post("/cancel-order", validateBearerToken, async (req: any, res: any) => {
  try {
    const { order_id, reason } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: "Missing order_id" });
    }

    // Get order
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, customer:customers(user_id)")
      .eq("id", order_id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Verify customer owns order
    if (order.customer?.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not order owner" });
    }

    // Check if cancellable (only pending status)
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Order cannot be cancelled in " + order.status + " status",
        redirect_to: "/refund-request",
      });
    }

    // Update order status
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    if (error) throw error;

    // Refund escrow if applicable
    const { data: escrow } = await supabaseAdmin
      .from("escrow_transactions")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (escrow?.status === "pending" || escrow?.status === "held") {
      // Refund logic would be implemented here
      // For now, just update escrow status
      await supabaseAdmin
        .from("escrow_transactions")
        .update({ status: "refunded" })
        .eq("id", escrow.id);
    }

    return res.json({
      success: true,
      message: "Commande annulée avec succès",
    });
  } catch (err: any) {
    console.error("cancel-order error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Confirm Order by Seller
router.post("/confirm-order-by-seller", validateBearerToken, async (req: any, res: any) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: "Missing order_id" });
    }

    // Get order and verify seller
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, vendor:vendors(user_id)")
      .eq("id", order_id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Verify vendor owns order
    if (order.vendor?.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not vendor" });
    }

    // Update order status
    await supabaseAdmin
      .from("orders")
      .update({
        status: "confirmed",
        cancellable: false,
        seller_confirmed_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    // Update escrow
    const autoReleaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: escrow } = await supabaseAdmin
      .from("escrow_transactions")
      .update({
        status: "held",
        seller_confirmed_at: new Date().toISOString(),
        auto_release_date: autoReleaseDate,
        auto_release_enabled: true,
      })
      .eq("order_id", order_id)
      .select()
      .single();

    // Create notification
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: order.customer_id,
        title: "Commande confirmée",
        message: "Le vendeur a confirmé votre commande",
        type: "order_confirmed",
        metadata: { order_id },
      });

    return res.json({
      success: true,
      auto_release_date: autoReleaseDate,
    });
  } catch (err: any) {
    console.error("confirm-order-by-seller error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Confirm Delivery
router.post("/confirm-delivery", validateBearerToken, async (req: any, res: any) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: "Missing order_id" });
    }

    // Get order
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, customer:customers(user_id)")
      .eq("id", order_id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Verify customer
    if (order.customer?.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not order owner" });
    }

    // Call RPC to release escrow with commission deduction
    const { data: releaseData, error } = await supabaseAdmin.rpc(
      "confirm_delivery_and_release_escrow",
      {
        p_order_id: order_id,
      }
    );

    if (error) throw error;

    // Update order status
    await supabaseAdmin
      .from("orders")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    return res.json({
      success: true,
      released_amount: releaseData?.released_amount,
      seller_amount: releaseData?.seller_amount,
      commission_retained: releaseData?.commission_retained,
    });
  } catch (err: any) {
    console.error("confirm-delivery error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Link Escrow Order
router.post("/link-escrow-order", validateBearerToken, async (req: any, res: any) => {
  try {
    const { payment_intent_id, vendor_id, order_id } = req.body;

    if (!payment_intent_id || !vendor_id || !order_id) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Get escrow
    const { data: escrow } = await supabaseAdmin
      .from("escrow_transactions")
      .select("*")
      .eq("payment_intent_id", payment_intent_id)
      .single();

    if (!escrow) {
      return res.status(404).json({ success: false, error: "Escrow not found" });
    }

    // Verify user is payer or vendor
    if (escrow.buyer_id !== req.user.id && escrow.seller_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    // Link order
    const { data: updated, error } = await supabaseAdmin
      .from("escrow_transactions")
      .update({ order_id })
      .eq("id", escrow.id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      escrow_id: updated.id,
      order_id: updated.order_id,
    });
  } catch (err: any) {
    console.error("link-escrow-order error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Request Refund
router.post("/request-refund", validateBearerToken, async (req: any, res: any) => {
  try {
    const { order_id, reason, requested_amount, evidence_text } = req.body;

    if (!order_id || !reason) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // Get order
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, customer:customers(user_id)")
      .eq("id", order_id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Verify customer
    if (order.customer?.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not order owner" });
    }

    // Check order status
    const allowedStatuses = ["pending", "confirmed", "held", "shipped"];
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: "Cannot request refund for orders in " + order.status + " status",
      });
    }

    // Create dispute record
    const { data: refund, error } = await supabaseAdmin
      .from("order_disputes")
      .insert({
        order_id,
        buyer_id: req.user.id,
        seller_id: order.vendor_id,
        status: "awaiting_vendor_response",
        reason,
        requested_amount: requested_amount || order.total_amount,
        evidence: evidence_text,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Notify vendor and PDG
    await supabaseAdmin
      .from("notifications")
      .insert([
        {
          user_id: order.vendor_id,
          title: "Demande de remboursement",
          message: `Demande de remboursement pour la commande ${order_id}`,
          type: "refund_request",
          metadata: { order_id, refund_id: refund.id },
        },
      ]);

    return res.json({
      success: true,
      refund_request_id: refund.id,
      status: refund.status,
      requested_amount: refund.requested_amount,
    });
  } catch (err: any) {
    console.error("request-refund error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
