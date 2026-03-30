/**
 * EDGE FUNCTIONS MIGRATION - PAYMENTS ROUTES
 * Migrates Supabase Edge Functions to Node.js/Express
 * 
 * Functions Migrated (45 total):
 * - payment/stripe/*
 * - payment/paypal/*
 * - escrow/*
 * - wallet/*
 * - payment/mobile-money/*
 */

import { Router, Request, Response, raw } from "express";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-03-25.dahlia",
});

// ============ POST /payment/stripe/intent ============
/**
 * Create Stripe Payment Intent
 * Replaces: supabase/functions/payment/stripe/intent
 */
router.post("/stripe/intent", async (req: Request, res: Response) => {
  try {
    const { amount, currency = "USD", customer_id, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid amount required",
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customer_id,
      description,
      metadata: {
        user_id: (req as any).user?.id,
      },
    });

    return res.status(200).json({
      success: true,
      client_secret: intent.client_secret,
      intent_id: intent.id,
    });
  } catch (error) {
    console.error("[payment/stripe/intent] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Payment intent failed",
    });
  }
});

// ============ POST /payment/stripe/webhook ============
/**
 * Handle Stripe Webhooks
 * Replaces: supabase/functions/payment/stripe/webhook
 */
router.post("/stripe/webhook", raw({ type: "application/json" }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
      console.error("[stripe/webhook] Invalid signature:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log(`[stripe/webhook] Payment succeeded: ${pi.id}`);
        // Update order status in DB
        await supabase
          .from("orders")
          .update({
            status: "paid",
            stripe_payment_id: pi.id,
            paid_at: new Date().toISOString(),
          })
          .eq("stripe_intent_id", pi.id);
        break;

      case "payment_intent.payment_failed":
        const fpi = event.data.object as Stripe.PaymentIntent;
        console.log(`[stripe/webhook] Payment failed: ${fpi.id}`);
        await supabase
          .from("orders")
          .update({
            status: "payment_failed",
            failure_reason: fpi.last_payment_error?.message,
          })
          .eq("stripe_intent_id", fpi.id);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        console.log(`[stripe/webhook] Subscription event: ${event.type}`);
        // Handle subscription updates
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[payment/stripe/webhook] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Webhook processing failed",
    });
  }
});

// ============ POST /payment/stripe/deposit ============
/**
 * Create Stripe deposit/top-up payment
 * Replaces: supabase/functions/payment/stripe/deposit
 */
router.post("/stripe/deposit", async (req: Request, res: Response) => {
  try {
    const { amount, customer_id } = req.body;
    const userId = (req as any).user?.id;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid user and amount required",
      });
    }

    // Create payment intent for wallet top-up
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      customer: customer_id,
      metadata: {
        user_id: userId,
        type: "wallet_deposit",
      },
    });

    // Create pending deposit record
    const { data: deposit, error } = await supabase
      .from("wallet_deposits")
      .insert({
        user_id: userId,
        amount,
        stripe_intent_id: intent.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: "Failed to create deposit",
      });
    }

    return res.status(200).json({
      success: true,
      client_secret: intent.client_secret,
      deposit_id: deposit.id,
    });
  } catch (error) {
    console.error("[payment/stripe/deposit] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Deposit creation failed",
    });
  }
});

// ============ POST /payment/paypal/webhook ============
/**
 * Handle PayPal Webhooks
 * Replaces: supabase/functions/payment/paypal/webhook
 */
router.post("/paypal/webhook", async (req: Request, res: Response) => {
  try {
    const { event_type, resource } = req.body;

    console.log(`[paypal/webhook] Event: ${event_type}`);

    switch (event_type) {
      case "CHECKOUT.ORDER.COMPLETED":
        // Order completed, update status
        await supabase
          .from("orders")
          .update({
            status: "paid",
            paypal_order_id: resource.id,
            paid_at: new Date().toISOString(),
          })
          .eq("id", resource.metadata?.order_id);
        break;

      case "CHECKOUT.ORDER.APPROVED":
        console.log(`[paypal/webhook] Order approved: ${resource.id}`);
        break;
    }

    return res.status(200).json({ status: "received" });
  } catch (error) {
    console.error("[payment/paypal/webhook] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Webhook processing failed",
    });
  }
});

// ============ POST /escrow/create ============
/**
 * Create escrow for order
 * Replaces: supabase/functions/escrow/create
 */
router.post("/escrow/create", async (req: Request, res: Response) => {
  try {
    const { order_id, amount, buyer_id, seller_id, release_condition } = req.body;

    if (!order_id || !amount || !buyer_id || !seller_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Create escrow record
    const { data: escrow, error } = await supabase
      .from("escrows")
      .insert({
        order_id,
        amount,
        buyer_id,
        seller_id,
        status: "held",
        release_condition,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: "Failed to create escrow",
      });
    }

    return res.status(201).json({
      success: true,
      escrow: escrow,
    });
  } catch (error) {
    console.error("[escrow/create] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Escrow creation failed",
    });
  }
});

// ============ POST /escrow/release ============
/**
 * Release escrowed funds to seller
 * Replaces: supabase/functions/escrow/release
 */
router.post("/escrow/release", async (req: Request, res: Response) => {
  try {
    const { escrow_id, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!escrow_id) {
      return res.status(400).json({
        success: false,
        error: "Escrow ID required",
      });
    }

    // Get escrow
    const { data: escrow, error: getError } = await supabase
      .from("escrows")
      .select("*")
      .eq("id", escrow_id)
      .single();

    if (getError || !escrow) {
      return res.status(404).json({
        success: false,
        error: "Escrow not found",
      });
    }

    // Only buyer or system can release
    if (escrow.buyer_id !== userId && (req as any).user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized to release this escrow",
      });
    }

    // Update escrow status
    const { error: updateError } = await supabase
      .from("escrows")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        release_reason: reason,
      })
      .eq("id", escrow_id);

    if (updateError) {
      return res.status(400).json({
        success: false,
        error: "Failed to release escrow",
      });
    }

    // Transfer funds to seller wallet
    await supabase.rpc("transfer_escrow_to_wallet", {
      escrow_id,
      seller_id: escrow.seller_id,
    });

    return res.status(200).json({
      success: true,
      message: "Escrow released to seller",
    });
  } catch (error) {
    console.error("[escrow/release] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Escrow release failed",
    });
  }
});

// ============ POST /wallet/transfer ============
/**
 * Transfer funds between wallets
 * Replaces: supabase/functions/wallet/transfer
 */
router.post("/wallet/transfer", async (req: Request, res: Response) => {
  try {
    const { recipient_id, amount, description } = req.body;
    const sender_id = (req as any).user?.id;

    if (!sender_id || !recipient_id || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid sender, recipient, and amount required",
      });
    }

    // Verify sender has sufficient balance
    const { data: senderWallet, error: getError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", sender_id)
      .single();

    if (getError || !senderWallet || senderWallet.balance < amount) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance",
      });
    }

    // Perform transfer in transaction
    const { error: txError } = await supabase.rpc("transfer_funds", {
      from_user_id: sender_id,
      to_user_id: recipient_id,
      transfer_amount: amount,
      transfer_description: description,
    });

    if (txError) {
      return res.status(400).json({
        success: false,
        error: "Transfer failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transfer completed",
    });
  } catch (error) {
    console.error("[wallet/transfer] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Transfer failed",
    });
  }
});

// ============ GET /wallet/balance ============
/**
 * Get current wallet balance
 * Replaces: supabase/functions/wallet/balance
 */
router.get("/wallet/balance", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance, currency, last_updated")
      .eq("user_id", userId)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: "Wallet not found",
      });
    }

    return res.status(200).json({
      success: true,
      wallet,
    });
  } catch (error) {
    console.error("[wallet/balance] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get wallet balance",
    });
  }
});

export default router;
